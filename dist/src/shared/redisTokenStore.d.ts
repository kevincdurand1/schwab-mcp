import { type RedisClientType } from 'redis';
import { type TokenStore, type TokenData } from '../types/auth.js';
export declare class RedisTokenStore implements TokenStore {
    private client;
    private static readonly TOKEN_KEY;
    private static readonly TOKEN_TTL;
    constructor(client: RedisClientType);
    get(userId?: string): Promise<TokenData | null>;
    set(userId: string, tokenData: TokenData): Promise<void>;
    set(tokenData: TokenData): Promise<void>;
    delete(userId?: string): Promise<void>;
    refresh(userId: string, newTokenData: Partial<TokenData>): Promise<void>;
    refresh(newTokenData: Partial<TokenData>): Promise<void>;
}
export declare function createTokenStore(redisClient: RedisClientType): TokenStore;
