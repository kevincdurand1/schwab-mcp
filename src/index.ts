import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createApiClient, type SchwabApiClient } from '@sudowealth/schwab-api'
import { DurableMCP } from 'workers-mcp'
import { SchwabHandler } from './auth'
import {
	type CodeFlowTokenData,
	type SchwabCodeFlowAuth,
	initializeSchwabAuthClient,
} from './auth/client'
import { TokenManager } from './auth/tokenManager'
import { logger } from './shared/logger'
import { initializeTokenManager } from './shared/utils'
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

// Import middleware directly

type Props = {
	name: string
	email: string
	accessToken: string
	refreshToken: string
	expiresAt: number
	// Track registered tools to ensure persistence
	registeredTools: string[]
}

export class MyMCP extends DurableMCP<Props, Env> {
	private tokenManager!: SchwabCodeFlowAuth
	private centralTokenManager!: TokenManager
	private client!: SchwabApiClient

	server = new McpServer({
		name: 'Schwab MCP',
		version: '0.0.1',
	})

	async init() {
		try {
			logger.info('Initializing Schwab MCP server')

			// Initialize registeredTools array if not present
			if (!this.props.registeredTools) {
				this.props.registeredTools = []
			}

			const redirectUri = 'https://schwab-mcp.dyeoman2.workers.dev/callback'

			// Preserve existing auth if present during reconnection
			if (this.tokenManager && this.client && this.centralTokenManager) {
				logger.info(
					'Auth components already exist, skipping recreation during init',
				)
			} else {
				// Create fresh auth components
				logger.info('Creating auth components')

				// Define token persistence functions
				const saveToken = async (tokens: CodeFlowTokenData) => {
					// Store tokens directly in props
					if (tokens.accessToken) this.props.accessToken = tokens.accessToken
					if (tokens.refreshToken) this.props.refreshToken = tokens.refreshToken
					if (tokens.expiresAt) this.props.expiresAt = tokens.expiresAt
					// Force props to persist immediately
					this.props = { ...this.props }
				}

				const loadToken = async () => {
					// Return tokens from props if available
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

				// Use the shared auth client initialization function
				this.tokenManager = initializeSchwabAuthClient(
					this.env,
					redirectUri,
					loadToken,
					saveToken,
				)

				// Create centralized token manager and make it available to utilities
				this.centralTokenManager = new TokenManager(this.tokenManager)
				initializeTokenManager(this.centralTokenManager)

				// Create API client with auth
				this.client = createApiClient({
					config: { environment: 'PRODUCTION' },
					auth: this.tokenManager,
				})
			}

			// Set up debug info for requests
			if ((this.client as any).axiosInstance) {
				logger.info('Adding request/response interceptors for debugging')

				// Add request interceptor
				;(this.client as any).axiosInstance.interceptors.request.use(
					(config: any) => {
						logger.info(
							`API Request: ${config.method.toUpperCase()} ${config.url}`,
							{
								headers: config.headers,
								baseURL: config.baseURL,
							},
						)
						return config
					},
					(error: any) => {
						logger.error('API Request Error', { error })
						return Promise.reject(error)
					},
				)

				// Add response interceptor
				;(this.client as any).axiosInstance.interceptors.response.use(
					(response: any) => {
						logger.info(
							`API Response: ${response.status} ${response.statusText}`,
							{
								url: response.config.url,
								method: response.config.method.toUpperCase(),
								data:
									typeof response.data === 'object'
										? '(object)'
										: response.data,
							},
						)
						return response
					},
					(error: any) => {
						if (error.response) {
							logger.error(`API Response Error: ${error.response.status}`, {
								url: error.config?.url,
								method: error.config?.method?.toUpperCase(),
								data: error.response.data,
							})
						} else {
							logger.error('API Error (no response)', { error })
						}
						return Promise.reject(error)
					},
				)
			}

			// Register all tools and track them
			await this.registerTools(this.client)
		} catch (error) {
			logger.error('Error during initialization', { error })
			throw error
		}
	}

	private async registerTools(client: SchwabApiClient) {
		// Register Schwab API tools
		registerAccountTools(this.server, client)
		registerInstrumentTools(this.server, client)
		registerMarketHoursTools(this.server, client)
		registerMoversTools(this.server, client)
		registerOptionsTools(this.server, client)
		registerOrderTools(this.server, client)
		registerPriceHistoryTools(this.server, client)
		registerQuotesTools(this.server, client)
		registerTransactionTools(this.server, client)

		// Force props to persist without using save() directly
		this.props = { ...this.props }
	}

	// Simplified reconnection method using enhanced features
	async onReconnect() {
		logger.info('Handling reconnection')

		try {
			// Use the dedicated reconnection handler from our centralized token manager
			if (this.centralTokenManager?.handleReconnection) {
				const reconnectSuccess =
					await this.centralTokenManager.handleReconnection()

				if (reconnectSuccess) {
					logger.info('Reconnection successful')
					return true
				}
			}

			// If the enhanced handler isn't available, we need to initialize
			logger.warn('Standard reconnection handling failed, reinitializing')
			await this.init()
			return true
		} catch (error) {
			logger.error('Error during reconnection handling', { error })
			return false
		}
	}

	// Simplified token validation - just delegate to token manager
	private async ensureValidToken(): Promise<boolean> {
		return this.centralTokenManager?.ensureValidToken() ?? false
	}

	// Simplified SSE connection handler
	async onSSE(event: any) {
		logger.info('SSE connection established or reconnected')
		await this.onReconnect()
		return await super.onSSE(event)
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
