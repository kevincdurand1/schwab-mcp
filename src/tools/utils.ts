import { invariant } from '@epic-web/invariant'
// Removed problematic import, defining McpContent locally as a placeholder
import { type z } from 'zod'

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