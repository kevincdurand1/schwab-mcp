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
