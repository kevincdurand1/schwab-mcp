import { type AuthRequest } from '@cloudflare/workers-oauth-provider';
import { type ValidatedEnv } from '../../types/env';
import { type StateData as StateDataFromSchema } from './schemas';
export type StateData = StateDataFromSchema;
/**
 * Decodes and verifies a state parameter from OAuth callback.
 * This is now a thin wrapper around the SDK's enhanced function
 */
export declare function decodeAndVerifyState<T = AuthRequest>(config: ValidatedEnv, stateParam: string): Promise<T | null>;
/**
 * Extracts the client ID from a state object
 * Delegates to SDK implementation
 */
export declare function extractClientIdFromState(state: StateData | AuthRequest): string;
