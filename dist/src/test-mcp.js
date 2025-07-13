#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
// Create a minimal MCP server
const server = new Server({
    name: 'test-mcp',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Define schemas
const ListToolsRequestSchema = z.object({
    method: z.literal('tools/list'),
    params: z.object({}).optional(),
});
const CallToolRequestSchema = z.object({
    method: z.literal('tools/call'),
    params: z.object({
        name: z.string(),
        arguments: z.record(z.unknown()).optional(),
    }),
});
// Add a simple test tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'test',
                description: 'A simple test tool',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'A test message'
                        }
                    },
                    required: ['message']
                }
            }
        ]
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === 'test') {
        return {
            content: [
                {
                    type: 'text',
                    text: `Test tool called with message: ${args?.message || 'no message'}`
                }
            ]
        };
    }
    return {
        content: [
            {
                type: 'text',
                text: `Unknown tool: ${name}`
            }
        ],
        isError: true
    };
});
// Connect to stdio
async function main() {
    const transport = new (await import('@modelcontextprotocol/sdk/server/stdio.js')).StdioServerTransport();
    await server.connect(transport);
    console.error('Test MCP server started');
}
main().catch(console.error);
//# sourceMappingURL=test-mcp.js.map