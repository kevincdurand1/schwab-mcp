import {
	type AuthRequest,
	type OAuthHelpers,
} from '@cloudflare/workers-oauth-provider'
import { createApiClient } from '@sudowealth/schwab-api'
import { Hono } from 'hono'
import { EnvConfig } from '../config/envConfig'
import { logger } from '../shared/logger'
import { type Env } from '../types/env'
import {
	initializeSchwabAuthClient,
	redirectToSchwab,
	type CodeFlowTokenData,
} from './client'
import { clientIdAlreadyApproved, parseRedirectApproval } from './cookies'
import { AuthError, formatAuthError } from './errorMessages'
import { renderApprovalDialog } from './ui'

// Create Hono app with appropriate bindings
const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>()

/**
 * GET /authorize - Entry point for OAuth authorization flow
 *
 * This endpoint checks if the client is already approved, and either:
 * 1. Redirects directly to Schwab if approved
 * 2. Shows an approval dialog if not approved
 */
app.get('/authorize', async (c) => {
	try {
		// Environment config is initialized at startup
		// No need to initialize here

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
				EnvConfig.COOKIE_ENCRYPTION_KEY,
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
		// Environment config is initialized at startup
		// No need to initialize here

		const { state, headers } = await parseRedirectApproval(
			c.req.raw,
			EnvConfig.COOKIE_ENCRYPTION_KEY,
		)

		if (!state.oauthReqInfo) {
			const errorInfo = formatAuthError(AuthError.MISSING_STATE)
			logger.error(errorInfo.message)
			return c.text('Invalid request', errorInfo.status)
		}

		return redirectToSchwab(c, state.oauthReqInfo, headers)
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

		// Parse the state to get the oauthReqInfo
		const oauthReqInfo = JSON.parse(atob(stateParam)) as AuthRequest
		if (!oauthReqInfo.clientId) {
			const errorInfo = formatAuthError(AuthError.INVALID_STATE)
			logger.error(errorInfo.message)
			return c.text(errorInfo.message, errorInfo.status)
		}

		// Set up redirect URI and token storage for KV
		const redirectUri = new URL('/callback', c.req.raw.url).href
		const userId = oauthReqInfo.clientId

		const saveToken = async (tokenData: CodeFlowTokenData) => {
			await EnvConfig.OAUTH_KV?.put(
				`token:${userId}`,
				JSON.stringify(tokenData),
			)
		}

		const loadToken = async (): Promise<CodeFlowTokenData | null> => {
			const tokenStr = await EnvConfig.OAUTH_KV?.get(`token:${userId}`)
			return tokenStr ? (JSON.parse(tokenStr) as CodeFlowTokenData) : null
		}

		// Always use the original env object for auth client to ensure consistency
		const auth = initializeSchwabAuthClient(
			c.env,
			redirectUri,
			loadToken,
			saveToken,
		)

		// Exchange the code for tokens
		const tokenSet = await auth.exchangeCode(code)

		// Create API client
		const client = createApiClient({
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

		// Complete the authorization flow
		const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
			request: oauthReqInfo,
			userId: userIdFromSchwab,
			metadata: { label: userIdFromSchwab },
			scope: oauthReqInfo.scope,
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
