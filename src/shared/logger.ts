/**
 * Centralized logger for the application
 * Includes different log levels and ensures sensitive data is not logged
 */

enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

// Current log level for the application
// Can be set based on environment
const currentLogLevel = LogLevel.INFO

/**
 * Sanitizes log data to ensure no tokens or sensitive information is logged
 *
 * @param data The data to be sanitized
 * @returns Sanitized data safe for logging
 */
function sanitizeLogData(data: any): any {
	if (typeof data === 'string') {
		// Redact potential tokens from strings
		return data
			.replace(
				/Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_.+/=]*/g,
				'Bearer [REDACTED]',
			)
			.replace(
				/accessToken["']?\s*:\s*["']?[^"',}]*["']?/g,
				'accessToken: "[REDACTED]"',
			)
			.replace(
				/refreshToken["']?\s*:\s*["']?[^"',}]*["']?/g,
				'refreshToken: "[REDACTED]"',
			)
	}

	if (data === null || data === undefined) {
		return data
	}

	if (typeof data === 'object') {
		if (Array.isArray(data)) {
			return data.map(sanitizeLogData)
		}

		const sanitized: Record<string, any> = {}
		for (const [key, value] of Object.entries(data)) {
			// Skip sensitive keys entirely
			if (
				['password', 'secret', 'token', 'key', 'auth'].some((k) =>
					key.toLowerCase().includes(k),
				)
			) {
				sanitized[key] = '[REDACTED]'
			} else {
				sanitized[key] = sanitizeLogData(value)
			}
		}
		return sanitized
	}

	return data
}

/**
 * Creates a log entry with the specified level and message
 *
 * @param level The log level
 * @param message The log message
 * @param data Optional data to include with the log
 */
function log(level: LogLevel, message: string, data?: any) {
	if (level < currentLogLevel) return

	const sanitizedData = data ? sanitizeLogData(data) : undefined
	const timestamp = new Date().toISOString()
	const levelName = LogLevel[level]

	switch (level) {
		case LogLevel.DEBUG:
			console.debug(`[${timestamp}] [${levelName}] ${message}`, sanitizedData)
			break
		case LogLevel.INFO:
			console.info(`[${timestamp}] [${levelName}] ${message}`, sanitizedData)
			break
		case LogLevel.WARN:
			console.warn(`[${timestamp}] [${levelName}] ${message}`, sanitizedData)
			break
		case LogLevel.ERROR:
			console.error(`[${timestamp}] [${levelName}] ${message}`, sanitizedData)
			break
	}
}

// Public API
export const logger = {
	debug: (message: string, data?: any) => log(LogLevel.DEBUG, message, data),
	info: (message: string, data?: any) => log(LogLevel.INFO, message, data),
	warn: (message: string, data?: any) => log(LogLevel.WARN, message, data),
	error: (message: string, data?: any) => log(LogLevel.ERROR, message, data),
}
