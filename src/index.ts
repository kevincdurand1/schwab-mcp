import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { DurableMCP } from 'workers-mcp'
import { TokenManager } from './auth/tokenManager'
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
	private tokenManager!: TokenManager

	server = new McpServer({
		name: 'Schwab MCP',
		version: '0.0.1',
	})

	async init() {
		// Initialize the TokenManager
		this.tokenManager = new TokenManager(
			{
				accessToken: this.props.accessToken,
				refreshToken: this.props.refreshToken,
				expiresAt: this.props.expiresAt,
			},
			this.env,
		)

		// Create token updater to persist tokens to DurableMCP props
		const updateTokensInProps = () => {
			const tokenSet = this.tokenManager.getTokenSet()
			this.props.accessToken = tokenSet.accessToken
			this.props.refreshToken = tokenSet.refreshToken
			this.props.expiresAt = tokenSet.expiresAt
		}

		// Create the async getAccessToken function
		const getAccessToken = async (): Promise<string> => {
			const token = await this.tokenManager.getAccessToken()
			// After getting a token (which may have been refreshed), update props
			updateTokensInProps()
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
