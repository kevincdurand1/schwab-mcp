import {
	type AuthRequest,
	type OAuthHelpers,
} from '@cloudflare/workers-oauth-provider'
import { trader } from '@sudowealth/schwab-api'
import { Hono, type Context } from 'hono'
import { logger } from '../../shared/logger'
import  { type Env } from '../../types/env'
import { createSchwabAuth } from '../schwabAuth'
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
		logger.error('Invalid request: clientId is missing', { path: '/authorize', method: 'GET' })
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
			name: 'Schwab OAuth Demo',
			description: 'This MCP Server is a demo for Schwab OAuth.',
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
		logger.error('Invalid request: state.oauthReqInfo is missing', { path: '/authorize', method: 'POST' })
		return c.text('Invalid request', 400)
	}

	return redirectToSchwab(c, state.oauthReqInfo, headers)
})

async function redirectToSchwab(
	c: Context,
	oauthReqInfo: AuthRequest,
	headers: Record<string, string> = {},
) {
	const redirectUri = new URL('/callback', c.req.raw.url).href
	
	// Get the authorization URL from the schwab-api library
	// We need to access the underlying auth client directly for this
	// Hacky but necessary since our SchwabAuth interface focuses on token operations
	const schwabScope = ['SchwabApi', 'oauth2', 'read']
	const authClient = require('@sudowealth/schwab-api').createAuthClient({
		clientId: c.env.SCHWAB_CLIENT_ID,
		clientSecret: c.env.SCHWAB_CLIENT_SECRET,
		redirectUri,
		save: async () => {},
		load: async () => null,
	})
	
	const authResponse = authClient.getAuthorizationUrl({
		scope: schwabScope,
	})

	// Need to manually add state parameter
	const authUrl = new URL(authResponse.authUrl)
	authUrl.searchParams.set('state', btoa(JSON.stringify(oauthReqInfo)))

	return new Response(null, {
		status: 302,
		headers: {
			...headers,
			location: authUrl.toString(),
		},
	})
}

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

	// Use our SchwabAuth service
	const redirectUri = new URL('/callback', c.req.raw.url).href
	const auth = createSchwabAuth(c.env, redirectUri)

	try {
		// Exchange the code for tokens
		const tokenSet = await auth.exchangeCode(code as string)

		if (!tokenSet || !tokenSet.accessToken) {
			logger.error('Failed to get tokens', { path: '/callback' })
			return c.text('Failed to get access token', 500)
		}

		// Fetch the user info from Schwab
		try {
			const userPreferenceData = await trader.userPreference.getUserPreference(
				tokenSet.accessToken,
			)

			// Extract data based on the UserPreference schema
			let userIdFromSchwab: string
			let userNameFromSchwab: string = 'Schwab User' // Default name

			if (userPreferenceData?.streamerInfo?.[0]?.schwabClientCorrelId) {
				userIdFromSchwab =
					userPreferenceData.streamerInfo[0].schwabClientCorrelId
				userNameFromSchwab = `User ${userIdFromSchwab.substring(0, 8)}`
			} else {
				// Fallback if schwabClientCorrelId is not available
				logger.warn('Relevant user identifier not found in UserPreference. Falling back to a temporary ID.', { path: '/callback' })
				userIdFromSchwab = `schwabUser_${Date.now()}`
			}

			// Return back to the MCP client a new token
			const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
				request: oauthReqInfo,
				userId: userIdFromSchwab,
				metadata: {
					label: userNameFromSchwab,
				},
				scope: oauthReqInfo.scope,
				props: {
					name: userNameFromSchwab,
					accessToken: tokenSet.accessToken,
					refreshToken: tokenSet.refreshToken,
					expiresAt: tokenSet.expiresAt,
				},
			})

			return Response.redirect(redirectTo)
		} catch (error) {
			logger.error('Failed to fetch user preferences', { path: '/callback', error })
			return c.text(
				`Failed to fetch user preferences: ${error instanceof Error ? error.message : String(error)}`,
				500
			)
		}
	} catch (error: any) {
		logger.error('Token exchange failed', { path: '/callback', error })
		return c.text('Failed to exchange authorization code for token.', 500)
	}
})

export { app as SchwabHandler }