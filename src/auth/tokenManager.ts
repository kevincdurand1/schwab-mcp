import { type TokenData } from '@sudowealth/schwab-api'
import { logger } from '../shared/logger'
import { type SchwabCodeFlowAuth } from './client'

export class TokenManager {
	private tokenClient: SchwabCodeFlowAuth
	private tokenData: TokenData | null = null
	private initialized = false

	constructor(tokenClient: SchwabCodeFlowAuth) {
		logger.info('TokenManager constructor called')
		this.tokenClient = tokenClient
		this.initialize()
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

			// Get current token data
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

			const beforeRefresh = await this.tokenClient.getTokenData()
			logger.info('[TokenManager] Token before refresh', {
				hasAccessToken: !!beforeRefresh?.accessToken,
				hasRefreshToken: !!beforeRefresh?.refreshToken,
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

			// Check if refresh token is available
			if (!beforeRefresh?.refreshToken) {
				logger.error('[TokenManager] Refresh token is missing, cannot refresh')
				return false
			}

			logger.info('[TokenManager] Calling refresh()...')
			const result = await this.tokenClient.refresh()
			logger.info('[TokenManager] Refresh call completed', { result })

			const afterRefresh = await this.tokenClient.getTokenData()
			logger.info('[TokenManager] Token after refresh', {
				hasAccessToken: !!afterRefresh?.accessToken,
				hasRefreshToken: !!afterRefresh?.refreshToken,
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
				result: result,
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
}
