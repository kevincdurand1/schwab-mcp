import {
	type OAuthHelpers,
	type AuthRequest,
} from '@cloudflare/workers-oauth-provider'
import { createApiClient } from '@sudowealth/schwab-api'
import { Hono } from 'hono'
import { getEnvironment } from '../config'
import { logger } from '../shared/logger'
import { type Env } from '../types/env'
import {
	initializeSchwabAuthClient,
	redirectToSchwab,
	type CodeFlowTokenData,
} from './client'
import { clientIdAlreadyApproved, parseRedirectApproval } from './cookies'
import { AuthError, formatAuthError } from './errorMessages'
import { ensureEnvInitialized } from './middlewares'
import { decodeAndVerifyState, extractClientIdFromState } from './stateUtils'
import { renderApprovalDialog } from './ui'

// Create Hono app with appropriate bindings
const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>()

// Apply middleware to ensure environment is initialized
app.use('*', ensureEnvInitialized)

// No need to store config locally, we'll use the centralized environment

/**
 * GET /authorize - Entry point for OAuth authorization flow
 *
 * This endpoint checks if the client is already approved, and either:
 * 1. Redirects directly to Schwab if approved
 * 2. Shows an approval dialog if not approved
 */
app.get('/authorize', async (c) => {
	try {
		const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw)
		const { clientId } = oauthReqInfo

		if (!clientId) {
			const errorInfo = formatAuthError(AuthError.MISSING_CLIENT_ID)
			logger.error(errorInfo.message)
			return c.text('Invalid request', errorInfo.status)
		}

		// If client ID is already approved, redirect directly to Schwab
		if (
			await clientIdAlreadyApproved(
				c.req.raw,
				oauthReqInfo.clientId,
				getEnvironment().COOKIE_ENCRYPTION_KEY,
			)
		) {
			return redirectToSchwab(c, oauthReqInfo)
		}

		// Otherwise, render the approval dialog
		return renderApprovalDialog(c.req.raw, {
			client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
			server: {
				name: 'Schwab MCP Server',
				description:
					'Access your Schwab accounts and market data in MCP clients.',
			},
			state: { oauthReqInfo },
		})
	} catch (error) {
		const errorInfo = formatAuthError(AuthError.AUTH_REQUEST_ERROR, { error })
		logger.error(errorInfo.message, { error })
		return c.text(errorInfo.message, errorInfo.status)
	}
})

/**
 * POST /authorize - Handle approval dialog submission
 *
 * After the user approves the request, this endpoint processes the form submission
 * and redirects to Schwab for authentication
 */
app.post('/authorize', async (c) => {
	try {
		const { state, headers } = await parseRedirectApproval(
			c.req.raw,
			getEnvironment().COOKIE_ENCRYPTION_KEY,
		)

		if (!state.oauthReqInfo) {
			const errorInfo = formatAuthError(AuthError.MISSING_STATE)
			logger.error(errorInfo.message)
			return c.text('Invalid request', errorInfo.status)
		}

		// Pass the actual AuthRequest object to redirectToSchwab
		const authRequestForSchwab = state.oauthReqInfo

		// Validate required AuthRequest fields before passing to redirectToSchwab
		if (!authRequestForSchwab?.clientId || !authRequestForSchwab?.scope) {
			const errorInfo = formatAuthError(AuthError.INVALID_STATE)
			logger.error(errorInfo.message, {
				missingFields: {
					clientId: !authRequestForSchwab?.clientId,
					scope: !authRequestForSchwab?.scope,
				},
			})
			return c.text('Invalid state information', errorInfo.status)
		}

		return redirectToSchwab(c, authRequestForSchwab, headers)
	} catch (error) {
		const errorInfo = formatAuthError(AuthError.AUTH_APPROVAL_ERROR, { error })
		logger.error(errorInfo.message, { error })
		return c.text(errorInfo.message, errorInfo.status)
	}
})

/**
 * OAuth Callback Endpoint
 *
 * This route handles the callback from Schwab after user authentication.
 * It exchanges the temporary code for an access token and completes the
 * authorization flow.
 */
app.get('/callback', async (c) => {
	try {
		// Extract state and code from query parameters
		const stateParam = c.req.query('state')
		const code = c.req.query('code')

		if (!stateParam || !code) {
			const errorInfo = formatAuthError(AuthError.MISSING_PARAMETERS, {
				hasState: !!stateParam,
				hasCode: !!code,
			})
			logger.error(errorInfo.message, errorInfo.details)
			return c.text(errorInfo.message, errorInfo.status)
		}

		// Parse the state using our utility function.
		// `decodedStateAsAuthRequest` is the AuthRequest object itself that was sent to Schwab.
		const decodedStateAsAuthRequest = decodeAndVerifyState(
			stateParam,
		) as AuthRequest

		// `extractClientIdFromState` will correctly get `decodedStateAsAuthRequest.clientId`.
		// This also serves as validation that clientId exists within the decoded state.
		const clientIdFromState = extractClientIdFromState(
			decodedStateAsAuthRequest,
		)

		// Validate required AuthRequest fields directly on `decodedStateAsAuthRequest`
		if (
			!decodedStateAsAuthRequest?.clientId || // Should be redundant due to extractClientIdFromState
			!decodedStateAsAuthRequest?.redirectUri ||
			!decodedStateAsAuthRequest?.scope
		) {
			const errorInfo = formatAuthError(AuthError.INVALID_STATE, {
				detail:
					'Decoded state object from Schwab callback is missing required AuthRequest fields (clientId, redirectUri, or scope).',
				decodedState: decodedStateAsAuthRequest, // Log the problematic state
			})
			logger.error(errorInfo.message, errorInfo.details)
			return c.text(errorInfo.message, errorInfo.status)
		}

		// Set up redirect URI and token storage for KV
		const redirectUri = getEnvironment().SCHWAB_REDIRECT_URI
		const userIdForKV = clientIdFromState // Use the validated clientId for KV key consistency

		const saveToken = async (tokenData: CodeFlowTokenData) => {
			await getEnvironment().OAUTH_KV?.put(
				`token:${userIdForKV}`,
				JSON.stringify(tokenData),
			)
		}

		const loadToken = async (): Promise<CodeFlowTokenData | null> => {
			const tokenStr = await getEnvironment().OAUTH_KV?.get(
				`token:${userIdForKV}`,
			)
			return tokenStr ? (JSON.parse(tokenStr) as CodeFlowTokenData) : null
		}

		// Use the validated config for auth client to ensure consistency
		const auth = initializeSchwabAuthClient(redirectUri, loadToken, saveToken)

		// Exchange the code for tokens
		const tokenSet = await auth.exchangeCode(code)

		// Create API client
		const client = await createApiClient({
			config: { environment: 'PRODUCTION' },
			auth,
		})

		// Fetch user info to get the Schwab user ID
		const userPreferences =
			await client.trader.userPreference.getUserPreference()
		const userIdFromSchwab =
			userPreferences?.streamerInfo?.[0]?.schwabClientCorrelId

		if (!userIdFromSchwab) {
			const errorInfo = formatAuthError(AuthError.NO_USER_ID)
			logger.error(errorInfo.message)
			return c.text(errorInfo.message, errorInfo.status)
		}

		// Complete the authorization flow using the decoded AuthRequest object
		const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
			request: decodedStateAsAuthRequest,
			userId: userIdFromSchwab,
			metadata: { label: userIdFromSchwab },
			scope: decodedStateAsAuthRequest.scope,
			props: {
				userId: userIdFromSchwab,
				accessToken: tokenSet.accessToken,
				refreshToken: tokenSet.refreshToken,
				expiresAt: tokenSet.expiresAt,
			},
		})

		return Response.redirect(redirectTo)
	} catch (error) {
		const errorInfo = formatAuthError(AuthError.AUTH_CALLBACK_ERROR, {
			error,
			errorMessage: error instanceof Error ? error.message : String(error),
		})
		logger.error(errorInfo.message, errorInfo.details)
		return c.text(errorInfo.message, errorInfo.status)
	}
})

export { app as SchwabHandler }
