import { decodeOAuthState, createCookieTokenStore, } from '@sudowealth/schwab-api';
import { LOGGER_CONTEXTS, COOKIE_NAMES, HTTP_HEADERS, } from '../shared/constants';
import { logger } from '../shared/log';
import { AuthErrors } from './errors';
import { ApprovedClientsSchema } from './schemas';
import { extractClientIdFromState } from './stateUtils';
// Create scoped logger for cookie operations
const cookieLogger = logger.child(LOGGER_CONTEXTS.COOKIES);
const MCP_APPROVAL = COOKIE_NAMES.APPROVED_CLIENTS;
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;
// Initialize cookie store for approved clients
let approvalCookieStore = null;
/**
 * Get or create the approval cookie store
 */
function getApprovalCookieStore(secret) {
    if (!approvalCookieStore) {
        const options = {
            encryptionKey: secret,
            cookieName: MCP_APPROVAL,
            cookieOptions: {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                maxAge: ONE_YEAR_IN_SECONDS,
                path: '/',
            },
            validateOnLoad: false, // We'll validate with Zod schema
        };
        approvalCookieStore = createCookieTokenStore(options);
    }
    return approvalCookieStore;
}
/**
 * Extracts and validates the approved clients from the cookie.
 */
async function parseApprovalCookie(cookieHeader, secret) {
    const store = getApprovalCookieStore(secret);
    try {
        // Use store's load method which handles verification
        const data = await store.load(cookieHeader);
        if (!data) {
            return undefined;
        }
        // We store the client IDs as a JSON string in the accessToken field
        try {
            const approvedClients = JSON.parse(data.accessToken);
            return ApprovedClientsSchema.parse(approvedClients);
        }
        catch (e) {
            cookieLogger.warn('Cookie payload validation failed:', e);
            return undefined;
        }
    }
    catch (error) {
        cookieLogger.error('Error parsing approval cookie:', error);
        return undefined;
    }
}
/**
 * Sets the approval cookie with the provided client IDs.
 */
async function setApprovalCookie(approvedClients, secret) {
    const store = getApprovalCookieStore(secret);
    // We're abusing the TokenData interface a bit here
    // Store the approved clients as a JSON string in the accessToken field
    const pseudoTokenData = {
        accessToken: JSON.stringify(approvedClients), // Store as JSON string
        refreshToken: '',
        expiresAt: Date.now() + ONE_YEAR_IN_SECONDS * 1000,
    };
    return await store.save(pseudoTokenData);
}
export async function clientIdAlreadyApproved(request, clientId, cookieSecret) {
    if (!clientId)
        return false;
    const cookieHeader = request.headers.get('Cookie');
    const approvedClients = await parseApprovalCookie(cookieHeader, cookieSecret);
    return approvedClients?.includes(clientId) ?? false;
}
export async function parseRedirectApproval(request, config) {
    const cookieSecret = config.COOKIE_ENCRYPTION_KEY;
    if (request.method !== 'POST') {
        throw new AuthErrors.InvalidRequestMethod();
    }
    let encodedState;
    let state;
    let clientId;
    try {
        const formData = await request.formData();
        const stateParam = formData.get('state');
        if (typeof stateParam !== 'string' || !stateParam) {
            throw new AuthErrors.MissingFormState();
        }
        encodedState = stateParam;
        // The approval dialog uses btoa() to encode the state, which is standard base64
        // We should use atob() to decode it, not the OAuth state decoder
        // This matches how the state is encoded in src/auth/ui/approvalDialog.ts
        let decodedState;
        try {
            const decodedStateJson = atob(encodedState);
            decodedState = JSON.parse(decodedStateJson);
        }
        catch {
            // If standard base64 decoding fails, try the OAuth decoder as fallback
            cookieLogger.warn('Standard base64 decode failed, trying OAuth decoder');
            const oauthDecoded = decodeOAuthState(encodedState);
            if (!oauthDecoded) {
                throw new AuthErrors.InvalidState();
            }
            decodedState = oauthDecoded;
        }
        state = decodedState;
        clientId = extractClientIdFromState(state);
    }
    catch (e) {
        cookieLogger.error('Error processing form submission:', e);
        if (e instanceof AuthErrors.InvalidState ||
            e instanceof AuthErrors.MissingFormState ||
            e instanceof AuthErrors.ClientIdExtraction) {
            throw e;
        }
        throw new AuthErrors.CookieDecode(e instanceof Error ? e : undefined);
    }
    // Get existing approved clients
    const cookieHeader = request.headers.get('Cookie');
    const existingApprovedClients = (await parseApprovalCookie(cookieHeader, cookieSecret)) ?? [];
    // Add the newly approved client ID (avoid duplicates)
    const updatedApprovedClients = Array.from(new Set([...existingApprovedClients, clientId]));
    // Create the Set-Cookie header
    const cookieHeaderValue = await setApprovalCookie(updatedApprovedClients, cookieSecret);
    return {
        state,
        headers: { [HTTP_HEADERS.SET_COOKIE]: cookieHeaderValue },
    };
}
//# sourceMappingURL=cookies.js.map