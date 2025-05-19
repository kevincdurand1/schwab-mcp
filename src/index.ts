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
	// Add a property to track registered tools to ensure persistence
	registeredTools: string[]
}

export class MyMCP extends DurableMCP<Props, Env> {
	private tokenManager!: SchwabCodeFlowAuth
	private centralTokenManager!: TokenManager
	private client!: any

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

				// Define the complete config with the enhanced options
				const authConfig = {
					// Use the new enhanced strategy instead of CODE_FLOW
					strategy: AuthStrategy.ENHANCED,
					oauthConfig: {
						clientId: this.env.SCHWAB_CLIENT_ID,
						clientSecret: this.env.SCHWAB_CLIENT_SECRET,
						redirectUri: redirectUri,
						save: async (tokens: CodeFlowTokenData) => {
							// Store tokens directly in props
							if (tokens.accessToken)
								this.props.accessToken = tokens.accessToken
							if (tokens.refreshToken)
								this.props.refreshToken = tokens.refreshToken
							if (tokens.expiresAt) this.props.expiresAt = tokens.expiresAt
							// Force props to persist immediately
							this.props = { ...this.props }
						},
						load: async () => {
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
						},
					},
					// Add configuration for the enhanced token manager
					enhancedConfig: {
						persistence: {
							validateOnLoad: true,
							validateOnSave: true,
							events: true,
						},
						reconnection: {
							enabled: true,
							retryOnTransientErrors: true,
							maxRetries: 3,
							backoffFactor: 1.5,
						},
						diagnostics: {
							logTokenState: true,
							detailedErrors: true,
						},
					},
				}

				// Use type assertion to bypass TypeScript restrictions
				const auth = createSchwabAuth(authConfig as any)

				// Store auth in tokenManager
				this.tokenManager = auth as unknown as SchwabCodeFlowAuth

				// Create centralized token manager and make it available to utilities
				this.centralTokenManager = new TokenManager(this.tokenManager)
				initializeTokenManager(this.centralTokenManager)

				// Create API client with auth
				this.client = createApiClient({
					config: { environment: 'PRODUCTION' },
					auth,
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

			// Override JSON-RPC handler to add parameter handling
			this.setupCustomRpcHandler()
		} catch (error) {
			logger.error('Error during initialization', { error })
			throw error
		}
	}

	private async registerTools(client: any) {
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

	private setupCustomRpcHandler() {
		// @ts-ignore - Accessing internal properties for parameter handling
		const originalJsonRpcHandler = this.server.jsonRpcHandler
		// @ts-ignore - Overriding internal method for parameter handling
		this.server.jsonRpcHandler = async (request) => {
			try {
				logger.info('Incoming RPC request', {
					method: request.method,
					params: JSON.stringify(request.params),
					id: request.id,
				})

				// Handle SSE connections and reconnections
				if (
					request.method === 'sse/connect' ||
					request.method === 'sse/connect_client'
				) {
					logger.info('SSE connection attempt detected via RPC', {
						method: request.method,
					})
					await this.onReconnect()
				}

				// Handle tools/list with extra logging
				if (request.method === 'tools/list') {
					logger.info('Handling tools/list request', {
						registeredToolsInProps: this.props.registeredTools,
					})

					// If we don't have tools in the server but have them in props, re-register
					// @ts-ignore - Using internal property for debugging
					const serverToolCount = Object.keys(this.server.tools || {}).length
					if (serverToolCount === 0 && this.props.registeredTools.length > 0) {
						logger.warn(
							'Tools missing from server but found in props, re-registering',
						)
						await this.registerTools(null) // Pass null client since we're just re-registering diagnostic tools
					}
				}

				// Handle tools/call with extra validation and parameter fix
				if (request.method === 'tools/call') {
					const toolName = request.params?.name

					// IMPORTANT FIX: Handle multiple parameter formats and normalize them
					let toolParams = {}

					// 1. Check if params are in request.params.arguments (most likely format)
					if (request.params?.arguments !== undefined) {
						if (typeof request.params.arguments === 'object') {
							toolParams = request.params.arguments
						} else {
							// Handle non-object arguments (might be string, number, etc.)
							toolParams = { value: request.params.arguments }
						}
					}
					// 2. Check if params are in request.params.params
					else if (request.params?.params !== undefined) {
						if (typeof request.params.params === 'object') {
							toolParams = request.params.params
						} else {
							toolParams = { value: request.params.params }
						}
					}
					// 3. Check if other fields in request.params might be parameters
					else {
						// Collect all fields except 'name' as possible parameters
						const potentialParams = { ...request.params }
						if (potentialParams.name) {
							delete potentialParams.name
						}

						// If there are other fields, use them as parameters
						if (Object.keys(potentialParams).length > 0) {
							toolParams = potentialParams
						}
					}

					// CRITICAL FIX: Filter out system properties to isolate user parameters
					const systemProperties = ['signal', 'sessionId', 'requestId', 'name']
					const filteredParams = { ...toolParams } as Record<string, any>

					// Remove system properties from parameters
					for (const prop of systemProperties) {
						if (prop in filteredParams) {
							delete filteredParams[prop]
						}
					}

					// Use filtered parameters
					toolParams =
						Object.keys(filteredParams).length > 0 ? filteredParams : {}

					// Validate tool name
					if (!toolName) {
						return {
							jsonrpc: '2.0',
							id: request.id,
							error: {
								code: -32602,
								message: 'Invalid params: missing tool name',
								data: {
									availableTools: this.props.registeredTools,
								},
							},
						}
					}

					// Handle unknown tool
					if (!this.props.registeredTools.includes(toolName)) {
						// Check if tool exists in server but not in props
						// @ts-ignore - Using internal property for debugging
						const serverTools = Object.keys(this.server.tools || {})
						if (serverTools.includes(toolName)) {
							// Tool exists in server but not in props, add it to props
							this.props.registeredTools.push(toolName)
							// Force props to persist without using save() directly
							this.props = { ...this.props }
							logger.info(`Added missing tool to props: ${toolName}`)
						} else {
							return {
								jsonrpc: '2.0',
								id: request.id,
								result: {
									content: [
										{
											type: 'text',
											text: `The requested tool '${toolName}' was not found.`,
										},
										{
											type: 'text',
											text: `Available tools: ${this.props.registeredTools.join(', ')}`,
										},
									],
								},
							}
						}
					}

					// Fix for parameter passing - manually invoke the tool function
					try {
						// For Schwab API tools, check token validity first
						const isApiTool =
							toolName.startsWith('accounts') ||
							toolName.startsWith('instruments') ||
							toolName.startsWith('marketHours') ||
							toolName.startsWith('movers') ||
							toolName.startsWith('options') ||
							toolName.startsWith('orders') ||
							toolName.startsWith('priceHistory') ||
							toolName.startsWith('quotes') ||
							toolName.startsWith('transactions')

						if (isApiTool) {
							logger.info('API tool detected, checking token validity')

							// Check if connection state is valid
							if (!this.client || !this.centralTokenManager) {
								logger.warn(
									'Client or token manager not initialized, attempting recovery',
								)
								await this.onReconnect()
							}

							const tokenValid =
								await this.centralTokenManager.ensureValidToken()

							if (!tokenValid) {
								return {
									jsonrpc: '2.0',
									id: request.id,
									result: {
										content: [
											{
												type: 'text',
												text: 'Authentication required: Please authenticate with Schwab to use API tools',
											},
										],
									},
								}
							}
						}

						// Normal case for tools
						// @ts-ignore - Accessing tools object directly
						const toolInfo = this.server.tools[toolName]
						if (toolInfo && typeof toolInfo.handler === 'function') {
							logger.info('Invoking tool handler with parameters', {
								toolName,
								paramsBeingPassed: JSON.stringify(toolParams),
							})

							// Call the handler directly with the filtered params
							const result = await toolInfo.handler(toolParams)

							// Return a proper JSON-RPC response
							return {
								jsonrpc: '2.0',
								id: request.id,
								result: result,
							}
						}
					} catch (toolError) {
						logger.error('Error invoking tool', {
							toolName,
							error: toolError,
						})

						return {
							jsonrpc: '2.0',
							id: request.id,
							result: {
								content: [
									{
										type: 'text',
										text: `Error calling tool: ${(toolError as Error).message}`,
									},
								],
							},
						}
					}
				}

				// Call original handler for non-tool/call requests
				const result = await originalJsonRpcHandler.call(this.server, request)
				return result
			} catch (error) {
				logger.error('Error handling RPC request', {
					method: request.method,
					error,
				})

				// For tools/call errors, try to provide better diagnostics
				if (request.method === 'tools/call' && request.id) {
					return {
						jsonrpc: '2.0',
						id: request.id,
						result: {
							content: [
								{
									type: 'text',
									text: `Error calling tool: ${(error as Error).message || 'Unknown error'}`,
								},
								{
									type: 'text',
									text: `Available tools: ${this.props.registeredTools.join(', ')}`,
								},
							],
						},
					}
				}

				throw error
			}
		}
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
