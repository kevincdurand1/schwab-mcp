import { type SchwabApiClient } from '@sudowealth/schwab-api';
import { type RedisClientType } from 'redis';
/**
 * Create a Schwab API client with proper token management
 * @param redisClient - Shared Redis client instance (connection must be open)
 * @returns Configured Schwab API client
 */
export declare function getSchwabClient(redisClient: RedisClientType): Promise<SchwabApiClient>;
