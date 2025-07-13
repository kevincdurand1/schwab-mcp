/**
 * Application Constants
 */
export declare const APP_NAME: "Schwab MCP";
export declare const APP_SERVER_NAME: "Schwab MCP Server";
/**
 * Server Constants
 */
export declare const CONSTANTS: {
    readonly SERVER_NAME: "schwab-mcp";
    readonly SERVER_VERSION: "1.0.0";
};
/**
 * Cookie Constants
 */
export declare const COOKIE_NAMES: {
    readonly APPROVED_CLIENTS: "mcp-approved-clients";
};
/**
 * HTTP Header Constants
 */
export declare const HTTP_HEADERS: {
    readonly COOKIE: "Cookie";
    readonly SET_COOKIE: "Set-Cookie";
};
/**
 * Logger Context Names
 */
export declare const LOGGER_CONTEXTS: {
    readonly MCP_DO: "mcp-do";
    readonly OAUTH_HANDLER: "oauth-handler";
    readonly COOKIES: "cookies";
    readonly AUTH_CLIENT: "auth-client";
    readonly STATE_UTILS: "state-utils";
    readonly KV_TOKEN_STORE: "kv-token-store";
};
/**
 * API Endpoints
 */
export declare const API_ENDPOINTS: {
    readonly SSE: "/sse";
    readonly AUTHORIZE: "/authorize";
    readonly TOKEN: "/token";
    readonly CALLBACK: "/callback";
    readonly REGISTER: "/register";
};
/**
 * Tool Names
 */
export declare const TOOL_NAMES: {
    readonly STATUS: "status";
};
/**
 * Environment Constants
 */
export declare const ENVIRONMENTS: {
    readonly PRODUCTION: "PRODUCTION";
};
/**
 * Content Types
 */
export declare const CONTENT_TYPES: {
    readonly TEXT: "text";
};
/**
 * KV Token Store Constants
 */
export declare const TOKEN_KEY_PREFIX: "token:";
export declare const TTL_31_DAYS: number;
