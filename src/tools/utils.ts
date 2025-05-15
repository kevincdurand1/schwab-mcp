import { invariant } from '@epic-web/invariant'
// Removed problematic import, defining McpContent locally as a placeholder
import { type z } from 'zod'
import { logger } from '../shared/logger'

/**
 * Placeholder type for MCP content until the correct type can be imported from the SDK.
 */
export type McpContent = Record<string, any>;

/**
 * Higher-order function to wrap tool handlers with a token retrieval mechanism
 * 
 * @param getAccessToken Function to retrieve a valid access token
 * @param fn The actual tool handler function that needs the token
 * @returns A wrapped function that automatically provides the token to the handler
 */
export function withToken<A, R extends McpContent>(
  getAccessToken: () => Promise<string>,
  fn: (token: string, args: A) => Promise<R>
) {
  return async (args: A): Promise<R> => {
    const token = await getAccessToken()
    invariant(token, 'No access token available')
    return fn(token, args)
  }
}

/**
 * Converts any error to a SchwabApiError with appropriate status code and message
 * 
 * @param error The error to convert
 * @returns A SchwabApiError instance
 */
export function toSchwabApiError(error: unknown): SchwabApiError {
  if (error instanceof SchwabApiError) {
    return error
  }
  
  const status = error instanceof Error && 'status' in error ? 
    (error as any).status || 500 : 
    500
  
  const message = error instanceof Error ? 
    error.message : 
    String(error)
  
  return new SchwabApiError(status, message)
}

/**
 * Higher-order function to create Schwab API tool handlers with consistent error handling
 * 
 * This utility function handles common patterns in Schwab API tool implementations:
 * 1. Gets a fresh access token
 * 2. Invokes the API function with the token and validated input
 * 3. Handles errors consistently with appropriate logging
 * 
 * @param getAccessTokenProvided The function to retrieve a valid access token
 * @param schema The Zod schema used to validate input
 * @param invoke The function that interacts with the Schwab API
 * @returns A tool handler function
 */
export function schwabTool<
  S extends z.ZodSchema<any, any>,
  F extends (...args: any[]) => Promise<any>,
>(
  getAccessTokenProvided: () => Promise<string>,
  schema: S, 
  invoke: (token: string, input: z.infer<S>) => ReturnType<F>
) {
  // Return a function compatible with the McpServer.tool() expected callback
  return (args: z.infer<S>) => {
    // Log the API call (without sensitive info)
    logger.info(`Invoking Schwab API with schema: ${schema.constructor.name}`)
    
    // Get the access token, then invoke function with proper error handling
    return getAccessTokenProvided()
      .then((token: string) => {
        invariant(token, 'No access token available')
        return invoke(token, args)
      })
      .catch((err: unknown) => {
        // Convert to a consistent error format and rethrow
        logger.error('Error calling Schwab API', err)
        throw toSchwabApiError(err)
      })
  }
}

/**
 * Merges multiple Zod shape objects into a single shape object
 * This helps avoid spreading objects directly which can cause issues if zod updates
 * 
 * @param shapes An array of Zod shape objects to merge
 * @returns A single merged shape object
 */
export function mergeShapes<T extends z.ZodRawShape[]>(...shapes: T): z.ZodRawShape {
  return shapes.reduce((acc, shape) => ({ ...acc, ...shape }), {})
}

/**
 * Custom error class for Schwab API errors
 * Contains status code and error message
 */
export class SchwabApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'SchwabApiError'
  }
}

/**
 * Custom error class for MCP tool errors
 * Contains an error code and message
 */
export class ToolError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ToolError'
  }
}