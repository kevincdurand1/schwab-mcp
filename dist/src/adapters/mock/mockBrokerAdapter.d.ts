/**
 * Mock Broker Adapter
 * For testing and development without real API calls
 */
import { type BrokerClient, type AccountsAPI, type QuotesAPI, type OrdersAPI, type TransactionsAPI, type MarketDataAPI, type PortfolioAPI, type WatchlistAPI, type ActivityAPI } from '../../core/types.js';
export declare class MockBrokerAdapter implements BrokerClient {
    readonly brokerName = "mock";
    readonly accounts: AccountsAPI;
    readonly quotes: QuotesAPI;
    readonly orders: OrdersAPI;
    readonly transactions: TransactionsAPI;
    readonly marketData: MarketDataAPI;
    readonly portfolio: PortfolioAPI;
    readonly watchlists: WatchlistAPI;
    readonly activity: ActivityAPI;
    constructor();
    static create(accessToken: string): Promise<MockBrokerAdapter>;
}
