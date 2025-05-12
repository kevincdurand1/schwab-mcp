import { SchwabApiError } from '../errors'
import { schwabApiMetadata, HttpMethod, MethodMetadata } from './metadata'

// Shared primitives -------------------------------------------------

// Schwab API base URL
const SCHWAB_API_BASE_URL = 'https://api.schwabapi.com'

// --- Endpoint Definitions ---

// Trader API v1 Endpoints
export type TraderEndpoint =
  | '/trader/v1/accounts/accountNumbers'
  | '/trader/v1/accounts'
  | '/trader/v1/accounts/{accountNumber}'
  | '/trader/v1/accounts/{accountNumber}/orders'
  | '/trader/v1/accounts/{accountNumber}/orders/{orderId}'
  | '/trader/v1/orders' // Corresponds to /orders in the screenshot context
  | '/trader/v1/accounts/{accountNumber}/previewOrder'
  | '/trader/v1/accounts/{accountNumber}/transactions'
  | '/trader/v1/accounts/{accountNumber}/transactions/{transactionId}'
  | '/trader/v1/userPreference' // Corresponds to /userPreference

// Market Data API v1 Endpoints
export type MarketDataEndpoint =
  | '/marketdata/v1/quotes'
  | '/marketdata/v1/{symbol_id}/quotes'
  | '/marketdata/v1/chains'
  | '/marketdata/v1/expirationchain'
  | '/marketdata/v1/pricehistory'
  | '/marketdata/v1/movers/{symbol_id}'
  | '/marketdata/v1/markets'
  | '/marketdata/v1/markets/{market_id}'
  | '/marketdata/v1/instruments'
  | '/marketdata/v1/instruments/{cusip_id}'

// Combined Endpoint Type
export type SchwabEndpoint = TraderEndpoint | MarketDataEndpoint

// Type for path parameters (keys are param names like 'accountNumber', values are string/number)
export type PathParams = Record<string, string | number>

// --- SchwabFetch Options (Updated) ---
interface SchwabFetchRequestOptions {
  method: HttpMethod
  pathParams?: PathParams
  queryParams?: Record<string, any> // Data for query parameters
  body?: any // Data for request body
  // 'init' can still be used for overriding fetch-specific things like cache, signal etc.
  // but method should primarily come from metadata.
  init?: Omit<RequestInit, 'body' | 'method'>
}

/**
 * Metadata-driven fetch wrapper for Schwab API calls.
 * Handles URL construction, auth, input validation, response parsing, and error handling.
 * Throws SchwabApiError on any failure.
 * @param endpointTemplate The API endpoint template string.
 * @param accessToken The Schwab API access token.
 * @param requestOptions Options including method, path/query params, body, and minimal init overrides.
 * @returns A Promise resolving to the parsed data on success.
 */
export async function schwabFetch<TResponse>(
  endpointTemplate: SchwabEndpoint,
  accessToken: string,
  requestOptions: SchwabFetchRequestOptions,
): Promise<TResponse> {
  // 1. Get Method-Specific Metadata
  const endpointMetadataMap = schwabApiMetadata[endpointTemplate]
  if (!endpointMetadataMap) {
    throw new SchwabApiError(0, undefined, `[schwabFetch] No metadata defined for endpoint template: ${endpointTemplate}`)
  }

  const method = requestOptions.method
  const methodMetadata = endpointMetadataMap[method]
  if (!methodMetadata) {
    throw new SchwabApiError(405, undefined, `[schwabFetch] Method ${method} not defined/allowed for endpoint: ${endpointTemplate}`) // 405 Method Not Allowed
  }

  const { pathParams, queryParams, body, init = {} } = requestOptions

  // 2. Validate Path Parameters
  if (methodMetadata.pathSchema && pathParams) {
    const parsedPathParams = methodMetadata.pathSchema.safeParse(pathParams)
    if (!parsedPathParams.success) {
      throw new SchwabApiError(
        400,
        parsedPathParams.error.format(),
        `[schwabFetch] Invalid path parameters for ${method} ${endpointTemplate}`,
      )
    }
    // Note: pathParams are used directly in substitution, no need to use parsedPathParams.data unless transformation is needed
  } else if (methodMetadata.pathSchema && !pathParams && String(endpointTemplate).includes('{')) {
    // Check if path params are required but not provided
    throw new SchwabApiError(400, undefined, `[schwabFetch] Path parameters required but not provided for ${method} ${endpointTemplate}`)
  }

  // 3. Substitute Path Parameters
  let finalEndpointPath = String(endpointTemplate)
  if (pathParams) {
    Object.entries(pathParams).forEach(([key, value]) => {
      const placeholder = `{${key}}`
      if (finalEndpointPath.includes(placeholder)) {
        finalEndpointPath = finalEndpointPath.replace(placeholder, String(value))
      } else {
        console.warn(`[schwabFetch] Path parameter '${key}' provided but not found in template '${endpointTemplate}'`)
      }
    })
  }
  if (finalEndpointPath.includes('{') && finalEndpointPath.includes('}')) {
    throw new SchwabApiError(400, undefined, `[schwabFetch] Unsubstituted placeholders remain in path: ${finalEndpointPath}`)
  }

  // 4. Validate Query Parameters
  let validatedQueryParams = queryParams
  if (methodMetadata.querySchema) {
    const parsedQueryParams = methodMetadata.querySchema.safeParse(queryParams ?? {}) // Parse empty object if none provided
    if (!parsedQueryParams.success) {
      throw new SchwabApiError(
        400,
        parsedQueryParams.error.format(),
        `[schwabFetch] Invalid query parameters for ${method} ${endpointTemplate}`,
      )
    }
    validatedQueryParams = parsedQueryParams.data
  }

  // 5. Construct URL
  const url = new URL(SCHWAB_API_BASE_URL + finalEndpointPath)
  if (validatedQueryParams) {
    Object.entries(validatedQueryParams).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  // 6. Validate Body
  let validatedBody = body
  if (methodMetadata.bodySchema) {
    const parsedBody = methodMetadata.bodySchema.safeParse(body ?? undefined) // Validate body or undefined if none provided
    if (!parsedBody.success) {
      throw new SchwabApiError(400, parsedBody.error.format(), `[schwabFetch] Invalid request body for ${method} ${endpointTemplate}`)
    }
    validatedBody = parsedBody.data
  } else if (body) {
    // If a body is provided but no bodySchema is defined for the method
    console.warn(`[schwabFetch] Request body provided for ${method} ${endpointTemplate}, but no bodySchema is defined in metadata.`)
  }

  // 7. Prepare RequestInit
  const requestInit: RequestInit = {
    ...init,
    method: method, // Use the validated method from requestOptions
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      // Content-Type added below if body exists
    },
  }
  if (validatedBody !== undefined && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestInit.body = JSON.stringify(validatedBody)
    ;(requestInit.headers as Record<string, string>)['Content-Type'] = 'application/json'
  }

  // 8. Perform Fetch
  let response: Response
  try {
    console.log(`[schwabFetch] Fetching ${url.toString()}, method: ${method}`)
    response = await fetch(url.toString(), requestInit)
    console.log(
      `[schwabFetch] Response status: ${response.status}, headers:`,
      Object.fromEntries(
        [...response.headers.entries()].filter(([k]) => ['content-type', 'x-rate-limit-remaining', 'x-rate-limit-reset'].includes(k)),
      ),
    )
  } catch (networkError: any) {
    console.error(`[schwabFetch] Network error fetching ${url.toString()}:`, networkError)
    throw new SchwabApiError(0, undefined, `Network error: ${networkError.message}`)
  }

  // 9. Handle HTTP Errors
  if (!response.ok) {
    let errorBodyText
    let errorBody
    try {
      errorBodyText = await response.text()
      console.error(`[schwabFetch] Error response body: ${errorBodyText}`)

      // Try to parse as JSON if possible
      try {
        errorBody = JSON.parse(errorBodyText)
      } catch (e) {
        // Not JSON, use as text
        errorBody = { message: errorBodyText }
      }
    } catch (readError) {
      errorBodyText = 'Failed to read error body'
      console.error(`[schwabFetch] Error reading error response body:`, readError)
    }

    // Check for specific error cases
    if (response.status === 401) {
      console.error(`[schwabFetch] Authentication error (401): Token may be invalid or expired`)
      throw new SchwabApiError(
        response.status,
        errorBody,
        `Authentication failed: Token may be invalid or expired. ${errorBody?.message || ''}`,
      )
    }

    if (response.status === 429) {
      console.error(`[schwabFetch] Rate limit exceeded (429)`)
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

  // 10. Process response
  try {
    // First check if the response is empty
    const contentLength = response.headers.get('content-length')

    // Determine if response should be a collection based on the path
    const isCollectionResponse =
      finalEndpointPath.includes('accounts') || finalEndpointPath.includes('orders') || finalEndpointPath.includes('watchlists')

    // If explicitly empty (content-length is 0), return empty array for collections or null for singleton
    if (contentLength === '0') {
      console.log(`[schwabFetch] Empty response (content-length: 0)`)
      // Type assertion to TResponse is necessary here
      return (isCollectionResponse ? [] : null) as TResponse
    }

    // Otherwise try to parse as JSON
    const jsonData = await response.json()
    console.log(`[schwabFetch] Successfully parsed JSON response`)

    // Parse response based on schema
    const parsedResponse = methodMetadata.responseSchema.safeParse(jsonData)
    if (!parsedResponse.success) {
      console.error(`[schwabFetch] Invalid response schema:`, parsedResponse.error.format())
      throw new SchwabApiError(
        response.status,
        { validationError: parsedResponse.error.format() },
        `Invalid response format from Schwab API`,
      )
    }

    return parsedResponse.data as TResponse
  } catch (jsonError: any) {
    console.error(`[schwabFetch] Error parsing JSON response:`, jsonError)
    throw new SchwabApiError(response.status, undefined, `Failed to parse API response: ${jsonError.message}`)
  }
}
