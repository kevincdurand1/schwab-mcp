import { createApiClient, EnhancedTokenManager } from '@sudowealth/schwab-api';
// Use console.error for logging to avoid polluting stdout (MCP communication channel)
const log = {
    info: (msg, data) => console.error(`[SchwabClient] ${msg}`, data || ''),
    error: (msg, data) => console.error(`[SchwabClient] ${msg}`, data || ''),
};
/**
 * Create a Schwab API client with proper token management
 * @param redisClient - Shared Redis client instance (connection must be open)
 * @returns Configured Schwab API client
 */
export async function getSchwabClient(redisClient) {
    if (!redisClient || !redisClient.isOpen) {
        throw new Error('Redis client must be provided and connected');
    }
    const TOKEN_KEY = 'schwab-mcp:token';
    const TOKEN_TTL = 31 * 24 * 60 * 60; // 31 days
    // Create EnhancedTokenManager with proper Redis integration
    const tokenManager = new EnhancedTokenManager({
        clientId: process.env.SCHWAB_CLIENT_ID,
        clientSecret: process.env.SCHWAB_CLIENT_SECRET,
        redirectUri: process.env.SCHWAB_REDIRECT_URI || 'https://127.0.0.1:5001/api/SchwabAuth/callback',
        // CRITICAL FIX: Load fresh tokens from Redis every time
        load: async () => {
            try {
                const tokenData = await redisClient.get(TOKEN_KEY);
                if (!tokenData) {
                    log.error('No tokens found in Redis');
                    throw new Error('No authentication tokens found');
                }
                const tokens = JSON.parse(tokenData);
                log.info('Loaded fresh tokens from Redis', {
                    hasAccessToken: !!tokens.accessToken,
                    hasRefreshToken: !!tokens.refreshToken,
                    expiresAt: tokens.expiresAt
                });
                // Check if token is expired
                if (new Date(tokens.expiresAt) < new Date()) {
                    log.error('Token expired', { expiresAt: tokens.expiresAt });
                    throw new Error('Authentication token expired');
                }
                return {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresAt: tokens.expiresAt,
                    tokenType: tokens.tokenType || 'Bearer',
                    scope: tokens.scope || 'api',
                    createdAt: tokens.createdAt || new Date().toISOString()
                };
            }
            catch (error) {
                log.error('Failed to load tokens from Redis:', error);
                throw error;
            }
        },
        // Save refreshed tokens back to Redis
        save: async (newTokenData) => {
            log.info('Token refresh detected, saving to Redis');
            try {
                // Get existing token data for fields not provided in refresh
                const existingData = await redisClient.get(TOKEN_KEY);
                const existing = existingData ? JSON.parse(existingData) : {};
                const updatedTokenData = {
                    accessToken: newTokenData.accessToken,
                    refreshToken: newTokenData.refreshToken || existing.refreshToken,
                    expiresAt: newTokenData.expiresAt,
                    tokenType: newTokenData.tokenType || existing.tokenType || 'Bearer',
                    scope: newTokenData.scope || existing.scope || 'api',
                    createdAt: existing.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                // Save to Redis with TTL
                await redisClient.setEx(TOKEN_KEY, TOKEN_TTL, JSON.stringify(updatedTokenData));
                // Set sync notification
                await redisClient.setEx('schwab-mcp:token-sync', TOKEN_TTL, JSON.stringify({
                    timestamp: new Date().toISOString(),
                    action: 'refreshed',
                    expiresAt: updatedTokenData.expiresAt,
                    source: 'EnhancedTokenManager'
                }));
                log.info('✅ Refreshed tokens saved to Redis successfully');
            }
            catch (error) {
                log.error('❌ Failed to save refreshed tokens to Redis:', error);
                // Don't throw - allow API call to continue even if save fails
            }
        }
    });
    // Create API client with proper configuration
    return await createApiClient({
        auth: tokenManager, // Pass the token manager, not a string!
        config: {
            baseUrl: 'https://api.schwabapi.com',
            // SDK automatically handles /trader/v1 and /marketdata/v1 paths
        }
    });
}
//# sourceMappingURL=schwabClient.js.map