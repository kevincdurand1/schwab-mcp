import { type TokenData } from '@sudowealth/schwab-api'
import { logger } from '../shared/logger'
import { type SchwabCodeFlowAuth } from './client'

// Token lifecycle event interface
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
		logger.info('TokenManager initialized')
		this.tokenClient = tokenClient
		this.initialized = true

		// Subscribe to token events if available
		if (this.tokenClient?.onTokenEvent) {
			this.tokenClient.onTokenEvent((event) => {
				logger.info(`Token event: ${event.type}`)

				// Store the event
				this.tokenEvents.push(event)

				// If this is a refresh event, update our local token data
				if (event.type === 'refresh' && event.tokenData) {
					this.tokenData = event.tokenData
				}
			})
		}
	}

	updateTokenClient(tokenClient: SchwabCodeFlowAuth) {
		logger.info('Updating token client')
		this.tokenClient = tokenClient
		this.initialized = true
	}

	async getAccessToken(): Promise<string | null> {
		logger.info('Getting access token')
		if (!this.initialized || !this.tokenClient) {
			logger.warn('TokenManager not properly initialized')
			return null
		}

		const isValid = await this.ensureValidToken()
		return isValid && this.tokenData ? this.tokenData.accessToken : null
	}

	async ensureValidToken(): Promise<boolean> {
		try {
			logger.info('Ensuring token validity')

			if (!this.initialized || !this.tokenClient) {
				logger.warn('TokenManager not properly initialized')
				return false
			}

			// Use enhanced token validation
			if (this.tokenClient?.validateToken) {
				const validationResult = await this.tokenClient.validateToken()

				if (validationResult.valid) {
					this.tokenData = validationResult.tokenData ?? null
					logger.info('Token is valid')
					return true
				}

				if (validationResult.canRefresh) {
					// Use the enhanced refresh capability
					return await this.refresh()
				}

				logger.error('Token invalid and cannot be refreshed')
				return false
			}

			// If enhanced validation is unavailable, use the getTokenData + expiry check method
			// This should only happen if the library is outdated
			this.tokenData = await this.tokenClient.getTokenData()

			if (!this.tokenData?.accessToken) {
				logger.error('No access token available')
				return false
			}

			// Check expiration
			if (
				this.tokenData.expiresAt &&
				Date.now() + 300000 >= this.tokenData.expiresAt
			) {
				return await this.refresh()
			}

			return true
		} catch (error) {
			logger.error('Error validating token', { error })
			return false
		}
	}

	async refresh(): Promise<boolean> {
		try {
			logger.info('Starting token refresh')

			if (!this.initialized || !this.tokenClient) {
				logger.warn('TokenManager not properly initialized')
				return false
			}

			// Use enhanced forceRefresh
			if (this.tokenClient?.forceRefresh) {
				logger.info('Using enhanced force refresh')
				const result = await this.tokenClient.forceRefresh({
					retryOnFailure: true,
					logDetails: true,
				})

				// Get updated token data after refresh
				this.tokenData = await this.tokenClient.getTokenData()
				return result.success
			}

			// Fall back to standard refresh if enhanced isn't available
			const tokenData = await this.tokenClient.getTokenData()
			if (!tokenData?.refreshToken) {
				return false
			}

			await this.tokenClient.refresh(tokenData.refreshToken, { force: true })
			this.tokenData = await this.tokenClient.getTokenData()
			return !!this.tokenData?.accessToken
		} catch (error) {
			logger.error('Token refresh error', { error })
			return false
		}
	}

	// Dedicated method for handling reconnection
	async handleReconnection(): Promise<boolean> {
		// Avoid reconnecting too frequently
		const now = Date.now()
		if (now - this.lastReconnectTime < 5000) {
			logger.info('Skipping reconnection, too soon after last attempt')
			return false
		}

		this.lastReconnectTime = now
		logger.info('Handling reconnection')

		try {
			// Use enhanced reconnection handler
			if (this.tokenClient?.handleReconnection) {
				const result = await this.tokenClient.handleReconnection({
					forceTokenRefresh: true,
					validateTokens: true,
				})

				// Update our token data if successful
				if (result.success) {
					this.tokenData = await this.tokenClient.getTokenData()
				}

				return result.success
			}

			// Fall back to refresh if enhanced reconnection isn't available
			return await this.refresh()
		} catch (error) {
			logger.error('Reconnection error', { error })
			return false
		}
	}

	// Token health diagnostics
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
