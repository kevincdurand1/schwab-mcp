import { AuthErrorCode as SchwabSDKAuthErrorCode } from '@sudowealth/schwab-api';
import { type AuthError } from './errors';
/**
 * Maps a Schwab SDK error to the appropriate MCP error and metadata
 * Now uses the enhanced SDK error mapper
 */
export declare function mapSchwabError(code: SchwabSDKAuthErrorCode, originalMessage: string, schwabStatus?: number): {
    mcpError: AuthError;
    detailMessage: string;
    httpStatus: number;
};
