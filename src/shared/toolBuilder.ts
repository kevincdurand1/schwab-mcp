import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { type z } from 'zod'
import { type TokenManager } from '../auth/tokenManager'
import { logger } from './logger'

// Store a reference to the token manager
type TokenManagerType = TokenManager
let tokenManagerInstance: TokenManagerType | null = null

/**
 * Initialize the token manager used by tools
 */
export function initializeTokenManager(manager: TokenManagerType) {
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
function formatResponse(response: ToolResponse): any {
	if (response.success) {
		// Create a valid content array for MCP
		return {
			content: [
				{
					type: 'text',
					text: response.message || 'Operation successful',
				},
				{
					type: 'text',
					text: JSON.stringify(response.data, null, 2),
				},
			],
		}
	} else {
		return {
			content: [
				{
					type: 'text',
					text: response.error.message || 'An error occurred',
				},
			],
			isError: true,
		}
	}
}

/**
 * Creates a tool error response
 */
export function toolError(
	message: string | Error,
	details?: Record<string, any>,
): ToolResponse {
	const error = message instanceof Error ? message : new Error(message)
	return { success: false, error, details }
}

/**
 * Creates a tool success response
 */
export function toolSuccess<T>(data: T, message?: string): ToolResponse<T> {
	return {
		success: true,
		data,
		message,
	}
}

/**
 * Creates and registers a tool with the MCP server
 */
export function createTool<S extends z.ZodObject<any, any, any>>(
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
		) => Promise<ToolResponse>
	},
) {
	server.tool(name, schema.shape, async (args: any) => {
		try {
			logger.info(`Invoking tool: ${name}`)

			// Try to validate token but proceed anyway
			try {
				if (tokenManagerInstance) {
					await tokenManagerInstance.ensureValidToken()
				}
			} catch (tokenError) {
				logger.warn(`Token validation warning for tool: ${name}`, {
					tokenError,
				})
				// Continue execution even if token validation fails
				// This matches the behavior of the original schwabTool implementation
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
			return formatResponse(result)
		} catch (error) {
			logger.error(`Unexpected error in tool: ${name}`, { error })
			return formatResponse(
				toolError(error instanceof Error ? error : new Error('Unknown error'), {
					source: name,
				}),
			)
		}
	})
}
