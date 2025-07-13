type AuthErrorKind = 'MissingClientId' | 'MissingState' | 'MissingParameters' | 'InvalidState' | 'CookieDecode' | 'InvalidCookieFormat' | 'InvalidRequestMethod' | 'MissingFormState' | 'ClientIdExtraction' | 'CookieSignature' | 'AuthRequest' | 'AuthApproval' | 'AuthCallback' | 'AuthUrl' | 'NoUserId' | 'TokenExchange' | 'ApiResponse' | 'CookieSecretMissing';
export declare abstract class AuthError extends Error {
    readonly kind: AuthErrorKind;
    readonly status: number;
    constructor(kind: AuthErrorKind, status: number, message: string, cause?: Error);
}
export declare const AuthErrors: {
    readonly MissingClientId: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly MissingState: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly MissingParameters: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly InvalidState: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly CookieDecode: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly InvalidCookieFormat: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly InvalidRequestMethod: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly MissingFormState: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly ClientIdExtraction: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly CookieSignature: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly AuthRequest: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly AuthApproval: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly AuthCallback: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly AuthUrl: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly NoUserId: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly TokenExchange: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly ApiResponse: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
    readonly CookieSecretMissing: {
        new (cause?: Error): {
            readonly kind: AuthErrorKind;
            readonly status: number;
            name: string;
            message: string;
            stack?: string;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function): void;
        prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
        stackTraceLimit: number;
    };
};
interface JsonErrorResponse {
    code: string;
    message: string;
    requestId?: string;
    details?: Record<string, any>;
}
interface ErrorResponse {
    message: string;
    status: number;
    details?: any;
}
export declare function formatAuthError(error: AuthError, details?: Record<string, any>): ErrorResponse;
export declare function createJsonErrorResponse(error: AuthError, requestId?: string, additionalDetails?: Record<string, any>): JsonErrorResponse;
export {};
