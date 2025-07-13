/**
 * Types for our custom Schwab API client
 */
// Error Types
export class SchwabApiError extends Error {
    status;
    code;
    details;
    constructor(message, status, code, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        this.name = 'SchwabApiError';
    }
}
export class SchwabAuthError extends SchwabApiError {
    constructor(message, details) {
        super(message, 401, 'AUTH_ERROR', details);
        this.name = 'SchwabAuthError';
    }
}
//# sourceMappingURL=types.js.map