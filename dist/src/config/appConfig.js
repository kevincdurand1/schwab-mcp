import { z } from 'zod';
import { logger } from '../shared/log';
const envSchema = z.object({
    SCHWAB_CLIENT_ID: z
        .string({
        required_error: 'SCHWAB_CLIENT_ID is required for OAuth authentication',
    })
        .min(1, 'SCHWAB_CLIENT_ID cannot be empty'),
    SCHWAB_CLIENT_SECRET: z
        .string({
        required_error: 'SCHWAB_CLIENT_SECRET is required for OAuth authentication',
    })
        .min(1, 'SCHWAB_CLIENT_SECRET cannot be empty'),
    SCHWAB_REDIRECT_URI: z
        .string({
        required_error: 'SCHWAB_REDIRECT_URI is required for OAuth callback',
    })
        .url('SCHWAB_REDIRECT_URI must be a valid URL'),
    SESSION_SECRET: z
        .string({
        required_error: 'SESSION_SECRET is required for Express session management',
    })
        .min(1, 'SESSION_SECRET cannot be empty'),
    REDIS_URL: z
        .string()
        .optional(),
    LOG_LEVEL: z
        .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
        .optional()
        .default('info'),
    ENVIRONMENT: z
        .enum(['development', 'staging', 'production'])
        .optional()
        .default('production'),
    PORT: z
        .string()
        .optional(),
    ALLOWED_ORIGINS: z
        .string()
        .optional(),
    PUBLIC_URL: z
        .string()
        .optional(),
});
function buildConfigInternal(env) {
    try {
        const validated = envSchema.parse(env);
        return Object.freeze(validated);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues
                .map((issue) => {
                const path = issue.path.join('.');
                return `  - ${path}: ${issue.message}`;
            })
                .join('\n');
            const msg = `Environment validation failed:\n${issues}`;
            logger.error(msg);
            throw new Error(msg);
        }
        throw error;
    }
}
// Memoized singleton config getter
export const getConfig = (() => {
    let cachedConfig = null;
    let cachedEnvHash = null;
    return (env) => {
        // Create a simple hash of the env object for memoization
        const envHash = JSON.stringify(Object.keys(env)
            .sort()
            .map((key) => [key, env[key]]));
        if (cachedConfig && cachedEnvHash === envHash) {
            return cachedConfig;
        }
        cachedConfig = buildConfigInternal(env);
        cachedEnvHash = envHash;
        return cachedConfig;
    };
})();
//# sourceMappingURL=appConfig.js.map