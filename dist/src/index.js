import 'dotenv/config';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { createServer } from 'https';
import path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import RedisStore from 'connect-redis';
import express from 'express';
import session from 'express-session';
import { createClient } from 'redis';
import { createOAuthHandler } from './auth/expressOAuth.js';
import { CONSTANTS } from './shared/constants.js';
import { createTokenStore } from './shared/redisTokenStore.js';
import { registerTools } from './tools/register.js';
// Use console.error for logging to avoid polluting stdout (MCP communication channel)
const log = {
    info: (msg, data) => console.error(`[INFO] ${msg}`, data || ''),
    error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
};
// Environment validation
function validateEnvironment() {
    const required = [
        'SCHWAB_CLIENT_ID',
        'SCHWAB_CLIENT_SECRET',
        'SESSION_SECRET'
    ];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    log.info('Environment validation passed');
}
async function main() {
    // Validate environment first
    validateEnvironment();
    const app = express();
    const port = process.env.PORT || 3000;
    // Initialize Redis
    const redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
    });
    redisClient.on('error', (err) => log.error('Redis Client Error', err));
    await redisClient.connect();
    // Create token store
    const tokenStore = createTokenStore(redisClient);
    // Create MCP server FIRST - before any Express middleware
    const mcpServer = new Server({
        name: CONSTANTS.SERVER_NAME,
        version: CONSTANTS.SERVER_VERSION,
    }, {
        capabilities: {
            tools: {},
        },
    });
    // Register tools
    await registerTools(mcpServer, tokenStore);
    // Setup MCP transport
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
    });
    // Connect MCP server to transport
    await mcpServer.connect(transport);
    // Create HTTPS server to handle MCP requests before Express
    const httpsOptions = {
        key: fs.readFileSync(path.join(process.cwd(), 'certs', '127.0.0.1-key.pem')),
        cert: fs.readFileSync(path.join(process.cwd(), 'certs', '127.0.0.1.pem'))
    };
    const httpServer = createServer(httpsOptions, async (req, res) => {
        // Handle MCP requests directly
        if (req.url === '/mcp' && req.method === 'POST') {
            try {
                await transport.handleRequest(req, res);
            }
            catch (error) {
                log.error('MCP transport error:', error);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'MCP transport error' }));
                }
            }
            return;
        }
        // Pass all other requests to Express
        app(req, res);
    });
    // Session configuration
    const redisStore = new RedisStore({
        client: redisClient,
        prefix: 'schwab-mcp:sess:',
        ttl: 7200 // 2 hours in seconds
    });
    app.use(session({
        store: redisStore,
        secret: process.env.SESSION_SECRET || 'change-me-in-production',
        resave: false,
        saveUninitialized: true, // Ensure sessions are created
        name: 'schwab-mcp-session', // Custom session name
        cookie: {
            secure: true, // Always use secure cookies for HTTPS
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 2, // 2 hours for OAuth flow
            sameSite: 'lax' // OAuth compatibility
        },
        rolling: true, // Force session save
        genid: function (req) {
            return randomUUID(); // Use crypto.randomUUID for session IDs
        }
    }));
    // Parse JSON bodies for all endpoints (MCP is handled separately)
    app.use(express.json());
    // Health check
    app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
    });
    // Setup OAuth routes
    const oauthHandler = createOAuthHandler(tokenStore);
    app.use('/auth', oauthHandler);
    // Error handling
    mcpServer.onerror = (error) => {
        log.error('MCP Server error:', error);
    };
    // Start server
    httpServer.listen(port, () => {
        log.info(`Schwab MCP server running on HTTPS port ${port}`);
        log.info(`OAuth callback URL: ${process.env.SCHWAB_REDIRECT_URI || 'https://127.0.0.1:5001/api/SchwabAuth/callback'}`);
    });
}
main().catch((error) => {
    log.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map