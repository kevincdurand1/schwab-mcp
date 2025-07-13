/**
 * Schwab Broker Adapter using our custom API client
 * Implements the generic broker interface for Schwab
 */
import { type RedisClientType } from 'redis';
import { type SchwabApiEndpoints } from '../../lib/schwab-api/index.js';
import { type BrokerClient, type AccountsAPI, type QuotesAPI, type OrdersAPI, type TransactionsAPI, type MarketDataAPI, type PortfolioAPI, type WatchlistAPI, type ActivityAPI } from '../../core/types.js';
export declare class SchwabBrokerAdapter implements BrokerClient {
    private schwabClient;
    readonly brokerName = "schwab";
    readonly accounts: AccountsAPI;
    readonly quotes: QuotesAPI;
    readonly orders: OrdersAPI;
    readonly transactions: TransactionsAPI;
    readonly marketData: MarketDataAPI;
    readonly portfolio: PortfolioAPI;
    readonly watchlists: WatchlistAPI;
    readonly activity: ActivityAPI;
    constructor(schwabClient: SchwabApiEndpoints);
}
/**
 * Create a Schwab broker adapter with Redis token storage
 */
export declare function createSchwabBrokerAdapter(redisClient: RedisClientType): Promise<SchwabBrokerAdapter>;
