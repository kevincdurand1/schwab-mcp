import { type AuthRequest } from '@cloudflare/workers-oauth-provider'
import { logger } from '../shared/logger'
import { AuthError, formatAuthError } from './errorMessages'

/**
 * Interface for structured state data
 */
export interface StateData {
	clientId?: string
	userId?: string
	oauthReqInfo?: AuthRequest
	[key: string]: any
}

/**
 * Decodes a base64 string to Uint8Array.
 * @param base64Payload - The base64 encoded string.
 * @returns Uint8Array containing the decoded data.
 */
function decodeBase64Payload(base64Payload: string): Uint8Array {
	try {
		// First convert base64 to string representation of binary data
		const binaryString = atob(base64Payload)
		// Then convert to actual Uint8Array
		const decodedBytes = new Uint8Array(binaryString.length)
		for (let i = 0; i < binaryString.length; i++) {
			decodedBytes[i] = binaryString.charCodeAt(i)
		}
		return decodedBytes
	} catch (e) {
		logger.warn('Invalid base64 payload:', e)
		throw new Error('Failed to decode base64 payload')
	}
}

/**
 * Decodes and verifies a state parameter, returning structured data.
 * Safely handles base64 decoding before attempting to parse JSON.
 *
 * @param encoded - The base64 encoded state string.
 * @returns The parsed state data with typed access to common fields.
 * @throws Error if state decoding or validation fails.
 */
export function decodeAndVerifyState(encoded: string): StateData {
	try {
		// Step 1: Decode base64 to Uint8Array
		const bytes = decodeBase64Payload(encoded)

		// Step 2: Convert to string for JSON parsing
		const jsonString = new TextDecoder().decode(bytes)

		// Step 3: Parse JSON
		const state = JSON.parse(jsonString) as StateData

		// Step 4: Validate required fields
		validateStateFields(state)

		return state
	} catch (e) {
		logger.error('Error decoding state:', e)
		const errorInfo = formatAuthError(AuthError.COOKIE_DECODE_ERROR)
		throw new Error(errorInfo.message)
	}
}

/**
 * Validates the required fields in the state object.
 * @param state - The state object to validate.
 * @throws Error if required fields are missing.
 */
function validateStateFields(state: StateData): void {
	// Check if we have a clientId directly or nested in oauthReqInfo
	const clientId = state.clientId || state.oauthReqInfo?.clientId

	if (!clientId) {
		const errorInfo = formatAuthError(AuthError.CLIENT_ID_EXTRACTION_ERROR)
		throw new Error(errorInfo.message)
	}
}

/**
 * Extracts the client ID from a state object, handling different state structures.
 *
 * @param state - The decoded state object.
 * @returns The client ID from the state.
 * @throws Error if client ID cannot be extracted.
 */
export function extractClientIdFromState(state: StateData): string {
	const clientId = state.clientId || state.oauthReqInfo?.clientId

	if (!clientId) {
		const errorInfo = formatAuthError(AuthError.CLIENT_ID_EXTRACTION_ERROR)
		throw new Error(errorInfo.message)
	}

	return clientId
}

/**
 * Encodes a state object to base64.
 *
 * @param state - The state object to encode.
 * @returns The base64 encoded state string.
 */
export function encodeState(state: StateData): string {
	const jsonString = JSON.stringify(state)
	return btoa(jsonString)
}
