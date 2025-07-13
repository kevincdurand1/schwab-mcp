/**
 * Environment variables for the Schwab MCP Express server
 *
 * This is the single source of truth for environment variable definitions.
 * In runtime, these variables are validated and accessed through AppConfig.
 */
export interface Env {
    /**
     * Schwab OAuth client ID for API access
     */
    SCHWAB_CLIENT_ID: string;
    /**
     * Schwab OAuth client secret for API access
     */
    SCHWAB_CLIENT_SECRET: string;
    /**
     * OAuth redirect URI for callback after authentication
     * This should be a fixed, configured value to ensure consistency
     * across different environments and proxies
     */
    SCHWAB_REDIRECT_URI: string;
    /**
     * Session secret for Express session management
     */
    SESSION_SECRET: string;
    /**
     * Optional Redis URL for token and session storage
     */
    REDIS_URL?: string;
    /**
     * Optional log level for application logging
     */
    LOG_LEVEL?: string;
    /**
     * Environment type (development, staging, production)
     * Defaults to production if not specified
     */
    ENVIRONMENT?: string;
    /**
     * Optional server port
     */
    PORT?: string;
    /**
     * Optional allowed origins for CORS
     */
    ALLOWED_ORIGINS?: string;
    /**
     * Optional public URL for auth callbacks
     */
    PUBLIC_URL?: string;
}
/**
 * A validated Env object, with all required fields validated to be non-empty
 * Used to pass around a validated set of environment variables
 * All properties are readonly to prevent accidental modification after validation
 */
export interface ValidatedEnv {
    /**
     * Schwab OAuth client ID for API access
     */
    readonly SCHWAB_CLIENT_ID: string;
    /**
     * Schwab OAuth client secret for API access
     */
    readonly SCHWAB_CLIENT_SECRET: string;
    /**
     * OAuth redirect URI for callback after authentication
     */
    readonly SCHWAB_REDIRECT_URI: string;
    /**
     * Session secret for Express session management
     */
    readonly SESSION_SECRET: string;
    /**
     * Optional Redis URL for token and session storage
     */
    readonly REDIS_URL?: string;
    /**
     * Optional log level for application logging
     */
    readonly LOG_LEVEL?: string;
    /**
     * Environment type (development, staging, production)
     * Defaults to production if not specified
     */
    readonly ENVIRONMENT?: 'development' | 'staging' | 'production';
    /**
     * Optional server port
     */
    readonly PORT?: string;
    /**
     * Optional allowed origins for CORS
     */
    readonly ALLOWED_ORIGINS?: string;
    /**
     * Optional public URL for auth callbacks
     */
    readonly PUBLIC_URL?: string;
}
