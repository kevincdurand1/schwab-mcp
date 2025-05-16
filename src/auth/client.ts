import {
	type OAuthHelpers,
	type AuthRequest,
} from '@cloudflare/workers-oauth-provider'
import { createSchwabAuthClient } from '@sudowealth/schwab-api'
import { type Context } from 'hono'
import { type BlankInput } from 'hono/types'
import { type Env } from '../types/env'

/**
 * Creates a unified Schwab Auth client that can both generate authorization URLs
 * and handle token exchange/refresh operations.
 */
export function createSchwabAuth(env: Env, redirectUri: string) {
	// Create the full auth client using the unified function
	return createSchwabAuthClient({
		clientId: env.SCHWAB_CLIENT_ID,
		clientSecret: env.SCHWAB_CLIENT_SECRET,
		redirectUri,
	})
}

/**
 * Redirects the user to Schwab's authorization page using the unified auth client.
 */
export async function redirectToSchwab(
	c: Context<
		{
			Bindings: Env & {
				OAUTH_PROVIDER: OAuthHelpers
			}
		},
		'/authorize',
		BlankInput
	>,
	oauthReqInfo: AuthRequest,
	headers: HeadersInit = {},
): Promise<Response> {
	// Create a new redirect URI for the callback
	const redirectUri = new URL('/callback', c.req.raw.url).href

	// Use our unified auth client
	const auth = createSchwabAuth(c.env, redirectUri)

	// Get the authorization URL as a string
	const { authUrl } = auth.getAuthorizationUrl({
		scope: oauthReqInfo.scope,
	})

	// Create a URL object to manipulate the parameters
	const url = new URL(authUrl)

	// Add state parameter containing the encoded oauthReqInfo
	url.searchParams.set('state', btoa(JSON.stringify(oauthReqInfo)))

	// Create redirect response with any additional headers
	if (Object.keys(headers).length > 0) {
		// If we have headers, create a custom response
		return new Response(null, {
			status: 302,
			headers: {
				Location: url.href,
				...headers,
			},
		})
	} else {
		// Standard redirect without custom headers
		return Response.redirect(url.href, 302)
	}
}
