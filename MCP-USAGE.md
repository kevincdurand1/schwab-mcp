# Using Schwab MCP Server with Any LLM

The Schwab MCP server is built on the open Model Context Protocol (MCP) standard
and can work with any LLM or client that supports MCP.

## MCP Protocol Overview

MCP is an open protocol that enables seamless integration between LLMs and
external data sources. This server implements:

- **Transport**: STDIO (Standard Input/Output)
- **Protocol**: JSON-RPC 2.0
- **Authentication**: Environment-based (tokens stored in Redis)

## Starting the MCP Server

### Direct Command

```bash
cd /path/to/schwab-mcp
npx tsx src/mcp-server.ts
```

### Using the Start Script

```bash
./scripts/start-mcp-server.sh
```

## Integration Examples

### 1. Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
	"mcpServers": {
		"schwab-mcp": {
			"command": "/path/to/schwab-mcp/scripts/start-mcp-server.sh",
			"args": [],
			"env": {}
		}
	}
}
```

### 2. Generic MCP Client (Python)

```python
import subprocess
import json

# Start MCP server
process = subprocess.Popen(
    ['npx', 'tsx', 'src/mcp-server.ts'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    cwd='/path/to/schwab-mcp'
)

# Send request
request = {
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
}
process.stdin.write(json.dumps(request).encode() + b'\n')
process.stdin.flush()

# Read response
response = json.loads(process.stdout.readline())
print(response)
```

### 3. Node.js Client

```javascript
const { spawn } = require('child_process')

// Start MCP server
const mcp = spawn('npx', ['tsx', 'src/mcp-server.ts'], {
	cwd: '/path/to/schwab-mcp',
})

// Send request
mcp.stdin.write(
	JSON.stringify({
		jsonrpc: '2.0',
		method: 'tools/list',
		id: 1,
	}) + '\n',
)

// Handle response
mcp.stdout.on('data', (data) => {
	const response = JSON.parse(data.toString())
	console.log(response)
})
```

### 4. HTTP Bridge (for LLMs that only support HTTP)

The server includes a built-in HTTP bridge for LLMs that don't support STDIO:

```bash
# Start the HTTP bridge
npm run mcp:bridge

# Or directly
npx tsx src/mcp-http-bridge.ts
```

The bridge provides:

- Session management with unique session IDs
- Automatic cleanup of idle sessions (5 minutes timeout)
- RESTful API endpoints
- Health check endpoint

**API Usage:**

```bash
# 1. Create a session
curl -X POST http://localhost:8080/mcp/sessions
# Response: {"sessionId":"uuid-here"}

# 2. Send MCP request
curl -X POST http://localhost:8080/mcp/sessions/{sessionId}/request \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'

# 3. Close session when done
curl -X DELETE http://localhost:8080/mcp/sessions/{sessionId}
```

**Python Example:**

```python
import requests

# Create session
session_resp = requests.post('http://localhost:8080/mcp/sessions')
session_id = session_resp.json()['sessionId']

# Use MCP tools
resp = requests.post(
    f'http://localhost:8080/mcp/sessions/{session_id}/request',
    json={
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "getQuotes",
            "arguments": {"symbols": "AAPL"}
        },
        "id": 1
    }
)
print(resp.json())

# Clean up
requests.delete(f'http://localhost:8080/mcp/sessions/{session_id}')
```

## Available Tools

The server provides 33 tools for Schwab trading and market data:

### Authentication

- `authenticate` - Initiate OAuth flow

### Market Data

- `getQuotes` - Get stock quotes
- `getMarketHours` - Get market hours
- `getPriceHistory` - Get price history
- `getMovers` - Get market movers
- `getOptionChains` - Get option chains
- `getOptionExpiration` - Get option expiration dates
- `getInstruments` - Search instruments
- `getInstrumentByCusip` - Get instrument by CUSIP
- `getNews` - Get market news
- `getEarningsCalendar` - Get earnings calendar
- `getDividendHistory` - Get dividend history
- `getCompanyProfile` - Get company profile

### Trading

- `getAccounts` - Get trading accounts
- `getOrders` - Get orders
- `placeOrder` - Place order
- `replaceOrder` - Replace order
- `cancelOrder` - Cancel order
- `getOrderById` - Get order by ID
- `previewOrder` - Preview order

### Account Management

- `getTransactions` - Get transactions
- `getUserPreference` - Get user preferences
- `getPositions` - Get positions
- `getPortfolioSummary` - Get portfolio summary
- `getPerformance` - Get performance
- `getAccountActivity` - Get account activity

### Watchlists

- `getWatchlists` - Get watchlists
- `createWatchlist` - Create watchlist
- `updateWatchlist` - Update watchlist
- `deleteWatchlist` - Delete watchlist
- `addToWatchlist` - Add to watchlist
- `removeFromWatchlist` - Remove from watchlist

## MCP Request Format

All requests follow JSON-RPC 2.0:

```json
{
	"jsonrpc": "2.0",
	"method": "tools/call",
	"params": {
		"name": "getQuotes",
		"arguments": {
			"symbols": "AAPL,MSFT"
		}
	},
	"id": "unique-id"
}
```

## Prerequisites

1. **Environment Variables** (in `.env`):
   - `SCHWAB_CLIENT_ID`
   - `SCHWAB_CLIENT_SECRET`
   - `SCHWAB_REDIRECT_URI`
   - `SESSION_SECRET`
   - `REDIS_URL` (optional, defaults to redis://127.0.0.1:6379)

2. **Redis** running for token storage

3. **Authentication**: Complete OAuth flow via
   `https://127.0.0.1:3000/auth/login`

## Testing the Server

Test with any MCP-compatible tool:

```bash
# List available tools
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | \
  npx tsx src/mcp-server.ts | jq .

# Call a tool
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "getQuotes", "arguments": {"symbols": "AAPL"}}, "id": 2}' | \
  npx tsx src/mcp-server.ts | jq .
```

## Standards Compliance

This server implements:

- [MCP Specification](https://modelcontextprotocol.io/specification)
- JSON-RPC 2.0 Protocol
- OAuth 2.0 for authentication
- Standard STDIO transport

Any LLM or application that supports MCP can use this server without
modification.
