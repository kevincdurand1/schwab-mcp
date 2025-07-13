# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Schwab MCP (Model Context Protocol) server that enables AI assistants to interact securely with Charles Schwab accounts and market data through the official Schwab API. It supports multiple deployment modes:
- Express.js web server with OAuth flow (recommended)
- STDIO mode for direct MCP protocol
- HTTP bridge mode for non-STDIO clients

## Essential Commands

### Docker Development (Recommended)

```bash
npm run docker:up    # Start Docker services (includes Redis)
npm run docker:down  # Stop Docker services
npm run docker:logs  # View application logs
npm run docker:build # Build Docker image
```

### Local Development

```bash
npm run dev          # Start local development server with hot reload
npm run build        # Build TypeScript to dist/
npm run start        # Start production server (requires Redis)
npm run inspect      # Open MCP Inspector for testing tools
npm run mcp:bridge   # Start HTTP bridge for non-STDIO MCP clients
```

### Code Quality

```bash
npm run validate     # Run typecheck and lint (ALWAYS run after making changes)
npm run format       # Format code with Prettier (run after validation passes)
npm run typecheck    # Run TypeScript type checking only
npm run lint         # Run ESLint only
```

## Architecture

### Deployment Modes

1. **Express Server** (`src/index.ts`): Full web server with OAuth flow and session management
2. **STDIO Server** (`src/mcp-server.ts`): Standard MCP protocol over STDIO
3. **HTTP Bridge** (`src/mcp-http-bridge.ts`): REST API wrapper for HTTP-only clients

### Core Structure

- **Broker Adapter Pattern**: Abstraction layer for multiple brokers
  - `IBrokerAdapter` interface in `src/core/types.ts`
  - `SchwabAdapter` for production Schwab API integration
  - `MockBrokerAdapter` for testing without real API calls
  - `BrokerFactory` for instantiating the correct adapter

- **Token Storage**: Multiple implementations for different environments
  - `RedisTokenStore`: Production Redis-based storage with automatic expiration
  - `KvTokenStore`: Key-value abstraction layer
  - Token synchronization for distributed deployments

- **OAuth 2.0 with PKCE**: Secure authentication with automatic token refresh

### Key Components

1. **Authentication (`src/auth/`)**
   - `expressOAuth.ts`: OAuth client managing token exchange and refresh
   - `index.ts`: Main authentication handler
   - `schemas.ts`: Zod schemas for authentication data validation
   - `ui/`: Configuration for authentication UI

2. **Tools (`src/tools/`)**
   - `market/`: Market data tools (quotes, movers, options chains, price history)
   - `trader/`: Trading tools (accounts, orders, transactions)
   - `register.ts`: MCP tool registration and execution handlers (33 tools total)

3. **Adapters (`src/adapters/`)**
   - `schwab/`: Schwab-specific implementation
   - `mock/`: Mock implementation for testing

4. **Shared Components (`src/shared/`)**
   - `schwabClient.ts`: Schwab API client wrapper
   - `redisTokenStore.ts`: Redis token management
   - `tokenSync.ts`: Token synchronization utilities
   - `log.ts`: Secure logging with automatic secret redaction

### Important Patterns

1. **Tool Implementation**: All tools are registered in `src/tools/register.ts` with:
   - Zod schemas for input validation
   - Authentication checks before execution
   - Consistent error handling patterns
   - Adapter pattern for broker abstraction

2. **Error Handling**: Structured error patterns using try-catch with detailed logging
   - Tools return structured errors with helpful messages
   - OAuth errors trigger re-authentication flow
   - Secure logging automatically redacts sensitive information

3. **Security**:
   - Account identifiers automatically scrubbed in responses
   - Session secrets required and validated
   - HTTPS support via SSL certificates in `certs/`
   - CORS configuration via `ALLOWED_ORIGINS`

## Development Workflow

1. **Before Making Changes**: Review existing tool implementations in `src/tools/` for patterns
2. **After Code Changes**: Always run `npm run validate` to ensure type safety and code quality
3. **Before Committing**: Run `npm run format` to maintain consistent code style
4. **Testing Tools**: Use `npm run inspect` to test tool implementations with the MCP Inspector
5. **Testing Note**: No unit tests exist; testing relies on type checking and manual testing

## Key Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `@sudowealth/schwab-api`: Schwab API client library
- `express`: Web framework for HTTP server
- `redis`: Redis client for session storage
- `express-session`: Session middleware for Express
- `connect-redis`: Redis session store
- `@epic-web/config`: Standardized ESLint and Prettier configuration
- Node.js version: 22.x (locked in package.json)

## Environment Variables

Required in `.env`:
- `SCHWAB_CLIENT_ID`: Schwab application client ID
- `SCHWAB_CLIENT_SECRET`: Schwab application secret
- `SCHWAB_REDIRECT_URI`: OAuth callback URL
- `SESSION_SECRET`: Session encryption secret
- `PORT`: Server port (default: 3000)
- `LOG_LEVEL`: Logging verbosity (default: "info")

Optional configuration:
- `REDIS_HOST`: Redis host (default: "localhost")
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (if required)
- `REDIS_URL`: Complete Redis URL (alternative to individual settings)
- `PUBLIC_URL`: Base URL for the application (important for OAuth redirects)
- `NODE_ENV`: Controls development/production mode
- `ALLOWED_ORIGINS`: CORS configuration (defaults to `*`)

## Common Tasks

### Adding a New Tool

1. Add tool definition to `src/tools/register.ts`
2. Create Zod schema for input validation
3. Implement execution logic with proper error handling
4. Use the broker adapter pattern for broker-specific logic
5. Test with MCP Inspector

### Updating Schwab API Integration

1. Update `@sudowealth/schwab-api` dependency in package.json
2. Review breaking changes in Schwab API documentation
3. Update `SchwabAdapter` implementation if needed
4. Update affected tools with new API patterns
5. Test all tools with MCP Inspector

### Working with the Adapter Pattern

1. Define methods in `IBrokerAdapter` interface
2. Implement in `SchwabAdapter` for production
3. Implement in `MockBrokerAdapter` for testing
4. Use `BrokerFactory` to get the appropriate adapter

### Debugging OAuth Issues

1. Check Redis for token storage and expiration
2. Review auth flow in `src/auth/expressOAuth.ts`
3. Verify callback URL matches Schwab app configuration
4. Check logs for detailed error messages (secrets are automatically redacted)
5. Ensure Redis is running and accessible
6. Verify `PUBLIC_URL` is set correctly for OAuth redirects

### Docker Troubleshooting

1. Ensure Docker and docker-compose are installed
2. Check if ports are available (3000 for app, 6379 for Redis)
3. Review Docker logs: `npm run docker:logs`
4. Check health endpoint at `/health`
5. Rebuild containers if needed: `npm run docker:down && npm run docker:build && npm run docker:up`
6. Logs are persisted in `./logs` directory
7. Redis data persisted with AOF (Append Only File) for durability

### Using the HTTP Bridge

For clients that don't support STDIO:
1. Start the bridge: `npm run mcp:bridge`
2. Send POST requests to `/mcp` with MCP protocol messages
3. Include session ID in headers for stateful operations
4. See `MCP-USAGE.md` for complete API documentation and examples

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.