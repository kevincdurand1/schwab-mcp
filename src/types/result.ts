/**
 * Generic Result type for representing success and error states
 *
 * @template T The success data type
 * @template E The error type, defaults to Error
 */
export type Result<T, E = Error> =
	| { success: true; data: T }
	| { success: false; error: E }
