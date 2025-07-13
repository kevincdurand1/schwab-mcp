import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getBrokerFactory, getBrokerConfigFromEnv } from '../core/brokerFactory.js';
import { marketTools } from './market/index.js';
import { traderTools } from './trader/index.js';
// Use console.error for logging to avoid polluting stdout (MCP communication channel)
const log = {
    info: (msg, data) => console.error(`[INFO] ${msg}`, data || ''),
    error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
};
// Define the tool call request schema
const CallToolRequestSchema = z.object({
    method: z.literal('tools/call'),
    params: z.object({
        name: z.string(),
        arguments: z.record(z.unknown()).optional(),
        _meta: z.object({
            progressToken: z.union([z.string(), z.number()]).optional(),
        }).passthrough().optional(),
    }).passthrough(),
});
// Define the list tools request schema  
const ListToolsRequestSchema = z.object({
    method: z.literal('tools/list'),
    params: z.object({
        _meta: z.object({
            progressToken: z.union([z.string(), z.number()]).optional(),
        }).passthrough().optional(),
    }).passthrough().optional(),
});
export async function registerTools(server, tokenStore) {
    // Combine all tools
    const allTools = [...marketTools, ...traderTools];
    // Build tool definitions with original schemas (no userId requirement)
    const toolDefinitions = allTools.map(toolSpec => {
        // Convert Zod schema to JSON schema
        const jsonSchema = zodToJsonSchema(toolSpec.schema, {
            target: 'jsonSchema7',
            $refStrategy: 'none'
        });
        return {
            name: toolSpec.name,
            description: toolSpec.description,
            inputSchema: jsonSchema
        };
    });
    // Add authentication helper tool
    const authToolDefinition = {
        name: 'authenticate',
        description: 'Get the authentication URL for connecting your Schwab account',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
            additionalProperties: false
        }
    };
    // Add auth tool to the list
    toolDefinitions.push(authToolDefinition);
    // Register tools/list handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        log.info('Handling tools/list request');
        return {
            tools: toolDefinitions
        };
    });
    // Register tools/call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            const { name: toolName, arguments: toolArgs = {} } = request.params;
            log.info(`Executing tool: ${toolName}`, { toolArgs });
            // Handle authentication tool
            if (toolName === 'authenticate') {
                // Check if already authenticated
                const existingTokenData = await tokenStore.get();
                if (existingTokenData && new Date(existingTokenData.expiresAt) > new Date()) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `✅ Already authenticated! Your Schwab account is connected and ready to use.\n\nToken expires at: ${existingTokenData.expiresAt}\nScopes: ${existingTokenData.scope || 'api'}\n\nYou can now use all Schwab MCP tools.`
                            }
                        ]
                    };
                }
                // Check for pre-stored tokens in environment first
                const accessToken = process.env.SCHWAB_ACCESS_TOKEN;
                const refreshToken = process.env.SCHWAB_REFRESH_TOKEN;
                if (accessToken && refreshToken) {
                    // Store tokens from environment
                    const expiresAt = new Date();
                    expiresAt.setHours(expiresAt.getHours() + 1); // Assume 1 hour expiry
                    await tokenStore.set({
                        accessToken,
                        refreshToken,
                        expiresAt: expiresAt.toISOString(),
                        tokenType: 'Bearer',
                        scope: 'api',
                        createdAt: new Date().toISOString()
                    });
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `✅ Authentication successful! Tokens loaded from environment variables.\n\nYour Schwab account is now connected and ready to use.\n\nYou can now use all Schwab MCP tools.`
                            }
                        ]
                    };
                }
                // Not authenticated, provide OAuth URL (using new callback URL)
                const authUrl = `${process.env.PUBLIC_URL || 'https://127.0.0.1:3000'}/auth/login`;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `🔐 Authentication Required\n\nTo use Schwab MCP tools, you need to authenticate with your Schwab account.\n\n📋 Steps:\n1. Visit: ${authUrl}\n2. Log in with your Schwab credentials\n3. Complete OAuth (will redirect to port 5001)\n4. Run this authenticate tool again to verify\n\nAfter successful authentication, you'll have access to all Schwab MCP tools.\n\n⚠️ Note: You may need to accept the SSL certificate warning for 127.0.0.1`
                        }
                    ]
                };
            }
            // Handle regular tools
            const toolSpec = allTools.find(tool => tool.name === toolName);
            if (!toolSpec) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: Unknown tool '${toolName}'`
                        }
                    ],
                    isError: true
                };
            }
            // Get and validate token (no userId needed)
            const tokenData = await tokenStore.get();
            if (!tokenData) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Error: Not authenticated. Please use the authenticate tool first.'
                        }
                    ],
                    isError: true
                };
            }
            // PROACTIVE TOKEN REFRESH: Check if token will expire soon and refresh if needed
            const expirationTime = new Date(tokenData.expiresAt);
            const now = new Date();
            const timeToExpiry = expirationTime.getTime() - now.getTime();
            const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
            if (timeToExpiry < REFRESH_THRESHOLD) {
                log.info('Token expires soon, attempting proactive refresh');
                try {
                    // Use the Express server's refresh endpoint
                    const refreshResponse = await fetch(`${process.env.PUBLIC_URL || 'https://127.0.0.1:3000'}/auth/refresh`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    if (refreshResponse.ok) {
                        log.info('Token refreshed proactively');
                        // Get the updated token data
                        const updatedTokenData = await tokenStore.get();
                        if (updatedTokenData && new Date(updatedTokenData.expiresAt) > new Date()) {
                            // Use updated token data for API call
                            const brokerConfig = getBrokerConfigFromEnv();
                            const brokerFactory = getBrokerFactory();
                            // Pass the Redis client from the token store instead of token data
                            const redisClient = tokenStore.client;
                            if (!redisClient || !redisClient.isOpen) {
                                throw new Error('Redis client not available or not connected');
                            }
                            const client = await brokerFactory.createClient(brokerConfig, redisClient);
                            const result = await toolSpec.call(client, toolArgs);
                            return {
                                content: [
                                    {
                                        type: 'text',
                                        text: JSON.stringify(result, null, 2)
                                    }
                                ]
                            };
                        }
                    }
                    else {
                        log.error('Proactive token refresh failed');
                    }
                }
                catch (refreshError) {
                    log.error('Error during proactive token refresh:', refreshError);
                }
            }
            // Check token expiration (final check)
            if (new Date(tokenData.expiresAt) < new Date()) {
                log.info('Token expired, user needs to re-authenticate');
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Error: Token expired. Please re-authenticate using the authenticate tool.'
                        }
                    ],
                    isError: true
                };
            }
            // Create broker client and execute tool
            const brokerConfig = getBrokerConfigFromEnv();
            const brokerFactory = getBrokerFactory();
            // Pass the Redis client from the token store instead of token data
            const redisClient = tokenStore.client;
            if (!redisClient || !redisClient.isOpen) {
                throw new Error('Redis client not available or not connected');
            }
            const client = await brokerFactory.createClient(brokerConfig, redisClient);
            const result = await toolSpec.call(client, toolArgs);
            // Return successful result
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }
                ]
            };
        }
        catch (error) {
            log.error(`Error executing tool:`, error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
                    }
                ],
                isError: true
            };
        }
    });
    log.info(`Successfully registered ${allTools.length} tools + 1 auth tool`);
}
//# sourceMappingURL=register.js.map