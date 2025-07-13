import { type z } from 'zod';
import { type BrokerClient } from '../core/types.js';
export interface ToolSpec<S extends z.ZodSchema> {
    name: string;
    description: string;
    schema: S;
    call: (client: BrokerClient, params: z.infer<S>) => Promise<unknown>;
}
export declare function createToolSpec<S extends z.ZodSchema>(spec: {
    name: string;
    description: string;
    schema: S;
    call: (client: BrokerClient, params: z.infer<S>) => Promise<unknown>;
}): ToolSpec<S>;
