import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { type z } from 'zod'
import { logger } from './logger'

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
		// Run diagnostics to get comprehensive token status
		const diagnostics = await (client as any).debugAuth?.()

		if (diagnostics) {
			logger.info('Token diagnostics', {
				hasToken: diagnostics.tokenStatus.hasAccessToken,
				isExpired: diagnostics.tokenStatus.isExpired,
				expiresIn: diagnostics.tokenStatus.expiresInSeconds + ' seconds',
				authType: diagnostics.authManagerType,
				supportsRefresh: diagnostics.supportsRefresh,
				environment: diagnostics.environment?.apiEnvironment,
			})

			// If token is expired or will expire soon (within 5 minutes)
			if (
				diagnostics.tokenStatus.isExpired ||
				diagnostics.tokenStatus.expiresInSeconds < 300
			) {
				logger.info('Token expired or expiring soon, attempting refresh')

				// Force a token refresh and get updated diagnostics
				const refreshResult = await (client as any).debugAuth?.({
					forceRefresh: true,
				})

				logger.info('Token refresh result', {
					success: refreshResult.tokenStatus.refreshSuccessful ?? false,
					newExpiresIn: refreshResult.tokenStatus.expiresInSeconds + ' seconds',
				})

				return refreshResult.tokenStatus.refreshSuccessful ?? false
			}

			// Token is valid
			return (
				diagnostics.tokenStatus.hasAccessToken &&
				!diagnostics.tokenStatus.isExpired
			)
		}

		// Fall back to old token check logic if debugAuth isn't available
		// Get current token
		const tokenData = await (client.auth as any).getTokenData?.()

		if (!tokenData?.accessToken) {
			logger.error('No access token available')
			return false
		}

		// Check if token is expired or will expire soon
		if (tokenData.expiresAt && Date.now() > tokenData.expiresAt - 60000) {
			// If we have a refresh token, try to refresh
			if (tokenData.refreshToken) {
				logger.info('Token expired or expiring soon, attempting refresh')
				try {
					await (client.auth as any).refresh(undefined, { force: true })
					logger.info('Token refresh successful')

					// Get the updated token
					const refreshedToken = await (client.auth as any).getTokenData?.()
					if (!refreshedToken?.accessToken) {
						logger.error('No access token available after refresh')
						return false
					}

					// Explicitly set the Authorization header on the axios instance if it exists
					if ((client as any).axiosInstance) {
						;(client as any).axiosInstance.defaults.headers.common[
							'Authorization'
						] = `Bearer ${refreshedToken.accessToken}`
						logger.info(
							'Explicitly set Authorization header with refreshed token',
						)
					}

					return true
				} catch (error) {
					logger.error('Token refresh failed', { error })
					return false
				}
			} else {
				logger.error('Token expired and no refresh token available')
				return false
			}
		}

		// If token is valid, explicitly set the Authorization header on the axios instance if it exists
		if ((client as any).axiosInstance) {
			;(client as any).axiosInstance.defaults.headers.common['Authorization'] =
				`Bearer ${tokenData.accessToken}`
			logger.info('Explicitly set Authorization header with current token')
		}

		return true
	} catch (error) {
		logger.error('Error ensuring valid token', { error })
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
						? Math.floor((tokenData.expiresAt - Date.now()) / 1000) + ' seconds'
						: 'unknown',
				})
			}

			// Ensure we have a valid token and authorization header is set
			await ensureValidToken(client)
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
