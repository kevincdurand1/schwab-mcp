import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { type z } from 'zod'
import { type TokenManager } from '../auth/tokenManager'
import { logger } from './logger'

// Store a reference to the token manager
let tokenManagerInstance: TokenManager | null = null

// Function to initialize the token manager reference
export function initializeTokenManager(manager: TokenManager) {
	logger.info('[utils] Initializing token manager', { hasManager: !!manager })
	tokenManagerInstance = manager
}

/**
 * Helper function to ensure a valid token and explicitly set Authorization header if needed
 *
 * @param client The Schwab API client
 * @returns True if token is valid and ready to use
 */
export async function ensureValidToken(
	client: SchwabApiClient,
): Promise<boolean> {
	try {
		// If we have a centralized token manager, use it
		if (tokenManagerInstance) {
			logger.info('[utils] Using centralized token manager')
			return tokenManagerInstance.ensureValidToken()
		}

		logger.warn(
			'[utils] No centralized token manager available, using legacy code path',
		)

		// Fallback to client's own token management
		try {
			// Since we don't know the exact structure of client.auth,
			// use a safe approach to try to get the token
			const auth = client.auth as any
			let token = null

			if (auth && typeof auth.getTokenData === 'function') {
				token = await auth.getTokenData()
			} else if (auth && typeof auth.getToken === 'function') {
				token = await auth.getToken()
				// If the token is just a string, convert it to an object
				if (typeof token === 'string') {
					token = { accessToken: token }
				}
			}

			const hasToken = !!token?.accessToken
			logger.info('[utils] Client auth token result', { hasToken })
			return hasToken
		} catch (authError) {
			logger.error('[utils] Error accessing client auth methods', {
				error:
					authError instanceof Error ? authError.message : String(authError),
			})
			return false
		}
	} catch (error) {
		logger.error('[utils] Error ensuring valid token', {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : 'No stack trace',
		})
		return false
	}
}

/**
 * Higher-order function to create Schwab API tool handlers with consistent error handling
 *
 * This utility function handles common patterns in Schwab API tool implementations:
 * 1. Gets a fresh access token
 * 2. Invokes the API function with the token and validated input
 * 3. Handles errors consistently with appropriate logging
 *
 * @param client The Schwab API client
 * @param schema The Zod schema used to validate input
 * @param invoke The function that interacts with the Schwab API
 * @returns A tool handler function
 */
export function schwabTool<
	S extends z.ZodSchema<any, any>,
	F extends (...args: any[]) => Promise<any>,
>(
	client: SchwabApiClient,
	schema: S,
	invoke: (input: z.infer<S>) => ReturnType<F>,
) {
	// Return a function compatible with the McpServer.tool() expected callback
	return async (args: z.infer<S>) => {
		// Log the API call (without sensitive info)
		logger.info(`Invoking Schwab API with schema: ${schema.constructor.name}`)

		// Run diagnostics before API call
		try {
			// Use centralized token manager if available for token validation
			if (tokenManagerInstance) {
				await tokenManagerInstance.ensureValidToken()
			} else {
				// Debug token state with the new diagnostics tool
				if ((client as any).debugAuth) {
					const diagnostics = await (client as any).debugAuth()
					logger.info('Token state before API call', {
						hasToken: diagnostics.tokenStatus.hasAccessToken,
						isExpired: diagnostics.tokenStatus.isExpired,
						expiresIn: diagnostics.tokenStatus.expiresInSeconds + ' seconds',
						environment: diagnostics.environment?.apiEnvironment,
					})
				} else {
					// Fall back to old diagnostics if debugAuth not available
					const tokenData = await (client.auth as any).getTokenData?.()
					logger.info('Token state before API call', {
						hasAccessToken: !!tokenData?.accessToken,
						hasRefreshToken: !!tokenData?.refreshToken,
						tokenExpired: tokenData?.expiresAt
							? Date.now() > tokenData.expiresAt
							: 'unknown',
						expiresIn: tokenData?.expiresAt
							? Math.floor((tokenData.expiresAt - Date.now()) / 1000) +
								' seconds'
							: 'unknown',
					})
				}

				// Ensure we have a valid token and authorization header is set
				await ensureValidToken(client)
			}
		} catch (tokenError) {
			logger.error('Error checking token state', { error: tokenError })
		}

		// Get the access token, then invoke function with proper error handling
		return invoke(args)
	}
}

/**
 * Merges multiple Zod shape objects into a single shape object
 * This helps avoid spreading objects directly which can cause issues if zod updates
 *
 * @param shapes An array of Zod shape objects to merge
 * @returns A single merged shape object
 */
export function mergeShapes<T extends z.ZodRawShape[]>(
	...shapes: T
): z.ZodRawShape {
	return shapes.reduce((acc, shape) => ({ ...acc, ...shape }), {})
}

/**
 * Wraps an API request with token auth
 *
 * @param client The Schwab API client
 * @param fn The API function to call
 * @param args Arguments to pass to the API function
 * @returns The result of the API call
 */
export async function withTokenAuth<T, Args extends any[]>(
	client: SchwabApiClient,
	fn: (...args: Args) => Promise<T>,
	...args: Args
): Promise<T> {
	try {
		// Ensure we have a valid token before making the request
		logger.info('[utils] withTokenAuth called')
		const tokenValid = await ensureValidToken(client)

		if (!tokenValid) {
			logger.error('[utils] Failed to get valid token for API request')
			throw new Error('Failed to get valid token for API request')
		}

		logger.info('[utils] Token valid, proceeding with API request')

		// Create a response hook to detect auth failures
		const originalFetch = globalThis.fetch
		globalThis.fetch = async (url, options) => {
			const response = await originalFetch(url, options)

			// Check for auth failures and log them
			if (response.status === 401) {
				logger.error('[utils] 401 Unauthorized response from API', {
					url: url.toString(),
					hasAuthHeader: options?.headers && 'Authorization' in options.headers,
					rawHeaders: options?.headers
						? JSON.stringify(options.headers)
						: 'none',
				})

				// Try to get details from the response
				try {
					const clonedResponse = response.clone()
					const responseText = await clonedResponse.text()
					logger.error('[utils] 401 response details', {
						responseText,
						responseSize: responseText.length,
					})
				} catch (e) {
					logger.error('[utils] Could not read 401 response body', {
						error: e instanceof Error ? e.message : String(e),
					})
				}
			}

			return response
		}

		try {
			// Attempt the API call
			const result = await fn(...args)
			logger.info('[utils] API request successful')
			return result
		} finally {
			// Restore original fetch
			globalThis.fetch = originalFetch
		}
	} catch (error) {
		logger.error('[utils] API request failed', {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : 'No stack trace',
			args: JSON.stringify(args),
		})
		throw error
	}
}
