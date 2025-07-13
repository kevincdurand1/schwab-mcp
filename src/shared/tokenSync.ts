import { createClient, type RedisClientType } from 'redis';

// Use console.error for logging to avoid polluting stdout (MCP communication channel)
const log = {
  info: (msg: string, data?: any) => console.error(`[TokenSync] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[TokenSync] ${msg}`, data || ''),
};

export interface TokenSyncData {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: string;
  scope?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Token synchronization utility to ensure all services have access to the latest tokens
 */
export class TokenSyncManager {
  private static readonly TOKEN_KEY = 'schwab-mcp:token';
  private static readonly TOKEN_SYNC_KEY = 'schwab-mcp:token-sync';
  private static readonly TOKEN_TTL = 31 * 24 * 60 * 60; // 31 days

  private redisClient: RedisClientType | null = null;

  async connect(): Promise<void> {
    if (this.redisClient?.isOpen) {
      return;
    }

    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
    });

    this.redisClient.on('error', (err) => log.error('Redis Client Error', err));
    await this.redisClient.connect();
    log.info('Connected to Redis for token synchronization');
  }

  async disconnect(): Promise<void> {
    if (this.redisClient?.isOpen) {
      await this.redisClient.disconnect();
      this.redisClient = null;
    }
  }

  /**
   * Store tokens with automatic sync notification
   */
  async storeTokens(tokenData: TokenSyncData): Promise<void> {
    if (!this.redisClient) {
      await this.connect();
    }

    try {
      const tokenString = JSON.stringify(tokenData);
      
      // Store tokens with TTL
      await this.redisClient!.setEx(TokenSyncManager.TOKEN_KEY, TokenSyncManager.TOKEN_TTL, tokenString);
      
      // Set sync notification with timestamp
      await this.redisClient!.setEx(
        TokenSyncManager.TOKEN_SYNC_KEY,
        TokenSyncManager.TOKEN_TTL,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          action: 'updated',
          expiresAt: tokenData.expiresAt
        })
      );

      log.info('Tokens stored and sync notification sent');
    } catch (error) {
      log.error('Error storing tokens:', error);
      throw error;
    }
  }

  /**
   * Get current tokens
   */
  async getTokens(): Promise<TokenSyncData | null> {
    if (!this.redisClient) {
      await this.connect();
    }

    try {
      const tokenString = await this.redisClient!.get(TokenSyncManager.TOKEN_KEY);
      
      if (!tokenString) {
        return null;
      }

      const tokenData = JSON.parse(tokenString) as TokenSyncData;
      
      // Check if token is expired
      if (new Date(tokenData.expiresAt) < new Date()) {
        log.info('Token expired, removing from storage');
        await this.deleteTokens();
        return null;
      }

      return tokenData;
    } catch (error) {
      log.error('Error retrieving tokens:', error);
      return null;
    }
  }

  /**
   * Check if tokens need refresh (within threshold)
   */
  async needsRefresh(thresholdMinutes: number = 5): Promise<boolean> {
    const tokens = await this.getTokens();
    if (!tokens) {
      return false;
    }

    const expirationTime = new Date(tokens.expiresAt);
    const now = new Date();
    const timeToExpiry = expirationTime.getTime() - now.getTime();
    const threshold = thresholdMinutes * 60 * 1000;

    return timeToExpiry < threshold;
  }

  /**
   * Delete tokens and send sync notification
   */
  async deleteTokens(): Promise<void> {
    if (!this.redisClient) {
      await this.connect();
    }

    try {
      await this.redisClient!.del(TokenSyncManager.TOKEN_KEY);
      
      // Set sync notification for deletion
      await this.redisClient!.setEx(
        TokenSyncManager.TOKEN_SYNC_KEY,
        3600, // 1 hour TTL for deletion notification
        JSON.stringify({
          timestamp: new Date().toISOString(),
          action: 'deleted'
        })
      );

      log.info('Tokens deleted and sync notification sent');
    } catch (error) {
      log.error('Error deleting tokens:', error);
      throw error;
    }
  }

  /**
   * Refresh tokens using the Schwab API
   */
  async refreshTokens(): Promise<TokenSyncData | null> {
    const currentTokens = await this.getTokens();
    if (!currentTokens || !currentTokens.refreshToken) {
      log.error('No refresh token available');
      return null;
    }

    try {
      log.info('Attempting to refresh tokens');

      const clientId = process.env.SCHWAB_CLIENT_ID;
      const clientSecret = process.env.SCHWAB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('Missing client credentials for token refresh');
      }

      const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

      const response = await fetch('https://api.schwabapi.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': authHeader
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: currentTokens.refreshToken
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${errorText}`);
      }

      const tokens = await response.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
        scope?: string;
      };

      // Calculate new expiration
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 3600));

      const newTokenData: TokenSyncData = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || currentTokens.refreshToken,
        expiresAt: expiresAt.toISOString(),
        tokenType: tokens.token_type || 'Bearer',
        scope: tokens.scope || currentTokens.scope,
        createdAt: currentTokens.createdAt,
        updatedAt: new Date().toISOString()
      };

      // Store the refreshed tokens
      await this.storeTokens(newTokenData);

      log.info('Tokens refreshed successfully');
      return newTokenData;

    } catch (error) {
      log.error('Error refreshing tokens:', error);
      return null;
    }
  }

  /**
   * Get last sync status
   */
  async getSyncStatus(): Promise<{ timestamp: string; action: string; expiresAt?: string } | null> {
    if (!this.redisClient) {
      await this.connect();
    }

    try {
      const syncString = await this.redisClient!.get(TokenSyncManager.TOKEN_SYNC_KEY);
      return syncString ? JSON.parse(syncString) : null;
    } catch (error) {
      log.error('Error getting sync status:', error);
      return null;
    }
  }
}

// Singleton instance
export const tokenSyncManager = new TokenSyncManager(); 