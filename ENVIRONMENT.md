# Environment Variables Guide

This document describes all environment variables used by the Schwab MCP server and how to configure them securely.

## Required Variables

### Schwab API Credentials
```bash
SCHWAB_CLIENT_ID=your_app_key_here
SCHWAB_CLIENT_SECRET=your_app_secret_here
SCHWAB_REDIRECT_URI=https://127.0.0.1:3000/auth/callback
```

**Security Notes:**
- Never commit these values to version control
- Obtain from https://developer.schwab.com/
- `REDIRECT_URI` must match your Schwab app configuration exactly

### Session Security
```bash
SESSION_SECRET=your_secure_random_string_here
```

**Security Notes:**
- Generate a cryptographically secure random string (32+ characters)
- Use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Never use default or example values in production

## Optional Variables

### Server Configuration
```bash
PORT=3000                           # Default: 3000
NODE_ENV=production                 # Default: development
PUBLIC_URL=https://your-domain.com  # Default: http://localhost:3000
LOG_LEVEL=info                      # Default: info (debug, info, warn, error)
```

### Redis Configuration
```bash
REDIS_URL=redis://localhost:6379    # Default: redis://localhost:6379
REDIS_HOST=localhost                # Alternative to REDIS_URL
REDIS_PORT=6379                     # Alternative to REDIS_URL
REDIS_PASSWORD=your_redis_password  # If Redis requires auth
```

### Development/Debug Variables
```bash
MCP_DEBUG=true                      # Enable MCP debugging
VERBOSE_LOGGING=true                # Enable verbose request logging
```

## Environment Files

### .env (Local Development)
```bash
# Copy from .env.example and fill in your values
cp .env.example .env
```

### .env.docker (Docker Development)
```bash
# Pre-configured for Docker environment
# Copy and modify as needed
cp .env.docker .env
```

## Security Best Practices

### 1. Environment File Security
```bash
# Ensure .env files are not readable by others
chmod 600 .env
chmod 600 .env.docker
```

### 2. Git Ignore Configuration
The following files should NEVER be committed:
- `.env`
- `.env.local`
- `.env.production`
- Any file containing actual credentials

### 3. Production Deployment
```bash
# Use environment variables from your deployment platform
# Examples for common platforms:

# Docker Compose
docker-compose up -d \
  -e SCHWAB_CLIENT_ID=your_id \
  -e SCHWAB_CLIENT_SECRET=your_secret

# Kubernetes
kubectl create secret generic schwab-secrets \
  --from-literal=client-id=your_id \
  --from-literal=client-secret=your_secret

# AWS ECS/Fargate
# Use AWS Secrets Manager or Parameter Store

# Heroku
heroku config:set SCHWAB_CLIENT_ID=your_id
heroku config:set SCHWAB_CLIENT_SECRET=your_secret
```

### 4. Credential Rotation
- Rotate `SESSION_SECRET` regularly
- Update Schwab API credentials when they expire
- Monitor for any credential exposure

## Environment Validation

The application validates all required environment variables on startup:

```bash
# Required variables checked:
✓ SCHWAB_CLIENT_ID
✓ SCHWAB_CLIENT_SECRET
✓ SESSION_SECRET

# Optional variables with defaults:
✓ PORT (default: 3000)
✓ REDIS_URL (default: redis://localhost:6379)
✓ LOG_LEVEL (default: info)
```

## Troubleshooting

### Common Issues

**1. Missing CLIENT_ID/CLIENT_SECRET**
```
Error: SCHWAB_CLIENT_ID and SCHWAB_CLIENT_SECRET must be set
```
Solution: Set both variables in your environment

**2. Invalid REDIRECT_URI**
```
Error: OAuth callback URL mismatch
```
Solution: Ensure `SCHWAB_REDIRECT_URI` matches your Schwab app configuration

**3. Redis Connection Issues**
```
Error: Redis connection failed
```
Solution: Check `REDIS_URL` and ensure Redis server is running

**4. Session Security Warning**
```
Warning: Using default SESSION_SECRET
```
Solution: Generate and set a secure `SESSION_SECRET`

## Example Configurations

### Local Development
```bash
# .env
SCHWAB_CLIENT_ID=your_schwab_client_id
SCHWAB_CLIENT_SECRET=your_schwab_client_secret
SCHWAB_REDIRECT_URI=http://localhost:3000/auth/callback
SESSION_SECRET=your_generated_session_secret
PORT=3000
LOG_LEVEL=debug
REDIS_URL=redis://localhost:6379
```

### Production
```bash
# Environment variables (not in .env file)
SCHWAB_CLIENT_ID=your_schwab_client_id
SCHWAB_CLIENT_SECRET=your_schwab_client_secret
SCHWAB_REDIRECT_URI=https://your-domain.com/auth/callback
SESSION_SECRET=your_generated_session_secret
PORT=3000
NODE_ENV=production
LOG_LEVEL=warn
REDIS_URL=redis://your-redis-server:6379
```

## Security Checklist

- [ ] All `.env*` files are in `.gitignore`
- [ ] `SESSION_SECRET` is randomly generated (32+ characters)
- [ ] Schwab credentials are from official developer portal
- [ ] `REDIRECT_URI` matches Schwab app configuration exactly
- [ ] No credentials are hardcoded in source code
- [ ] Environment files have restricted permissions (600)
- [ ] Production uses secure HTTPS URLs
- [ ] Redis connection uses authentication if exposed