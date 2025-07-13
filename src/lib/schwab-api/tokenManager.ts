/**
 * Token Management for Schwab API
 */

import { type TokenData, type TokenManager, SchwabAuthError } from './types.js';

export class RedisTokenManager implements TokenManager {
  private readonly tokenKey = 'schwab-mcp:token';
  private readonly tokenTtl = 31 * 24 * 60 * 60; // 31 days

  constructor(private redisClient: any) {
    if (!redisClient || !redisClient.isOpen) {
      throw new Error('Redis client must be provided and connected');
    }
  }

  async load(): Promise<TokenData> {
    try {
      const tokenData = await this.redisClient.get(this.tokenKey);
      
      if (!tokenData) {
        throw new SchwabAuthError('No authentication tokens found');
      }

      const tokens = JSON.parse(tokenData);

      // Check if token is expired
      if (new Date(tokens.expiresAt) < new Date()) {
        throw new SchwabAuthError('Authentication token expired');
      }

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        tokenType: tokens.tokenType || 'Bearer',
        scope: tokens.scope || 'api',
        createdAt: tokens.createdAt || new Date().toISOString(),
        updatedAt: tokens.updatedAt
      };
    } catch (error) {
      if (error instanceof SchwabAuthError) {
        throw error;
      }
      throw new SchwabAuthError('Failed to load tokens from storage', error);
    }
  }

  async save(newTokenData: Partial<TokenData>): Promise<void> {
    try {
      // Get existing token data for fields not provided in refresh
      const existingData = await this.redisClient.get(this.tokenKey);
      const existing = existingData ? JSON.parse(existingData) : {};
      
      const updatedTokenData = {
        accessToken: newTokenData.accessToken || existing.accessToken,
        refreshToken: newTokenData.refreshToken || existing.refreshToken,
        expiresAt: newTokenData.expiresAt || existing.expiresAt,
        tokenType: newTokenData.tokenType || existing.tokenType || 'Bearer',
        scope: newTokenData.scope || existing.scope || 'api',
        createdAt: existing.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to Redis with TTL
      await this.redisClient.setEx(this.tokenKey, this.tokenTtl, JSON.stringify(updatedTokenData));
      
      // Set sync notification for other processes
      await this.redisClient.setEx(
        'schwab-mcp:token-sync',
        300, // 5 minutes
        JSON.stringify({ 
          lastSync: new Date().toISOString(),
          action: 'token_updated'
        })
      );
    } catch (error) {
      throw new SchwabAuthError('Failed to save tokens to storage', error);
    }
  }

  async refresh(refreshToken: string, clientId: string, clientSecret: string): Promise<TokenData> {
    try {
      const response = await fetch('https://api.schwabapi.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new SchwabAuthError(`Token refresh failed: ${response.status} ${errorText}`);
      }

      const tokenResponse = await response.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        token_type?: string;
        scope?: string;
      };
      
      const expiresAt = new Date(Date.now() + (tokenResponse.expires_in * 1000)).toISOString();
      
      const tokenData: TokenData = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || refreshToken,
        expiresAt,
        tokenType: tokenResponse.token_type || 'Bearer',
        scope: tokenResponse.scope || 'api',
        createdAt: new Date().toISOString()
      };

      await this.save(tokenData);
      return tokenData;
    } catch (error) {
      if (error instanceof SchwabAuthError) {
        throw error;
      }
      throw new SchwabAuthError('Token refresh operation failed', error);
    }
  }
}