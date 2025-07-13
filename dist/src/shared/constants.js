/**
 * Application Constants
 */
export const APP_NAME = 'Schwab MCP';
export const APP_SERVER_NAME = 'Schwab MCP Server';
/**
 * Server Constants
 */
export const CONSTANTS = {
    SERVER_NAME: 'schwab-mcp',
    SERVER_VERSION: '1.0.0',
};
/**
 * Cookie Constants
 */
export const COOKIE_NAMES = {
    APPROVED_CLIENTS: 'mcp-approved-clients',
};
/**
 * HTTP Header Constants
 */
export const HTTP_HEADERS = {
    COOKIE: 'Cookie',
    SET_COOKIE: 'Set-Cookie',
};
/**
 * Logger Context Names
 */
export const LOGGER_CONTEXTS = {
    MCP_DO: 'mcp-do',
    OAUTH_HANDLER: 'oauth-handler',
    COOKIES: 'cookies',
    AUTH_CLIENT: 'auth-client',
    STATE_UTILS: 'state-utils',
    KV_TOKEN_STORE: 'kv-token-store',
};
/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
    SSE: '/sse',
    AUTHORIZE: '/authorize',
    TOKEN: '/token',
    CALLBACK: '/callback',
    REGISTER: '/register',
};
/**
 * Tool Names
 */
export const TOOL_NAMES = {
    STATUS: 'status',
};
/**
 * Environment Constants
 */
export const ENVIRONMENTS = {
    PRODUCTION: 'PRODUCTION',
};
/**
 * Content Types
 */
export const CONTENT_TYPES = {
    TEXT: 'text',
};
/**
 * KV Token Store Constants
 */
export const TOKEN_KEY_PREFIX = 'token:';
export const TTL_31_DAYS = 31 * 24 * 60 * 60;
//# sourceMappingURL=constants.js.map