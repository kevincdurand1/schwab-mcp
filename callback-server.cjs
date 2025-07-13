const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const express = require('express');
const { createClient } = require('redis');

const app = express();

// OAuth config
const CLIENT_ID = '0A33ilOe6rzQ0RxyFtyd42A3BWdEhyq5';
const CLIENT_SECRET = process.env.SCHWAB_CLIENT_SECRET;
const REDIRECT_URI = 'https://127.0.0.1:5001/api/SchwabAuth/callback';

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

redisClient.on('error', (err) => console.error('Redis Error:', err));

// Automated OAuth callback handler with token exchange
app.get('/api/SchwabAuth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    console.log('🔄 Automated OAuth callback received:', {
      hasCode: !!code,
      hasState: !!state,
      codePreview: code ? code.substring(0, 20) + '...' : 'none'
    });

    if (!code || !state) {
      throw new Error('Authorization code or state not provided');
    }

    // Retrieve PKCE state from Redis
    const stateData = await redisClient.get(`oauth:state:${state}`);
    if (!stateData) {
      throw new Error('OAuth state not found or expired');
    }

    const { codeVerifier, timestamp, clientId, redirectUri } = JSON.parse(stateData);
    
    console.log('✅ Retrieved PKCE state from Redis:', {
      hasCodeVerifier: !!codeVerifier,
      ageSeconds: Math.floor((Date.now() - timestamp) / 1000)
    });

    // Exchange authorization code for tokens
    console.log('🔄 Exchanging authorization code for tokens...');
    
    // Debug client credentials
    console.log('🔍 Debug info:', {
      hasClientSecret: !!CLIENT_SECRET,
      clientSecretLength: CLIENT_SECRET ? CLIENT_SECRET.length : 0,
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI
    });
    
    if (!CLIENT_SECRET) {
      throw new Error('SCHWAB_CLIENT_SECRET not available in environment');
    }
    
    const authHeader = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`;
    console.log('🔍 Auth header constructed:', authHeader.substring(0, 30) + '...');
    
    const tokenResponse = await fetch('https://api.schwabapi.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('❌ Token exchange failed:', error);
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokens = await tokenResponse.json();
    console.log('✅ Tokens received successfully!');

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 3600));

    // Store tokens in Redis for MCP server using TokenSyncManager pattern
    const tokenData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: expiresAt.toISOString(),
      tokenType: tokens.token_type || 'Bearer',
      scope: tokens.scope,
      createdAt: new Date().toISOString()
    };

    // Store tokens with TTL and sync notification
    await redisClient.setEx('schwab-mcp:token', 31 * 24 * 60 * 60, JSON.stringify(tokenData));
    
    // Set sync notification for other services
    await redisClient.setEx(
      'schwab-mcp:token-sync',
      31 * 24 * 60 * 60,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        action: 'updated',
        expiresAt: tokenData.expiresAt,
        source: 'oauth-callback'
      })
    );
    
    console.log('✅ Tokens stored in Redis with sync notification for MCP server');

    // Clean up OAuth state
    await redisClient.del(`oauth:state:${state}`);

    // Display success page with automation complete
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>🎉 OAuth Automation Complete!</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .success { color: #22c55e; }
          .info { color: #2563eb; }
          .step { background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #22c55e; }
          .token-info { background: #eff6ff; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #2563eb; }
          .env-vars { background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 6px; font-family: monospace; margin: 10px 0; }
          .celebration { font-size: 2em; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="celebration">🎉🚀✅</div>
        <h1 class="success">OAuth Automation Complete!</h1>
        <p>Your Schwab account has been automatically connected to the MCP server.</p>
        
        <div class="step">
          <h3>✅ What Happened Automatically:</h3>
          <ul>
            <li>✅ Authorization code received and validated</li>
            <li>✅ PKCE state retrieved from Redis</li>
            <li>✅ Code exchanged for access tokens</li>
            <li>✅ Tokens stored securely for MCP server</li>
            <li>✅ Authentication complete!</li>
          </ul>
        </div>

        <div class="token-info">
          <h3 class="info">🔧 Token Information:</h3>
          <ul>
            <li><strong>Access Token:</strong> ✅ Stored securely</li>
            <li><strong>Refresh Token:</strong> ✅ Stored securely</li>
            <li><strong>Expires:</strong> ${expiresAt.toLocaleString()}</li>
            <li><strong>Scope:</strong> ${tokens.scope}</li>
            <li><strong>Token Type:</strong> ${tokens.token_type}</li>
          </ul>
        </div>

        <div class="step">
          <h3>🎯 Next Steps:</h3>
          <ol>
            <li><strong>Close this window</strong> - Everything is automated!</li>
            <li><strong>Go to Claude Desktop</strong></li>
            <li><strong>Run the authenticate tool</strong> - It will automatically detect your tokens</li>
            <li><strong>Start using all 32 Schwab MCP tools!</strong></li>
          </ol>
        </div>

        <div class="token-info">
          <h3 class="info">🔄 Optional: Add to .env file</h3>
          <p>For backup or external use, you can also add these to your .env file:</p>
          <div class="env-vars">
SCHWAB_ACCESS_TOKEN=${tokens.access_token}
SCHWAB_REFRESH_TOKEN=${tokens.refresh_token}
          </div>
        </div>

        <p><strong>🎉 Congratulations!</strong> Your Schwab MCP server is fully authenticated and ready to use.</p>
        
        <p><small><strong>Debug Info:</strong> State cleaned up, tokens expire at ${expiresAt.toISOString()}</small></p>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ Automated OAuth error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Automation Error</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; }
          .error { color: #ef4444; }
          .fallback { background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 15px 0; }
        </style>
      </head>
      <body>
        <h1 class="error">❌ OAuth Automation Failed</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        
        <div class="fallback">
          <h3>🔧 Fallback Option:</h3>
          <p>You can still complete authentication manually:</p>
          <ul>
            <li><strong>Authorization Code:</strong> ${req.query.code || 'Not available'}</li>
            <li><strong>State:</strong> ${req.query.state || 'Not available'}</li>
          </ul>
          <p>Run: <code>node simple-auth.cjs</code> and follow the manual instructions.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Automated Schwab OAuth Handler',
    redis: redisClient.isReady ? 'connected' : 'disconnected'
  });
});

// Start server with Redis connection
async function startServer() {
  try {
    // Connect to Redis first
    await redisClient.connect();
    console.log('✅ Connected to Redis for automated OAuth flow');

    // Start HTTPS server
    const httpsOptions = {
      key: fs.readFileSync('certs/127.0.0.1-key.pem'),
      cert: fs.readFileSync('certs/127.0.0.1.pem')
    };

    https.createServer(httpsOptions, app).listen(5001, () => {
      console.log('🚀 Automated Schwab OAuth Server running on https://127.0.0.1:5001');
      console.log('🤖 Fully automated OAuth flow ready!');
      console.log('🔗 Callback endpoint: /api/SchwabAuth/callback');
    });
  } catch (error) {
    console.error('❌ Failed to start automated OAuth server:', error);
    process.exit(1);
  }
}

startServer(); 