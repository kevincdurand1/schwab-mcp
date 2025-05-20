import { logger } from '../shared/logger'
import { AuthError, formatAuthError } from './errorMessages'
import {
	decodeAndVerifyState,
	extractClientIdFromState,
	type StateData,
} from './stateUtils'

const MCP_APPROVAL = 'mcp-approved-clients'
const ONE_YEAR_IN_SECONDS = 31536000

// --- Helper Functions ---

/**
 * Converts an ArrayBuffer to a hex string
 * Uses Buffer in Node.js-compatible environments (enabled with nodejs_compat)
 */
function toHex(buffer: ArrayBuffer): string {
	// Using Buffer is more standard when available in the Workers environment
	return Buffer.from(buffer).toString('hex')
}

/**
 * Converts a hex string to an ArrayBuffer
 * Uses Buffer in Node.js-compatible environments (enabled with nodejs_compat)
 * 
 * @param hexString - A hexadecimal string
 * @returns ArrayBuffer representation of the hex string
 */
function fromHex(hexString: string): ArrayBuffer {
	// Validate hex string format
	if (!/^[0-9a-fA-F]*$/.test(hexString)) {
		logger.warn('Invalid hex string format detected')
		throw new Error('Invalid hex string format')
	}
	
	// Using Buffer is more standard when available in the Workers environment
	return Buffer.from(hexString, 'hex').buffer
}

/**
 * Imports a secret key string for HMAC-SHA256 signing.
 * @param secret - The raw secret key string.
 * @returns A promise resolving to the CryptoKey object.
 */
async function importKey(secret: string): Promise<CryptoKey> {
	if (!secret) {
		const errorInfo = formatAuthError(AuthError.COOKIE_SECRET_MISSING)
		throw new Error(errorInfo.message)
	}
	const enc = new TextEncoder()
	return crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false, // not extractable
		['sign', 'verify'], // key usages
	)
}

/**
 * Signs data using HMAC-SHA256.
 * @param key - The CryptoKey for signing.
 * @param data - The string data to sign.
 * @returns A promise resolving to the signature as a hex string.
 */
async function signData(key: CryptoKey, data: string): Promise<string> {
	const enc = new TextEncoder()
	const signatureBuffer = await crypto.subtle.sign(
		'HMAC',
		key,
		enc.encode(data),
	)
	return toHex(signatureBuffer)
}

/**
 * Verifies an HMAC-SHA256 signature.
 * @param key - The CryptoKey for verification.
 * @param signatureHex - The signature to verify (hex string).
 * @param data - The original data that was signed.
 * @returns A promise resolving to true if the signature is valid, false otherwise.
 */
async function verifySignature(
	key: CryptoKey,
	signatureHex: string,
	data: string,
): Promise<boolean> {
	const enc = new TextEncoder()
	try {
		return await crypto.subtle.verify(
			'HMAC',
			key,
			fromHex(signatureHex),
			enc.encode(data),
		)
	} catch (e) {
		logger.error('Error verifying signature:', e)
		return false
	}
}

/**
 * Parses a cookie string and extracts the value of the specified cookie.
 * @param cookieHeader - The raw cookie header string.
 * @param cookieName - The name of the cookie to extract.
 * @returns The cookie value if found, undefined otherwise.
 */
function extractCookieValue(
	cookieHeader: string | null,
	cookieName: string,
): string | undefined {
	if (!cookieHeader) return undefined

	const cookies = cookieHeader.split(';').map((c) => c.trim())
	const targetCookie = cookies.find((c) => c.startsWith(`${cookieName}=`))

	if (!targetCookie) return undefined
	return targetCookie.substring(cookieName.length + 1)
}

/**
 * Verifies and decodes a signed cookie value.
 * Separates signature verification from content parsing for better security.
 *
 * @param cookieValue - The raw cookie value in format "signature.payload".
 * @param secret - The secret key used for signing.
 * @returns A promise resolving to the decoded payload if signature is valid, undefined otherwise.
 */
async function verifyAndDecodeCookie<T>(
	cookieValue: string | undefined,
	secret: string,
): Promise<T | undefined> {
	if (!cookieValue) return undefined

	const parts = cookieValue.split('.')
	if (parts.length !== 2) {
		const errorInfo = formatAuthError(AuthError.INVALID_COOKIE_FORMAT)
		logger.warn(errorInfo.message)
		return undefined
	}

	// TypeScript doesn't know that we've already checked parts.length === 2
	// so we need to assert the types manually
	const signatureHex = parts[0]
	const base64Payload = parts[1]

	// Step 1: Parse the base64 payload to get the raw string
	let payloadString: string
	try {
		// base64Payload must be a string because it comes from parts[1]
		// and we've already checked that parts.length === 2
		if (typeof base64Payload !== 'string') {
			logger.warn('Invalid base64 payload format: not a string')
			return undefined
		}
		const binaryString = atob(base64Payload)
		payloadString = binaryString
	} catch (e) {
		logger.warn('Invalid base64 payload in cookie:', e)
		return undefined
	}

	// Step 2: Verify HMAC signature before parsing JSON
	const key = await importKey(secret)
	if (typeof signatureHex !== 'string') {
		logger.warn('Invalid signature format: not a string')
		return undefined
	}
	const isValid = await verifySignature(key, signatureHex, payloadString)

	if (!isValid) {
		const errorInfo = formatAuthError(AuthError.COOKIE_SIGNATURE_FAILED)
		logger.warn(errorInfo.message)
		return undefined
	}

	// Step 3: Parse JSON only after signature validation
	try {
		return JSON.parse(payloadString) as T
	} catch (e) {
		logger.error('Error parsing cookie payload:', e)
		return undefined
	}
}

/**
 * Creates a signed cookie string in the format "signature.base64(payload)".
 * @param payload - The data to store in the cookie.
 * @param secret - The secret key used for signing.
 * @returns A promise resolving to the signed cookie value.
 */
async function createSignedCookie(
	payload: any,
	secret: string,
): Promise<string> {
	const stringifiedPayload = JSON.stringify(payload)
	const key = await importKey(secret)
	const signature = await signData(key, stringifiedPayload)
	return `${signature}.${btoa(stringifiedPayload)}`
}

/**
 * Creates a Set-Cookie header value for the approval cookie.
 * @param cookieValue - The signed cookie value.
 * @returns The Set-Cookie header value.
 */
function createApprovalCookieHeader(cookieValue: string): string {
	return `${MCP_APPROVAL}=${cookieValue}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${ONE_YEAR_IN_SECONDS}`
}

/**
 * Extracts and validates the approved clients from the cookie.
 * @param cookieHeader - The value of the Cookie header from the request.
 * @param secret - The secret key used for signing.
 * @returns A promise resolving to the list of approved client IDs if the cookie is valid, otherwise undefined.
 */
async function parseApprovalCookie(
	cookieHeader: string | null,
	secret: string,
): Promise<string[] | undefined> {
	const cookieValue = extractCookieValue(cookieHeader, MCP_APPROVAL)
	const approvedClients = await verifyAndDecodeCookie<string[]>(
		cookieValue,
		secret,
	)

	// Additional validation for array content
	if (approvedClients) {
		if (!Array.isArray(approvedClients)) {
			logger.warn('Cookie payload is not an array.')
			return undefined
		}

		// Ensure all elements are strings
		if (!approvedClients.every((item) => typeof item === 'string')) {
			logger.warn('Cookie payload contains non-string elements.')
			return undefined
		}
	}

	return approvedClients
}

/**
 * Sets the approval cookie with the provided client IDs.
 * @param approvedClients - Array of approved client IDs.
 * @param secret - The secret key used for signing.
 * @returns A promise resolving to the Set-Cookie header value.
 */
async function setApprovalCookie(
	approvedClients: string[],
	secret: string,
): Promise<string> {
	const cookieValue = await createSignedCookie(approvedClients, secret)
	return createApprovalCookieHeader(cookieValue)
}

// --- Exported Functions ---

/**
 * Checks if a given client ID has already been approved by the user,
 * based on a signed cookie.
 *
 * @param request - The incoming Request object to read cookies from.
 * @param clientId - The OAuth client ID to check approval for.
 * @param cookieSecret - The secret key used to sign/verify the approval cookie.
 * @returns A promise resolving to true if the client ID is in the list of approved clients in a valid cookie, false otherwise.
 */
export async function clientIdAlreadyApproved(
	request: Request,
	clientId: string,
	cookieSecret: string,
): Promise<boolean> {
	if (!clientId) return false
	const cookieHeader = request.headers.get('Cookie')
	const approvedClients = await parseApprovalCookie(cookieHeader, cookieSecret)

	return approvedClients?.includes(clientId) ?? false
}

/**
 * Result of parsing the approval form submission.
 */
export interface ParsedApprovalResult {
	/** The original state object passed through the form. */
	state: StateData
	/** Headers to set on the redirect response, including the Set-Cookie header. */
	headers: Record<string, string>
}

/**
 * Parses the form submission from the approval dialog, extracts the state,
 * and generates Set-Cookie headers to mark the client as approved.
 *
 * @param request - The incoming POST Request object containing the form data.
 * @param cookieSecret - The secret key used to sign the approval cookie.
 * @returns A promise resolving to an object containing the parsed state and necessary headers.
 * @throws If the request method is not POST, form data is invalid, or state is missing.
 */
export async function parseRedirectApproval(
	request: Request,
	cookieSecret: string,
): Promise<ParsedApprovalResult> {
	if (request.method !== 'POST') {
		const errorInfo = formatAuthError(AuthError.INVALID_REQUEST_METHOD)
		throw new Error(errorInfo.message)
	}

	let encodedState: string
	let state: StateData
	let clientId: string

	try {
		const formData = await request.formData()
		const stateParam = formData.get('state')

		if (typeof stateParam !== 'string' || !stateParam) {
			const errorInfo = formatAuthError(AuthError.MISSING_FORM_STATE)
			throw new Error(errorInfo.message)
		}

		encodedState = stateParam
		state = decodeAndVerifyState(encodedState)
		clientId = extractClientIdFromState(state)
	} catch (e) {
		logger.error('Error processing form submission:', e)
		// Rethrow with centralized error format
		throw new Error(
			`Failed to parse approval form: ${e instanceof Error ? e.message : String(e)}`,
		)
	}

	// Get existing approved clients
	const cookieHeader = request.headers.get('Cookie')
	const existingApprovedClients =
		(await parseApprovalCookie(cookieHeader, cookieSecret)) ?? []

	// Add the newly approved client ID (avoid duplicates)
	const updatedApprovedClients = Array.from(
		new Set([...existingApprovedClients, clientId]),
	)

	// Create the Set-Cookie header
	const cookieHeaderValue = await setApprovalCookie(
		updatedApprovedClients,
		cookieSecret,
	)

	// Return result with headers
	return {
		state,
		headers: { 'Set-Cookie': cookieHeaderValue },
	}
}

