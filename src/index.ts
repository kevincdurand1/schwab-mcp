import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { TokenManager } from '@sudowealth/schwab-api'
import { DurableMCP } from 'workers-mcp'
import { SchwabHandler, createSchwabAuth } from './auth'
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

		// Create an access token provider that persists tokens after refreshes
		const getAccessToken = async (): Promise<string> => {
			// Get a valid token from the TokenManager, which handles refreshing internally
			const token = await this.tokenManager.getAccessToken()

			// Store the updated tokens in props if they've changed
			const tokenSet = this.tokenManager.getTokenSet()
			if (
				tokenSet.accessToken !== this.props.accessToken ||
				tokenSet.refreshToken !== this.props.refreshToken ||
				tokenSet.expiresAt !== this.props.expiresAt
			) {
				// Update our props with the new token values
				this.props.accessToken = tokenSet.accessToken
				this.props.refreshToken = tokenSet.refreshToken
				this.props.expiresAt = tokenSet.expiresAt
			}

			return token
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
