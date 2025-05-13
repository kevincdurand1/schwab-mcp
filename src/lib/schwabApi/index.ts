// Export the explicit API methods
export * from './endpoints'

// Export the proxy-based API client
export { Schwab } from './proxy'

// Export configuration utilities
export { configureSchwabApi, DEFAULT_API_CONFIG, SANDBOX_API_CONFIG, type SchwabApiConfig } from './http'

// Export type utilities
export {
  type EndpointMetadata,
  type HttpMethod,
  type InferPathParams,
  type InferQueryParams,
  type InferBody,
  type InferResponse,
} from './http'

// Export error class and type guard
export { SchwabApiError, isSchwabApiError } from '../errors'

// === curated domain re-exports ===
export { OrderStatus, OrderSide, OrderType, OrderDuration, type Order, type OrderRequest, type UserPreference } from '../../tools/schemas'
export { asAccountNumber, asOrderId, asTransactionId, type AccountNumber, type OrderId, type TransactionId } from '../../tools/types'
