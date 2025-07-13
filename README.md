# Schwab MCP Server

A Model Context Protocol (MCP) server that enables any MCP-compatible AI
assistant to securely interact with Charles Schwab accounts and market data
through the official Schwab API. Works with Claude, custom LLM integrations, or
any application that supports the open MCP standard.

## What You Can Do

Ask your AI assistant to:

- "Show me my Schwab account balances and positions"
- "Get real-time quotes for AAPL, GOOGL, and MSFT"
- "What are today's market movers in the $SPX?"
- "Show me the options chain for TSLA with Greeks"
- "Get my transactions from the last 30 days"
- "Search for ETFs related to technology"
- "Check if the markets are open"

## Unofficial MCP Server

This is an unofficial, community-developed TypeScript MCP server for Charles
Schwab. It has not been approved, endorsed, or certified by Charles Schwab. It
is provided as-is, and its functionality may be incomplete or unstable. Use at
your own risk, especially when dealing with financial data or transactions.

## Overview

This MCP server acts as a bridge between AI assistants and the Schwab API,
providing:

- **Secure OAuth Authentication**: Implements Schwab's OAuth 2.0 flow with PKCE
  for secure authentication
- **Comprehensive Trading Tools**: Access to accounts, orders, quotes, and
  transactions
- **Market Data Tools**: Real-time quotes, price history, market hours, movers,
  and options chains
- **Account Privacy**: Built-in account identifier scrubbing to protect
  sensitive information
- **Enterprise-Ready**: Deployed with Docker using Express.js and Redis for
  session management

## Features

### Trading Tools

- **Account Management**
  - `getAccounts`: Retrieve all account information with positions and balances
  - `getAccountNumbers`: Get list of account identifiers
- **Order Management**
  - `getOrder`: Get order by ID
  - `getOrders`: Fetch orders with filtering by status, time range, and symbol
  - `getOrdersByAccountNumber`: Get orders by account number
  - `cancelOrder`: Cancel an order (Experimental)
  - `placeOrder`: Place an order (Experimental)
  - `replaceOrder`: Replace an order (Experimental)
- **Market Quotes**
  - `getQuotes`: Get real-time quotes for multiple symbols
  - `getQuoteBySymbolId`: Get detailed quote for a single symbol
- **Transaction History**
  - `getTransactions`: Retrieve transaction history across all accounts with
    date filtering
- **User Preferences**
  - `getUserPreference`: Retrieve user trading preferences and settings

### Market Data Tools

- **Instrument Search**
  - `searchInstruments`: Search for securities by symbol with
    fundamental/reference data
- **Price History**
  - `getPriceHistory`: Get historical price data with customizable periods and
    frequencies
- **Market Hours**
  - `getMarketHours`: Check market operating hours by date
  - `getMarketHoursByMarketId`: Get specific market information
- **Market Movers**
  - `getMovers`: Find top market movers by index ($SPX, $COMPX, $DJI)
- **Options Chains**
  - `getOptionChain`: Retrieve full options chain data with Greeks
  - `getOptionExpirationChain`: Get option expiration dates

## Prerequisites

1. **Schwab Developer Account**: Register at
   [Schwab Developer Portal](https://developer.schwab.com)
2. **Docker**: For deployment (recommended)
3. **Node.js**: Version 22.x or higher (for local development)
4. **Redis**: For session storage (included in Docker setup)

## Getting Started

### Quick Setup with Docker

```bash
git clone <repository-url>
cd schwab-mcp
cp .env.example .env
# Edit .env with your Schwab API credentials

# Build and run with Docker
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs
```

### Manual Setup

```bash
git clone <repository-url>
cd schwab-mcp
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Build and run
npm run build
npm start
```

### Configuration

#### 1. Create a Schwab App

1. Log in to the [Schwab Developer Portal](https://developer.schwab.com)
2. Create a new app with:
   - **App Name**: Your MCP server name
   - **Callback URL**: `http://localhost:3000/callback` (or your production URL)
   - **App Type**: Personal or third-party based on your use case
3. Note your **App Key** (Client ID) and generate an **App Secret**

#### 2. Set Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Required - Schwab API credentials
SCHWAB_CLIENT_ID=your_app_key
SCHWAB_CLIENT_SECRET=your_app_secret
SCHWAB_REDIRECT_URI=http://localhost:3000/callback

# Required - Session security
SESSION_SECRET=your_random_session_secret

# Optional - Server configuration
PORT=3000
LOG_LEVEL=info

# Optional - Redis configuration (if not using Docker)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### Testing with Inspector

Test your deployment using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
```

Enter `http://localhost:3000/sse` and connect. You'll be prompted to
authenticate with Schwab.

## Usage

### Claude Desktop Configuration

Add the following to your Claude Desktop configuration file:

```json
{
	"mcpServers": {
		"schwab": {
			"command": "npx",
			"args": ["mcp-remote", "http://localhost:3000/sse"]
		}
	}
}
```

Restart Claude Desktop. When you first use a Schwab tool, a browser window will
open for authentication.

### Example Commands

Once connected, you can ask Claude to:

- "Show me my Schwab account balances"
- "Get a quote for AAPL"
- "What are today's market movers in the $SPX?"
- "Show me the options chain for TSLA"
- "Get my recent transactions from the last week"

### Local Development

For local development, create a `.env` file:

```env
SCHWAB_CLIENT_ID=your_development_app_key
SCHWAB_CLIENT_SECRET=your_development_app_secret
SCHWAB_REDIRECT_URI=http://localhost:3000/callback
SESSION_SECRET=your_random_session_secret
LOG_LEVEL=debug
```

Run locally:

```bash
npm run dev
# Server will be available at http://localhost:3000
```

Connect to `http://localhost:3000/sse` using the MCP Inspector for testing.

## Architecture

### Technology Stack

- **Runtime**: Node.js with Express.js
- **Authentication**: OAuth 2.0 with PKCE
- **API Client**: `@sudowealth/schwab-api` for type-safe Schwab API access
- **MCP Framework**: `@modelcontextprotocol/sdk`
- **Session Management**: Redis for session storage
- **Deployment**: Docker with docker-compose

### Security Features

1. **OAuth 2.0 with PKCE**: Secure authentication flow preventing authorization
   code interception
2. **Enhanced Token Management**:
   - Redis-based token store with automatic refresh
   - Automatic token refresh (5 minutes before expiration)
   - Configurable token persistence
3. **Account Scrubbing**: Sensitive account identifiers are automatically
   replaced with display names
4. **Session Security**: Express sessions with Redis backend
5. **Secret Redaction**: Automatic masking of sensitive data in logs

## Development

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run docker:build # Build Docker image
npm run docker:up    # Start with docker-compose
npm run docker:down  # Stop docker-compose
npm run docker:logs  # View container logs
npm run typecheck    # Run TypeScript type checking
npm run lint         # Run ESLint with automatic fixes
npm run format       # Format code with Prettier
npm run validate     # Run typecheck and lint together
```

### Debugging

The server includes comprehensive logging with configurable levels:

- **Development**: Terminal output with colored logs
- **Production**: Structured JSON logs
- **Log Levels**: DEBUG, INFO, WARN, ERROR (set via LOG_LEVEL env var)

Enable debug logging to see detailed OAuth flow and API interactions:

```env
LOG_LEVEL=debug
```

### Error Handling

The server implements robust error handling with specific error types:

- **Authentication Errors (401)**: Prompt for re-authentication
- **Client Errors (400)**: Invalid parameters, missing data
- **Server Errors (500)**: API failures, configuration issues
- **Network Errors (503)**: Automatic retry with backoff
- All errors include request IDs for Schwab API troubleshooting

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Troubleshooting

### Common Issues

1. **"Connection refused" error**
   - Ensure Redis is running (included in Docker setup)
   - Check that the server is running on the expected port

2. **Authentication failures**
   - Verify your redirect URI matches exactly in Schwab app settings
   - Check that all environment variables are set correctly
   - Enable debug logging to see detailed OAuth flow

3. **Token refresh issues**
   - The server automatically refreshes tokens 5 minutes before expiration
   - Check Redis for stored tokens and sessions

### Docker Issues

If you encounter Docker issues:

```bash
# Rebuild containers
npm run docker:down
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs
```

## Recent Updates

- **Express.js Migration**: Migrated from Cloudflare Workers to Express.js
- **Redis Integration**: Session and token storage with Redis
- **Docker Support**: Complete Docker deployment with docker-compose
- **Enhanced Security**: Improved session management and token handling
- **Better Error Handling**: Structured error types with Schwab API error
  mapping

## Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- Uses [Model Context Protocol](https://modelcontextprotocol.io/)
- Powered by
  [@sudowealth/schwab-api](https://www.npmjs.com/package/@sudowealth/schwab-api)
