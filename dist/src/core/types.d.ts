/**
 * Generic Broker Abstraction Layer
 * Defines broker-agnostic interfaces for multi-broker support
 */
import { z } from 'zod';
export declare const GetAccountsParamsSchema: z.ZodObject<{
    fields: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fields?: string | undefined;
}, {
    fields?: string | undefined;
}>;
export declare const GetQuotesParamsSchema: z.ZodObject<{
    symbols: z.ZodString;
    fields: z.ZodOptional<z.ZodString>;
    indicative: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    symbols: string;
    fields?: string | undefined;
    indicative?: boolean | undefined;
}, {
    symbols: string;
    fields?: string | undefined;
    indicative?: boolean | undefined;
}>;
export declare const GetOrdersParamsSchema: z.ZodObject<{
    accountNumber: z.ZodOptional<z.ZodString>;
    maxResults: z.ZodOptional<z.ZodNumber>;
    fromEnteredTime: z.ZodOptional<z.ZodString>;
    toEnteredTime: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    accountNumber?: string | undefined;
    maxResults?: number | undefined;
    fromEnteredTime?: string | undefined;
    toEnteredTime?: string | undefined;
}, {
    status?: string | undefined;
    accountNumber?: string | undefined;
    maxResults?: number | undefined;
    fromEnteredTime?: string | undefined;
    toEnteredTime?: string | undefined;
}>;
export declare const GetTransactionsParamsSchema: z.ZodObject<{
    accountNumber: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    symbol: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol?: string | undefined;
    type?: string | undefined;
    accountNumber?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    symbol?: string | undefined;
    type?: string | undefined;
    accountNumber?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const GetOrderParamsSchema: z.ZodObject<{
    orderId: z.ZodString;
    accountNumber: z.ZodString;
}, "strip", z.ZodTypeAny, {
    accountNumber: string;
    orderId: string;
}, {
    accountNumber: string;
    orderId: string;
}>;
export declare const GetUserPreferenceParamsSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const GetMarketHoursByMarketIdParamsSchema: z.ZodObject<{
    market_id: z.ZodString;
    date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    market_id: string;
    date?: string | undefined;
}, {
    market_id: string;
    date?: string | undefined;
}>;
export declare const GetOptionExpirationChainParamsSchema: z.ZodObject<{
    symbol: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
}, {
    symbol: string;
}>;
export declare const PlaceOrderParamsSchema: z.ZodObject<{
    accountNumber: z.ZodString;
    symbol: z.ZodString;
    quantity: z.ZodNumber;
    side: z.ZodEnum<["BUY", "SELL"]>;
    orderType: z.ZodEnum<["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]>;
    price: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodEnum<["DAY", "GTC", "FILL_OR_KILL"]>>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    accountNumber: string;
    quantity: number;
    side: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
    price?: number | undefined;
    duration?: "DAY" | "GTC" | "FILL_OR_KILL" | undefined;
}, {
    symbol: string;
    accountNumber: string;
    quantity: number;
    side: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
    price?: number | undefined;
    duration?: "DAY" | "GTC" | "FILL_OR_KILL" | undefined;
}>;
export declare const ReplaceOrderParamsSchema: z.ZodObject<{
    orderId: z.ZodString;
    accountNumber: z.ZodString;
    symbol: z.ZodString;
    quantity: z.ZodNumber;
    side: z.ZodEnum<["BUY", "SELL"]>;
    orderType: z.ZodEnum<["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]>;
    price: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodEnum<["DAY", "GTC", "FILL_OR_KILL"]>>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    accountNumber: string;
    orderId: string;
    quantity: number;
    side: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
    price?: number | undefined;
    duration?: "DAY" | "GTC" | "FILL_OR_KILL" | undefined;
}, {
    symbol: string;
    accountNumber: string;
    orderId: string;
    quantity: number;
    side: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
    price?: number | undefined;
    duration?: "DAY" | "GTC" | "FILL_OR_KILL" | undefined;
}>;
export declare const GetPositionsParamsSchema: z.ZodObject<{
    accountNumber: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    accountNumber?: string | undefined;
}, {
    accountNumber?: string | undefined;
}>;
export declare const GetPortfolioSummaryParamsSchema: z.ZodObject<{
    accountNumber: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    accountNumber?: string | undefined;
}, {
    accountNumber?: string | undefined;
}>;
export declare const GetPerformanceParamsSchema: z.ZodObject<{
    accountNumber: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    accountNumber?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    accountNumber?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const GetWatchlistsParamsSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const CreateWatchlistParamsSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
}>;
export declare const AddToWatchlistParamsSchema: z.ZodObject<{
    watchlistId: z.ZodString;
    symbol: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    watchlistId: string;
}, {
    symbol: string;
    watchlistId: string;
}>;
export declare const RemoveFromWatchlistParamsSchema: z.ZodObject<{
    watchlistId: z.ZodString;
    symbol: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    watchlistId: string;
}, {
    symbol: string;
    watchlistId: string;
}>;
export declare const GetInstrumentByCusipParamsSchema: z.ZodObject<{
    cusip_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    cusip_id: string;
}, {
    cusip_id: string;
}>;
export declare const GetNewsParamsSchema: z.ZodObject<{
    symbol: z.ZodOptional<z.ZodString>;
    maxResults: z.ZodOptional<z.ZodNumber>;
    fromDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol?: string | undefined;
    maxResults?: number | undefined;
    fromDate?: string | undefined;
}, {
    symbol?: string | undefined;
    maxResults?: number | undefined;
    fromDate?: string | undefined;
}>;
export declare const GetEarningsCalendarParamsSchema: z.ZodObject<{
    symbol: z.ZodOptional<z.ZodString>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    symbol?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}>;
export declare const GetDividendHistoryParamsSchema: z.ZodObject<{
    symbol: z.ZodString;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    symbol: string;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}>;
export declare const GetCompanyProfileParamsSchema: z.ZodObject<{
    symbol: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
}, {
    symbol: string;
}>;
export declare const GetAccountActivityParamsSchema: z.ZodObject<{
    accountNumber: z.ZodOptional<z.ZodString>;
    maxResults: z.ZodOptional<z.ZodNumber>;
    fromDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    accountNumber?: string | undefined;
    maxResults?: number | undefined;
    fromDate?: string | undefined;
}, {
    accountNumber?: string | undefined;
    maxResults?: number | undefined;
    fromDate?: string | undefined;
}>;
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
export interface Account {
    accountNumber: string;
    accountName?: string;
    type: string;
    balance?: number;
    positions?: Position[];
    [key: string]: any;
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
    getPriceHistory(params: any): Promise<any>;
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
export type BrokerType = 'schwab' | 'fidelity' | 'td-ameritrade' | 'interactive-brokers' | 'mock';
export interface BrokerConfig {
    type: BrokerType;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    baseUrl?: string;
    scopes?: string[];
}
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
