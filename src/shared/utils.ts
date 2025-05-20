// Re-export from toolBuilder to maintain backwards compatibility
export { mergeShapes, createTool, toolError, toolSuccess } from './toolBuilder'

// Export retry utilities
export {
  withRetry,
  withRetryResult,
  withParallelRetry,
  withParallelRetryResult,
  isRetryableError,
  type RetryOptions,
  DEFAULT_RETRY_OPTIONS,
} from './retry'
