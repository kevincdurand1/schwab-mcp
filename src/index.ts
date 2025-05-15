import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createAuthClient } from '@sudowealth/schwab-api'
import { DurableMCP } from 'workers-mcp'
import { SchwabHandler } from './schwab-handler'
import { registerAccountTools } from './tools/accounts'
import { registerInstrumentTools } from './tools/instruments'
import { registerMarketHoursTools } from './tools/marketHours'
import { registerMoversTools } from './tools/movers'
import { registerOptionsTools } from './tools/options'
import { registerOrderTools } from './tools/orders'
import { registerPriceHistoryTools } from './tools/priceHistory'
import { registerQuotesTools } from './tools/quotes'
import { registerTransactionTools } from './tools/transactions'

type Props = {
	name: string
	email: string
	accessToken: string
	refreshToken: string
	expiresAt: number
}

export class MyMCP extends DurableMCP<Props, Env> {
	private isRefreshingToken: boolean = false;

	server = new McpServer({
		name: 'Schwab MCP',
		version: '0.0.1',
	})

	/**
	 * Refreshes the access token using the Schwab API.
	 * Updates this.props with the new token information.
	 * 
	 * Note: DurableMCP automatically persists props between sessions.
	 * Once props are updated here, they'll be available in future sessions.
	 */
	private async refreshAccessTokenInternal(): Promise<void> {
		if (this.isRefreshingToken) {
			return; // Refresh already in progress
		}
		this.isRefreshingToken = true;

		try {
			const auth = createAuthClient({
				clientId: this.env.SCHWAB_CLIENT_ID,
				clientSecret: this.env.SCHWAB_CLIENT_SECRET,
				redirectUri: 'https://schwab-mcp.dyeoman2.workers.dev/callback',
				save: async () => {},
				load: async () => ({
					accessToken: this.props.accessToken,
					refreshToken: this.props.refreshToken,
					expiresAt: this.props.expiresAt,
				}),
			});

			const newTokenSet = await auth.refreshTokens();

			this.props.accessToken = newTokenSet.accessToken;
			this.props.refreshToken = newTokenSet.refreshToken ?? this.props.refreshToken;
			this.props.expiresAt = newTokenSet.expiresAt;

			// Props update is automatically handled by DurableMCP on the init() call
			// We just need to update this.props and the framework handles persistence
			console.log('Access token refreshed successfully.');
		} catch (error) {
			console.error('Failed to refresh access token:', error);
		} finally {
			this.isRefreshingToken = false;
		}
	}

	async init() {
		const getAccessToken = (): string | undefined => { // Now synchronous
			const now = Date.now();

			// If token is expired or about to expire and no refresh is in progress
			if (this.props.expiresAt <= now + 60000) { // 1 minute buffer
				if (!this.isRefreshingToken) {
					// Call the internal refresh method but don't await it (fire-and-forget)
					this.refreshAccessTokenInternal().catch(err => {
						// Error is logged within refreshAccessTokenInternal
						console.error('Failed to refresh access token:', err);
					});
				}
			}
			return this.props.accessToken
		}

		// Register all tools for accessing Schwab API
		registerAccountTools(this.server, getAccessToken)
		registerInstrumentTools(this.server, getAccessToken)
		registerMarketHoursTools(this.server, getAccessToken)
		registerMoversTools(this.server, getAccessToken)
		registerOptionsTools(this.server, getAccessToken)
		registerOrderTools(this.server, getAccessToken)
		registerPriceHistoryTools(this.server, getAccessToken)
		registerQuotesTools(this.server, getAccessToken)
		registerTransactionTools(this.server, getAccessToken)
	}
}

export default new OAuthProvider({
	apiRoute: '/sse',
	// @ts-ignore
	apiHandler: MyMCP.mount('/sse') as any,
	defaultHandler: SchwabHandler as any,
	authorizeEndpoint: '/authorize',
	tokenEndpoint: '/token',
	clientRegistrationEndpoint: '/register',
})
