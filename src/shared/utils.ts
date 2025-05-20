import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { type ITokenManager } from '../auth/tokenInterface'
import { logger } from './logger'

// Re-export from toolBuilder to maintain backwards compatibility
export { mergeShapes, createTool, toolError, toolSuccess } from './toolBuilder'

// Store a reference to the token manager
let tokenManagerInstance: ITokenManager | null = null

/**
 * Initialize the token manager reference
 */
export function initializeTokenManager(manager: ITokenManager) {
	logger.info('Initializing token manager in utils')
	tokenManagerInstance = manager
}

/**
 * Ensures a valid token is available before making API requests
 *
 * @returns True if token is valid and ready to use
 */
export async function ensureValidToken(): Promise<boolean> {
	try {
		// Use the centralized token manager
		if (tokenManagerInstance) {
			return tokenManagerInstance.ensureValidToken()
		}

		// If token manager is not available, report error
		logger.error('Token manager not initialized')
		return false
	} catch (error) {
		logger.error('Error ensuring valid token', { error })
		return false
	}
}

/**
 * Wraps an API request with token authentication
 *
 * @param client The Schwab API client (not used as we use the central token manager)
 * @param fn The API function to call
 * @param args Arguments to pass to the API function
 * @returns The result of the API call
 */
export async function withTokenAuth<T, Args extends any[]>(
	_client: SchwabApiClient,
	fn: (...args: Args) => Promise<T>,
	...args: Args
): Promise<T> {
	try {
		// Ensure we have a valid token before making the request
		const tokenValid = await ensureValidToken()

		if (!tokenValid) {
			logger.error('Failed to get valid token for API request')
			throw new Error('Failed to get valid token for API request')
		}

		logger.info('Token valid, proceeding with API request')

		// Make the API call
		const result = await fn(...args)
		logger.info('API request successful')
		return result
	} catch (error) {
		logger.error('API request failed', { error })
		throw error
	}
}
