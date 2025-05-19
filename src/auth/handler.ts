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
		logger.error('Invalid request: clientId is missing', {
			path: '/authorize',
			method: 'GET',
		})
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
		logger.error('Invalid request: state.oauthReqInfo is missing', {
			path: '/authorize',
			method: 'POST',
		})
		return c.text('Invalid request', 400)
	}

	return redirectToSchwab(c, state.oauthReqInfo, headers)
})

/**
 * OAuth Callback Endpoint
 *
 * This route handles the callback from Schwab after user authentication.
 * It exchanges the temporary code for an access token, then stores some
 * user metadata & the auth token as part of the 'props' on the token passed
 * down to the client. It ends by redirecting the client back to _its_ callback URL
 */
app.get('/callback', async (c) => {
	// Get the oathReqInfo out of state
	const oauthReqInfo = JSON.parse(
		atob(c.req.query('state') as string),
	) as AuthRequest
	if (!oauthReqInfo.clientId) {
		logger.error('Invalid state: clientId is missing', { path: '/callback' })
		return c.text('Invalid state', 400)
	}

	// Exchange the code for an access token using the auth client
	const code = c.req.query('code')
	if (!code) {
		logger.error('Missing code parameter', { path: '/callback' })
		return c.text('Missing code', 400)
	}

	// Use our SchwabAuth service with token persistence
	const redirectUri = new URL('/callback', c.req.raw.url).href

	// Define token storage functions for KV
	const saveToken = async (tokenData: CodeFlowTokenData) => {
		const userId = oauthReqInfo.clientId
		if (!userId) return
		await c.env.OAUTH_KV?.put(`token:${userId}`, JSON.stringify(tokenData))
	}

	const loadToken = async (): Promise<CodeFlowTokenData | null> => {
		const userId = oauthReqInfo.clientId
		if (!userId) return null
		const tokenStr = await c.env.OAUTH_KV?.get(`token:${userId}`)
		return tokenStr ? (JSON.parse(tokenStr) as CodeFlowTokenData) : null
	}

	const auth = initializeSchwabAuthClient(
		c.env,
		redirectUri,
		loadToken,
		saveToken,
	)

	try {
		// Exchange the code for tokens
		const tokenSet = await auth.exchangeCode(code as string)

		// Create the API client with the authenticated auth client
		const client = createApiClient({
			config: { environment: 'PRODUCTION' },
			auth,
		})

		// Fetch the user info from Schwab
		try {
			const userPreferences =
				await client.trader.userPreference.getUserPreference()

			const userIdFromSchwab =
				userPreferences?.streamerInfo?.[0]?.schwabClientCorrelId
			if (!userIdFromSchwab) {
				logger.error('No user ID found in UserPreference', {
					path: '/callback',
				})
				return c.text('No user ID found in UserPreference', 500)
			}

			// Return back to the MCP client a new token
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
			logger.error('Failed to fetch user preferences', {
				path: '/callback',
				error,
			})
			return c.text(
				`Failed to fetch user preferences: ${error instanceof Error ? error.message : String(error)}`,
				500,
			)
		}
	} catch (error: any) {
		logger.error('Token exchange failed', {
			path: '/callback',
			errorMessage: error instanceof Error ? error.message : String(error),
			errorName: error instanceof Error ? error.name : 'Unknown',
			errorCode: error?.code || 'no_code',
			errorStack: error instanceof Error ? error.stack : undefined,
			errorDetails: JSON.stringify(error),
		})
		return c.text('Failed to exchange authorization code for token.', 500)
	}
})

export { app as SchwabHandler }
