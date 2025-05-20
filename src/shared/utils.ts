import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { type z } from 'zod'
import { type ITokenManager } from '../auth/tokenInterface'
import { formatError, formatSuccess } from './formatters'
import { logger } from './logger'

// Store a reference to the token manager
let tokenManagerInstance: ITokenManager | null = null

// Function to initialize the token manager reference
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
 * Formats API results as a ToolResponse for MCP
 */
function toToolResponse(data: any): any {
	// If it's already in the content array format, return it
	if (data && data.content && Array.isArray(data.content)) {
		return data
	}

	// For Result type objects from formatSuccess/formatError
	if (data && 'success' in data) {
		if (data.success) {
			return {
				content: [
					{
						type: 'text',
						text: data.data.message || 'Operation successful',
					},
					{
						type: 'text',
						text: JSON.stringify(data.data, null, 2),
					},
				],
			}
		} else {
			return {
				content: [
					{
						type: 'text',
						text:
							data.error instanceof Error
								? data.error.message
								: 'An error occurred',
					},
				],
				isError: true,
			}
		}
	}

	// Default case - wrap in content array
	return {
		content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
	}
}

/**
 * Higher-order function to create Schwab API tool handlers with consistent error handling
 *
 * This utility function handles common patterns in Schwab API tool implementations:
 * 1. Validates access token and inputs
 * 2. Executes the handler with validated input
 * 3. Handles errors consistently with the Result pattern
 *
 * @param client The Schwab API client
 * @param schema The Zod schema used to validate input
 * @param handler The function that interacts with the Schwab API and returns a Result
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
		try {
			logger.info(`Invoking Schwab API with schema: ${schema.constructor.name}`)

			// Try to validate token but proceed anyway
			try {
				if (tokenManagerInstance) {
					await tokenManagerInstance.ensureValidToken()
				}
			} catch (tokenError) {
				logger.warn(`Token validation warning for schwabTool`, { tokenError })
				// Continue execution even if token validation fails
			}

			// Validate input
			let parsedInput: z.infer<S>
			try {
				parsedInput = schema.parse(args)
			} catch (validationError) {
				logger.error(`Input validation error in schwabTool`, { validationError })
				return toToolResponse(
					formatError(new Error('Invalid input'), {
						details: validationError instanceof Error ? validationError.message : String(validationError),
					}),
				)
			}

			// Execute the handler with validated input
			const result = await invoke(parsedInput)

			// If result already has content array format, return directly
			if (result && result.content && Array.isArray(result.content)) {
				return result
			}

			// Handle success or error based on the Result type
			if (result && 'success' in result) {
				if (result.success) {
					return toToolResponse(formatSuccess(result.data))
				} else {
					return toToolResponse(formatError(result.error))
				}
			}

			// Default case - convert to standard format
			return toToolResponse(result)
		} catch (error) {
			logger.error('Unexpected error in tool execution', { error })
			return toToolResponse(
				formatError(
					error instanceof Error ? error : new Error('Unknown error'),
					{ source: 'schwabTool' },
				),
			)
		}
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