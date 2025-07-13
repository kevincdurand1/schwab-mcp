/**
 * Types for our custom Schwab API client
 */
export interface TokenData {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    tokenType: string;
    scope: string;
    createdAt: string;
    updatedAt?: string;
}
export interface TokenManager {
    load(): Promise<TokenData>;
    save(tokenData: Partial<TokenData>): Promise<void>;
    refresh?(refreshToken: string, clientId: string, clientSecret: string): Promise<TokenData>;
}
export interface SchwabApiResponse<T> {
    data: T;
    status: number;
    headers: Record<string, string>;
}
export interface Account {
    accountNumber: string;
    type: string;
    displayName?: string;
    positions?: Position[];
    balances?: AccountBalances;
    [key: string]: any;
}
export interface Position {
    symbol: string;
    quantity: number;
    marketValue: number;
    averagePrice?: number;
    [key: string]: any;
}
export interface AccountBalances {
    cashBalance?: number;
    totalValue?: number;
    buyingPower?: number;
    [key: string]: any;
}
export interface Quote {
    symbol: string;
    price: number;
    change?: number;
    changePercent?: number;
    volume?: number;
    bid?: number;
    ask?: number;
    [key: string]: any;
}
export interface Order {
    orderId: string;
    accountNumber: string;
    symbol: string;
    quantity: number;
    status: string;
    orderType?: string;
    side?: 'BUY' | 'SELL';
    [key: string]: any;
}
export interface Transaction {
    transactionId: string;
    accountNumber: string;
    type: string;
    amount: number;
    date: string;
    symbol?: string;
    [key: string]: any;
}
export interface SchwabApiConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    baseUrl?: string;
    tokenManager: TokenManager;
}
export interface GetAccountsParams {
    fields?: string;
}
export interface GetQuotesParams {
    symbols: string[];
    fields?: string;
    indicative?: boolean;
}
export interface GetOrdersParams {
    accountNumber: string;
    maxResults?: number;
    fromEnteredTime?: string;
    toEnteredTime?: string;
    status?: string;
}
export interface GetTransactionsParams {
    accountNumber: string;
    type?: string;
    startDate?: string;
    endDate?: string;
}
export declare class SchwabApiError extends Error {
    status?: number | undefined;
    code?: string | undefined;
    details?: any | undefined;
    constructor(message: string, status?: number | undefined, code?: string | undefined, details?: any | undefined);
}
export declare class SchwabAuthError extends SchwabApiError {
    constructor(message: string, details?: any);
}
