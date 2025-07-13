/**
 * Lightweight Pino logger wrapper for Express.js
 * Provides structured logging with automatic secret redaction
 */
export type PinoLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
interface AppLogger {
    debug: (message: string, data?: any, contextId?: string) => void;
    info: (message: string, data?: any, contextId?: string) => void;
    warn: (message: string, data?: any, contextId?: string) => void;
    error: (message: string, data?: any, contextId?: string) => void;
    child: (contextId: string) => ChildLogger;
}
interface ChildLogger {
    debug: (message: string, data?: any, contextId?: string) => void;
    info: (message: string, data?: any, contextId?: string) => void;
    warn: (message: string, data?: any, contextId?: string) => void;
    error: (message: string, data?: any, contextId?: string) => void;
    child: (contextId: string) => ChildLogger;
}
/**
 * Build a logger instance with the specified log level
 */
export declare function buildLogger(level?: PinoLogLevel): AppLogger;
export declare const logger: AppLogger;
export declare class Logger {
    private context;
    private logger;
    constructor(context: string);
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, data?: any): void;
}
export {};
