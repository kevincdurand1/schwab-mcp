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
import { initializeTokenManager, withTokenAuth } from './shared/utils'
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

// Type for diagnostics content
type DiagnosticsContent = Array<{ type: string; text: string }>

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

			logger.info('Loaded token data from props', {
				hasAccessToken: !!tokenData.accessToken,
				expiresIn:
					Math.floor((tokenData.expiresAt - Date.now()) / 1000) + ' seconds',
			})

			return tokenData
		}
		logger.info('No token data found in props')
		return null
	}

	private async saveTokenData(tokenData: CodeFlowTokenData): Promise<void> {
		logger.info('Saving token data to props', {
			hasAccessToken: !!tokenData.accessToken,
			hasRefreshToken: !!tokenData.refreshToken,
			expiresIn: tokenData.expiresAt
				? Math.floor((tokenData.expiresAt - Date.now()) / 1000) + ' seconds'
				: 'unknown',
		})

		this.props.accessToken = tokenData.accessToken
		this.props.refreshToken = tokenData.refreshToken
		this.props.expiresAt = tokenData.expiresAt

		// Force props to persist by making a shallow copy
		this.props = { ...this.props }
	}

	async init() {
		try {
			logger.info('Initializing Schwab MCP server')

			// Initialize registeredTools array if not present
			if (!this.props.registeredTools) {
				this.props.registeredTools = []
			}

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

			// Create centralized token manager and make it available to utilities
			this.centralTokenManager = new TokenManager(this.tokenManager)
			initializeTokenManager(this.centralTokenManager)

			// Create API client with auth
			this.client = createApiClient({
				config: { environment: 'PRODUCTION' },
				auth,
			})

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

	// Helper to register a tool and track it in props
	private registerTool(
		name: string,
		params: Record<string, any>,
		handler: any,
	) {
		// Register the tool with the server
		this.server.tool(name, params, handler)

		// Track the tool if not already tracked
		if (!this.props.registeredTools.includes(name)) {
			this.props.registeredTools.push(name)
			logger.info(`Tool registered: ${name}`)
		}
	}

	private async registerTools(client: any) {
		// Register diagnostic tools
		this.registerTool('echo', { message: 'string?' }, async (args: any) => {
			// Extract message from args, dealing with potential system properties contamination
			let message

			// Try to extract message directly from args
			if (args && typeof args === 'object') {
				// Check if message is directly in the args object
				if ('message' in args) {
					message = args.message
				}
				// If not, check if there are nested parameters
				else if (
					'params' in args &&
					args.params &&
					typeof args.params === 'object' &&
					'message' in args.params
				) {
					message = args.params.message
				} else if (
					'arguments' in args &&
					args.arguments &&
					typeof args.arguments === 'object' &&
					'message' in args.arguments
				) {
					message = args.arguments.message
				}
			}

			logger.info('Echo tool called', {
				message,
				rawArgs: args,
				argsType: typeof args,
				hasMessage:
					args && typeof args === 'object' ? 'message' in args : false,
				argsAsJson: JSON.stringify(args),
			})

			return {
				content: [
					{
						type: 'text',
						text: `Echo: ${message || '[No message provided]'}`,
					},
					{
						type: 'text',
						text: `Server time: ${new Date().toISOString()}`,
					},
					{
						type: 'text',
						text: `Registered tools (${this.props.registeredTools.length}): ${this.props.registeredTools.join(', ')}`,
					},
				],
			}
		})

		// System info tool
		this.registerTool('systemInfo', {}, async () => {
			logger.info('System info tool called')
			return {
				content: [
					{
						type: 'text',
						text: `Server info: Schwab MCP 0.0.1`,
					},
					{
						type: 'text',
						text: `Registered tools (${this.props.registeredTools.length}): ${this.props.registeredTools.join(', ')}`,
					},
					{
						type: 'text',
						text: `Current time: ${new Date().toISOString()}`,
					},
				],
			}
		})

		// Authentication status checker tool with enhanced diagnostics
		this.registerTool('checkAuth', {}, async () => {
			logger.info('Auth check tool called')

			// Basic token info
			const now = Date.now()
			const tokenExpiry = this.props.expiresAt || 0
			const expiresIn = Math.floor((tokenExpiry - now) / 1000)
			const hasValidToken = await this.ensureValidToken()

			// Enhanced diagnostics using debugAuth if available
			let diagnosticsContent: DiagnosticsContent = []
			try {
				if (client.debugAuth) {
					const diagnostics = await client.debugAuth()
					diagnosticsContent = [
						{
							type: 'text',
							text: `Auth Manager Type: ${diagnostics.authManagerType || 'Unknown'}`,
						},
						{
							type: 'text',
							text: `Supports Refresh: ${diagnostics.supportsRefresh ? 'Yes' : 'No'}`,
						},
						{
							type: 'text',
							text: `Environment: ${diagnostics.environment?.apiEnvironment || 'Unknown'}`,
						},
						{
							type: 'text',
							text: `Auth Headers Valid: ${diagnostics.authHeadersValid ? 'Yes' : 'No'}`,
						},
						{
							type: 'text',
							text: `Token Status: ${JSON.stringify(diagnostics.tokenStatus, null, 2)}`,
						},
					]
				}
			} catch (error) {
				logger.error('Error getting auth diagnostics', { error })
				diagnosticsContent = [
					{
						type: 'text',
						text: `Error getting enhanced diagnostics: ${(error as Error).message}`,
					},
				]
			}

			return {
				content: [
					{
						type: 'text',
						text: `Authentication Status Check:`,
					},
					{
						type: 'text',
						text: `Has access token: ${!!this.props.accessToken}`,
					},
					{
						type: 'text',
						text: `Has refresh token: ${!!this.props.refreshToken}`,
					},
					{
						type: 'text',
						text: `Token expires in: ${expiresIn > 0 ? `${expiresIn} seconds` : 'Expired'}`,
					},
					{
						type: 'text',
						text: `Token status: ${hasValidToken ? 'Valid' : 'Invalid or expired'}`,
					},
					{
						type: 'text',
						text: `Current time: ${new Date().toISOString()}`,
					},
					{
						type: 'text',
						text: `Expiry time: ${new Date(tokenExpiry).toISOString()}`,
					},
					...diagnosticsContent,
				],
			}
		})

		// Add a dedicated debug auth tool for detailed diagnostics
		this.registerTool(
			'debugAuth',
			{ forceRefresh: 'boolean?' },
			async (args: any) => {
				logger.info('Debug auth tool called', { args })

				try {
					// Force refresh if requested
					const forceRefresh = args?.forceRefresh === true

					// Run the debugAuth function if available
					if (client.debugAuth) {
						const diagnostics = await client.debugAuth({ forceRefresh })

						// Log full diagnostics to server logs
						logger.info('Auth diagnostics', diagnostics)

						return {
							content: [
								{
									type: 'text',
									text: `Auth Diagnostics${forceRefresh ? ' (with forced refresh)' : ''}:`,
								},
								{
									type: 'text',
									text: `Auth Manager Type: ${diagnostics.authManagerType || 'Unknown'}`,
								},
								{
									type: 'text',
									text: `Supports Refresh: ${diagnostics.supportsRefresh ? 'Yes' : 'No'}`,
								},
								{
									type: 'text',
									text: `Has Token: ${diagnostics.tokenStatus.hasAccessToken ? 'Yes' : 'No'}`,
								},
								{
									type: 'text',
									text: `Is Expired: ${diagnostics.tokenStatus.isExpired ? 'Yes' : 'No'}`,
								},
								{
									type: 'text',
									text: `Expires In: ${diagnostics.tokenStatus.expiresInSeconds} seconds`,
								},
								{
									type: 'text',
									text: `Refresh Successful: ${diagnostics.tokenStatus.refreshSuccessful ? 'Yes' : 'No/Not Attempted'}`,
								},
								{
									type: 'text',
									text: `Environment: ${diagnostics.environment?.apiEnvironment || 'Unknown'}`,
								},
								{
									type: 'text',
									text: `Auth Headers Valid: ${diagnostics.authHeadersValid ? 'Yes' : 'No'}`,
								},
								{
									type: 'text',
									text: `Full Diagnostics: ${JSON.stringify(diagnostics, null, 2)}`,
								},
							],
						}
					} else {
						// Fall back to basic diagnostics if debugAuth isn't available
						return {
							content: [
								{
									type: 'text',
									text: `debugAuth method not available on client. Using basic diagnostics:`,
								},
								{
									type: 'text',
									text: `Has access token: ${!!this.props.accessToken}`,
								},
								{
									type: 'text',
									text: `Has refresh token: ${!!this.props.refreshToken}`,
								},
								{
									type: 'text',
									text: `Token expiry: ${new Date(this.props.expiresAt).toISOString()}`,
								},
								{
									type: 'text',
									text: `Current time: ${new Date().toISOString()}`,
								},
							],
						}
					}
				} catch (error) {
					logger.error('Error in debugAuth tool', { error })
					return {
						content: [
							{
								type: 'text',
								text: `Error running auth diagnostics: ${(error as Error).message}`,
							},
						],
					}
				}
			},
		)

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

	// Replace the existing ensureValidToken method with one that uses the centralized manager
	private async ensureValidToken(): Promise<boolean> {
		return this.centralTokenManager.ensureValidToken()
	}

	private makeApiCall = async <T>(
		method: (client: any) => Promise<T>,
	): Promise<T> => {
		try {
			const methodName = method.name || 'unnamed function'
			logger.info(`Making API call using ${methodName}`, {
				clientExists: !!this.client,
				tokenManagerExists: !!this.centralTokenManager,
			})

			// Do an explicit token check before the API call
			if (this.centralTokenManager) {
				const tokenValid = await this.centralTokenManager.ensureValidToken()
				if (!tokenValid) {
					logger.error(
						`Token validation failed before API call to ${methodName}`,
					)
					throw new Error('Failed to get valid token for API request')
				}

				// Get the current token for logging
				// Use the centralTokenManager to get token data if available
				const tokenData = await this.centralTokenManager.getAccessToken()
				logger.info(`Token state before API call to ${methodName}`, {
					hasAccessToken: !!tokenData,
					accessTokenPrefix: tokenData
						? `${tokenData.substring(0, 10)}...`
						: 'none',
					// We can't easily get expiration here, so just note if we have a token
					hasToken: !!tokenData,
				})
			}

			// Use our withTokenAuth wrapper for better error logging and handling
			return await withTokenAuth(this.client, method, this.client)
		} catch (error) {
			logger.error('API call failed', {
				methodName: method.name || 'unnamed function',
				error: error instanceof Error ? error.message : String(error),
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
				stack: error instanceof Error ? error.stack : undefined,
			})
			throw error
		}
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
