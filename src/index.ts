import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { DurableMCP } from 'workers-mcp'
import { SchwabHandler, TokenManager, createSchwabAuth } from './auth'
import {
	registerAccountTools,
	registerInstrumentTools,
	registerMarketHoursTools,
	registerMoversTools,
	registerOptionsTools,
	registerOrderTools,
	registerPriceHistoryTools,
	registerQuotesTools,
	registerTransactionTools,
} from './tools'

type Props = {
	name: string
	email: string
	accessToken: string
	refreshToken: string
	expiresAt: number
}

export class MyMCP extends DurableMCP<Props, Env> {
	private tokenManager!: TokenManager
	private refreshPromise: Promise<void> | null = null

	server = new McpServer({
		name: 'Schwab MCP',
		version: '0.0.1',
	})

	async init() {
		// Create the SchwabAuth service with a callback URL derived from this server
		const redirectUri = 'https://schwab-mcp.dyeoman2.workers.dev/callback'
		const authService = createSchwabAuth(this.env, redirectUri)
		
		// Initialize the TokenManager with the auth service
		this.tokenManager = new TokenManager(
			{
				accessToken: this.props.accessToken,
				refreshToken: this.props.refreshToken,
				expiresAt: this.props.expiresAt,
			},
			authService,
		)

		// Create a coordinated getAccessToken function that persists tokens
		// and ensures only one refresh operation happens at a time
		const getAccessToken = async (): Promise<string> => {
			// Case 1: Token is still valid, return it immediately
			if (Date.now() < this.props.expiresAt - 60_000) {
				return this.props.accessToken
			}
			
			// Case 2: We need to refresh, but another request is already refreshing
			if (this.refreshPromise) {
				await this.refreshPromise
				return this.props.accessToken
			}
			
			// Case 3: We need to refresh and nobody else is doing it
			try {
				this.refreshPromise = (async () => {
					// Get fresh token from TokenManager (this updates its internal state)
					await this.tokenManager.getAccessToken()
					
					// Persist the updated token
					const tokenSet = this.tokenManager.getTokenSet()
					this.props.accessToken = tokenSet.accessToken
					this.props.refreshToken = tokenSet.refreshToken
					this.props.expiresAt = tokenSet.expiresAt
					
					// No return here, so this IIFE is Promise<void>
				})()
				
				await this.refreshPromise // Await the refresh operation to complete
				return this.props.accessToken // Return the updated access token
			} finally {
				this.refreshPromise = null
			}
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
