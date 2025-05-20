import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { z } from 'zod'
import { type Result } from '../types/result'
import { type FormattedSuccessPayload } from './formatters'
import { logger } from './logger'

// Use the centralized token manager instead of maintaining a separate reference

/**
 * A simplified response type for all tools
 */
export type ToolResponse<T = any> =
	| { success: true; data: T; message?: string }
	| { success: false; error: Error; details?: Record<string, any> }

/**
 * Represents the structure of MCP content array responses
 */
export type McpContentArray = {
	content: Array<{ type: string; text: string }>
	isError?: boolean
}

/**
 * Converts a ToolResponse to the MCP content array format
 */
function formatResponse(response: ToolResponse | Result<any>): McpContentArray {
	// Handle ToolResponse format
	if (response && 'success' in response) {
		if (response.success) {
			// Get the data payload from either ToolResponse or Result
			const dataToLog = 'data' in response ? response.data : null

			// Determine the message to display
			const message =
				('message' in response && response.message) ||
				(dataToLog && (dataToLog as any).message) ||
				'Operation successful'

			// Create a valid content array for MCP
			return {
				content: [
					{
						type: 'text',
						text: message,
					},
					{
						type: 'text',
						text: JSON.stringify(dataToLog, null, 2),
					},
				],
			}
		} else {
			// Prepare the error message text
			let errorMessage = 'An error occurred'

			if ('error' in response && response.error) {
				errorMessage =
					response.error instanceof Error
						? response.error.message
						: String(response.error)
			}

			// Create content array with error details
			const content = [{ type: 'text', text: errorMessage }]

			// Add formatted details if available
			if ('details' in response && response.details) {
				// Check for formatted details from Schwab API errors
				if (response.details.formattedDetails) {
					content.push({
						type: 'text',
						text: `Details: ${response.details.formattedDetails}`,
					})
				}

				// Add useful diagnostic information
				const diagnosticInfo = {
					status: response.details.status,
					code: response.details.code,
					requestId: response.details.requestId,
				}

				// Only add diagnostic info if at least one property has a value
				if (Object.values(diagnosticInfo).some((val) => val !== undefined)) {
					content.push({
						type: 'text',
						text: `Diagnostic Info: ${JSON.stringify(diagnosticInfo)}`,
					})
				}
			}

			return {
				content,
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
 * Type guard to check if an error is a SchwabApiError
 */
function isSchwabApiError(error: any): boolean {
	return (
		error &&
		typeof error === 'object' &&
		(error.name === 'SchwabApiError' ||
			error.constructor?.name === 'SchwabApiError')
	)
}

/**
 * Type guard to check if an error is a SchwabAuthError
 */
function isAuthError(error: any): boolean {
	return (
		error &&
		typeof error === 'object' &&
		(error.name === 'SchwabAuthError' ||
			error.constructor?.name === 'SchwabAuthError')
	)
}

/**
 * Creates a tool error response
 *
 * Enhances error handling for Schwab API errors by extracting detailed information
 * including status codes, error codes, request IDs, and formatted details.
 */
export function toolError(
	message: string | Error | unknown,
	details?: Record<string, any>,
): ToolResponse {
	const error = message instanceof Error ? message : new Error(String(message))

	// Extract enhanced details from Schwab API errors
	let enhancedDetails = { ...details }

	if (isSchwabApiError(error) || isAuthError(error)) {
		// Access rich error information from Schwab API errors
		const apiError = error as any
		enhancedDetails = {
			...enhancedDetails,
			// Include HTTP status if available
			status: apiError.status,
			// Include API/Auth error code if available
			code: apiError.code,
			// Include parsed error details if available
			parsedError: apiError.parsedError,
		}

		// Add request ID for traceability if the method exists
		if (typeof apiError.getRequestId === 'function') {
			enhancedDetails.requestId = apiError.getRequestId()
		}

		// Add formatted details for user-friendly messages if the method exists
		if (typeof apiError.getFormattedDetails === 'function') {
			enhancedDetails.formattedDetails = apiError.getFormattedDetails()
		}
	}

	logger.error('Tool error', { error, details: enhancedDetails })
	return { success: false, error, details: enhancedDetails }
}

/**
 * Test function to verify Schwab API error handling
 * This is for development/testing only and should be removed in production
 */
export function _testSchwabApiErrorHandling(): ToolResponse {
	// Mock a SchwabApiError
	const mockSchwabApiError = new Error('API request failed') as any
	mockSchwabApiError.name = 'SchwabApiError'
	mockSchwabApiError.status = 400
	mockSchwabApiError.code = 'INVALID_PARAMETER'
	mockSchwabApiError.parsedError = {
		field: 'symbol',
		message: 'Invalid symbol format',
	}
	mockSchwabApiError.getRequestId = () => 'req-123456789'
	mockSchwabApiError.getFormattedDetails = () =>
		'Invalid parameter: The symbol format is incorrect'

	// Test our error handling with the mock error
	return toolError(mockSchwabApiError, { source: 'testErrorHandling' })
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
 * 1. Validates access token through the centralized TokenStateMachine
 * 2. Validates input against provided schema
 * 3. Executes the handler with validated input
 * 4. Formats responses consistently
 * 5. Manages error handling and logging
 *
 * NOTE: This is the recommended approach for building tools that require authentication.
 * The token validation is handled automatically by the centralized token manager,
 * so there's no need to call ensureValidToken() or use other token validation methods
 * in your tool handlers.
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
		) => Promise<ToolResponse | Result<FormattedSuccessPayload<any>> | any>
	},
) {
	server.tool(
		name,
		schema instanceof z.ZodObject ? schema.shape : {},
		async (args: any) => {
			try {
				logger.info(`Invoking tool: ${name}`)

				// Token validation is handled by the centralized TokenStateMachine
				// Tool handlers don't need to worry about token validation
				// All API calls will automatically use the valid token from TokenStateMachine

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
