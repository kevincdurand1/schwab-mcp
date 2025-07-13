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
export declare class TokenSyncManager {
    private static readonly TOKEN_KEY;
    private static readonly TOKEN_SYNC_KEY;
    private static readonly TOKEN_TTL;
    private redisClient;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Store tokens with automatic sync notification
     */
    storeTokens(tokenData: TokenSyncData): Promise<void>;
    /**
     * Get current tokens
     */
    getTokens(): Promise<TokenSyncData | null>;
    /**
     * Check if tokens need refresh (within threshold)
     */
    needsRefresh(thresholdMinutes?: number): Promise<boolean>;
    /**
     * Delete tokens and send sync notification
     */
    deleteTokens(): Promise<void>;
    /**
     * Refresh tokens using the Schwab API
     */
    refreshTokens(): Promise<TokenSyncData | null>;
    /**
     * Get last sync status
     */
    getSyncStatus(): Promise<{
        timestamp: string;
        action: string;
        expiresAt?: string;
    } | null>;
}
export declare const tokenSyncManager: TokenSyncManager;
