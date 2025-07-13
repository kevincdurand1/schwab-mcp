import { AuthErrorCode as SchwabSDKAuthErrorCode, SchwabErrorMapper, } from '@sudowealth/schwab-api';
import { AuthErrors } from './errors';
// Create custom MCP error mapper
class MCPErrorMapper {
    map(error) {
        // Handle MCP-specific errors
        if (error instanceof AuthErrors.MissingClientId) {
            return {
                code: SchwabSDKAuthErrorCode.INVALID_CONFIGURATION,
                message: 'Client ID is required',
                httpStatus: 400,
                isRetryable: false,
                requiresReauth: false,
            };
        }
        if (error instanceof AuthErrors.CookieSecretMissing) {
            return {
                code: SchwabSDKAuthErrorCode.INVALID_CONFIGURATION,
                message: 'Cookie encryption key is not configured',
                httpStatus: 500,
                isRetryable: false,
                requiresReauth: false,
            };
        }
        // Return null to let default mapper handle it
        return null;
    }
}
// Create instance with MCP-specific mappings
const errorMapper = new SchwabErrorMapper({
    customMappers: [new MCPErrorMapper()],
    customAuthMappings: {
        // Override specific mappings for MCP context
        [SchwabSDKAuthErrorCode.TOKEN_PERSISTENCE_LOAD_FAILED]: {
            message: 'Failed to load tokens from KV storage',
            httpStatus: 503,
            isRetryable: true,
        },
        [SchwabSDKAuthErrorCode.TOKEN_PERSISTENCE_SAVE_FAILED]: {
            message: 'Failed to save tokens to KV storage',
            httpStatus: 503,
            isRetryable: true,
        },
    },
});
/**
 * Maps a Schwab SDK error to the appropriate MCP error and metadata
 * Now uses the enhanced SDK error mapper
 */
export function mapSchwabError(code, originalMessage, schwabStatus) {
    // Create a mock error object for the mapper
    const mockError = {
        code,
        message: originalMessage,
        status: schwabStatus,
        isRetryable: () => false,
    };
    const mapping = errorMapper.map(mockError);
    // Map the SDK error code to MCP error class
    const mcpErrorMap = {
        [SchwabSDKAuthErrorCode.INVALID_CODE]: () => new AuthErrors.TokenExchange(),
        [SchwabSDKAuthErrorCode.PKCE_VERIFIER_MISSING]: () => new AuthErrors.TokenExchange(),
        [SchwabSDKAuthErrorCode.TOKEN_EXPIRED]: () => new AuthErrors.TokenExchange(),
        [SchwabSDKAuthErrorCode.UNAUTHORIZED]: () => new AuthErrors.TokenExchange(),
        [SchwabSDKAuthErrorCode.TOKEN_PERSISTENCE_LOAD_FAILED]: () => new AuthErrors.AuthCallback(),
        [SchwabSDKAuthErrorCode.TOKEN_PERSISTENCE_SAVE_FAILED]: () => new AuthErrors.AuthCallback(),
        [SchwabSDKAuthErrorCode.TOKEN_VALIDATION_ERROR]: () => new AuthErrors.AuthCallback(),
        [SchwabSDKAuthErrorCode.TOKEN_ENDPOINT_CONFIG_ERROR]: () => new AuthErrors.AuthCallback(),
        [SchwabSDKAuthErrorCode.REFRESH_NEEDED]: () => new AuthErrors.ApiResponse(),
        [SchwabSDKAuthErrorCode.NETWORK]: () => new AuthErrors.ApiResponse(),
        [SchwabSDKAuthErrorCode.UNKNOWN]: () => new AuthErrors.AuthCallback(),
    };
    const mcpErrorFactory = mcpErrorMap[code] || (() => new AuthErrors.AuthCallback());
    return {
        mcpError: mcpErrorFactory(),
        detailMessage: mapping.message,
        httpStatus: mapping.httpStatus,
    };
}
//# sourceMappingURL=errorMapping.js.map