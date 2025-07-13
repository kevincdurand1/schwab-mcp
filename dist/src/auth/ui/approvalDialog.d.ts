import { type ClientInfo } from '@cloudflare/workers-oauth-provider';
import { type ValidatedEnv } from '../../../types/env';
/**
 * Configuration for the approval dialog
 */
interface ApprovalDialogOptions {
    /**
     * Client information for basic display
     */
    client: ClientInfo | null;
    /**
     * Server information
     */
    server: {
        name: string;
        logo?: string;
    };
    /**
     * State data to encode in the approval flow
     */
    state: Record<string, any>;
    /**
     * Validated environment configuration
     */
    config: ValidatedEnv;
}
/**
 * Renders an approval page that redirects to Schwab OAuth
 * Following Cloudflare's pattern of minimal custom UI
 *
 * @param request - The HTTP request
 * @param options - Configuration for the approval
 * @returns A Response containing HTML with auto-redirect
 */
export declare function renderApprovalDialog(request: Request, options: ApprovalDialogOptions): Response;
export {};
