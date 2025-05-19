import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { type z } from 'zod'
import { type TokenManager } from '../auth/tokenManager'
import { logger } from './logger'

// Store a reference to the token manager
let tokenManagerInstance: TokenManager | null = null

// Function to initialize the token manager reference
export function initializeTokenManager(manager: TokenManager) {
	logger.info('Initializing token manager')
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
 * Higher-order function to create Schwab API tool handlers with consistent error handling
 *
 * This utility function handles common patterns in Schwab API tool implementations:
 * 1. Gets a fresh access token
 * 2. Invokes the API function with the validated input
 * 3. Handles errors consistently
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
		logger.info(`Invoking Schwab API with schema: ${schema.constructor.name}`)

		// Ensure we have a valid token before proceeding
		try {
			if (tokenManagerInstance) {
				await tokenManagerInstance.ensureValidToken()
			}
		} catch (tokenError) {
			logger.error('Error validating token', { error: tokenError })
		}

		// Invoke the API function with the validated input
		return invoke(args)
	}
}

/**
 * Merges multiple Zod shape objects into a single shape object
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
