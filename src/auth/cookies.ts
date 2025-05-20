import { AuthError, formatAuthError } from './errorMessages'

const MCP_APPROVAL = 'mcp-approved-clients'
const ONE_YEAR_IN_SECONDS = 31536000

// --- Helper Functions ---

/**
 * Converts an ArrayBuffer to a hex string
 */
function toHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
}

/**
 * Converts a hex string to an ArrayBuffer
 */
function fromHex(hexString: string): ArrayBuffer {
	const bytes = new Uint8Array(
		hexString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
	)
	return bytes.buffer
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
		console.warn('Invalid base64 payload:', e)
		throw new Error('Failed to decode base64 payload')
	}
}

/**
 * Decodes a URL-safe base64 string back to its original data.
 * Safely handles base64 decoding before attempting to parse JSON.
 *
 * @param encoded - The URL-safe base64 encoded string.
 * @returns The original data.
 */
function decodeState<T = any>(encoded: string): T {
	try {
		// Step 1: Decode base64 to Uint8Array
		const bytes = decodeBase64Payload(encoded)

		// Step 2: Convert to string for JSON parsing
		const jsonString = new TextDecoder().decode(bytes)

		// Step 3: Parse JSON
		return JSON.parse(jsonString) as T
	} catch (e) {
		console.error('Error decoding state:', e)
		const errorInfo = formatAuthError(AuthError.COOKIE_DECODE_ERROR)
		throw new Error(errorInfo.message)
	}
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
		console.error('Error verifying signature:', e)
		return false
	}
}

/**
 * Parses the signed cookie and verifies its integrity.
 * @param cookieHeader - The value of the Cookie header from the request.
 * @param secret - The secret key used for signing.
 * @returns A promise resolving to the list of approved client IDs if the cookie is valid, otherwise undefined.
 */
async function getApprovedClientsFromCookie(
	cookieHeader: string | null,
	secret: string,
): Promise<string[] | undefined> {
	if (!cookieHeader) return undefined

	const cookies = cookieHeader.split(';').map((c) => c.trim())
	const targetCookie = cookies.find((c) => c.startsWith(`${MCP_APPROVAL}=`))

	if (!targetCookie) return undefined

	const cookieValue = targetCookie.substring(MCP_APPROVAL.length + 1)
	const parts = cookieValue.split('.')

	if (parts.length !== 2) {
		const errorInfo = formatAuthError(AuthError.INVALID_COOKIE_FORMAT)
		console.warn(errorInfo.message)
		return undefined
	}

	const [signatureHex, base64Payload] = parts

	// Step 1: Safe base64 decode to Uint8Array (no JSON.parse yet)
	let decodedBytes: Uint8Array
	try {
		decodedBytes = decodeBase64Payload(base64Payload as string)
	} catch (e) {
		console.warn('Invalid base64 payload in cookie:', e)
		return undefined
	}

	// Convert Uint8Array back to string for signature verification
	const payloadString = new TextDecoder().decode(decodedBytes)

	// Step 2: Verify HMAC signature on raw bytes before parsing JSON
	const key = await importKey(secret)
	const isValid = await verifySignature(
		key,
		signatureHex as string,
		payloadString,
	)

	if (!isValid) {
		const errorInfo = formatAuthError(AuthError.COOKIE_SIGNATURE_FAILED)
		console.warn(errorInfo.message)
		return undefined
	}

	// Step 3: JSON.parse only after signature passes
	try {
		const approvedClients = JSON.parse(payloadString)
		if (!Array.isArray(approvedClients)) {
			console.warn('Cookie payload is not an array.')
			return undefined
		}
		// Ensure all elements are strings
		if (!approvedClients.every((item) => typeof item === 'string')) {
			console.warn('Cookie payload contains non-string elements.')
			return undefined
		}
		return approvedClients as string[]
	} catch (e) {
		console.error('Error parsing cookie payload:', e)
		return undefined
	}
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
	const approvedClients = await getApprovedClientsFromCookie(
		cookieHeader,
		cookieSecret,
	)

	return approvedClients?.includes(clientId) ?? false
}

/**
 * Result of parsing the approval form submission.
 */
export interface ParsedApprovalResult {
	/** The original state object passed through the form. */
	state: any
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

	let state: any
	let clientId: string | undefined

	try {
		const formData = await request.formData()
		const encodedState = formData.get('state')

		if (typeof encodedState !== 'string' || !encodedState) {
			const errorInfo = formatAuthError(AuthError.MISSING_FORM_STATE)
			throw new Error(errorInfo.message)
		}

		state = decodeState<{ oauthReqInfo?: { clientId?: string } }>(encodedState) // Decode the state
		clientId = state?.oauthReqInfo?.clientId // Extract clientId from within the state

		if (!clientId) {
			const errorInfo = formatAuthError(AuthError.CLIENT_ID_EXTRACTION_ERROR)
			throw new Error(errorInfo.message)
		}
	} catch (e) {
		console.error('Error processing form submission:', e)
		// Rethrow with centralized error format
		throw new Error(
			`Failed to parse approval form: ${e instanceof Error ? e.message : String(e)}`,
		)
	}

	// Get existing approved clients
	const cookieHeader = request.headers.get('Cookie')
	const existingApprovedClients =
		(await getApprovedClientsFromCookie(cookieHeader, cookieSecret)) ?? []

	// Add the newly approved client ID (avoid duplicates)
	const updatedApprovedClients = Array.from(
		new Set([...existingApprovedClients, clientId]),
	)

	// Sign the updated list
	const payload = JSON.stringify(updatedApprovedClients)
	const key = await importKey(cookieSecret)
	const signature = await signData(key, payload)
	const newCookieValue = `${signature}.${btoa(payload)}` // signature.base64(payload)

	// Generate Set-Cookie header
	const headers: Record<string, string> = {
		'Set-Cookie': `${MCP_APPROVAL}=${newCookieValue}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${ONE_YEAR_IN_SECONDS}`,
	}

	return { state, headers }
}

/**
 * Re-exports the renderApprovalDialog function from the UI module
 * for backward compatibility.
 */
export { renderApprovalDialog } from './ui'
