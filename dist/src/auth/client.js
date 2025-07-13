import { createSchwabAuth as SchwabAuthCreatorFromLibrary, AuthStrategy, encodeOAuthState, } from '@sudowealth/schwab-api';
import { LOGGER_CONTEXTS } from '../shared/constants';
import { logger } from '../shared/log';
import { AuthErrors, formatAuthError } from './errors';
import { mapTokenPersistence } from './tokenPersistence';
// Create scoped logger for auth client
const authLogger = logger.child(LOGGER_CONTEXTS.AUTH_CLIENT);
/**
 * Creates a Schwab Auth client with enhanced features
 *
 * @param redirectUri OAuth callback URI
 * @param load Function to load tokens from storage
 * @param save Function to save tokens to storage
 * @returns Initialized Schwab auth client as EnhancedTokenManager
 */
export function initializeSchwabAuthClient(config, redirectUri = config.SCHWAB_REDIRECT_URI, load, save) {
    const clientId = config.SCHWAB_CLIENT_ID;
    const clientSecret = config.SCHWAB_CLIENT_SECRET;
    authLogger.debug('Using centralized environment for Schwab Auth client');
    authLogger.info('Initializing enhanced Schwab Auth client', {
        hasLoadFunction: !!load,
        hasSaveFunction: !!save,
    });
    // Map our load/save functions to what EnhancedTokenManager expects
    const { load: mappedLoad, save: mappedSave } = mapTokenPersistence(load, save);
    // Build options for EnhancedTokenManager with MCP-specific defaults
    const tokenManagerOptions = {
        clientId,
        clientSecret,
        redirectUri,
        load: mappedLoad,
        save: mappedSave,
        validateTokens: true,
        autoReconnect: true,
        debug: config.LOG_LEVEL === 'debug' || config.LOG_LEVEL === 'trace',
        traceOperations: config.LOG_LEVEL === 'trace',
        refreshThresholdMs: 5 * 60 * 1000,
    };
    // Configure auth with enhanced token manager
    const authConfig = {
        strategy: AuthStrategy.ENHANCED,
        oauthConfig: tokenManagerOptions,
    };
    const authClient = SchwabAuthCreatorFromLibrary(authConfig);
    return authClient;
}
/**
 * Redirects the user to Schwab's authorization page
 *
 * @param c Hono context
 * @param config Validated environment configuration
 * @param oauthReqInfo OAuth request information
 * @param headers Optional headers to include in the response
 * @returns Redirect response to Schwab's authorization page
 */
export async function redirectToSchwab(c, config, oauthReqInfo, headers = {}) {
    try {
        const auth = initializeSchwabAuthClient(config);
        // Use SDK's OAuth state encoder
        const encodedState = encodeOAuthState(oauthReqInfo);
        const { authUrl } = await auth.getAuthorizationUrl({
            state: encodedState,
        });
        // Create redirect response with any additional headers
        if (Object.keys(headers).length > 0) {
            return new Response(null, {
                status: 302,
                headers: {
                    Location: authUrl,
                    ...headers,
                },
            });
        }
        else {
            return Response.redirect(authUrl, 302);
        }
    }
    catch (error) {
        const authError = new AuthErrors.AuthUrl(error instanceof Error ? error : undefined);
        const errorInfo = formatAuthError(authError, { error });
        authLogger.error(errorInfo.message, { error });
        return new Response(errorInfo.message, { status: errorInfo.status });
    }
}
//# sourceMappingURL=client.js.map