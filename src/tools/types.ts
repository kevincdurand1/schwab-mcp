/**
 * Nominal types for Schwab API identifiers
 * These types are string-compatible but help TypeScript prevent mixing different ID types
 */

export type Brand<K, T> = K & { readonly __brand: T }

// Nominal type for account numbers
export type AccountNumber = Brand<string, 'AccountNumber'>

// Nominal type for order IDs
export type OrderId = Brand<string, 'OrderId'>

// Nominal type for transaction IDs
export type TransactionId = Brand<string, 'TransactionId'>

// Nominal type for CUSIP IDs (security identifiers)
export type CusipId = string & { readonly brand: unique symbol }

// Nominal type for symbol IDs
export type SymbolId = string & { readonly brand: unique symbol }

// Nominal type for market IDs
export type MarketId = string & { readonly brand: unique symbol }

/**
 * Type converters to help cast strings to nominal types
 * These are type-only operations with no runtime cost
 */
export const asAccountNumber = (id: string): AccountNumber => id as AccountNumber
export const asOrderId = (id: string): OrderId => id as OrderId
export const asTransactionId = (id: string): TransactionId => id as TransactionId
export const asCusipId = (id: string): CusipId => id as CusipId
export const asSymbolId = (id: string): SymbolId => id as SymbolId
export const asMarketId = (id: string): MarketId => id as MarketId
