import { type Server } from '@modelcontextprotocol/sdk/server/index.js';
import { type TokenStore } from '../types/auth.js';
export declare function registerTools(server: Server, tokenStore: TokenStore): Promise<void>;
