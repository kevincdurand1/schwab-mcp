import { type Result } from '../types/result'

/**
 * Formats successful response data for MCP tools
 *
 * @param data The data to include in the response
 * @param message Optional message for human-readable explanation
 * @returns Formatted Result object
 */
export function formatSuccess<T>(data: T, message?: string): Result<any> {
	return {
		success: true,
		data: {
			...(typeof data === 'object' ? data : { value: data }),
			message,
		},
	}
}

/**
 * Formats error response data for MCP tools
 *
 * @param error The error that occurred
 * @param details Optional details to include
 * @returns Formatted Result object
 */
export function formatError(
	error: Error,
	details?: Record<string, any>,
): Result<never, Error> {
	return {
		success: false,
		error: details ? Object.assign(error, { details }) : error,
	}
}
