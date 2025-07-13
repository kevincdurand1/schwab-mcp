import { type ValidatedEnv } from '../../types/env';
import { type StateData } from './stateUtils';
export declare function clientIdAlreadyApproved(request: Request, clientId: string, cookieSecret: string): Promise<boolean>;
export interface ParsedApprovalResult {
    state: StateData;
    headers: Record<string, string>;
}
export declare function parseRedirectApproval(request: Request, config: ValidatedEnv): Promise<ParsedApprovalResult>;
