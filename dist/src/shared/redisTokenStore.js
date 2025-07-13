// Use console.error for logging to avoid polluting stdout (MCP communication channel)
const log = {
    debug: (msg, data) => { }, // Silent in production
    info: (msg, data) => console.error(`[INFO] ${msg}`, data || ''),
    error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
};
export class RedisTokenStore {
    client;
    static TOKEN_KEY = 'schwab-mcp:token'; // Fixed key for single user
    static TOKEN_TTL = 31 * 24 * 60 * 60; // 31 days in seconds
    constructor(client) {
        this.client = client;
    }
    async get(userId) {
        try {
            const data = await this.client.get(RedisTokenStore.TOKEN_KEY);
            if (!data) {
                log.debug('No token found');
                return null;
            }
            const tokenData = JSON.parse(data);
            // Check if token is expired
            if (tokenData.expiresAt && new Date(tokenData.expiresAt) < new Date()) {
                log.info('Token expired, removing');
                await this.delete();
                return null;
            }
            return tokenData;
        }
        catch (error) {
            log.error('Error retrieving token:', error);
            return null;
        }
    }
    async set(userIdOrTokenData, tokenData) {
        try {
            // Handle both old and new signatures for backward compatibility
            const data = typeof userIdOrTokenData === 'string' ? tokenData : userIdOrTokenData;
            const dataString = JSON.stringify(data);
            // Set with TTL
            await this.client.setEx(RedisTokenStore.TOKEN_KEY, RedisTokenStore.TOKEN_TTL, dataString);
            log.debug('Token stored');
        }
        catch (error) {
            log.error('Error storing token:', error);
            throw error;
        }
    }
    async delete(userId) {
        try {
            await this.client.del(RedisTokenStore.TOKEN_KEY);
            log.debug('Token deleted');
        }
        catch (error) {
            log.error('Error deleting token:', error);
            throw error;
        }
    }
    async refresh(userIdOrTokenData, newTokenData) {
        try {
            // Handle both old and new signatures
            const data = typeof userIdOrTokenData === 'string' ? newTokenData : userIdOrTokenData;
            const existingData = await this.get();
            if (!existingData) {
                throw new Error('No existing token found');
            }
            const updatedData = {
                ...existingData,
                ...data,
                updatedAt: new Date().toISOString()
            };
            await this.set(updatedData);
            log.info('Token refreshed');
        }
        catch (error) {
            log.error('Error refreshing token:', error);
            throw error;
        }
    }
}
export function createTokenStore(redisClient) {
    return new RedisTokenStore(redisClient);
}
//# sourceMappingURL=redisTokenStore.js.map