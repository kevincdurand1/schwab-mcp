import { type Result } from '../types/result'

/**
 * Represents the payload format for successful responses
 */
export type FormattedSuccessPayload<T> = (T extends object ? T : { value: T }) & { message?: string }

/**
 * Custom error class that includes details without mutating the original error
 */
export class ErrorWithDetails extends Error {
	details?: Record<string, any>
	originalStack?: string

	constructor(originalError: Error, details?: Record<string, any>) {
		super(originalError.message)
		this.name = originalError.name
		this.details = details
		this.originalStack = originalError.stack
		// Copy 'cause' if available and on modern Node/browsers
		if ('cause' in originalError) {
			(this as any).cause = originalError.cause
		}
	}
}

/**
 * Formats successful response data for MCP tools
 *
 * @param data The data to include in the response
 * @param message Optional message for human-readable explanation
 * @returns Formatted Result object with FormattedSuccessPayload
 */
export function formatSuccess<T>(data: T, message?: string): Result<FormattedSuccessPayload<T>> {
	return {
		success: true,
		data: {
			...(typeof data === 'object' && data !== null ? data as object : { value: data }),
			message,
		} as FormattedSuccessPayload<T>,
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
): Result<never, Error | ErrorWithDetails> {
	return {
		success: false,
		error: details ? new ErrorWithDetails(error, details) : error,
	}
}
