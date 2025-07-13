/**
 * Lightweight Pino logger wrapper for Express.js
 * Provides structured logging with automatic secret redaction
 */

import pino from 'pino'

// Pino log levels
export type PinoLogLevel =
	| 'trace'
	| 'debug'
	| 'info'
	| 'warn'
	| 'error'
	| 'fatal'

// Logger type that matches our existing interface
interface AppLogger {
	debug: (message: string, data?: any, contextId?: string) => void
	info: (message: string, data?: any, contextId?: string) => void
	warn: (message: string, data?: any, contextId?: string) => void
	error: (message: string, data?: any, contextId?: string) => void
	child: (contextId: string) => ChildLogger
}

// Child logger interface
interface ChildLogger {
  debug: (message: string, data?: any, contextId?: string) => void
  info: (message: string, data?: any, contextId?: string) => void
  warn: (message: string, data?: any, contextId?: string) => void
  error: (message: string, data?: any, contextId?: string) => void
  child: (contextId: string) => ChildLogger
}

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
]

// Custom serializers for additional redaction
const serializers = {
	// Redact authorization headers
	req: (req: any) => {
		const serialized = pino.stdSerializers.req(req)
		if (serialized.headers?.authorization) {
			serialized.headers.authorization = '[REDACTED]'
		}
		if (serialized.headers?.cookie) {
			serialized.headers.cookie = '[REDACTED]'
		}
		return serialized
	},
	// Redact sensitive error properties
	err: (err: any) => {
		const serialized = pino.stdSerializers.err(err)
		// Add any custom error redaction here if needed
		return serialized
	},
}

// Pino configuration for Express.js server
const pinoConfig: pino.LoggerOptions = {
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
}

/**
 * Build a logger instance with the specified log level
 */
export function buildLogger(level: PinoLogLevel = 'info'): AppLogger {
	// Create base pino instance
	const baseLogger = pino({
		...pinoConfig,
		level,
	})

	// Create wrapper that matches our existing interface
	const createLogFunction = (
		logFn: pino.LogFn,
	): ((message: string, data?: any, contextId?: string) => void) => {
		return (message: string, data?: any, contextId?: string) => {
			if (contextId) {
				logFn({ contextId, ...data }, message)
			} else if (data !== undefined) {
				logFn(data, message)
			} else {
				logFn(message)
			}
		}
	}

	const logger: AppLogger = {
		debug: createLogFunction(baseLogger.debug.bind(baseLogger)),
		info: createLogFunction(baseLogger.info.bind(baseLogger)),
		warn: createLogFunction(baseLogger.warn.bind(baseLogger)),
		error: createLogFunction(baseLogger.error.bind(baseLogger)),
		child: (contextId: string): ChildLogger => {
			const childLogger = baseLogger.child({ contextId })

			const createChildLogFunction = (
				logFn: pino.LogFn,
			): ((message: string, data?: any, contextId?: string) => void) => {
				return (message: string, data?: any, additionalContextId?: string) => {
					if (additionalContextId) {
						logFn({ contextId: additionalContextId, ...data }, message)
					} else if (data !== undefined) {
						logFn(data, message)
					} else {
						logFn(message)
					}
				}
			}

			      return {
        debug: createChildLogFunction(childLogger.debug.bind(childLogger)),
        info: createChildLogFunction(childLogger.info.bind(childLogger)),
        warn: createChildLogFunction(childLogger.warn.bind(childLogger)),
        error: createChildLogFunction(childLogger.error.bind(childLogger)),
        child: (nestedContextId: string) => {
          const nestedLogger = childLogger.child({ contextId: nestedContextId })
          return {
            debug: createChildLogFunction(nestedLogger.debug.bind(nestedLogger)),
            info: createChildLogFunction(nestedLogger.info.bind(nestedLogger)),
            warn: createChildLogFunction(nestedLogger.warn.bind(nestedLogger)),
            error: createChildLogFunction(nestedLogger.error.bind(nestedLogger)),
            child: (ctx: string) => logger.child(ctx)
          }
        }
      }
		},
	}

	return logger
}

// Create singleton logger instance with default level
// This will be reconfigured in MyMCP.init() with the actual level from config
export const logger = buildLogger('info')

// Export Logger class for compatibility
export class Logger {
  private logger: AppLogger
  
  constructor(private context: string) {
    this.logger = logger.child(context)
  }
  
  debug(message: string, data?: any) {
    this.logger.debug(message, data)
  }
  
  info(message: string, data?: any) {
    this.logger.info(message, data)
  }
  
  warn(message: string, data?: any) {
    this.logger.warn(message, data)
  }
  
  error(message: string, data?: any) {
    this.logger.error(message, data)
  }
}
