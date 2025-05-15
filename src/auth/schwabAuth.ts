import { createAuthClient } from '@sudowealth/schwab-api'
import  { type TokenSet } from './tokenManager'

/**
 * A lightweight service that wraps the Schwab API auth client
 * to provide a consistent interface for token operations
 */
export interface SchwabAuth {
  exchangeCode(code: string): Promise<TokenSet>
  refresh(
    refreshToken: string, 
    onSuccessfulPersist?: (token: TokenSet) => Promise<void>
  ): Promise<TokenSet>
}

/**
 * Creates a SchwabAuth service instance using the provided environment variables
 */
export function createSchwabAuth(env: {
  SCHWAB_CLIENT_ID: string
  SCHWAB_CLIENT_SECRET: string
}, redirectUri: string): SchwabAuth {
  // Create a main auth client for code exchange
  const mainAuth = createAuthClient({
    clientId: env.SCHWAB_CLIENT_ID,
    clientSecret: env.SCHWAB_CLIENT_SECRET,
    redirectUri,
    // We handle persistence ourselves, so these are no-ops
    load: async () => null,
    save: async () => {},
  })

  return {
    async exchangeCode(code: string): Promise<TokenSet> {
      const tokenSet = await mainAuth.exchangeCodeForTokens({
        code,
      })
      
      return {
        accessToken: tokenSet.accessToken,
        refreshToken: tokenSet.refreshToken || '',
        expiresAt: tokenSet.expiresAt,
      }
    },
    
    async refresh(
      refreshToken: string, 
      onSuccessfulPersist?: (token: TokenSet) => Promise<void>
    ): Promise<TokenSet> {
      try {
        // For token refresh, we create a temporary auth client with the specific refresh token
        // Note: We could cache this client for better performance, but for now creating a new one
        // each time ensures we're always using the latest refresh token without complicated state management
        const refreshAuth = createAuthClient({
          clientId: env.SCHWAB_CLIENT_ID,
          clientSecret: env.SCHWAB_CLIENT_SECRET,
          redirectUri,
          load: async () => ({
            refreshToken,
            accessToken: '', // Not strictly necessary for refresh
            expiresAt: 0,    // Not strictly necessary for refresh
          }),
          save: async () => {}, // No-op since we handle persistence explicitly
        });
        
        // Then call refreshTokens - use the load function above to get the token
        const tokenSet = await refreshAuth.refreshTokens();
        
        // Create the new token set
        const newTokenSet = {
          accessToken: tokenSet.accessToken,
          refreshToken: tokenSet.refreshToken || refreshToken, // Fall back to original if not returned
          expiresAt: tokenSet.expiresAt,
        };
        
        // If a callback was provided, wait for it to complete before returning
        // This allows the caller to decide when to persist the token
        // and ensures we don't lose tokens on partial failures
        if (onSuccessfulPersist) {
          try {
            await onSuccessfulPersist(newTokenSet);
          } catch (persistError: unknown) {
            console.error('Failed to persist token:', persistError);
            // This is critical - throw the error to indicate persistence failure
            // so the caller can implement retry logic with the original refresh token
            const errorMessage = persistError instanceof Error 
              ? persistError.message 
              : String(persistError);
            throw new Error(`Token persistence failed: ${errorMessage}`);
          }
        }
        
        return newTokenSet;
      } catch (error: unknown) {
        // Log error but don't expose internal details
        console.error('Token refresh failed:', error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : String(error);
        throw new Error(`Token refresh failed: ${errorMessage}`);
      }
    }
  }
}