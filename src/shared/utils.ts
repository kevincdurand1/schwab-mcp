import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { type z } from 'zod'
import { logger } from './logger'

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
	return (args: z.infer<S>) => {
		// Log the API call (without sensitive info)
		logger.info(`Invoking Schwab API with schema: ${schema.constructor.name}`)

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
