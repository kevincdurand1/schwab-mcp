import { type Result } from '../types/result'
import { logger } from './logger'

/**
 * Configuration options for retry operations
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelayMs?: number
  /** Factor by which delay increases with each attempt (default: 1.5) */
  backoffFactor?: number
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs?: number
  /** Whether to add jitter to delay times to prevent thundering herd (default: true) */
  useJitter?: boolean
  /** Optional function to determine if an error is retryable */
  isRetryable?: (error: unknown) => boolean
  /** Optional tag for logging purposes */
  operationName?: string
}

/**
 * Default retry configurations
 */
export const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'isRetryable' | 'operationName'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffFactor: 1.5,
  maxDelayMs: 10000,
  useJitter: true,
}

/**
 * Common network errors that are typically safe to retry
 */
const RETRYABLE_ERROR_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'EPIPE',
  'ENETUNREACH',
  'ENETRESET',
  'EAI_AGAIN',
])

/**
 * HTTP status codes that are typically safe to retry
 */
const RETRYABLE_STATUS_CODES = new Set([
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
])

/**
 * Default function to determine if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  // If it's an Axios error with a response
  if (error && typeof error === 'object' && 'response' in error && error.response) {
    const response = error.response as { status?: number }
    return response.status ? RETRYABLE_STATUS_CODES.has(response.status) : false
  }

  // If it's a network error with a code
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return RETRYABLE_ERROR_CODES.has(error.code as string)
  }

  // If it's an Error object with name/message that suggests it's retryable
  if (error instanceof Error) {
    const errorText = `${error.name} ${error.message}`.toLowerCase()
    return (
      errorText.includes('timeout') ||
      errorText.includes('network') ||
      errorText.includes('connection') ||
      errorText.includes('rate limit') ||
      errorText.includes('too many requests') ||
      errorText.includes('service unavailable') ||
      errorText.includes('gateway') ||
      errorText.includes('temporary')
    )
  }

  return false
}

/**
 * Calculate delay time for the next retry with optional jitter
 */
function calculateDelay(attempt: number, options: Required<Omit<RetryOptions, 'isRetryable' | 'operationName'>>): number {
  const { initialDelayMs, backoffFactor, maxDelayMs, useJitter } = options
  
  // Calculate exponential backoff
  const delay = Math.min(
    initialDelayMs * Math.pow(backoffFactor, attempt),
    maxDelayMs
  )
  
  // Add jitter to prevent thundering herd problem if enabled
  if (useJitter) {
    // Add +/- 25% jitter
    const jitterFactor = 0.75 + Math.random() * 0.5
    return Math.floor(delay * jitterFactor)
  }
  
  return Math.floor(delay)
}

/**
 * Sleep function that returns a promise which resolves after the specified delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Executes an async operation with retries using exponential backoff
 * 
 * @param operation Function to execute and potentially retry
 * @param options Retry configuration options
 * @returns A promise that resolves with the operation result
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const { 
    maxRetries = DEFAULT_RETRY_OPTIONS.maxRetries,
    initialDelayMs = DEFAULT_RETRY_OPTIONS.initialDelayMs,
    backoffFactor = DEFAULT_RETRY_OPTIONS.backoffFactor,
    maxDelayMs = DEFAULT_RETRY_OPTIONS.maxDelayMs,
    useJitter = DEFAULT_RETRY_OPTIONS.useJitter,
    isRetryable = isRetryableError,
    operationName = 'operation'
  } = options || {}

  const retryOptions = {
    initialDelayMs,
    backoffFactor,
    maxDelayMs,
    useJitter
  }

  let lastError: unknown
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.debug(`Retry attempt ${attempt}/${maxRetries} for ${operationName}`)
      }
      
      return await operation()
    } catch (error) {
      lastError = error
      
      // If we've used all our retries or the error isn't retryable, rethrow
      if (attempt >= maxRetries || !isRetryable(error)) {
        logger.debug(
          `Not retrying ${operationName}: ${attempt >= maxRetries ? 'max retries reached' : 'non-retryable error'}`,
          { error }
        )
        throw error
      }
      
      // Calculate delay for next retry
      const delay = calculateDelay(attempt, {
        maxRetries,
        ...retryOptions
      })
      
      logger.debug(`Retrying ${operationName} in ${delay}ms after error`, { 
        attempt: attempt + 1, 
        maxRetries, 
        delay,
        error: error instanceof Error ? error.message : String(error)
      })
      
      // Wait before the next retry
      await sleep(delay)
    }
  }
  
  // This should never be reached due to the throw in the catch block,
  // but TypeScript needs it for completeness
  throw lastError
}

/**
 * Wrapper for withRetry that returns a Result type
 * 
 * @param operation Function to execute and potentially retry
 * @param options Retry configuration options
 * @returns A Result object with either successful data or error
 */
export async function withRetryResult<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<Result<T>> {
  try {
    const result = await withRetry(operation, options)
    return { success: true, data: result }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error))
    }
  }
}

/**
 * Executes multiple operations in parallel with retry capability
 * 
 * @param operations Array of operations to execute with optional individual retry settings
 * @param defaultOptions Default retry options to apply to operations without specific options
 * @returns Array of results in the same order as the input operations
 */
export async function withParallelRetry<T>(
  operations: Array<{
    operation: () => Promise<T>
    options?: RetryOptions
  }>,
  defaultOptions?: RetryOptions
): Promise<T[]> {
  return Promise.all(
    operations.map(({ operation, options }) => 
      withRetry(operation, options || defaultOptions)
    )
  )
}

/**
 * Wrapper for withParallelRetry that returns Result types
 * 
 * @param operations Array of operations to execute with optional individual retry settings
 * @param defaultOptions Default retry options to apply to operations without specific options
 * @returns Array of Result objects in the same order as the input operations
 */
export async function withParallelRetryResult<T>(
  operations: Array<{
    operation: () => Promise<T>
    options?: RetryOptions
  }>,
  defaultOptions?: RetryOptions
): Promise<Array<Result<T>>> {
  return Promise.all(
    operations.map(({ operation, options }) => 
      withRetryResult(operation, options || defaultOptions)
    )
  )
}