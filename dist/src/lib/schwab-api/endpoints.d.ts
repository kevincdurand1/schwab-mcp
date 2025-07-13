/**
 * Schwab API Endpoints - High-level API methods
 */
import { SchwabApiClient } from './client.js';
import { type Account, type Quote, type Order, type Transaction, type GetAccountsParams, type GetQuotesParams, type GetOrdersParams, type GetTransactionsParams } from './types.js';
export declare class SchwabApiEndpoints {
    private client;
    constructor(client: SchwabApiClient);
    /**
     * Get all accounts for the authenticated user
     */
    getAccounts(params?: GetAccountsParams): Promise<Account[]>;
    /**
     * Get account numbers only
     */
    getAccountNumbers(params?: GetAccountsParams): Promise<string[]>;
    /**
     * Get specific account details
     */
    getAccount(accountNumber: string, fields?: string): Promise<Account>;
    /**
     * Get quotes for one or more symbols
     */
    getQuotes(params: GetQuotesParams): Promise<Record<string, Quote>>;
    /**
     * Get quote for a single symbol
     */
    getQuote(symbol: string, fields?: string): Promise<Quote>;
    /**
     * Get price history for a symbol
     */
    getPriceHistory(symbol: string, params?: {
        periodType?: string;
        period?: number;
        frequencyType?: string;
        frequency?: number;
        startDate?: number;
        endDate?: number;
        needExtendedHoursData?: boolean;
        needPreviousClose?: boolean;
    }): Promise<any>;
    /**
     * Get option chains for a symbol - Complete Schwab API implementation
     */
    getOptionChains(symbol: string, params?: {
        contractType?: 'CALL' | 'PUT' | 'ALL';
        strikeCount?: number;
        includeUnderlyingQuote?: boolean;
        strategy?: 'SINGLE' | 'ANALYTICAL' | 'COVERED' | 'VERTICAL' | 'CALENDAR' | 'STRANGLE' | 'STRADDLE' | 'BUTTERFLY' | 'CONDOR' | 'DIAGONAL' | 'COLLAR' | 'ROLL';
        interval?: number;
        strike?: number;
        range?: string;
        fromDate?: string;
        toDate?: string;
        volatility?: number;
        underlyingPrice?: number;
        interestRate?: number;
        daysToExpiration?: number;
        expMonth?: 'JAN' | 'FEB' | 'MAR' | 'APR' | 'MAY' | 'JUN' | 'JUL' | 'AUG' | 'SEP' | 'OCT' | 'NOV' | 'DEC' | 'ALL';
        optionType?: string;
        entitlement?: 'PN' | 'NP' | 'PP';
    }): Promise<any>;
    /**
     * Get orders for an account
     */
    getOrders(params: GetOrdersParams): Promise<Order[]>;
    /**
     * Get all orders across all accounts
     */
    getAllOrders(params?: {
        maxResults?: number;
        fromEnteredTime?: string;
        toEnteredTime?: string;
        status?: string;
    }): Promise<Order[]>;
    /**
     * Get specific order
     */
    getOrder(accountNumber: string, orderId: string): Promise<Order>;
    /**
     * Place an order
     */
    placeOrder(accountNumber: string, orderData: any): Promise<any>;
    /**
     * Replace/modify an order
     */
    replaceOrder(accountNumber: string, orderId: string, orderData: any): Promise<any>;
    /**
     * Cancel an order
     */
    cancelOrder(accountNumber: string, orderId: string): Promise<any>;
    /**
     * Get transactions for an account
     */
    getTransactions(params: GetTransactionsParams): Promise<Transaction[]>;
    /**
     * Get specific transaction
     */
    getTransaction(accountNumber: string, transactionId: string): Promise<Transaction>;
    /**
     * Get user preferences
     */
    getUserPreferences(): Promise<any>;
    /**
     * Get market movers
     */
    getMovers(index: '$DJI' | '$COMPX' | '$SPX', direction: 'up' | 'down', change: 'value' | 'percent'): Promise<any>;
    /**
     * Get market hours for markets
     */
    getMarketHours(markets: string[], date?: string): Promise<any>;
    /**
     * Search instruments by symbol or description
     */
    searchInstruments(symbol: string, projection: 'symbol-search' | 'symbol-regex' | 'desc-search' | 'desc-regex' | 'fundamental'): Promise<any>;
    /**
     * Get instrument by CUSIP
     */
    getInstrumentByCusip(cusip: string): Promise<any>;
    /**
     * Get account positions
     */
    getPositions(accountNumber: string, fields?: string): Promise<any>;
    /**
     * Get watchlists for an account
     */
    getWatchlists(accountNumber: string): Promise<any>;
    /**
     * Get specific watchlist
     */
    getWatchlist(accountNumber: string, watchlistId: string): Promise<any>;
    /**
     * Create a new watchlist
     */
    createWatchlist(accountNumber: string, watchlistData: any): Promise<any>;
    /**
     * Update a watchlist
     */
    updateWatchlist(accountNumber: string, watchlistId: string, watchlistData: any): Promise<any>;
    /**
     * Delete a watchlist
     */
    deleteWatchlist(accountNumber: string, watchlistId: string): Promise<any>;
}
