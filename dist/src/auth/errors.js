// Auth error definitions using class hierarchy
// Base class for all auth errors
export class AuthError extends Error {
    kind;
    status;
    constructor(kind, status, message, cause) {
        super(message);
        this.name = this.constructor.name;
        this.kind = kind;
        this.status = status;
        this.cause = cause;
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
// Concrete error classes
export const AuthErrors = {
    MissingClientId: class MissingClientId extends AuthError {
        constructor(cause) {
            super('MissingClientId', 400, 'Invalid request: clientId is missing', cause);
        }
    },
    MissingState: class MissingState extends AuthError {
        constructor(cause) {
            super('MissingState', 400, 'Invalid request: state.oauthReqInfo is missing', cause);
        }
    },
    MissingParameters: class MissingParameters extends AuthError {
        constructor(cause) {
            super('MissingParameters', 400, 'Missing required parameters', cause);
        }
    },
    InvalidState: class InvalidState extends AuthError {
        constructor(cause) {
            super('InvalidState', 400, 'Invalid state: clientId is missing', cause);
        }
    },
    CookieDecode: class CookieDecode extends AuthError {
        constructor(cause) {
            super('CookieDecode', 400, 'Could not decode state', cause);
        }
    },
    InvalidCookieFormat: class InvalidCookieFormat extends AuthError {
        constructor(cause) {
            super('InvalidCookieFormat', 400, 'Invalid cookie format received', cause);
        }
    },
    InvalidRequestMethod: class InvalidRequestMethod extends AuthError {
        constructor(cause) {
            super('InvalidRequestMethod', 400, 'Invalid request method. Expected POST.', cause);
        }
    },
    MissingFormState: class MissingFormState extends AuthError {
        constructor(cause) {
            super('MissingFormState', 400, "Missing or invalid 'state' in form data.", cause);
        }
    },
    ClientIdExtraction: class ClientIdExtraction extends AuthError {
        constructor(cause) {
            super('ClientIdExtraction', 400, 'Could not extract clientId from state object.', cause);
        }
    },
    CookieSignature: class CookieSignature extends AuthError {
        constructor(cause) {
            super('CookieSignature', 401, 'Cookie signature verification failed', cause);
        }
    },
    AuthRequest: class AuthRequest extends AuthError {
        constructor(cause) {
            super('AuthRequest', 500, 'Error processing authorization request', cause);
        }
    },
    AuthApproval: class AuthApproval extends AuthError {
        constructor(cause) {
            super('AuthApproval', 500, 'Error processing approval', cause);
        }
    },
    AuthCallback: class AuthCallback extends AuthError {
        constructor(cause) {
            super('AuthCallback', 500, 'Authorization failed during callback processing', cause);
        }
    },
    AuthUrl: class AuthUrl extends AuthError {
        constructor(cause) {
            super('AuthUrl', 500, 'Error creating authorization URL', cause);
        }
    },
    NoUserId: class NoUserId extends AuthError {
        constructor(cause) {
            super('NoUserId', 500, 'Failed to retrieve user information after Schwab auth', cause);
        }
    },
    TokenExchange: class TokenExchange extends AuthError {
        constructor(cause) {
            super('TokenExchange', 500, 'Failed to exchange Schwab authorization code for tokens', cause);
        }
    },
    ApiResponse: class ApiResponse extends AuthError {
        constructor(cause) {
            super('ApiResponse', 500, 'Schwab API request failed during authorization flow', cause);
        }
    },
    CookieSecretMissing: class CookieSecretMissing extends AuthError {
        constructor(cause) {
            super('CookieSecretMissing', 500, 'COOKIE_SECRET is not defined. A secret key is required for signing cookies.', cause);
        }
    },
};
export function formatAuthError(error, details) {
    let filtered = details;
    if (details) {
        const { stack, ...rest } = details;
        filtered = rest;
    }
    return {
        message: error.message,
        status: error.status,
        ...(filtered && { details: filtered }),
    };
}
export function createJsonErrorResponse(error, requestId, additionalDetails) {
    return {
        code: error.kind,
        message: error.message,
        ...(requestId && { requestId }),
        ...(additionalDetails && { details: additionalDetails }),
    };
}
//# sourceMappingURL=errors.js.map