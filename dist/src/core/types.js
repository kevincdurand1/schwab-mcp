/**
 * Generic Broker Abstraction Layer
 * Defines broker-agnostic interfaces for multi-broker support
 */
import { z } from 'zod';
// ===============================
// Generic Parameter Schemas
// ===============================
export const GetAccountsParamsSchema = z.object({
    fields: z.string().optional().describe('Fields to include in response (default: "positions")')
});
export const GetQuotesParamsSchema = z.object({
    symbols: z.string().describe('Comma-separated stock symbols'),
    fields: z.string().optional().describe('Quote fields to include'),
    indicative: z.boolean().optional().describe('Include indicative quotes')
});
export const GetOrdersParamsSchema = z.object({
    accountNumber: z.string().optional().describe('Account number filter'),
    maxResults: z.number().optional().describe('Maximum results to return'),
    fromEnteredTime: z.string().optional().describe('Start date filter'),
    toEnteredTime: z.string().optional().describe('End date filter'),
    status: z.string().optional().describe('Order status filter')
});
export const GetTransactionsParamsSchema = z.object({
    accountNumber: z.string().optional().describe('Account number'),
    startDate: z.string().optional().describe('Start date for transactions'),
    endDate: z.string().optional().describe('End date for transactions'),
    symbol: z.string().optional().describe('Symbol filter'),
    type: z.string().optional().describe('Transaction type filter')
});
export const GetOrderParamsSchema = z.object({
    orderId: z.string().describe('Order ID'),
    accountNumber: z.string().describe('Account number')
});
export const GetUserPreferenceParamsSchema = z.object({
// No parameters needed for getting user preferences
});
export const GetMarketHoursByMarketIdParamsSchema = z.object({
    market_id: z.string().describe('Market ID (equity, forex, etc.)'),
    date: z.string().optional().describe('Date to check market hours')
});
export const GetOptionExpirationChainParamsSchema = z.object({
    symbol: z.string().describe('Underlying symbol for option expiration chain')
});
export const PlaceOrderParamsSchema = z.object({
    accountNumber: z.string().describe('Account number for order placement'),
    symbol: z.string().describe('Symbol to trade'),
    quantity: z.number().describe('Quantity to trade'),
    side: z.enum(['BUY', 'SELL']).describe('Order side'),
    orderType: z.enum(['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT']).describe('Order type'),
    price: z.number().optional().describe('Limit price (required for LIMIT orders)'),
    duration: z.enum(['DAY', 'GTC', 'FILL_OR_KILL']).optional().describe('Order duration')
});
export const ReplaceOrderParamsSchema = z.object({
    orderId: z.string().describe('Order ID to replace'),
    accountNumber: z.string().describe('Account number'),
    symbol: z.string().describe('Symbol to trade'),
    quantity: z.number().describe('New quantity'),
    side: z.enum(['BUY', 'SELL']).describe('Order side'),
    orderType: z.enum(['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT']).describe('Order type'),
    price: z.number().optional().describe('New limit price'),
    duration: z.enum(['DAY', 'GTC', 'FILL_OR_KILL']).optional().describe('Order duration')
});
// Portfolio and Performance Tools
export const GetPositionsParamsSchema = z.object({
    accountNumber: z.string().optional().describe('Account number for positions')
});
export const GetPortfolioSummaryParamsSchema = z.object({
    accountNumber: z.string().optional().describe('Account number for portfolio summary')
});
export const GetPerformanceParamsSchema = z.object({
    accountNumber: z.string().optional().describe('Account number for performance data'),
    startDate: z.string().optional().describe('Start date for performance period'),
    endDate: z.string().optional().describe('End date for performance period')
});
// Watchlist Tools
export const GetWatchlistsParamsSchema = z.object({
// No parameters needed for getting user's watchlists
});
export const CreateWatchlistParamsSchema = z.object({
    name: z.string().describe('Watchlist name'),
    description: z.string().optional().describe('Watchlist description')
});
export const AddToWatchlistParamsSchema = z.object({
    watchlistId: z.string().describe('Watchlist ID'),
    symbol: z.string().describe('Symbol to add to watchlist')
});
export const RemoveFromWatchlistParamsSchema = z.object({
    watchlistId: z.string().describe('Watchlist ID'),
    symbol: z.string().describe('Symbol to remove from watchlist')
});
// Market Data Tools
export const GetInstrumentByCusipParamsSchema = z.object({
    cusip_id: z.string().describe('CUSIP identifier for the instrument')
});
export const GetNewsParamsSchema = z.object({
    symbol: z.string().optional().describe('Symbol for news (optional for general market news)'),
    maxResults: z.number().optional().describe('Maximum number of news items to return'),
    fromDate: z.string().optional().describe('Start date for news search')
});
export const GetEarningsCalendarParamsSchema = z.object({
    symbol: z.string().optional().describe('Symbol for earnings (optional for all earnings)'),
    fromDate: z.string().optional().describe('Start date for earnings calendar'),
    toDate: z.string().optional().describe('End date for earnings calendar')
});
export const GetDividendHistoryParamsSchema = z.object({
    symbol: z.string().describe('Symbol for dividend history'),
    fromDate: z.string().optional().describe('Start date for dividend history'),
    toDate: z.string().optional().describe('End date for dividend history')
});
export const GetCompanyProfileParamsSchema = z.object({
    symbol: z.string().describe('Symbol for company profile')
});
// Account Activity Tools
export const GetAccountActivityParamsSchema = z.object({
    accountNumber: z.string().optional().describe('Account number for activity'),
    maxResults: z.number().optional().describe('Maximum number of activity items'),
    fromDate: z.string().optional().describe('Start date for activity')
});
//# sourceMappingURL=types.js.map