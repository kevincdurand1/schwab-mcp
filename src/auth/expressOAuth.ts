import crypto from 'crypto';
import { Router } from 'express';
import  { type TokenStore, type OAuthConfig } from '../types/auth.js';

// Use console.error for logging to avoid polluting stdout (MCP communication channel)
const log = {
  info: (msg: string, data?: any) => console.error(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
};

interface OAuthSession {
  state?: string;
  codeVerifier?: string;
}

declare module 'express-session' {
  interface SessionData {
    oauth: OAuthSession;
  }
}

export function createOAuthHandler(tokenStore: TokenStore): Router {
  const router = Router();
  
  // OAuth configuration
  const oauthConfig = {
    clientId: process.env.SCHWAB_CLIENT_ID!,
    clientSecret: process.env.SCHWAB_CLIENT_SECRET!,
    redirectUri: process.env.SCHWAB_REDIRECT_URI || 'https://127.0.0.1:5001/api/SchwabAuth/callback',
    scopes: ['api'],
  };

  // Utility functions
  function generateRandomString(length: number): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  function generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }

  // Initialize OAuth flow with Redis state storage for automation
  router.get('/login', async (req, res) => {
    try {
      log.info('Starting automated OAuth flow');
      
      const state = generateRandomString(32);
      const codeVerifier = generateRandomString(64);
      const codeChallenge = generateCodeChallenge(codeVerifier);

      // Store PKCE state in Redis for automated callback handling
      const redisClient = (tokenStore as any).client; // Access Redis client
      await redisClient.set(
        `oauth:state:${state}`, 
        JSON.stringify({ 
          codeVerifier, 
          timestamp: Date.now(),
          clientId: oauthConfig.clientId,
          redirectUri: oauthConfig.redirectUri 
        }),
        'EX', 
        300 // Expire in 5 minutes
      );

      // Build authorization URL
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: oauthConfig.clientId,
        redirect_uri: oauthConfig.redirectUri,
        scope: oauthConfig.scopes.join(' '),
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      const authUrl = `https://api.schwabapi.com/v1/oauth/authorize?${params}`;
      
      log.info('OAuth flow initiated for automated handling', {
        clientId: oauthConfig.clientId,
        redirectUri: oauthConfig.redirectUri,
        scopes: oauthConfig.scopes,
        state: state.substring(0, 8) + '...',
        storedInRedis: true
      });
      
      res.redirect(authUrl);
    } catch (error) {
      log.error('OAuth initiation error:', error);
      res.status(500).json({ error: 'OAuth initiation failed' });
    }
  });

  // OAuth callback info route (actual callback handled externally on port 5001)
  router.get('/callback', async (req, res) => {
    log.info('OAuth callback info page accessed');
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Callback Information</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; text-align: center; }
          .info { color: #2563eb; }
          .message { background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .code { background: #1f2937; color: #f9fafb; padding: 10px; border-radius: 4px; font-family: monospace; }
        </style>
      </head>
      <body>
        <h1 class="info">OAuth Callback Information</h1>
        <div class="message">
          <p><strong>OAuth callbacks are handled externally on port 5001.</strong></p>
          <p>If you're seeing this page, the OAuth flow should redirect to:</p>
          <div class="code">https://127.0.0.1:5001/api/SchwabAuth/callback</div>
          <p>Make sure your external OAuth handler is running on port 5001.</p>
        </div>
      </body>
      </html>
    `);
  });

  // Token refresh endpoint - simplified
  router.post('/refresh', async (req, res) => {
    try {
      const tokenData = await tokenStore.get();

      if (!tokenData || !tokenData.refreshToken) {
        return res.status(404).json({ error: 'No refresh token found' });
      }

      // Refresh the token
      const refreshResponse = await fetch('https://api.schwabapi.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${oauthConfig.clientId}:${oauthConfig.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenData.refreshToken
        })
      });

      if (!refreshResponse.ok) {
        const error = await refreshResponse.text();
        throw new Error(`Token refresh failed: ${error}`);
      }

      const tokens = await refreshResponse.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
        scope: string;
      };
      
      // Calculate new expiration
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 3600));

      // Update stored tokens
      await tokenStore.refresh({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || tokenData.refreshToken,
        expiresAt: expiresAt.toISOString()
      });

      log.info('Token refreshed successfully');
      res.json({ success: true });
    } catch (error) {
      log.error('Token refresh error:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  });

  // Logout endpoint - simplified
  router.post('/logout', async (req, res) => {
    try {
      await tokenStore.delete();
      log.info('User logged out');
      res.json({ success: true });
    } catch (error) {
      log.error('Logout error:', error);
      res.status(500).json({ error: 'Failed to logout' });
    }
  });

  return router;
}