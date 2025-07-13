/**
 * Custom Schwab API Client - Main Export
 */
export * from './types.js';
export * from './client.js';
export * from './tokenManager.js';
export * from './endpoints.js';
import { SchwabApiEndpoints } from './endpoints.js';
import { RedisTokenManager } from './tokenManager.js';
import { type SchwabApiConfig } from './types.js';
/**
 * Create a complete Schwab API client with all endpoints
 */
export declare function createSchwabApiClient(config: SchwabApiConfig): SchwabApiEndpoints;
/**
 * Create a Redis-based token manager
 */
export declare function createRedisTokenManager(redisClient: any): RedisTokenManager;
