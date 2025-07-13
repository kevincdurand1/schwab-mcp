import { Router } from 'express';
import { type TokenStore } from '../types/auth.js';
interface OAuthSession {
    state?: string;
    codeVerifier?: string;
}
declare module 'express-session' {
    interface SessionData {
        oauth: OAuthSession;
    }
}
export declare function createOAuthHandler(tokenStore: TokenStore): Router;
export {};
