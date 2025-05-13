export class SchwabApiError extends Error {
  status: number
  body?: unknown

  constructor(status: number, body?: unknown, message?: string) {
    super(message || `Schwab API Error: ${status}`)
    this.status = status
    this.body = body
    Object.setPrototypeOf(this, SchwabApiError.prototype)
  }
}

/**
 * Type guard to check if an error is an instance of SchwabApiError.
 * @param e The error object to check.
 * @returns True if the error is a SchwabApiError, false otherwise.
 */
export const isSchwabApiError = (e: unknown): e is SchwabApiError => e instanceof SchwabApiError
