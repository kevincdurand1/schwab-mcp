/**
 * Token Management for Schwab API
 */
import { type TokenData, type TokenManager } from './types.js';
export declare class RedisTokenManager implements TokenManager {
    private redisClient;
    private readonly tokenKey;
    private readonly tokenTtl;
    constructor(redisClient: any);
    load(): Promise<TokenData>;
    save(newTokenData: Partial<TokenData>): Promise<void>;
    refresh(refreshToken: string, clientId: string, clientSecret: string): Promise<TokenData>;
}
