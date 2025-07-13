import { type OAuthHelpers, type AuthRequest } from '@cloudflare/workers-oauth-provider';
import { type TokenData, type EnhancedTokenManager } from '@sudowealth/schwab-api';
import { type Context } from 'hono';
import { type BlankInput } from 'hono/types';
import { type ValidatedEnv, type Env } from '../../types/env';
/**
 * Creates a Schwab Auth client with enhanced features
 *
 * @param redirectUri OAuth callback URI
 * @param load Function to load tokens from storage
 * @param save Function to save tokens to storage
 * @returns Initialized Schwab auth client as EnhancedTokenManager
 */
export declare function initializeSchwabAuthClient(config: ValidatedEnv, redirectUri?: string, load?: () => Promise<TokenData | null>, save?: (tokenData: TokenData) => Promise<void>): EnhancedTokenManager;
/**
 * Redirects the user to Schwab's authorization page
 *
 * @param c Hono context
 * @param config Validated environment configuration
 * @param oauthReqInfo OAuth request information
 * @param headers Optional headers to include in the response
 * @returns Redirect response to Schwab's authorization page
 */
export declare function redirectToSchwab(c: Context<{
    Bindings: Env & {
        OAUTH_PROVIDER: OAuthHelpers;
    };
}, '/authorize', BlankInput>, config: ValidatedEnv, oauthReqInfo: AuthRequest, headers?: HeadersInit): Promise<Response>;
