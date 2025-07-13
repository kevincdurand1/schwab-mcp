import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { type BrokerClient } from '../core/types.js';
type ToolHandler<S extends z.ZodSchema> = (input: z.infer<S>, client: BrokerClient) => Promise<ToolResponse>;
type ToolResponse<T = unknown> = {
    ok: true;
    data: T;
    message?: string;
} | {
    ok: false;
    error: Error;
    details?: Record<string, unknown>;
};
export declare function toolError(message: string | Error | unknown, details?: Record<string, any>): ToolResponse;
export declare function toolSuccess<T>({ data, message, source, }: {
    data: T;
    message?: string;
    source: string;
}): ToolResponse<T>;
export declare function createTool<S extends z.ZodSchema<any, any>>(client: BrokerClient, server: McpServer, { name, description, schema, handler, }: {
    name: string;
    description: string;
    schema: S;
    handler: ToolHandler<S>;
}): void;
export {};
