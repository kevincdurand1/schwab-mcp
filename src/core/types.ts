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

// Export param types
export type GetAccountsParams = z.infer<typeof GetAccountsParamsSchema>;
export type GetQuotesParams = z.infer<typeof GetQuotesParamsSchema>;
export type GetOrdersParams = z.infer<typeof GetOrdersParamsSchema>;
export type GetTransactionsParams = z.infer<typeof GetTransactionsParamsSchema>;
export type GetOrderParams = z.infer<typeof GetOrderParamsSchema>;
export type GetUserPreferenceParams = z.infer<typeof GetUserPreferenceParamsSchema>;
export type GetMarketHoursByMarketIdParams = z.infer<typeof GetMarketHoursByMarketIdParamsSchema>;
export type GetOptionExpirationChainParams = z.infer<typeof GetOptionExpirationChainParamsSchema>;
export type PlaceOrderParams = z.infer<typeof PlaceOrderParamsSchema>;
export type ReplaceOrderParams = z.infer<typeof ReplaceOrderParamsSchema>;

// New tool param types
export type GetPositionsParams = z.infer<typeof GetPositionsParamsSchema>;
export type GetPortfolioSummaryParams = z.infer<typeof GetPortfolioSummaryParamsSchema>;
export type GetPerformanceParams = z.infer<typeof GetPerformanceParamsSchema>;
export type GetWatchlistsParams = z.infer<typeof GetWatchlistsParamsSchema>;
export type CreateWatchlistParams = z.infer<typeof CreateWatchlistParamsSchema>;
export type AddToWatchlistParams = z.infer<typeof AddToWatchlistParamsSchema>;
export type RemoveFromWatchlistParams = z.infer<typeof RemoveFromWatchlistParamsSchema>;
export type GetInstrumentByCusipParams = z.infer<typeof GetInstrumentByCusipParamsSchema>;
export type GetNewsParams = z.infer<typeof GetNewsParamsSchema>;
export type GetEarningsCalendarParams = z.infer<typeof GetEarningsCalendarParamsSchema>;
export type GetDividendHistoryParams = z.infer<typeof GetDividendHistoryParamsSchema>;
export type GetCompanyProfileParams = z.infer<typeof GetCompanyProfileParamsSchema>;
export type GetAccountActivityParams = z.infer<typeof GetAccountActivityParamsSchema>;

// ===============================
// Generic Response Types
// ===============================

export interface Account {
  accountNumber: string;
  accountName?: string;
  type: string;
  balance?: number;
  positions?: Position[];
  [key: string]: any; // Allow broker-specific fields
}

export interface Position {
  symbol: string;
  quantity: number;
  marketValue?: number;
  [key: string]: any;
}

export interface Quote {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  volume?: number;
  [key: string]: any;
}

export interface Order {
  orderId: string;
  accountNumber: string;
  symbol: string;
  quantity: number;
  status: string;
  [key: string]: any;
}

export interface Transaction {
  transactionId: string;
  accountNumber: string;
  type: string;
  amount: number;
  date: string;
  [key: string]: any;
}

export interface Portfolio {
  accountNumber: string;
  totalValue: number;
  totalCash: number;
  totalEquity: number;
  dayChange: number;
  dayChangePercent: number;
  positions: Position[];
  [key: string]: any;
}

export interface Performance {
  accountNumber: string;
  totalReturn: number;
  totalReturnPercent: number;
  dayReturn: number;
  dayReturnPercent: number;
  startDate: string;
  endDate: string;
  [key: string]: any;
}

export interface Watchlist {
  watchlistId: string;
  name: string;
  description?: string;
  symbols: string[];
  [key: string]: any;
}

export interface NewsItem {
  headline: string;
  summary?: string;
  url: string;
  source: string;
  publishedDate: string;
  symbols?: string[];
  [key: string]: any;
}

export interface EarningsEvent {
  symbol: string;
  companyName: string;
  earningsDate: string;
  estimatedEPS?: number;
  actualEPS?: number;
  [key: string]: any;
}

export interface DividendEvent {
  symbol: string;
  exDate: string;
  payDate: string;
  amount: number;
  frequency: string;
  [key: string]: any;
}

export interface CompanyProfile {
  symbol: string;
  companyName: string;
  description?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  employees?: number;
  [key: string]: any;
}

export interface AccountActivity {
  activityId: string;
  accountNumber: string;
  type: string;
  description: string;
  amount?: number;
  date: string;
  [key: string]: any;
}

// ===============================
// Generic Broker API Interfaces
// ===============================

export interface AccountsAPI {
  getAccounts(params: GetAccountsParams): Promise<Account[]>;
  getAccountNumbers(params?: GetAccountsParams): Promise<string[]>;
}

export interface QuotesAPI {
  getQuotes(params: GetQuotesParams): Promise<Quote[]>;
  getQuote(symbol: string): Promise<Quote>;
}

export interface OrdersAPI {
  getOrders(params: GetOrdersParams): Promise<Order[]>;
  placeOrder(params: PlaceOrderParams): Promise<any>;
  replaceOrder(params: ReplaceOrderParams): Promise<any>;
  cancelOrder(orderId: string, accountNumber: string): Promise<any>;
}

export interface TransactionsAPI {
  getTransactions(params: GetTransactionsParams): Promise<Transaction[]>;
  getTransaction(transactionId: string, accountNumber: string): Promise<Transaction>;
}

export interface MarketDataAPI {
  getQuotes(params: GetQuotesParams): Promise<Quote[]>;
  getPriceHistory(params: any): Promise<any>; // TODO: Define generic price history
  getMarketHours(params: any): Promise<any>;
  getMovers(params: any): Promise<any>;
  getOptionChain(params: any): Promise<any>;
  searchInstruments(params: any): Promise<any>;
  getInstrumentByCusip(params: GetInstrumentByCusipParams): Promise<any>;
  getNews(params: GetNewsParams): Promise<NewsItem[]>;
  getEarningsCalendar(params: GetEarningsCalendarParams): Promise<EarningsEvent[]>;
  getDividendHistory(params: GetDividendHistoryParams): Promise<DividendEvent[]>;
  getCompanyProfile(params: GetCompanyProfileParams): Promise<CompanyProfile>;
}

// New API interfaces for additional functionality
export interface PortfolioAPI {
  getPositions(params: GetPositionsParams): Promise<Position[]>;
  getPortfolioSummary(params: GetPortfolioSummaryParams): Promise<Portfolio>;
  getPerformance(params: GetPerformanceParams): Promise<Performance>;
}

export interface WatchlistAPI {
  getWatchlists(params: GetWatchlistsParams): Promise<Watchlist[]>;
  createWatchlist(params: CreateWatchlistParams): Promise<Watchlist>;
  addToWatchlist(params: AddToWatchlistParams): Promise<any>;
  removeFromWatchlist(params: RemoveFromWatchlistParams): Promise<any>;
}

export interface ActivityAPI {
  getAccountActivity(params: GetAccountActivityParams): Promise<AccountActivity[]>;
}

// ===============================
// Generic Broker Client Interface
// ===============================

export interface BrokerClient {
  readonly brokerName: string;
  readonly accounts: AccountsAPI;
  readonly quotes: QuotesAPI;
  readonly orders: OrdersAPI;
  readonly transactions: TransactionsAPI;
  readonly marketData: MarketDataAPI;
  readonly portfolio: PortfolioAPI;
  readonly watchlists: WatchlistAPI;
  readonly activity: ActivityAPI;
}

// ===============================
// Broker Configuration
// ===============================

export type BrokerType = 'schwab' | 'fidelity' | 'td-ameritrade' | 'interactive-brokers' | 'mock';

export interface BrokerConfig {
  type: BrokerType;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl?: string;
  scopes?: string[];
}

// ===============================
// Generic Error Types
// ===============================

export interface BrokerError extends Error {
  code: string;
  status?: number;
  isRetryable: boolean;
  requiresReauth: boolean;
  brokerSpecific?: any;
}

export interface BrokerErrorInfo {
  code: string;
  message: string;
  status: number;
  isRetryable: boolean;
  requiresReauth: boolean;
} 