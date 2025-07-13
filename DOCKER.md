# Docker Deployment Guide

This guide covers deploying the Schwab MCP server using Docker with Express.js
and Redis.

## Quick Start

1. **Clone and setup environment**:

   ```bash
   git clone <repository-url>
   cd schwab-mcp
   cp .env.docker .env
   ```

2. **Configure environment variables in `.env`**:

   ```bash
   # Required: Your Schwab API credentials
   SCHWAB_APP_KEY=your_schwab_app_key
   SCHWAB_APP_SECRET=your_schwab_app_secret

   # Required: Generate a strong session secret
   SESSION_SECRET=your_strong_random_session_secret

   # Optional: Adjust callback URL if deploying remotely
   SCHWAB_OAUTH_CALLBACK_URL=http://localhost:3000/auth/callback
   ```

3. **Start with Docker Compose**:

   ```bash
   npm run docker:up
   ```

4. **View logs**:
   ```bash
   npm run docker:logs
   ```

## Environment Configuration

### Required Variables

- `SCHWAB_APP_KEY`: Your Schwab API application key
- `SCHWAB_APP_SECRET`: Your Schwab API application secret
- `SESSION_SECRET`: Strong random string for session security

### Optional Variables

- `SCHWAB_OAUTH_CALLBACK_URL`: OAuth callback URL (default:
  `http://localhost:3000/auth/callback`)
- `SCHWAB_ACCOUNT_PRIVACY`: Privacy level for account data (default: `STANDARD`)
- `PORT`: Server port (default: `3000`)
- `LOG_LEVEL`: Logging level (default: `INFO`)
- `ALLOWED_ORIGINS`: CORS origins (default: `*`)

## Development Workflow

### Local Development (without Docker)

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Setup environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Start Redis locally**:

   ```bash
   # Option 1: Using Docker
   docker run -d -p 6379:6379 redis:7-alpine

   # Option 2: Using Homebrew (macOS)
   brew install redis
   brew services start redis
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

### Production Deployment

1. **Build and deploy with Docker Compose**:

   ```bash
   # Build image
   npm run docker:build

   # Start services
   npm run docker:up
   ```

2. **For cloud deployment**, update the callback URL:
   ```bash
   SCHWAB_OAUTH_CALLBACK_URL=https://your-domain.com/auth/callback
   PUBLIC_URL=https://your-domain.com
   ```

## Architecture Overview

| Component              | Implementation                |
| ---------------------- | ----------------------------- |
| **Runtime**            | Node.js + Express             |
| **State Storage**      | Redis                         |
| **Token Storage**      | Redis                         |
| **OAuth Flow**         | Custom Express implementation |
| **Session Management** | express-session + Redis       |

## Usage with Claude Desktop

1. **Authenticate**: Visit `http://localhost:3000/auth/login` to get your user
   ID
2. **Configure Claude Desktop** with the MCP endpoint:
   ```json
   {
   	"mcpServers": {
   		"schwab": {
   			"command": "curl",
   			"args": [
   				"-X",
   				"POST",
   				"http://localhost:3000/mcp",
   				"-H",
   				"Content-Type: application/json"
   			]
   		}
   	}
   }
   ```

## Docker Commands Reference

```bash
# Build and start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs

# Build image only
npm run docker:build

# Development mode (with hot reload)
npm run dev

# Production mode (local)
npm run build && npm start
```

## Troubleshooting

### Common Issues

1. **Redis connection failed**:

   - Ensure Redis container is running: `docker ps`
   - Check Redis logs: `docker-compose logs redis`

2. **OAuth callback fails**:

   - Verify `SCHWAB_OAUTH_CALLBACK_URL` matches your Schwab app configuration
   - Ensure the server is accessible at the callback URL

3. **Session issues**:
   - Check that `SESSION_SECRET` is set and secure
   - Verify Redis is storing session data

### Health Checks

- **Server health**: `curl http://localhost:3000/health`
- **Redis health**: `docker-compose exec redis redis-cli ping`

## Security Considerations

- Always use strong `SESSION_SECRET` in production
- Enable HTTPS for production deployments
- Restrict `ALLOWED_ORIGINS` in production
- Consider using Redis AUTH in production
- Regularly rotate your Schwab API credentials
