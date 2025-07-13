/**
 * Broker Factory Pattern
 * Creates broker clients based on configuration
 */
import { type RedisClientType } from 'redis';
import { type BrokerClient, type BrokerConfig, type BrokerType } from './types.js';
export interface BrokerFactory {
    createClient(config: BrokerConfig, redisClient: RedisClientType): Promise<BrokerClient>;
    getSupportedBrokers(): BrokerType[];
}
export declare class DefaultBrokerFactory implements BrokerFactory {
    private readonly brokerMap;
    constructor();
    createClient(config: BrokerConfig, redisClient: RedisClientType): Promise<BrokerClient>;
    getSupportedBrokers(): BrokerType[];
    private createSchwabClient;
    private createMockClient;
}
export declare function getBrokerFactory(): BrokerFactory;
export declare function setBrokerFactory(factory: BrokerFactory): void;
export declare function createBrokerConfig(type: BrokerType, clientId: string, clientSecret: string, redirectUri: string, options?: {
    baseUrl?: string;
    scopes?: string[];
}): BrokerConfig;
export declare function getBrokerConfigFromEnv(): BrokerConfig;
