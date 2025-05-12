import { z, ZodTypeDef, ZodType } from 'zod'
import { SchwabEndpoint, PathParams } from './http' // Assuming SchwabEndpoint and PathParams are exported from http.ts
import { SchwabAccountsResponseSchema } from '../../tools/accounts'
// Import necessary schemas from the main schema file for examples/future use
import { Order, OrderRequest, UserPreference } from '../../tools/schemas'

// Define the structure for query parameters specific to /accounts
const AccountsQueryParamsSchema = z
  .object({
    fields: z.enum(['positions']).optional(),
  })
  .strict() // Use strict to prevent unexpected query params

// --- Metadata Structures ---

// Metadata specific to a particular HTTP method for an endpoint
export interface MethodMetadata {
  pathSchema?: ZodType<PathParams>
  querySchema?: ZodType<any>
  bodySchema?: ZodType<any>
  responseSchema: ZodType<any, ZodTypeDef, any>
}

// Allowed HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// Maps HTTP Methods to their specific metadata for a given path
// Using Partial allows defining only the supported methods for an endpoint
type MethodMetadataMap = Partial<Record<HttpMethod, MethodMetadata>>

// --- API Metadata Map ---

// The main map uses the endpoint path template as the key
// The value maps supported HTTP methods to their specific metadata
export const schwabApiMetadata: Partial<Record<SchwabEndpoint, MethodMetadataMap>> = {
  // === Trader API ===
  // -- Accounts --
  '/trader/v1/accounts': {
    GET: {
      querySchema: AccountsQueryParamsSchema,
      responseSchema: SchwabAccountsResponseSchema,
    },
  },
  '/trader/v1/accounts/accountNumbers': {
    GET: {
      // No path, query, or body params based on docs
      responseSchema: z.any(), // Placeholder
    },
  },
  '/trader/v1/accounts/{accountNumber}': {
    GET: {
      pathSchema: z.object({ accountNumber: z.string() }).strict(),
      querySchema: AccountsQueryParamsSchema, // Assuming same query params as /accounts
      responseSchema: z.any(), // Placeholder for single account details
    },
  },
  // -- Orders --
  '/trader/v1/accounts/{accountNumber}/orders': {
    GET: {
      pathSchema: z.object({ accountNumber: z.string() }).strict(),
      // queryParams: maxResults, fromDate, toDate, status (needs specific schema)
      querySchema: z.any(), // Placeholder
      responseSchema: z.any(), // Placeholder for list of orders
    },
    POST: {
      pathSchema: z.object({ accountNumber: z.string() }).strict(),
      bodySchema: OrderRequest, // Use existing OrderRequest
      responseSchema: z.any(), // Placeholder (often a location header or order details)
    },
  },
  '/trader/v1/accounts/{accountNumber}/orders/{orderId}': {
    GET: {
      pathSchema: z.object({ accountNumber: z.string(), orderId: z.string() }).strict(),
      responseSchema: Order,
    },
    PUT: {
      pathSchema: z.object({ accountNumber: z.string(), orderId: z.string() }).strict(),
      bodySchema: OrderRequest,
      responseSchema: z.void(),
    },
    DELETE: {
      pathSchema: z.object({ accountNumber: z.string(), orderId: z.string() }).strict(),
      responseSchema: z.void(),
    },
  },
  '/trader/v1/orders': {
    GET: {
      // queryParams: maxResults, fromDate, toDate, status (needs specific schema)
      querySchema: z.any(), // Placeholder
      responseSchema: z.any(), // Placeholder for list of all orders
    },
  },
  '/trader/v1/accounts/{accountNumber}/previewOrder': {
    POST: {
      pathSchema: z.object({ accountNumber: z.string() }).strict(),
      bodySchema: OrderRequest, // Assuming preview uses same body as place order
      responseSchema: z.any(), // Placeholder for preview details
    },
  },
  // -- Transactions --
  '/trader/v1/accounts/{accountNumber}/transactions': {
    GET: {
      pathSchema: z.object({ accountNumber: z.string() }).strict(),
      // queryParams: startDate, endDate, types, symbol (needs specific schema)
      querySchema: z.any(), // Placeholder
      responseSchema: z.any(), // Placeholder for list of transactions
    },
  },
  '/trader/v1/accounts/{accountNumber}/transactions/{transactionId}': {
    GET: {
      pathSchema: z.object({ accountNumber: z.string(), transactionId: z.string() }).strict(),
      responseSchema: z.any(), // Placeholder for single transaction details
    },
  },
  // -- UserPreference --
  '/trader/v1/userPreference': {
    GET: {
      responseSchema: UserPreference,
    },
  },

  // === Market Data API ===
  '/marketdata/v1/quotes': {
    GET: {
      // queryParams: symbols, fields (needs specific schema)
      querySchema: z.any(), // Placeholder
      responseSchema: z.any(), // Placeholder
    },
  },
  '/marketdata/v1/{symbol_id}/quotes': {
    GET: {
      pathSchema: z.object({ symbol_id: z.string() }).strict(),
      responseSchema: z.any(), // Placeholder
    },
  },
  '/marketdata/v1/chains': {
    GET: {
      // queryParams: symbol, contractType, strikeCount, etc. (needs specific schema)
      querySchema: z.any(), // Placeholder
      responseSchema: z.any(), // Placeholder
    },
  },
  '/marketdata/v1/expirationchain': {
    GET: {
      // queryParams: symbol (needs specific schema)
      querySchema: z.any(), // Placeholder
      responseSchema: z.any(), // Placeholder
    },
  },
  '/marketdata/v1/pricehistory': {
    GET: {
      // queryParams: symbol, periodType, period, frequencyType, frequency, etc. (needs specific schema)
      querySchema: z.any(), // Placeholder
      responseSchema: z.any(), // Placeholder
    },
  },
  '/marketdata/v1/movers/{symbol_id}': {
    // symbol_id here is actually the index, e.g., $COMPX, $DJI
    GET: {
      pathSchema: z.object({ symbol_id: z.string() }).strict(),
      // queryParams: sort, frequency (needs specific schema)
      querySchema: z.any(), // Placeholder
      responseSchema: z.any(), // Placeholder
    },
  },
  '/marketdata/v1/markets': {
    GET: {
      // queryParams: markets (needs specific schema)
      querySchema: z.any(), // Placeholder
      responseSchema: z.any(), // Placeholder
    },
  },
  '/marketdata/v1/markets/{market_id}': {
    GET: {
      pathSchema: z.object({ market_id: z.string() }).strict(),
      responseSchema: z.any(), // Placeholder
    },
  },
  '/marketdata/v1/instruments': {
    GET: {
      // queryParams: symbol, projection (needs specific schema)
      querySchema: z.any(), // Placeholder
      responseSchema: z.any(), // Placeholder
    },
  },
  '/marketdata/v1/instruments/{cusip_id}': {
    GET: {
      pathSchema: z.object({ cusip_id: z.string() }).strict(),
      responseSchema: z.any(), // Placeholder
    },
  },
}
