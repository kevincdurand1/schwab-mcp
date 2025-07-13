import { sanitizeError } from '@sudowealth/schwab-api';
// Keep any MCP-specific logging logic
export function logOnlyInDevelopment(logger, level, message, data) {
    if (process.env.NODE_ENV !== 'production') {
        logger[level](message, data ? sanitizeError(data) : undefined);
    }
}
//# sourceMappingURL=secureLogger.js.map