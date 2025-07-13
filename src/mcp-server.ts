#!/usr/bin/env node
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from 'redis';
import { CONSTANTS } from './shared/constants.js';
import { createTokenStore } from './shared/redisTokenStore.js';
import { registerTools } from './tools/register.js';

// Use console.error for logging to avoid polluting stdout (MCP communication channel)
const log = {
  info: (msg: string, data?: any) => console.error(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
};

function validateEnvironment() {
  const required = ['SCHWAB_CLIENT_ID', 'SCHWAB_CLIENT_SECRET', 'SESSION_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  log.info('Environment validation passed');
}

async function main() {
  // Validate environment first
  validateEnvironment();
  
  // Initialize Redis
  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
  });
  
  redisClient.on('error', (err) => log.error('Redis Client Error', err));
  await redisClient.connect();
  
  // Create token store
  const tokenStore = createTokenStore(redisClient as any);
  
  // Create MCP server
  const server = new Server({
    name: CONSTANTS.SERVER_NAME,
    version: CONSTANTS.SERVER_VERSION,
  }, {
    capabilities: {
      tools: {},
    },
  });

  // Register all comprehensive tools using our existing system
  await registerTools(server, tokenStore);
  
  log.info('Successfully registered all comprehensive tools for MCP');

  // Connect to stdio transport (standard MCP protocol)
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  log.info('MCP server connected via stdio transport with all tools');
}

main().catch((error) => {
  console.error('Failed to start comprehensive MCP server:', error);
  process.exit(1);
}); 