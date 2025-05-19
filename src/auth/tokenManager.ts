import { type TokenData } from '@sudowealth/schwab-api'
import { logger } from '../shared/logger'
import { type SchwabCodeFlowAuth } from './client'

// Add these types to match the enhanced token management features
interface TokenLifecycleEvent {
	type: 'save' | 'load' | 'refresh' | 'expire' | 'error'
	tokenData?: TokenData | null
	error?: Error | null
	timestamp: number
}

export class TokenManager {
	private tokenClient: SchwabCodeFlowAuth
	private tokenData: TokenData | null = null
	private initialized = false
	// Track token lifecycle events
	private tokenEvents: TokenLifecycleEvent[] = []
	// Store the last reconnection attempt time
	private lastReconnectTime = 0

	constructor(tokenClient: SchwabCodeFlowAuth) {
		logger.info('TokenManager constructor called')
		this.tokenClient = tokenClient
		this.initialize()

		// Subscribe to token events if available
		if (this.tokenClient.onTokenEvent) {
			this.tokenClient.onTokenEvent((event) => {
				logger.info(`[TokenManager] Token event: ${event.type}`, {
					hasTokenData: !!event.tokenData,
					hasError: !!event.error,
					timestamp: event.timestamp,
				})

				// Store the event
				this.tokenEvents.push(event)

				// If this is a refresh event, update our local token data
				if (event.type === 'refresh' && event.tokenData) {
					this.tokenData = event.tokenData
				}
			})
		}
	}

	private initialize() {
		this.initialized = true
		logger.info('TokenManager initialized with client', {
			hasClient: !!this.tokenClient,
			clientType: this.tokenClient ? typeof this.tokenClient : 'undefined',
			supportsRefresh:
				this.tokenClient &&
				typeof this.tokenClient.supportsRefresh === 'function'
					? this.tokenClient.supportsRefresh()
					: 'unknown',
			hasGetTokenMethod:
				this.tokenClient && typeof this.tokenClient.getTokenData === 'function'
					? 'yes'
					: 'no',
			hasRefreshMethod:
				this.tokenClient && typeof this.tokenClient.refresh === 'function'
					? 'yes'
					: 'no',
			// Check for new enhanced features
			hasTokenEvents: !!this.tokenClient.onTokenEvent,
			hasReconnect: !!this.tokenClient.handleReconnection,
			hasForceRefresh: !!this.tokenClient.forceRefresh,
		})
	}

	updateTokenClient(tokenClient: SchwabCodeFlowAuth) {
		logger.info('TokenManager updating token client')
		this.tokenClient = tokenClient
		this.initialize()
	}

	async getAccessToken(): Promise<string | null> {
		logger.info('TokenManager.getAccessToken called')
		if (!this.initialized || !this.tokenClient) {
			logger.warn(
				'TokenManager not properly initialized when getting access token',
			)
			return null
		}

		const isValid = await this.ensureValidToken()
		return isValid && this.tokenData ? this.tokenData.accessToken : null
	}

	async ensureValidToken(): Promise<boolean> {
		try {
			logger.info('TokenManager.ensureValidToken called')

			if (!this.initialized || !this.tokenClient) {
				logger.warn(
					'TokenManager not properly initialized when ensuring valid token',
				)
				return false
			}

			// Use enhanced token validation if available
			if (this.tokenClient.validateToken) {
				const validationResult = await this.tokenClient.validateToken()

				if (validationResult.valid) {
					this.tokenData = validationResult.tokenData ?? null
					logger.info('Token is valid (using enhanced validation)')
					return true
				}

				if (validationResult.canRefresh) {
					// Use the enhanced refresh capability
					return await this.refresh()
				}

				logger.error('Token invalid and cannot be refreshed', validationResult)
				return false
			}

			// Fall back to original validation logic
			this.tokenData = await this.tokenClient.getTokenData()

			logger.info('Retrieved token data', {
				hasAccessToken: !!this.tokenData?.accessToken,
				hasRefreshToken: !!this.tokenData?.refreshToken,
				expiresAt: this.tokenData?.expiresAt
					? new Date(this.tokenData.expiresAt).toISOString()
					: 'undefined',
				expiresIn: this.tokenData?.expiresAt
					? Math.floor((this.tokenData.expiresAt - Date.now()) / 1000) +
						' seconds'
					: 'unknown',
			})

			if (!this.tokenData?.accessToken) {
				logger.error('[ERROR] No access token available')
				return false
			}

			// Check if token is expired or expiring soon
			const now = Date.now()
			const bufferTime = 300 * 1000 // 5 minutes

			if (
				this.tokenData.expiresAt &&
				now + bufferTime >= this.tokenData.expiresAt
			) {
				logger.info('Token expired or expiring soon, attempting refresh', {
					now,
					expiresAt: this.tokenData.expiresAt,
					expiresIn:
						Math.floor((this.tokenData.expiresAt - now) / 1000) + ' seconds',
					bufferTimeSeconds: bufferTime / 1000,
				})

				// Attempt refresh
				return await this.refresh()
			}

			logger.info('Token is valid, no refresh needed', {
				expiresIn: this.tokenData.expiresAt
					? Math.floor((this.tokenData.expiresAt - now) / 1000) + ' seconds'
					: 'unknown',
			})
			return true
		} catch (error) {
			logger.error('Error in token management', {
				error,
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
				errorMessage: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			})
			return false
		}
	}

	async refresh(): Promise<boolean> {
		try {
			logger.info('[TokenManager] Starting token refresh')

			// Check initialization state
			if (!this.initialized || !this.tokenClient) {
				logger.warn(
					'TokenManager not properly initialized when refreshing token',
				)
				return false
			}

			// Use enhanced forceRefresh if available
			if (this.tokenClient.forceRefresh) {
				logger.info('[TokenManager] Using enhanced force refresh')
				const result = await this.tokenClient.forceRefresh({
					retryOnFailure: true,
					logDetails: true,
				})

				// Get updated token data after refresh
				this.tokenData = await this.tokenClient.getTokenData()

				logger.info('[TokenManager] Enhanced refresh completed', {
					success: result.success,
					hasAccessToken: !!this.tokenData?.accessToken,
					hasRefreshToken: !!this.tokenData?.refreshToken,
					expiresIn: this.tokenData?.expiresAt
						? Math.floor((this.tokenData.expiresAt - Date.now()) / 1000) +
							' seconds'
						: 'unknown',
				})

				return result.success
			}

			// Fall back to original implementation
			// Get current token data
			const beforeRefresh = await this.tokenClient.getTokenData()

			// Log detailed token state before refresh attempt
			logger.info('[TokenManager] Token before refresh', {
				hasAccessToken: !!beforeRefresh?.accessToken,
				hasRefreshToken: !!beforeRefresh?.refreshToken,
				refreshTokenLength: beforeRefresh?.refreshToken?.length || 0,
				expiresAt: beforeRefresh?.expiresAt
					? new Date(beforeRefresh.expiresAt).toISOString()
					: 'undefined',
				accessTokenPrefix: beforeRefresh?.accessToken
					? beforeRefresh.accessToken.substring(0, 10) + '...'
					: 'none',
				refreshTokenPrefix: beforeRefresh?.refreshToken
					? beforeRefresh.refreshToken.substring(0, 10) + '...'
					: 'none',
			})

			// Check if refresh token is available and valid
			if (
				!beforeRefresh?.refreshToken ||
				beforeRefresh.refreshToken.length < 10
			) {
				logger.error(
					'[TokenManager] Refresh token is missing or invalid (length: ' +
						(beforeRefresh?.refreshToken?.length || 0) +
						')',
				)
				return false
			}

			// Attempt refresh with explicitly provided refresh token
			logger.info(
				'[TokenManager] Calling refresh with explicit refresh token...',
			)

			// Call refresh with the refresh token explicitly to avoid relying on internal state
			const result = await this.tokenClient.refresh(
				beforeRefresh.refreshToken,
				{ force: true },
			)

			logger.info('[TokenManager] Refresh call completed', {
				result: result ? 'success' : 'failure',
				resultType: typeof result,
			})

			// Verify token data after refresh
			const afterRefresh = await this.tokenClient.getTokenData()

			// Log detailed token state after refresh
			logger.info('[TokenManager] Token after refresh', {
				hasAccessToken: !!afterRefresh?.accessToken,
				hasRefreshToken: !!afterRefresh?.refreshToken,
				refreshTokenLength: afterRefresh?.refreshToken?.length || 0,
				expiresAt: afterRefresh?.expiresAt
					? new Date(afterRefresh.expiresAt).toISOString()
					: 'undefined',
				accessTokenPrefix: afterRefresh?.accessToken
					? afterRefresh.accessToken.substring(0, 10) + '...'
					: 'none',
				refreshTokenPrefix: afterRefresh?.refreshToken
					? afterRefresh.refreshToken.substring(0, 10) + '...'
					: 'none',
				tokensChanged: beforeRefresh?.accessToken !== afterRefresh?.accessToken,
				result: result ? 'success' : 'failure',
			})

			this.tokenData = afterRefresh
			const success = !!afterRefresh?.accessToken

			logger.info(
				'[TokenManager] Refresh ' + (success ? 'successful' : 'failed'),
			)

			return success
		} catch (error) {
			logger.error('[TokenManager] Token refresh error', {
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			})
			return false
		}
	}

	// Add a dedicated method for handling reconnection
	async handleReconnection(): Promise<boolean> {
		// Avoid reconnecting too frequently
		const now = Date.now()
		if (now - this.lastReconnectTime < 5000) {
			// 5 seconds minimum between reconnects
			logger.info(
				'[TokenManager] Skipping reconnection, too soon after last attempt',
			)
			return false
		}

		this.lastReconnectTime = now
		logger.info('[TokenManager] Handling reconnection explicitly')

		try {
			// Use enhanced reconnection handler if available
			if (this.tokenClient.handleReconnection) {
				logger.info('[TokenManager] Using enhanced reconnection handler')

				const result = await this.tokenClient.handleReconnection({
					forceTokenRefresh: true,
					validateTokens: true,
				})

				logger.info('[TokenManager] Enhanced reconnection completed', {
					success: result.success,
					tokenRestored: result.tokenRestored,
					refreshPerformed: result.refreshPerformed,
				})

				// Update our token data
				if (result.success) {
					this.tokenData = await this.tokenClient.getTokenData()
				}

				return result.success
			}

			// Fall back to manual reconnection
			logger.info('[TokenManager] Falling back to manual reconnection')
			return await this.refresh()
		} catch (error) {
			logger.error('[TokenManager] Reconnection error', {
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			})
			return false
		}
	}

	// Add a method to get token health diagnostics
	getTokenDiagnostics() {
		return {
			initialized: this.initialized,
			hasTokenData: !!this.tokenData,
			hasAccessToken: !!this.tokenData?.accessToken,
			hasRefreshToken: !!this.tokenData?.refreshToken,
			isExpired: this.tokenData?.expiresAt
				? Date.now() > this.tokenData.expiresAt
				: true,
			expiresIn: this.tokenData?.expiresAt
				? Math.floor((this.tokenData.expiresAt - Date.now()) / 1000)
				: -1,
			eventsCount: this.tokenEvents.length,
			lastEventType:
				this.tokenEvents.length > 0
					? this.tokenEvents[this.tokenEvents.length - 1]?.type
					: 'none',
			lastReconnection:
				this.lastReconnectTime > 0
					? new Date(this.lastReconnectTime).toISOString()
					: 'never',
		}
	}
}
