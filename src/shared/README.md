# Shared Utilities

This directory contains shared utilities used throughout the Schwab MCP
implementation.

## Tool Building

The `toolBuilder.ts` module provides a unified approach to building and
registering tools with the MCP server. This ensures consistent token validation,
input validation, error handling, and response formatting across all tools.

### Key Components

- `createTool`: The main factory function for creating and registering tools
  with the MCP server
- `toolSuccess` & `toolError`: Helper functions for creating standardized
  response objects
- `mergeShapes`: Utility to merge multiple Zod schema shapes into a single shape

### Using the Tool Factory

```typescript
import { createTool, toolSuccess, toolError } from '../shared/toolBuilder'

export function registerMyTools(client: SchwabApiClient, server: McpServer) {
	createTool(client, server, {
		name: 'myTool',
		schema: mySchema, // Zod schema for validating input
		handler: async (input, client) => {
			try {
				// Your tool implementation logic here
				const result = await client.someApi.someMethod(input)

				return toolSuccess({
					data: result,
					message: 'Successfully fetched data',
					source: 'myTool',
				})
			} catch (error) {
				return toolError(error, { source: 'myTool' })
			}
		},
	})
}
```

### Token Management

Token validation is handled automatically by the tool factory. If a token is
invalid, the tool will attempt to refresh it before proceeding. If token refresh
fails, the tool will continue execution in a "best-effort" mode, allowing
operations that don't require authentication to still work.

To initialize the token manager:

```typescript
import { initializeTokenManager } from '../auth'

// Initialize at application startup
// Token management is centralized in the TokenStateMachine instance within MyMCP
initializeTokenManager(tokenManagerInstance)
```

### Response Formatting

The tool factory automatically formats responses into the standard MCP content
array format, supporting both success and error cases. The format is:

```typescript
// Success
{
  content: [
    { type: 'text', text: 'Success message' },
    { type: 'text', text: JSON.stringify(data, null, 2) }
  ]
}

// Error
{
  content: [
    { type: 'text', text: 'Error message' }
  ],
  isError: true
}
```

### Error Handling

Errors are logged and formatted consistently across all tools. The tool factory
catches exceptions at multiple levels:

1. Token validation errors (non-fatal)
2. Input validation errors
3. Handler execution errors
4. Unexpected errors

Each error type is properly logged and formatted for the MCP server.

## Retry Utilities

The `retry.ts` module provides robust retry functionality with exponential backoff and configurable options. These utilities help handle transient network issues and API rate limiting gracefully.

### Key Components

- `withRetry`: Core function for executing operations with retries
- `withRetryResult`: Returns a standardized Result type containing success/error
- `withParallelRetry`: Executes multiple operations in parallel with retry capability
- `withParallelRetryResult`: Parallel execution with Result type returns
- `isRetryableError`: Default function to determine if an error should be retried

### Using Retry Utilities

```typescript
import { withRetry, withRetryResult, DEFAULT_RETRY_OPTIONS } from '../shared/utils'

// Basic usage with default options
async function fetchData() {
  return withRetry(async () => {
    // API call that might fail transiently
    return await api.getData()
  })
}

// With custom retry options
async function sendRequest() {
  return withRetry(
    async () => await api.sendRequest(data),
    {
      maxRetries: 5,
      initialDelayMs: 500,
      backoffFactor: 2,
      operationName: 'sendRequest',
      isRetryable: (error) => {
        // Custom logic to determine if this error should be retried
        return error.code === 'RATE_LIMITED' || error.status === 429
      }
    }
  )
}

// Using Result type for cleaner error handling
async function getUserProfile(userId: string) {
  const result = await withRetryResult(
    async () => await api.getUserProfile(userId),
    { operationName: 'getUserProfile' }
  )
  
  if (result.success) {
    return result.data
  } else {
    logger.error('Failed to get user profile', { error: result.error })
    return null
  }
}

// Parallel operations with retry
async function fetchAllData() {
  const operations = [
    { 
      operation: () => api.getAccounts(),
      options: { maxRetries: 2 }
    },
    { 
      operation: () => api.getTransactions(),
      options: { initialDelayMs: 200 }
    },
    { 
      operation: () => api.getPortfolio()
    }
  ]
  
  // Using shared default options for operations that don't specify their own
  const results = await withParallelRetryResult(operations, {
    maxRetries: 3,
    operationName: 'fetchAllData'
  })
  
  // Process results...
}
```

### Retry Options

You can customize retry behavior with these options:

```typescript
interface RetryOptions {
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
```
