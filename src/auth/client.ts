import {
	type OAuthHelpers,
	type AuthRequest,
} from '@cloudflare/workers-oauth-provider'
import {
	createSchwabAuth as SchwabAuthCreatorFromLibrary,
	AuthStrategy,
	type TokenData,
} from '@sudowealth/schwab-api'
import { type Context } from 'hono'
import { type BlankInput } from 'hono/types'
import { logger } from '../shared/logger'
import { type Env } from '../types/env'

// Define the stricter token type required by CODE_FLOW oauthConfig
// It must have refreshToken: string and expiresAt: number
export interface CodeFlowTokenData extends TokenData {
	accessToken: string
	refreshToken: string
	expiresAt: number
}

// Define interfaces for the enhanced token management features
export interface TokenLifecycleEvent {
	type: 'save' | 'load' | 'refresh' | 'expire' | 'error'
	tokenData?: TokenData | null
	error?: Error | null
	timestamp: number
}

export interface TokenValidationResult {
	valid: boolean
	canRefresh: boolean
	tokenData?: TokenData | null
	reason?: string
}

export interface TokenRefreshResult {
	success: boolean
	tokenData?: TokenData | null
	error?: Error | null
}

export interface ReconnectionResult {
	success: boolean
	tokenRestored: boolean
	refreshPerformed: boolean
	error?: Error | null
}

// Define the interface for the auth client returned by createSchwabAuth for CODE_FLOW
export interface SchwabCodeFlowAuth {
	getAuthorizationUrl(options?: any): {
		authUrl: string
		pkce?: { codeChallenge: string; codeVerifier: string }
	}
	exchangeCode(code: string, pkceVerifier?: string): Promise<TokenData> // Uses the library's TokenData for the promise

	// Methods to align with ITokenLifecycleManager expectations
	getAccessToken(): Promise<string | null>
	supportsRefresh(): boolean
	refresh(refreshToken?: string, options?: { force?: boolean }): Promise<any> // Update signature to match library
	getTokenData(): Promise<TokenData | null> // Made non-optional

	// Other methods from README for auth object
	onRefresh?(callback: (tokenData: TokenData) => void): void
	isRefreshTokenNearingExpiration?(): boolean
	// Potentially other methods from ITokenLifecycleManager or a base AuthClient type from the library

	loadTokenHook?: () => Promise<CodeFlowTokenData | null>
	saveTokenHook?: (tokenData: CodeFlowTokenData) => Promise<void>
	getTokenData: () => Promise<TokenData | null>
	refresh: (
		refreshToken?: string,
		options?: { force?: boolean },
	) => Promise<any>
	supportsRefresh: () => boolean

	// Enhanced token management features
	onTokenEvent?: (callback: (event: TokenLifecycleEvent) => void) => void
	validateToken?: () => Promise<TokenValidationResult>
	forceRefresh?: (options?: {
		retryOnFailure?: boolean
		logDetails?: boolean
	}) => Promise<TokenRefreshResult>
	handleReconnection?: (options?: {
		forceTokenRefresh?: boolean
		validateTokens?: boolean
	}) => Promise<ReconnectionResult>
	getTokenDiagnostics?: () => any
}

/**
 * Creates a unified Schwab Auth client that can both generate authorization URLs
 * and handle token exchange/refresh operations.
 */
export function initializeSchwabAuthClient(
	env: Env,
	redirectUri: string,
	load?: () => Promise<CodeFlowTokenData | null>, // Use stricter CodeFlowTokenData
	save?: (tokenData: CodeFlowTokenData) => Promise<void>, // Use stricter CodeFlowTokenData
): SchwabCodeFlowAuth {
	// Log client ID information (redacted for security)
	logger.info('Initializing Schwab Auth client', {
		clientIdLength: env.SCHWAB_CLIENT_ID?.length || 0,
		hasClientSecret: !!env.SCHWAB_CLIENT_SECRET,
		redirectUri,
	})
	const authClient = SchwabAuthCreatorFromLibrary({
		strategy: AuthStrategy.CODE_FLOW,
		oauthConfig: {
			clientId: env.SCHWAB_CLIENT_ID,
			clientSecret: env.SCHWAB_CLIENT_SECRET,
			redirectUri,
			load, // Pass load/save which now use the stricter CodeFlowTokenData
			save,
		},
	})

	// The library's createSchwabAuth, when configured for CODE_FLOW,
	// is expected to return an object matching SchwabCodeFlowAuth.
	// However, TS may infer a more generic type (like ITokenLifecycleManager).
	// We cast it, acknowledging this assumption based on the library's documented behavior.
	return authClient as unknown as SchwabCodeFlowAuth
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

	// Use our unified auth client. For auth URL generation, load/save might not be strictly needed,
	// so passing undefined (if they are not provided by caller) is fine.
	const auth = initializeSchwabAuthClient(c.env, redirectUri)

	// Check if the auth object has getAuthorizationUrl method
	if (typeof auth.getAuthorizationUrl !== 'function') {
		// If not available, create a direct authorization URL to Schwab
		const baseUrl = 'https://api.schwabapi.com/v1/oauth/authorize'
		const url = new URL(baseUrl)

		// Add required parameters
		url.searchParams.set('client_id', c.env.SCHWAB_CLIENT_ID)
		url.searchParams.set('redirect_uri', redirectUri)
		url.searchParams.set('response_type', 'code')

		// Optionally add scope if available from oauthReqInfo
		if (oauthReqInfo.scope) {
			if (Array.isArray(oauthReqInfo.scope)) {
				url.searchParams.set('scope', oauthReqInfo.scope.join(' '))
			} else if (typeof oauthReqInfo.scope === 'string') {
				url.searchParams.set('scope', oauthReqInfo.scope)
			}
		}

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

	// Original flow if getAuthorizationUrl exists
	const { authUrl } = auth.getAuthorizationUrl()

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
