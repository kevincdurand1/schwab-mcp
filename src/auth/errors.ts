// Auth error definitions simplified using discriminated unions
import { logger, LogLevel } from '../shared/logger'

export enum AuthErrorKind {
	MissingClientId = 'MissingClientId',
	MissingState = 'MissingState',
	MissingParameters = 'MissingParameters',
	InvalidState = 'InvalidState',
	CookieDecode = 'CookieDecode',
	InvalidCookieFormat = 'InvalidCookieFormat',
	InvalidRequestMethod = 'InvalidRequestMethod',
	MissingFormState = 'MissingFormState',
	ClientIdExtraction = 'ClientIdExtraction',
	CookieSignature = 'CookieSignature',
	AuthRequest = 'AuthRequest',
	AuthApproval = 'AuthApproval',
	AuthCallback = 'AuthCallback',
	AuthUrl = 'AuthUrl',
	NoUserId = 'NoUserId',
	TokenExchange = 'TokenExchange',
	ApiResponse = 'ApiResponse',
	CookieSecretMissing = 'CookieSecretMissing',
}

export interface AuthError {
	kind: AuthErrorKind
	status: number
	message: string
	cause?: Error
}

function errorDef(kind: AuthErrorKind): { status: number; message: string } {
	switch (kind) {
		case AuthErrorKind.MissingClientId:
			return { status: 400, message: 'Invalid request: clientId is missing' }
		case AuthErrorKind.MissingState:
			return {
				status: 400,
				message: 'Invalid request: state.oauthReqInfo is missing',
			}
		case AuthErrorKind.MissingParameters:
			return { status: 400, message: 'Missing required parameters' }
		case AuthErrorKind.InvalidState:
			return { status: 400, message: 'Invalid state: clientId is missing' }
		case AuthErrorKind.CookieDecode:
			return { status: 400, message: 'Could not decode state' }
		case AuthErrorKind.InvalidCookieFormat:
			return { status: 400, message: 'Invalid cookie format received' }
		case AuthErrorKind.InvalidRequestMethod:
			return {
				status: 400,
				message: 'Invalid request method. Expected POST.',
			}
		case AuthErrorKind.MissingFormState:
			return {
				status: 400,
				message: "Missing or invalid 'state' in form data.",
			}
		case AuthErrorKind.ClientIdExtraction:
			return {
				status: 400,
				message: 'Could not extract clientId from state object.',
			}
		case AuthErrorKind.CookieSignature:
			return { status: 401, message: 'Cookie signature verification failed' }
		case AuthErrorKind.AuthRequest:
			return { status: 500, message: 'Error processing authorization request' }
		case AuthErrorKind.AuthApproval:
			return { status: 500, message: 'Error processing approval' }
		case AuthErrorKind.AuthCallback:
			return {
				status: 500,
				message: 'Authorization failed during callback processing',
			}
		case AuthErrorKind.AuthUrl:
			return { status: 500, message: 'Error creating authorization URL' }
		case AuthErrorKind.NoUserId:
			return {
				status: 500,
				message: 'Failed to retrieve user information after Schwab auth',
			}
		case AuthErrorKind.TokenExchange:
			return {
				status: 500,
				message: 'Failed to exchange Schwab authorization code for tokens',
			}
		case AuthErrorKind.ApiResponse:
			return {
				status: 500,
				message: 'Schwab API request failed during authorization flow',
			}
		case AuthErrorKind.CookieSecretMissing:
			return {
				status: 500,
				message:
					'COOKIE_SECRET is not defined. A secret key is required for signing cookies.',
			}
		default: {
			const _exhaustiveCheck: never = kind
			return _exhaustiveCheck
		}
	}
}

export function createAuthError(kind: AuthErrorKind, cause?: Error): AuthError {
	const def = errorDef(kind)
	return {
		kind,
		status: def.status,
		message: def.message,
		...(cause ? { cause } : {}),
	}
}

export interface JsonErrorResponse {
	code: string
	message: string
	requestId?: string
	details?: Record<string, any>
}

interface ErrorResponse {
	message: string
	status: number
	details?: any
}

export function formatAuthError(
	error: AuthError,
	details?: Record<string, any>,
): ErrorResponse {
	const includeStack = logger.getLevel() === LogLevel.DEBUG
	let filtered = details
	if (details && !includeStack) {
		const { stack, ...rest } = details
		filtered = rest
	}
	return {
		message: error.message,
		status: error.status,
		...(filtered && { details: filtered }),
	}
}

export function createJsonErrorResponse(
	error: AuthError,
	requestId?: string,
	additionalDetails?: Record<string, any>,
): JsonErrorResponse {
	return {
		code: error.kind,
		message: error.message,
		...(requestId && { requestId }),
		...(additionalDetails && { details: additionalDetails }),
	}
}
