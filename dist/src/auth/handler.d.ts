import { type OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { Hono } from 'hono';
import { type Env } from '../../types/env';
declare const app: Hono<{
    Bindings: Env & {
        OAUTH_PROVIDER: OAuthHelpers;
    };
}, import("hono/types").BlankSchema, "/">;
export { app as SchwabHandler };
