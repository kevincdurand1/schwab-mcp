/**
 * Environment variables and bindings for the Schwab MCP worker
 */
export interface Env {
	/**
	 * Schwab OAuth client ID for API access
	 */
	SCHWAB_CLIENT_ID: string

	/**
	 * Schwab OAuth client secret for API access
	 */
	SCHWAB_CLIENT_SECRET: string

	/**
	 * Secret key used for cookie encryption
	 */
	COOKIE_ENCRYPTION_KEY: string
}
