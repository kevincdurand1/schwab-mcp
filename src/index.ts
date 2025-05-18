import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
	AuthStrategy,
	createApiClient,
	createSchwabAuth,
} from '@sudowealth/schwab-api'
import { DurableMCP } from 'workers-mcp'
import { SchwabHandler } from './auth'
import { type CodeFlowTokenData, type SchwabCodeFlowAuth } from './auth/client'
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
	private tokenManager!: SchwabCodeFlowAuth

	server = new McpServer({
		name: 'Schwab MCP',
		version: '0.0.1',
	})

	private async loadTokenData(): Promise<CodeFlowTokenData | null> {
		if (
			this.props.accessToken &&
			this.props.refreshToken &&
			this.props.expiresAt
		) {
			return {
				accessToken: this.props.accessToken,
				refreshToken: this.props.refreshToken,
				expiresAt: this.props.expiresAt,
			}
		}
		return null
	}

	private async saveTokenData(tokenData: CodeFlowTokenData): Promise<void> {
		this.props.accessToken = tokenData.accessToken
		this.props.refreshToken = tokenData.refreshToken
		this.props.expiresAt = tokenData.expiresAt
	}

	async init() {
		const redirectUri = 'https://schwab-mcp.dyeoman2.workers.dev/callback'

		const auth = createSchwabAuth({
			strategy: AuthStrategy.CODE_FLOW,
			oauthConfig: {
				clientId: this.env.SCHWAB_CLIENT_ID,
				clientSecret: this.env.SCHWAB_CLIENT_SECRET,
				redirectUri: redirectUri,
				save: async (tokens) => this.saveTokenData(tokens),
				load: async () => this.loadTokenData(),
			},
		})

		// Store auth in tokenManager
		this.tokenManager = auth as unknown as SchwabCodeFlowAuth

		// Create API client with auth
		const client = createApiClient({
			config: { environment: 'PRODUCTION' },
			auth,
		})

		registerAccountTools(this.server, client)
		registerInstrumentTools(this.server, client)
		registerMarketHoursTools(this.server, client)
		registerMoversTools(this.server, client)
		registerOptionsTools(this.server, client)
		registerOrderTools(this.server, client)
		registerPriceHistoryTools(this.server, client)
		registerQuotesTools(this.server, client)
		registerTransactionTools(this.server, client)
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
