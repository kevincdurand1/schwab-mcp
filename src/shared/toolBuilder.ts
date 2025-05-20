import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { z } from 'zod'
import { type ITokenManager } from '../auth/tokenInterface'
import { type Result } from '../types/result'
import { logger } from './logger'

// Store a reference to the token manager
let tokenManagerInstance: ITokenManager | null = null

/**
 * Initialize the token manager used by tools
 */
export function initializeTokenManager(manager: ITokenManager) {
	logger.info('Initializing tokenManager in toolBuilder')
	tokenManagerInstance = manager
}

/**
 * A simplified response type for all tools
 */
export type ToolResponse<T = any> =
	| { success: true; data: T; message?: string }
	| { success: false; error: Error; details?: Record<string, any> }

/**
 * Converts a ToolResponse to the MCP content array format
 */
function formatResponse(response: ToolResponse | Result<any>): any {
	// Handle ToolResponse format
	if (response && 'success' in response) {
		if (response.success) {
			// Create a valid content array for MCP
			return {
				content: [
					{
						type: 'text',
						text:
							'message' in response && response.message
								? response.message
								: 'data' in response && response.data?.message
									? response.data.message
									: 'Operation successful',
					},
					{
						type: 'text',
						text: JSON.stringify(
							'data' in response ? response.data : response,
							null,
							2,
						),
					},
				],
			}
		} else {
			return {
				content: [
					{
						type: 'text',
						text:
							'error' in response && response.error
								? response.error instanceof Error
									? response.error.message
									: String(response.error)
								: 'An error occurred',
					},
				],
				isError: true,
			}
		}
	}

	// Default case - wrap in content array
	return {
		content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
	}
}

/**
 * Creates a tool error response
 */
export function toolError(
	message: string | Error | unknown,
	details?: Record<string, any>,
): ToolResponse {
	const error = message instanceof Error ? message : new Error(String(message))
	logger.error('Tool error', { error, details })
	return { success: false, error, details }
}

/**
 * Creates a tool success response
 */
export function toolSuccess<T>({
	data,
	message,
	source,
}: {
	data: T
	message?: string
	source: string
}): ToolResponse<T> {
	const count = Array.isArray(data) ? data.length : 1
	logger.debug(`Tool success: ${source}`, { data, count })

	return {
		success: true,
		data,
		message,
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
 * Creates and registers a tool with the MCP server
 *
 * This unified tool factory function handles common patterns in tool implementations:
 * 1. Validates access token (best-effort - proceeds even if validation fails)
 * 2. Validates input against provided schema
 * 3. Executes the handler with validated input
 * 4. Formats responses consistently
 * 5. Manages error handling and logging
 *
 * @param client The Schwab API client
 * @param server The MCP server instance
 * @param options Configuration object containing name, schema, and handler function
 */
export function createTool<S extends z.ZodSchema<any, any>>(
	client: SchwabApiClient,
	server: McpServer,
	{
		name,
		schema,
		handler,
	}: {
		name: string
		schema: S
		handler: (
			input: z.infer<S>,
			client: SchwabApiClient,
		) => Promise<ToolResponse | Result<any> | any>
	},
) {
	server.tool(
		name,
		schema instanceof z.ZodObject ? schema.shape : {},
		async (args: any) => {
			try {
				logger.info(`Invoking tool: ${name}`)

				// Try to validate token but proceed anyway (best-effort)
				try {
					if (tokenManagerInstance) {
						await tokenManagerInstance.ensureValidToken()
					}
				} catch (tokenError) {
					logger.warn(`Token validation warning for tool: ${name}`, {
						tokenError,
					})
					// Continue execution even if token validation fails
				}

				// Parse input
				let parsedInput: z.infer<S>
				try {
					parsedInput = schema.parse(args)
				} catch (validationError) {
					logger.error(`Input validation error in tool: ${name}`, {
						validationError,
					})
					return formatResponse(
						toolError('Invalid input', {
							details:
								validationError instanceof Error
									? validationError.message
									: String(validationError),
						}),
					)
				}

				// Execute handler
				const result = await handler(parsedInput, client)

				// If result already has content array format, return directly
				if (result && result.content && Array.isArray(result.content)) {
					return result
				}

				return formatResponse(result)
			} catch (error) {
				logger.error(`Unexpected error in tool: ${name}`, { error })
				return formatResponse(
					toolError(
						error instanceof Error ? error : new Error('Unknown error'),
						{
							source: name,
						},
					),
				)
			}
		},
	)
}
