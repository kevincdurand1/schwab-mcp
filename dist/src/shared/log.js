/**
 * Lightweight Pino logger wrapper for Express.js
 * Provides structured logging with automatic secret redaction
 */
import pino from 'pino';
// Redaction paths for sensitive data
const REDACT_PATHS = [
    'password',
    'secret',
    'token',
    'key',
    'auth',
    'authorization',
    'cookie',
    'session',
    'accessToken',
    'refreshToken',
    'api_key',
    'apiKey',
    'client_secret',
    'clientSecret',
    'schwabUserId',
    'clientId',
    'accountNumber',
    'hashValue',
    'schwabClientCorrelId',
    'sourceKey',
    'expectedKey',
    'tokenKey',
    'fromKey',
    'toKey',
    '*.password',
    '*.secret',
    '*.token',
    '*.key',
    '*.auth',
    '*.authorization',
    '*.cookie',
    '*.session',
    '*.accessToken',
    '*.refreshToken',
    '*.api_key',
    '*.apiKey',
    '*.client_secret',
    '*.clientSecret',
    '*.schwabUserId',
    '*.clientId',
    '*.accountNumber',
    '*.hashValue',
    '*.schwabClientCorrelId',
    '*.sourceKey',
    '*.expectedKey',
    '*.tokenKey',
    '*.fromKey',
    '*.toKey',
];
// Custom serializers for additional redaction
const serializers = {
    // Redact authorization headers
    req: (req) => {
        const serialized = pino.stdSerializers.req(req);
        if (serialized.headers?.authorization) {
            serialized.headers.authorization = '[REDACTED]';
        }
        if (serialized.headers?.cookie) {
            serialized.headers.cookie = '[REDACTED]';
        }
        return serialized;
    },
    // Redact sensitive error properties
    err: (err) => {
        const serialized = pino.stdSerializers.err(err);
        // Add any custom error redaction here if needed
        return serialized;
    },
};
// Pino configuration for Express.js server
const pinoConfig = {
    // Set redaction paths
    redact: {
        paths: REDACT_PATHS,
        censor: '[REDACTED]',
    },
    // Custom serializers
    serializers,
    // Format timestamps
    timestamp: pino.stdTimeFunctions.isoTime,
    // Base context
    base: {
        env: 'express-server',
    },
};
/**
 * Build a logger instance with the specified log level
 */
export function buildLogger(level = 'info') {
    // Create base pino instance
    const baseLogger = pino({
        ...pinoConfig,
        level,
    });
    // Create wrapper that matches our existing interface
    const createLogFunction = (logFn) => {
        return (message, data, contextId) => {
            if (contextId) {
                logFn({ contextId, ...data }, message);
            }
            else if (data !== undefined) {
                logFn(data, message);
            }
            else {
                logFn(message);
            }
        };
    };
    const logger = {
        debug: createLogFunction(baseLogger.debug.bind(baseLogger)),
        info: createLogFunction(baseLogger.info.bind(baseLogger)),
        warn: createLogFunction(baseLogger.warn.bind(baseLogger)),
        error: createLogFunction(baseLogger.error.bind(baseLogger)),
        child: (contextId) => {
            const childLogger = baseLogger.child({ contextId });
            const createChildLogFunction = (logFn) => {
                return (message, data, additionalContextId) => {
                    if (additionalContextId) {
                        logFn({ contextId: additionalContextId, ...data }, message);
                    }
                    else if (data !== undefined) {
                        logFn(data, message);
                    }
                    else {
                        logFn(message);
                    }
                };
            };
            return {
                debug: createChildLogFunction(childLogger.debug.bind(childLogger)),
                info: createChildLogFunction(childLogger.info.bind(childLogger)),
                warn: createChildLogFunction(childLogger.warn.bind(childLogger)),
                error: createChildLogFunction(childLogger.error.bind(childLogger)),
                child: (nestedContextId) => {
                    const nestedLogger = childLogger.child({ contextId: nestedContextId });
                    return {
                        debug: createChildLogFunction(nestedLogger.debug.bind(nestedLogger)),
                        info: createChildLogFunction(nestedLogger.info.bind(nestedLogger)),
                        warn: createChildLogFunction(nestedLogger.warn.bind(nestedLogger)),
                        error: createChildLogFunction(nestedLogger.error.bind(nestedLogger)),
                        child: (ctx) => logger.child(ctx)
                    };
                }
            };
        },
    };
    return logger;
}
// Create singleton logger instance with default level
// This will be reconfigured in MyMCP.init() with the actual level from config
export const logger = buildLogger('info');
// Export Logger class for compatibility
export class Logger {
    context;
    logger;
    constructor(context) {
        this.context = context;
        this.logger = logger.child(context);
    }
    debug(message, data) {
        this.logger.debug(message, data);
    }
    info(message, data) {
        this.logger.info(message, data);
    }
    warn(message, data) {
        this.logger.warn(message, data);
    }
    error(message, data) {
        this.logger.error(message, data);
    }
}
//# sourceMappingURL=log.js.map