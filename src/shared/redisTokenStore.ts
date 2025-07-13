import  { type RedisClientType } from 'redis';
import  { type TokenStore, type TokenData } from '../types/auth.js';

// Use console.error for logging to avoid polluting stdout (MCP communication channel)
const log = {
  debug: (msg: string, data?: any) => {}, // Silent in production
  info: (msg: string, data?: any) => console.error(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
};

export class RedisTokenStore implements TokenStore {
  private static readonly TOKEN_KEY = 'schwab-mcp:token'; // Fixed key for single user
  private static readonly TOKEN_TTL = 31 * 24 * 60 * 60; // 31 days in seconds

  constructor(private client: RedisClientType) {}

  async get(userId?: string): Promise<TokenData | null> {
    try {
      const data = await this.client.get(RedisTokenStore.TOKEN_KEY);
      
      if (!data) {
        log.debug('No token found');
        return null;
      }

      const tokenData = JSON.parse(data) as TokenData;
      
      // Check if token is expired
      if (tokenData.expiresAt && new Date(tokenData.expiresAt) < new Date()) {
        log.info('Token expired, removing');
        await this.delete();
        return null;
      }

      return tokenData;
    } catch (error) {
      log.error('Error retrieving token:', error);
      return null;
    }
  }

  async set(userId: string, tokenData: TokenData): Promise<void>;
  async set(tokenData: TokenData): Promise<void>;
  async set(userIdOrTokenData: string | TokenData, tokenData?: TokenData): Promise<void> {
    try {
      // Handle both old and new signatures for backward compatibility
      const data = typeof userIdOrTokenData === 'string' ? tokenData! : userIdOrTokenData;
      const dataString = JSON.stringify(data);
      
      // Set with TTL
      await this.client.setEx(RedisTokenStore.TOKEN_KEY, RedisTokenStore.TOKEN_TTL, dataString);
      
      log.debug('Token stored');
    } catch (error) {
      log.error('Error storing token:', error);
      throw error;
    }
  }

  async delete(userId?: string): Promise<void> {
    try {
      await this.client.del(RedisTokenStore.TOKEN_KEY);
      log.debug('Token deleted');
    } catch (error) {
      log.error('Error deleting token:', error);
      throw error;
    }
  }

  async refresh(userId: string, newTokenData: Partial<TokenData>): Promise<void>;
  async refresh(newTokenData: Partial<TokenData>): Promise<void>;
  async refresh(userIdOrTokenData: string | Partial<TokenData>, newTokenData?: Partial<TokenData>): Promise<void> {
    try {
      // Handle both old and new signatures
      const data = typeof userIdOrTokenData === 'string' ? newTokenData! : userIdOrTokenData;
      
      const existingData = await this.get();
      if (!existingData) {
        throw new Error('No existing token found');
      }

      const updatedData: TokenData = {
        ...existingData,
        ...data,
        updatedAt: new Date().toISOString()
      };

      await this.set(updatedData);
      log.info('Token refreshed');
    } catch (error) {
      log.error('Error refreshing token:', error);
      throw error;
    }
  }
}

export function createTokenStore(redisClient: RedisClientType): TokenStore {
  return new RedisTokenStore(redisClient);
}