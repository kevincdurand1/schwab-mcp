import {
	type AuthRequest,
	type OAuthHelpers,
} from '@cloudflare/workers-oauth-provider'
import { createApiClient } from '@sudowealth/schwab-api'
import { Hono } from 'hono'
import { logger } from '../shared/logger'
import { type Env } from '../types/env'
import {
	initializeSchwabAuthClient,
	redirectToSchwab,
	type CodeFlowTokenData,
} from './client'
import {
	clientIdAlreadyApproved,
	parseRedirectApproval,
	renderApprovalDialog,
} from './cookies'

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>()

app.get('/authorize', async (c) => {
	const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw)
	const { clientId } = oauthReqInfo
	if (!clientId) {
		logger.error('Invalid request: clientId is missing')
		return c.text('Invalid request', 400)
	}

	if (
		await clientIdAlreadyApproved(
			c.req.raw,
			oauthReqInfo.clientId,
			c.env.COOKIE_ENCRYPTION_KEY,
		)
	) {
		return redirectToSchwab(c, oauthReqInfo)
	}

	return renderApprovalDialog(c.req.raw, {
		client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
		server: {
			name: 'Schwab MCP Server',
			description:
				'Access your Schwab accounts and market data in MCP clients.',
		},
		state: { oauthReqInfo },
	})
})

app.post('/authorize', async (c) => {
	const { state, headers } = await parseRedirectApproval(
		c.req.raw,
		c.env.COOKIE_ENCRYPTION_KEY,
	)
	if (!state.oauthReqInfo) {
		logger.error('Invalid request: state.oauthReqInfo is missing')
		return c.text('Invalid request', 400)
	}

	return redirectToSchwab(c, state.oauthReqInfo, headers)
})

/**
 * OAuth Callback Endpoint
 *
 * This route handles the callback from Schwab after user authentication.
 * It exchanges the temporary code for an access token and completes the
 * authorization flow.
 */
app.get('/callback', async (c) => {
	// Extract state and code from query parameters
	const stateParam = c.req.query('state')
	const code = c.req.query('code')

	if (!stateParam || !code) {
		logger.error('Missing required parameters', {
			hasState: !!stateParam,
			hasCode: !!code,
		})
		return c.text('Missing required parameters', 400)
	}

	// Parse the state to get the oauthReqInfo
	const oauthReqInfo = JSON.parse(atob(stateParam)) as AuthRequest
	if (!oauthReqInfo.clientId) {
		logger.error('Invalid state: clientId is missing')
		return c.text('Invalid state', 400)
	}

	// Set up redirect URI and token storage for KV
	const redirectUri = new URL('/callback', c.req.raw.url).href
	const userId = oauthReqInfo.clientId

	const saveToken = async (tokenData: CodeFlowTokenData) => {
		await c.env.OAUTH_KV?.put(`token:${userId}`, JSON.stringify(tokenData))
	}

	const loadToken = async (): Promise<CodeFlowTokenData | null> => {
		const tokenStr = await c.env.OAUTH_KV?.get(`token:${userId}`)
		return tokenStr ? (JSON.parse(tokenStr) as CodeFlowTokenData) : null
	}

	try {
		// Initialize auth client with persistence
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
			logger.error('No user ID found in UserPreference')
			return c.text('Failed to retrieve user information', 500)
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
		logger.error('Authorization failed', {
			error,
			errorMessage: error instanceof Error ? error.message : String(error),
		})
		return c.text('Authorization failed', 500)
	}
})

export { app as SchwabHandler }
