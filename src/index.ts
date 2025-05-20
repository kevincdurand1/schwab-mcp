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
import { type ITokenManager } from './auth/tokenInterface'
import { TokenManager } from './auth/tokenManager'
import { TokenStateMachine } from './auth/tokenStateMachine'
import { logger } from './shared/logger'
import { initializeTokenManager as initializeToolTokenManager } from './shared/toolBuilder'
import { initializeTokenManager as initializeUtilTokenManager } from './shared/utils'
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
	private centralTokenManager!: ITokenManager
	private client!: SchwabApiClient
	private useStateMachine = true // Flag to control which implementation to use

	server = new McpServer({
		name: 'Schwab MCP',
		version: '0.0.1',
	})

	async init() {
		try {
			logger.info('Initializing Schwab MCP server')

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

				// Create centralized token manager based on selection
				if (this.useStateMachine) {
					logger.info('Using TokenStateMachine for token management')
					this.centralTokenManager = new TokenStateMachine(this.tokenManager)
				} else {
					logger.info('Using TokenManager for token management')
					this.centralTokenManager = new TokenManager(this.tokenManager)
				}

				// Initialize both token managers with the same instance
				logger.info('Initializing token managers')
				initializeUtilTokenManager(this.centralTokenManager)
				initializeToolTokenManager(this.centralTokenManager)

				// Create API client with auth
				this.client = createApiClient({
					config: { environment: 'PRODUCTION' },
					auth: this.tokenManager,
				})
			}

			// Set up debug info for requests if axios is available
			if (
				this.client &&
				typeof this.client === 'object' &&
				'axiosInstance' in this.client
			) {
				const axiosInstance = (this.client as any).axiosInstance

				logger.info('Adding request/response interceptors for debugging')

				// Add request interceptor
				axiosInstance.interceptors.request.use(
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
				axiosInstance.interceptors.response.use(
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

			// Ensure token managers are initialized when reconnecting
			if (this.centralTokenManager) {
				initializeUtilTokenManager(this.centralTokenManager)
				initializeToolTokenManager(this.centralTokenManager)
			}

			// Register all tools and track them
			await this.registerTools(this.client)
		} catch (error) {
			logger.error('Error during initialization', { error })
			throw error
		}
	}

	private async registerTools(client: SchwabApiClient) {
		// Register Schwab API tools with the new parameter order
		registerAccountTools(client, this.server)
		registerInstrumentTools(client, this.server)
		registerMarketHoursTools(client, this.server)
		registerMoversTools(client, this.server)
		registerOptionsTools(client, this.server)
		registerOrderTools(client, this.server)
		registerPriceHistoryTools(client, this.server)
		registerQuotesTools(client, this.server)
		registerTransactionTools(client, this.server)
	}

	// Simplified reconnection method using enhanced features
	async onReconnect() {
		logger.info('Handling reconnection')

		try {
			// Ensure token managers are initialized
			if (this.centralTokenManager) {
				initializeUtilTokenManager(this.centralTokenManager)
				initializeToolTokenManager(this.centralTokenManager)
			}

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

	// Get token diagnostics (only available with TokenStateMachine)
	getDiagnostics() {
		if (
			this.useStateMachine &&
			this.centralTokenManager instanceof TokenStateMachine
		) {
			return this.centralTokenManager.getDiagnostics()
		}

		if (this.centralTokenManager instanceof TokenManager) {
			return this.centralTokenManager.getTokenDiagnostics()
		}

		// Simple diagnostics if neither specific type is available
		return {
			hasTokenManager: !!this.centralTokenManager,
			hasTokenClient: !!this.tokenManager,
			implementationType: this.useStateMachine
				? 'TokenStateMachine'
				: 'TokenManager',
		}
	}
}

export default new OAuthProvider({
	apiRoute: '/sse',
	// @ts-ignore - Needed because of type mismatch in the library
	apiHandler: MyMCP.mount('/sse') as any,
	defaultHandler: SchwabHandler as any,
	authorizeEndpoint: '/authorize',
	tokenEndpoint: '/token',
	clientRegistrationEndpoint: '/register',
})
