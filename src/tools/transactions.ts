import { z } from 'zod'
import { Transaction, TransactionType, ServiceError } from './schemas'

// --- Schemas for GET /accounts/{accountNumber}/transactions ---
// Schema for endpoint parameters (path and query)
export const TransactionParamsSchema = z.object({
  accountNumber: z.string(), // Path parameter (will be hashValue)
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "startDate must be in ISO-8601 format (yyyy-MM-dd'T'HH:mm:ss.SSSZ)"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "endDate must be in ISO-8601 format (yyyy-MM-dd'T'HH:mm:ss.SSSZ)"),
  symbol: z.string().optional(),
  types: TransactionType,
})

// Schema for the response body
export const TransactionResponseSchema = z.array(Transaction)

// --- Schemas for GET /accounts/{accountNumber}/transactions/{transactionId} ---
// Schema for path parameters
export const SingleTransactionParamsSchema = z.object({
  accountNumber: z.string(), // Path parameter (will be hashValue)
  transactionId: z.number().int(), // Path parameter ($int64)
})

// Schema for the successful response body (200 OK)
export const SingleTransactionResponseSchema = Transaction

// Note: Error responses (400, 401, 403, 404, 500, 503) for both endpoints
// are expected to use the imported 'ServiceError' schema.
// The imported 'ServiceError' schema is intended for use by API client code to handle error responses.
