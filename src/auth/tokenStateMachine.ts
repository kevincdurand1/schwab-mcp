import { logger } from '../shared/logger'
import {
	type SchwabCodeFlowAuth,
	type CodeFlowTokenData,
	type TokenLifecycleEvent,
	type TokenRefreshResult,
} from './client'
import { type ITokenManager } from './tokenInterface'

// Use CodeFlowTokenData which is exported instead of TokenData
type TokenData = CodeFlowTokenData

/**
 * Token state machine states
 */
type TokenState =
	| { status: 'uninitialized' }
	| { status: 'initializing' }
	| { status: 'valid'; tokenData: TokenData }
	| { status: 'expired'; tokenData: TokenData }
	| { status: 'refreshing'; tokenData: TokenData }
	| { status: 'error'; error: Error }

/**
 * Token state machine implementation that centralizes token management logic
 */
export class TokenStateMachine implements ITokenManager {
	private state: TokenState = { status: 'uninitialized' }
	private tokenClient: SchwabCodeFlowAuth
	private lastReconnectTime = 0

	constructor(tokenClient: SchwabCodeFlowAuth) {
		this.tokenClient = tokenClient

		// Subscribe to token events
		if (this.tokenClient?.onTokenEvent) {
			this.tokenClient.onTokenEvent(this.handleTokenEvent.bind(this))
		}
	}

	/**
	 * Handles token lifecycle events from the token client
	 */
	private handleTokenEvent(event: TokenLifecycleEvent): void {
		logger.info(`Token event: ${event.type}`)

		switch (event.type) {
			case 'load':
				if (event.tokenData) {
					const validTokenData = this.ensureValidTokenData(event.tokenData)
					if (validTokenData) {
						this.state = {
							status: this.isTokenExpired(validTokenData) ? 'expired' : 'valid',
							tokenData: validTokenData,
						}
					}
				}
				break

			case 'refresh':
				if (event.tokenData) {
					const validTokenData = this.ensureValidTokenData(event.tokenData)
					if (validTokenData) {
						this.state = {
							status: 'valid',
							tokenData: validTokenData,
						}
					}
				}
				break

			case 'expire':
				if (this.state.status === 'valid' && 'tokenData' in this.state) {
					this.state = {
						status: 'expired',
						tokenData: this.state.tokenData,
					}
				}
				break

			case 'error':
				if (event.error) {
					this.state = {
						status: 'error',
						error: event.error,
					}
				}
				break
		}
	}

	/**
	 * Ensures the token data meets CodeFlowTokenData requirements
	 */
	private ensureValidTokenData(tokenData: any): TokenData | null {
		if (
			!tokenData ||
			!tokenData.accessToken ||
			!tokenData.refreshToken ||
			!tokenData.expiresAt
		) {
			return null
		}

		return {
			accessToken: tokenData.accessToken,
			refreshToken: tokenData.refreshToken,
			expiresAt: tokenData.expiresAt,
			...tokenData,
		}
	}

	/**
	 * Checks if a token is expired or will expire soon
	 */
	private isTokenExpired(tokenData: TokenData): boolean {
		return !!(tokenData.expiresAt && Date.now() + 300000 >= tokenData.expiresAt)
	}

	/**
	 * Updates the token client
	 */
	updateTokenClient(tokenClient: SchwabCodeFlowAuth): void {
		logger.info('Updating token client')
		this.tokenClient = tokenClient
	}

	/**
	 * Initialize the token state
	 */
	async initialize(): Promise<boolean> {
		if (this.state.status !== 'uninitialized') {
			return this.state.status === 'valid'
		}

		this.state = { status: 'initializing' }

		try {
			const tokenData = await this.tokenClient.getTokenData()
			const validTokenData = this.ensureValidTokenData(tokenData)

			if (!validTokenData) {
				logger.info('No valid token data available')
				this.state = { status: 'uninitialized' }
				return false
			}

			if (this.isTokenExpired(validTokenData)) {
				logger.info('Token is expired, attempting refresh')
				this.state = { status: 'expired', tokenData: validTokenData }
				return await this.refresh()
			}

			logger.info('Token is valid')
			this.state = { status: 'valid', tokenData: validTokenData }
			return true
		} catch (error) {
			logger.error('Error initializing token state', { error })
			this.state = {
				status: 'error',
				error: error instanceof Error ? error : new Error(String(error)),
			}
			return false
		}
	}

	/**
	 * Get the current access token, ensuring it's valid first
	 */
	async getAccessToken(): Promise<string | null> {
		if (this.state.status !== 'valid') {
			const valid = await this.ensureValidToken()
			if (!valid) return null
		}

		return 'tokenData' in this.state ? this.state.tokenData.accessToken : null
	}

	/**
	 * Ensure the token is valid, refreshing if necessary
	 */
	async ensureValidToken(): Promise<boolean> {
		if (this.state.status === 'uninitialized') {
			return await this.initialize()
		}

		if (this.state.status === 'valid') {
			// Double-check expiration even in 'valid' state
			if (
				'tokenData' in this.state &&
				this.isTokenExpired(this.state.tokenData)
			) {
				logger.info('Token is expired despite valid state, refreshing')
				this.state = { status: 'expired', tokenData: this.state.tokenData }
				return await this.refresh()
			}
			return true
		}

		if (this.state.status === 'expired') {
			return await this.refresh()
		}

		if (this.state.status === 'error') {
			logger.warn('Token in error state, attempting recovery')
			return await this.initialize()
		}

		// For initializing or refreshing states
		logger.info(`Waiting for token state to resolve: ${this.state.status}`)
		return false
	}

	/**
	 * Refresh the token
	 */
	async refresh(): Promise<boolean> {
		if (this.state.status !== 'expired' && this.state.status !== 'valid') {
			logger.warn('Cannot refresh from current state', {
				state: this.state.status,
			})
			return false
		}

		if (!('tokenData' in this.state)) {
			return false
		}

		const currentTokenData = this.state.tokenData
		this.state = { status: 'refreshing', tokenData: currentTokenData }

		try {
			const result: TokenRefreshResult = await this.tokenClient.forceRefresh({
				retryOnFailure: true,
				logDetails: true,
			})

			if (result.success && result.tokenData) {
				const validTokenData = this.ensureValidTokenData(result.tokenData)
				if (validTokenData) {
					this.state = { status: 'valid', tokenData: validTokenData }
					return true
				} else {
					this.state = {
						status: 'error',
						error: new Error('Invalid token data received during refresh'),
					}
					return false
				}
			}

			this.state = {
				status: 'error',
				error: result.error || new Error('Token refresh failed'),
			}
			return false
		} catch (error) {
			logger.error('Error during token refresh', { error })
			this.state = {
				status: 'error',
				error: error instanceof Error ? error : new Error(String(error)),
			}
			return false
		}
	}

	/**
	 * Handle reconnection scenario
	 */
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
			const result = await this.tokenClient.handleReconnection({
				forceTokenRefresh: true,
				validateTokens: true,
			})

			// Update state based on reconnection result
			if (result.success) {
				const tokenData = await this.tokenClient.getTokenData()
				const validTokenData = this.ensureValidTokenData(tokenData)
				if (validTokenData) {
					this.state = {
						status: this.isTokenExpired(validTokenData) ? 'expired' : 'valid',
						tokenData: validTokenData,
					}
				}
			}

			return result.success
		} catch (error) {
			logger.error('Reconnection error', { error })
			this.state = {
				status: 'error',
				error: error instanceof Error ? error : new Error(String(error)),
			}
			return false
		}
	}

	/**
	 * Get diagnostic information about the current token state
	 */
	getDiagnostics() {
		return {
			state: this.state.status,
			hasAccessToken:
				(this.state.status === 'valid' ||
					this.state.status === 'expired' ||
					this.state.status === 'refreshing') &&
				!!this.state.tokenData.accessToken,
			hasRefreshToken:
				(this.state.status === 'valid' ||
					this.state.status === 'expired' ||
					this.state.status === 'refreshing') &&
				!!this.state.tokenData.refreshToken,
			expiresIn:
				(this.state.status === 'valid' ||
					this.state.status === 'expired' ||
					this.state.status === 'refreshing') &&
				this.state.tokenData.expiresAt
					? Math.floor((this.state.tokenData.expiresAt - Date.now()) / 1000)
					: -1,
			lastReconnection:
				this.lastReconnectTime > 0
					? new Date(this.lastReconnectTime).toISOString()
					: 'never',
		}
	}
}
