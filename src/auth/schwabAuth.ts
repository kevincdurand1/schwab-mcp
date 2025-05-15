import { createAuthClient } from '@sudowealth/schwab-api'
import  { type TokenSet } from './tokenManager'

/**
 * A lightweight service that wraps the Schwab API auth client
 * to provide a consistent interface for token operations
 */
export interface SchwabAuth {
  exchangeCode(code: string): Promise<TokenSet>
  refresh(refreshToken: string): Promise<TokenSet>
}

/**
 * Creates a SchwabAuth service instance using the provided environment variables
 */
export function createSchwabAuth(env: {
  SCHWAB_CLIENT_ID: string
  SCHWAB_CLIENT_SECRET: string
}, redirectUri: string): SchwabAuth {
  const auth = createAuthClient({
    clientId: env.SCHWAB_CLIENT_ID,
    clientSecret: env.SCHWAB_CLIENT_SECRET,
    redirectUri,
    // We handle persistence ourselves, so these are no-ops
    load: async () => null,
    save: async () => {},
  })

  return {
    async exchangeCode(code: string): Promise<TokenSet> {
      const tokenSet = await auth.exchangeCodeForTokens({
        code,
      })
      
      return {
        accessToken: tokenSet.accessToken,
        refreshToken: tokenSet.refreshToken || '',
        expiresAt: tokenSet.expiresAt,
      }
    },
    
    async refresh(refreshToken: string): Promise<TokenSet> {
      // Create a temporary auth client configured to load the specific refreshToken
      const tempAuth = createAuthClient({
        clientId: env.SCHWAB_CLIENT_ID,
        clientSecret: env.SCHWAB_CLIENT_SECRET,
        redirectUri,
        load: async () => ({
          refreshToken,
          accessToken: '', // Not strictly necessary for refresh, but load expects a TokenSet
          expiresAt: 0,    // Not strictly necessary for refresh
        }),
        save: async () => {},
      });
      
      const tokenSet = await tempAuth.refreshTokens(); // Now uses the load above
      
      return {
        accessToken: tokenSet.accessToken,
        refreshToken: tokenSet.refreshToken || refreshToken, // Fall back to original if not returned
        expiresAt: tokenSet.expiresAt,
      }
    }
  }
}