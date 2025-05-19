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

/**
 * Token data structure required by Schwab enhanced authentication strategy
 */
export interface CodeFlowTokenData extends TokenData {
	accessToken: string
	refreshToken: string
	expiresAt: number
}

/**
 * Event emitted during token lifecycle events
 */
export interface TokenLifecycleEvent {
	type: 'save' | 'load' | 'refresh' | 'expire' | 'error'
	tokenData?: TokenData | null
	error?: Error | null
	timestamp: number
}

/**
 * Result of token validation operations
 */
export interface TokenValidationResult {
	valid: boolean
	canRefresh: boolean
	tokenData?: TokenData | null
	reason?: string
}

/**
 * Result of token refresh operations
 */
export interface TokenRefreshResult {
	success: boolean
	tokenData?: TokenData | null
	error?: Error | null
}

/**
 * Result of reconnection operations
 */
export interface ReconnectionResult {
	success: boolean
	tokenRestored: boolean
	refreshPerformed: boolean
	error?: Error | null
}

/**
 * Enhanced Schwab authentication client interface
 */
export interface SchwabCodeFlowAuth {
	getAuthorizationUrl(options?: any): {
		authUrl: string
		pkce?: { codeChallenge: string; codeVerifier: string }
	}
	exchangeCode(code: string, pkceVerifier?: string): Promise<TokenData>

	// Core token methods
	getAccessToken(): Promise<string | null>
	getTokenData(): Promise<TokenData | null>
	supportsRefresh(): boolean
	refresh(refreshToken?: string, options?: { force?: boolean }): Promise<any>

	// Enhanced token management features
	onTokenEvent(callback: (event: TokenLifecycleEvent) => void): void
	validateToken(): Promise<TokenValidationResult>
	forceRefresh(options?: {
		retryOnFailure?: boolean
		logDetails?: boolean
	}): Promise<TokenRefreshResult>
	handleReconnection(options?: {
		forceTokenRefresh?: boolean
		validateTokens?: boolean
	}): Promise<ReconnectionResult>
	getTokenDiagnostics(): any
}

/**
 * Creates a Schwab Auth client with enhanced features
 *
 * @param env Environment variables containing Schwab API credentials
 * @param redirectUri OAuth callback URI
 * @param load Function to load tokens from storage
 * @param save Function to save tokens to storage
 * @returns Initialized Schwab auth client
 */
export function initializeSchwabAuthClient(
	env: Env,
	redirectUri: string,
	load?: () => Promise<CodeFlowTokenData | null>,
	save?: (tokenData: CodeFlowTokenData) => Promise<void>,
): SchwabCodeFlowAuth {
	logger.info('Initializing enhanced Schwab Auth client', {
		hasClientId: !!env.SCHWAB_CLIENT_ID,
		hasClientSecret: !!env.SCHWAB_CLIENT_SECRET,
		hasLoadFunction: !!load,
		hasSaveFunction: !!save,
	})

	const authConfig = {
		strategy: AuthStrategy.ENHANCED,
		oauthConfig: {
			clientId: env.SCHWAB_CLIENT_ID,
			clientSecret: env.SCHWAB_CLIENT_SECRET,
			redirectUri,
			load,
			save,
		},
		enhancedConfig: {
			persistence: {
				validateOnLoad: true,
				validateOnSave: true,
				events: true,
			},
			reconnection: {
				enabled: true,
				retryOnTransientErrors: true,
				maxRetries: 3,
				backoffFactor: 1.5,
			},
			diagnostics: {
				logTokenState: true,
				detailedErrors: true,
			},
		},
	}

	const authClient = SchwabAuthCreatorFromLibrary(authConfig)
	return authClient as unknown as SchwabCodeFlowAuth
}

/**
 * Redirects the user to Schwab's authorization page
 *
 * @param c Hono context
 * @param oauthReqInfo OAuth request information
 * @param headers Optional headers to include in the response
 * @returns Redirect response to Schwab's authorization page
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
	try {
		const redirectUri = new URL('/callback', c.req.raw.url).href
		const auth = initializeSchwabAuthClient(c.env, redirectUri)

		// Get the authorization URL
		const { authUrl } = auth.getAuthorizationUrl()

		// Add state parameter with encoded oauthReqInfo
		const url = new URL(authUrl)
		url.searchParams.set('state', btoa(JSON.stringify(oauthReqInfo)))

		// Create redirect response with any additional headers
		if (Object.keys(headers).length > 0) {
			return new Response(null, {
				status: 302,
				headers: {
					Location: url.href,
					...headers,
				},
			})
		} else {
			return Response.redirect(url.href, 302)
		}
	} catch (error) {
		logger.error('Error creating authorization redirect', { error })
		return new Response('Error creating authorization URL', { status: 500 })
	}
}
