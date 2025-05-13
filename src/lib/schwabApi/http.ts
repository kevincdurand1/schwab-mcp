import { ZodType } from 'zod'
import { SchwabApiError } from '../errors'
import { z } from 'zod'

// Re-export core schemas and types (Removed as per instruction 1)
// export { OrderStatus, OrderSide, OrderType, OrderDuration, type Order, type OrderRequest, type UserPreference } from '../../tools/schemas'
// export { asAccountNumber, asOrderId, asTransactionId, type AccountNumber, type OrderId, type TransactionId } from '../../tools/types'

// Shared primitives -------------------------------------------------

// API configuration options
interface SchwabApiConfig {
  baseUrl: string
  environment: 'production' | 'sandbox'
  enableLogging?: boolean
}

// Default API configuration
const DEFAULT_API_CONFIG: SchwabApiConfig = {
  baseUrl: 'https://api.schwabapi.com',
  environment: 'production',
  enableLogging: true,
}

// Sandbox API configuration
export const SANDBOX_API_CONFIG: SchwabApiConfig = {
  baseUrl: 'https://api-sandbox.schwabapi.com', // Adjust to actual sandbox URL
  environment: 'sandbox',
  enableLogging: true,
}

// Active configuration, can be changed at runtime
let apiConfig: SchwabApiConfig = DEFAULT_API_CONFIG

/**
 * Set the API configuration to use for all Schwab API calls
 * @param config The API configuration to use
 */
export function configureSchwabApi(config: Partial<SchwabApiConfig>): void {
  apiConfig = {
    ...DEFAULT_API_CONFIG, // Base defaults
    ...apiConfig, // Current overrides
    ...config, // New overrides
  }
}

// --- Core Types ---
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'

// Define generic types for params/body/response based on schemas
export type InferPathParams<S> = S extends ZodType<infer P> ? P : undefined
export type InferQueryParams<S> = S extends ZodType<infer Q> ? Q : undefined
export type InferBody<S> = S extends ZodType<infer B> ? B : undefined
export type InferResponse<S> = S extends ZodType<infer R> ? R : undefined

// New: Metadata structure for each endpoint
export interface EndpointMetadata<
  PathSchema extends ZodType | undefined = undefined,
  QuerySchema extends ZodType | undefined = undefined,
  BodySchema extends ZodType | undefined = undefined,
  ResponseSchema extends ZodType = ZodType, // Response schema is required
  M extends HttpMethod = HttpMethod,
> {
  path: string // The URL path template (e.g., /trader/v1/accounts/{accountNumber})
  method: M
  pathSchema?: PathSchema
  querySchema?: QuerySchema
  bodySchema?: BodySchema
  responseSchema: ResponseSchema
  // Optional: Add description, tags, etc. later if needed
}

// --- Endpoint Definitions ---

// --- SchwabFetch Options (Updated) ---
// Adjusted: Generic parameters P, Q, B now represent the actual data types, not necessarily schemas
interface SchwabFetchRequestOptions<P = unknown, Q = unknown, B = unknown> {
  pathParams?: P
  queryParams?: Q
  body?: B
  // 'init' can still be used for overriding fetch-specific things like cache, signal etc.
  init?: Omit<RequestInit, 'body' | 'method'>
}

// --- Endpoint Factory (Updated) ---

/**
 * Creates a type-safe function to call a Schwab API endpoint.
 * @param meta The metadata object describing the endpoint (path, method, schemas).
 * @returns An async function that takes an access token and options, returning the parsed response.
 */
export function createEndpoint<
  // Infer types P, Q, B, R from the schemas provided in meta
  P,
  Q,
  B,
  R,
  M extends HttpMethod,
  // Constrain Meta to ensure it provides schemas that can be inferred
  // Relaxed ZodType<X> to ZodType<X, any, any> to allow different input/output types
  Meta extends EndpointMetadata<
    ZodType<P, any, any> | undefined,
    ZodType<Q, any, any> | undefined,
    ZodType<B, any, any> | undefined,
    ZodType<R, any, any>,
    M
  >,
>(
  meta: Meta, // Accept the metadata object
) {
  // Removed InferPathParams, InferQueryParams, InferBody, InferResponse types inside
  // Directly use the inferred generics P, Q, B, R instead

  // Return the callable endpoint function
  return (
    accessToken: string,
    // Options are optional, types derived directly from inferred generics P, Q, B
    options: SchwabFetchRequestOptions<P, Q, B> = {},
  ): Promise<R> => {
    // Return type uses inferred generic R directly
    // Pass the metadata object and options to schwabFetch
    // Method is part of meta, so not needed in the options passed here
    // Pass inferred generics P, Q, B, R, M directly to schwabFetch
    return schwabFetch<P, Q, B, R, M>(
      accessToken,
      meta, // Pass the full metadata object
      options, // Pass the request options
    )
  }
}

// Extract URL construction to a separate function
function buildUrl(endpointTemplate: string, pathParams?: Record<string, string | number>, queryParams?: Record<string, any>): URL {
  // 1. Substitute Path Parameters
  let finalEndpointPath = endpointTemplate
  if (pathParams) {
    Object.entries(pathParams).forEach(([key, value]) => {
      const placeholder = `{${key}}`
      if (finalEndpointPath.includes(placeholder)) {
        finalEndpointPath = finalEndpointPath.replace(placeholder, String(value))
      } else {
        if (apiConfig.enableLogging) {
          console.warn(`[buildUrl] Path parameter \'${key}\' provided but not found in template \'${endpointTemplate}\'`)
        }
      }
    })
  }
  if (finalEndpointPath.includes('{') && finalEndpointPath.includes('}')) {
    throw new SchwabApiError(400, undefined, `[buildUrl] Unsubstituted placeholders remain in path: ${finalEndpointPath}`)
  }

  // 2. Construct URL with query parameters
  const url = new URL(apiConfig.baseUrl + finalEndpointPath)
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  return url
}

/**
 * Metadata-driven fetch wrapper for Schwab API calls.
 * Handles URL construction, auth, input validation, response parsing, and error handling.
 * Throws SchwabApiError on any failure.
 * @param accessToken The Schwab API access token.
 * @param meta The metadata object describing the endpoint (path, method, schemas).
 * @param requestOptions Options including path/query params, body, and minimal init overrides.
 * @returns A Promise resolving to the parsed data with type inferred from the schema.
 */
async function schwabFetch<P, Q, B, R, M extends HttpMethod>(
  accessToken: string,
  // Accept the full metadata object
  meta: EndpointMetadata<ZodType<P> | undefined, ZodType<Q> | undefined, ZodType<B> | undefined, ZodType<R>, M>,
  // Options object contains params and body matching the inferred types P, Q, B
  requestOptions: SchwabFetchRequestOptions<P, Q, B>,
): Promise<R> {
  // Return type R is inferred from meta.responseSchema
  // 1. Extract info from metadata and options
  const { pathParams, queryParams, body, init = {} } = requestOptions
  const { path: endpointTemplate, method, pathSchema, querySchema, bodySchema, responseSchema } = meta // Use meta

  // 2. Validate Path Parameters (using meta.pathSchema)
  if (pathSchema && pathParams) {
    // Check meta.pathSchema
    const parsedPathParams = pathSchema.safeParse(pathParams)
    if (!parsedPathParams.success) {
      throw new SchwabApiError(
        400,
        parsedPathParams.error.format(),
        `[schwabFetch] Invalid path parameters for ${method} ${endpointTemplate}`, // Use meta.method and meta.path
      )
    }
    // Path params used directly in buildUrl substitution
  } else if (pathSchema && !pathParams && endpointTemplate.includes('{')) {
    // Check meta.path for placeholders
    // Check if path params defined in schema are required (by checking path template) but not provided
    throw new SchwabApiError(400, undefined, `[schwabFetch] Path parameters required but not provided for ${method} ${endpointTemplate}`)
  }

  // 3. Validate Query Parameters (using meta.querySchema)
  let validatedQueryParams = queryParams
  if (querySchema) {
    // Check meta.querySchema
    const parsedQueryParams = querySchema.safeParse(queryParams ?? {}) // Parse empty object if none provided
    if (!parsedQueryParams.success) {
      throw new SchwabApiError(
        400,
        parsedQueryParams.error.format(),
        `[schwabFetch] Invalid query parameters for ${method} ${endpointTemplate}`, // Use meta.method and meta.path
      )
    }
    validatedQueryParams = parsedQueryParams.data as Q | undefined // Assign validated data
  }

  // 4. Construct URL using the helper (using meta.path)
  const url = buildUrl(endpointTemplate, pathParams as Record<string, string | number>, validatedQueryParams as Record<string, any>)

  // 5. Validate Body (using meta.bodySchema)
  let validatedBody = body
  if (bodySchema) {
    // Check meta.bodySchema
    const parsedBody = bodySchema.safeParse(body ?? undefined) // Validate body or undefined if none provided
    if (!parsedBody.success) {
      throw new SchwabApiError(400, parsedBody.error.format(), `[schwabFetch] Invalid request body for ${method} ${endpointTemplate}`) // Use meta.method and meta.path
    }
    validatedBody = parsedBody.data as B | undefined // Assign validated data
  } else if (body) {
    if (apiConfig.enableLogging) {
      console.warn(`[schwabFetch] Request body provided for ${method} ${endpointTemplate}, but no bodySchema is defined in metadata.`) // Use meta.method and meta.path
    }
  }

  // 6. Prepare RequestInit (using meta.method)
  const requestInit: RequestInit = {
    ...init,
    method: method, // Use method from meta
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      // Content-Type added below if body exists
    },
  }
  // Check method from meta for body serialization
  if (validatedBody !== undefined && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestInit.body = JSON.stringify(validatedBody)
    ;(requestInit.headers as Record<string, string>)['Content-Type'] = 'application/json'
  }

  // 7. Perform Fetch
  let response: Response
  try {
    if (apiConfig.enableLogging) {
      console.log(`[schwabFetch] Fetching ${url.toString()}, method: ${method}`) // Use meta.method
    }
    response = await fetch(url.toString(), requestInit)
    if (apiConfig.enableLogging) {
      console.log(
        `[schwabFetch] Response status: ${response.status}, headers:`,
        Object.fromEntries(
          [...response.headers.entries()].filter(([k]) => ['content-type', 'x-rate-limit-remaining', 'x-rate-limit-reset'].includes(k)),
        ),
      )
    }
  } catch (networkError: any) {
    if (apiConfig.enableLogging) {
      console.error(`[schwabFetch] Network error fetching ${url.toString()}:`, networkError)
    }
    throw new SchwabApiError(0, undefined, `Network error: ${networkError.message}`)
  }

  // 8. Handle HTTP Errors
  if (!response.ok) {
    let errorBodyText
    let errorBody
    try {
      errorBodyText = await response.text()
      if (apiConfig.enableLogging) {
        console.error(`[schwabFetch] Error response body: ${errorBodyText}`)
      }

      // Try to parse as JSON if possible
      try {
        errorBody = JSON.parse(errorBodyText)
      } catch (e) {
        // Not JSON, use as text
        errorBody = { message: errorBodyText }
      }
    } catch (readError) {
      errorBodyText = 'Failed to read error body'
      if (apiConfig.enableLogging) {
        console.error(`[schwabFetch] Error reading error response body:`, readError)
      }
    }

    // Check for specific error cases
    if (response.status === 401) {
      if (apiConfig.enableLogging) {
        console.error(`[schwabFetch] Authentication error (401): Token may be invalid or expired`)
      }
      throw new SchwabApiError(
        response.status,
        errorBody,
        `Authentication failed: Token may be invalid or expired. ${errorBody?.message || ''}`,
      )
    }

    if (response.status === 429) {
      if (apiConfig.enableLogging) {
        console.error(`[schwabFetch] Rate limit exceeded (429)`)
      }
      // Try to get rate limit reset time
      const resetTime = response.headers.get('x-rate-limit-reset')
      const waitTime = resetTime ? new Date(resetTime).getTime() - Date.now() : 60000

      throw new SchwabApiError(
        response.status,
        errorBody,
        `Rate limit exceeded. Please try again in ${Math.ceil(waitTime / 1000)} seconds.`,
      )
    }

    // General error case
    throw new SchwabApiError(response.status, errorBody, errorBody?.message || `API request failed with status: ${response.status}`)
  }

  // 9. Process response (using meta.responseSchema)
  try {
    // First check if the response is empty
    const contentLength = response.headers.get('content-length')

    // Determine if response should be a collection based on the path
    const isCollectionResponse = url.pathname.includes('accounts') || url.pathname.includes('orders') || url.pathname.includes('watchlists')

    // If explicitly empty (content-length is 0), return empty array for collections or null for singleton
    if (contentLength === '0') {
      if (apiConfig.enableLogging) {
        console.log(`[schwabFetch] Empty response (content-length: 0)`)
      }
      return (isCollectionResponse ? [] : null) as R
    }

    // Otherwise try to parse as JSON
    const jsonData = await response.json()
    if (apiConfig.enableLogging) {
      console.log(`[schwabFetch] Successfully parsed JSON response`)
    }

    // Parse response based on meta.responseSchema
    const parsedResponse = responseSchema.safeParse(jsonData) // Use meta.responseSchema
    if (!parsedResponse.success) {
      if (apiConfig.enableLogging) {
        console.error(`[schwabFetch] Invalid response schema:`, parsedResponse.error.format())
      }
      throw new SchwabApiError(
        response.status,
        { validationError: parsedResponse.error.format() },
        `Invalid response format from Schwab API`,
      )
    }

    // Return typed data (type R inferred from meta.responseSchema)
    return parsedResponse.data as R
  } catch (jsonError: any) {
    if (apiConfig.enableLogging) {
      console.error(`[schwabFetch] Error parsing JSON response:`, jsonError)
    }
    throw new SchwabApiError(response.status, undefined, `Failed to parse API response: ${jsonError.message}`)
  }
}

// Replace wildcard export
// export * from '../../tools'

// With selective exports
// export { OrderStatus, OrderSide, OrderType, OrderDuration, type Order, type OrderRequest, type UserPreference } from '../../tools/schemas'
// export { asAccountNumber, asOrderId, asTransactionId, type AccountNumber, type OrderId, type TransactionId } from '../../tools/types'
