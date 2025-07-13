/**
 * Custom Schwab API Client - Main Export
 */

export * from './types.js';
export * from './client.js';
export * from './tokenManager.js';
export * from './endpoints.js';

import { SchwabApiClient } from './client.js';
import { SchwabApiEndpoints } from './endpoints.js';
import { RedisTokenManager } from './tokenManager.js';
import { type SchwabApiConfig } from './types.js';

/**
 * Create a complete Schwab API client with all endpoints
 */
export function createSchwabApiClient(config: SchwabApiConfig): SchwabApiEndpoints {
  const client = new SchwabApiClient(config);
  return new SchwabApiEndpoints(client);
}

/**
 * Create a Redis-based token manager
 */
export function createRedisTokenManager(redisClient: any): RedisTokenManager {
  return new RedisTokenManager(redisClient);
}