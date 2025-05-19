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

	private async loadTokenData(): Promise<CodeFlowTokenData | null> {
		try {
			// Check if all required token properties are present
			if (
				this.props.accessToken &&
				this.props.refreshToken &&
				this.props.expiresAt
			) {
				const tokenData = {
					accessToken: this.props.accessToken,
					refreshToken: this.props.refreshToken,
					expiresAt: this.props.expiresAt,
				}

				// Log detailed token state
				logger.info('Loaded token data from props', {
					hasAccessToken: !!tokenData.accessToken,
					hasRefreshToken: !!tokenData.refreshToken,
					accessTokenLength: tokenData.accessToken.length,
					refreshTokenLength: tokenData.refreshToken.length,
					expiresAt: new Date(tokenData.expiresAt).toISOString(),
					expiresIn:
						Math.floor((tokenData.expiresAt - Date.now()) / 1000) + ' seconds',
					isExpired: Date.now() > tokenData.expiresAt,
				})

				// Verify token data - especially important to check refresh token
				if (!tokenData.refreshToken || tokenData.refreshToken.length < 10) {
					logger.error('Invalid refresh token loaded from props', {
						refreshTokenLength: tokenData.refreshToken?.length || 0,
					})
					return null
				}

				return tokenData
			}

			// Log which specific props are missing
			logger.info('Incomplete token data in props', {
				hasAccessToken: !!this.props.accessToken,
				hasRefreshToken: !!this.props.refreshToken,
				hasExpiresAt: !!this.props.expiresAt,
			})

			return null
		} catch (error) {
			logger.error('Error loading token data from props', { error })
			return null
		}
	}

	private async saveTokenData(tokenData: CodeFlowTokenData): Promise<void> {
		logger.info('Saving token data to props', {
			hasAccessToken: !!tokenData.accessToken,
			hasRefreshToken: !!tokenData.refreshToken,
			expiresIn: tokenData.expiresAt
				? Math.floor((tokenData.expiresAt - Date.now()) / 1000) + ' seconds'
				: 'unknown',
		})

		// Direct assignment with proper type checking
		if (tokenData.accessToken) this.props.accessToken = tokenData.accessToken
		if (tokenData.refreshToken) this.props.refreshToken = tokenData.refreshToken
		if (tokenData.expiresAt) this.props.expiresAt = tokenData.expiresAt

		// Force props to persist immediately
		try {
			// Clone props to ensure we're not using a proxy
			this.props = { ...this.props }

			// Log state of critical tokens after save attempt
			logger.info('Token state after save attempt', {
				propsHasAccessToken: !!this.props.accessToken,
				propsHasRefreshToken: !!this.props.refreshToken,
				propsTokenLength: this.props.accessToken?.length || 0,
				propsRefreshTokenLength: this.props.refreshToken?.length || 0,
				propsExpiresAt: this.props.expiresAt,
				tokensSaved: !!(this.props.accessToken && this.props.refreshToken),
			})
		} catch (error) {
			logger.error('Error saving token data to props', { error })
		}
	}

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
						hasParams: !!request.params,
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

					// Enhanced parameter logging
					logger.info('Tool call request details', {
						toolName,
						hasArguments: !!request.params?.arguments,
						hasParams: !!request.params?.params,
						argumentsReceived: JSON.stringify(request.params?.arguments),
						paramsReceived: JSON.stringify(request.params?.params),
						filteredParams: JSON.stringify(toolParams),
						requestParams: JSON.stringify(request.params),
					})

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
							logger.info(
								'API tool detected, ensuring valid token before proceeding',
								{ toolName },
							)

							// Check if connection state is valid
							if (!this.client || !this.centralTokenManager) {
								logger.warn(
									'Client or token manager not initialized during API call, attempting recovery',
								)
								await this.onReconnect()
							}

							const tokenValid = await this.ensureValidToken()

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
							paramsUsed: JSON.stringify(toolParams),
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

	// Add a method to ensure proper initialization during reconnections
	async onReconnect() {
		logger.info('Handling reconnection')

		try {
			// First, always try to load token data regardless of initialization state
			const tokenData = await this.loadTokenData()

			// Log token state for debugging
			logger.info('Token state during reconnection', {
				hasTokenData: !!tokenData,
				hasAccessToken: !!tokenData?.accessToken,
				hasRefreshToken: !!tokenData?.refreshToken,
				expiresAt: tokenData?.expiresAt
					? new Date(tokenData.expiresAt).toISOString()
					: 'none',
				isExpired: tokenData?.expiresAt
					? Date.now() > tokenData.expiresAt
					: true,
				hasClient: !!this.client,
				hasTokenManager: !!this.tokenManager,
				hasCentralTokenManager: !!this.centralTokenManager,
			})

			// Check if we need full reinitialization
			if (!this.client || !this.centralTokenManager || !this.tokenManager) {
				logger.info(
					'Client or token manager not initialized, performing full reinitializing',
				)
				await this.init()

				// After initialization, try to force token refresh if we have data
				if (tokenData && tokenData.refreshToken) {
					logger.info('Forcing token refresh after initialization')

					// Create new token data object for refreshing
					const refreshTokenData = {
						accessToken: tokenData.accessToken,
						refreshToken: tokenData.refreshToken,
						expiresAt: 0, // Force refresh by setting to expired
					}

					// Explicitly save this token data to ensure refresh token is available
					await this.saveTokenData(refreshTokenData)

					// Attempt a token refresh
					await this.centralTokenManager.refresh()
				}

				return true
			}

			// If components exist but token data is missing/invalid, we need to re-authenticate
			if (!tokenData || !tokenData.refreshToken) {
				logger.warn('Missing or invalid token data during reconnection')
				return false
			}

			// If token is expired, try to refresh it
			if (tokenData.expiresAt && Date.now() > tokenData.expiresAt) {
				logger.info('Token expired during reconnection, attempting refresh')

				// Update the token manager with the loaded data to ensure refresh token is available
				await this.saveTokenData(tokenData)

				// Force token refreshing
				const refreshSuccess = await this.centralTokenManager.refresh()
				if (!refreshSuccess) {
					logger.warn('Token refresh failed during reconnection')
					return false
				}

				logger.info('Token successfully refreshed during reconnection')
			}

			// Ensure token is still valid
			const tokenValid = await this.ensureValidToken()
			if (!tokenValid) {
				logger.warn('Token validation failed during reconnection')
				return false
			}

			logger.info('Reconnection successful, token is valid')
			return true
		} catch (error) {
			logger.error('Error during reconnection handling', {
				error,
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
				message: error instanceof Error ? error.message : String(error),
			})
			return false
		}
	}

	// Replace the existing ensureValidToken method with one that uses the centralized manager
	private async ensureValidToken(): Promise<boolean> {
		return this.centralTokenManager.ensureValidToken()
	}

	// Add more detailed tracking of SSE connections
	async onSSE(event: any) {
		logger.info('SSE connection established or reconnected', {
			source: 'onSSE',
			hasUrl: !!event?.url,
			urlParams: event?.url ? event.url.split('?')[1] || 'none' : 'url-missing',
		})

		// Attempt reconnection handling if needed
		const isReconnect = event?.url?.includes?.('reconnect=true') || false
		if (isReconnect) {
			logger.info('Handling explicit SSE reconnection')
			const reconnectSuccess = await this.onReconnect()
			if (!reconnectSuccess) {
				logger.warn('Reconnection failed to restore auth state')
			} else {
				logger.info('Reconnection successfully restored auth state')
			}
		} else {
			// Always perform a light reconnect check even without the flag
			logger.info('Performing routine reconnection check for SSE')
			await this.onReconnect()
		}

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
