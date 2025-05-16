import { invariant } from '@epic-web/invariant'
import { type z } from 'zod'
import { logger } from '../shared/logger'

/**
 * Converts any error to a SchwabApiError with appropriate status code and message
 *
 * @param error The error to convert
 * @returns A SchwabApiError instance
 */
function toSchwabApiError(error: unknown): SchwabApiError {
	if (error instanceof SchwabApiError) {
		return error
	}

	const status =
		error instanceof Error && 'status' in error
			? (error as any).status || 500
			: 500

	const message = error instanceof Error ? error.message : String(error)

	return new SchwabApiError(status, message)
}

/**
 * Higher-order function to create Schwab API tool handlers with consistent error handling
 *
 * This utility function handles common patterns in Schwab API tool implementations:
 * 1. Gets a fresh access token
 * 2. Invokes the API function with the token and validated input
 * 3. Handles errors consistently with appropriate logging
 *
 * @param getAccessTokenProvided The function to retrieve a valid access token
 * @param schema The Zod schema used to validate input
 * @param invoke The function that interacts with the Schwab API
 * @returns A tool handler function
 */
export function schwabTool<
	S extends z.ZodSchema<any, any>,
	F extends (...args: any[]) => Promise<any>,
>(
	getAccessTokenProvided: () => Promise<string>,
	schema: S,
	invoke: (token: string, input: z.infer<S>) => ReturnType<F>,
) {
	// Return a function compatible with the McpServer.tool() expected callback
	return (args: z.infer<S>) => {
		// Log the API call (without sensitive info)
		logger.info(`Invoking Schwab API with schema: ${schema.constructor.name}`)

		// Get the access token, then invoke function with proper error handling
		return getAccessTokenProvided()
			.then((token: string) => {
				invariant(token, 'No access token available')
				return invoke(token, args)
			})
			.catch((err: unknown) => {
				// Convert to a consistent error format and rethrow
				logger.error('Error calling Schwab API', err)
				throw toSchwabApiError(err)
			})
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
 * Custom error class for Schwab API errors
 * Contains status code and error message
 */
class SchwabApiError extends Error {
	constructor(
		public statusCode: number,
		message: string,
	) {
		super(message)
		this.name = 'SchwabApiError'
	}
}
