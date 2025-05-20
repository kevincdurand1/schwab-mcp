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
 *
 * This class is the single source of truth for token state and handles all
 * aspects of token lifecycle including initialization, validation, refreshing,
 * and reconnection. All token refresh operations should go through this class
 * rather than using the tokenClient's refresh methods directly.
 */
export class TokenStateMachine implements ITokenManager {
	private state: TokenState = { status: 'uninitialized' }
	private tokenClient: SchwabCodeFlowAuth
	private lastReconnectTime = 0

	/**
	 * Internal methods for state transitions to ensure consistent state updates
	 */
	private transitionToUninitialized(): void {
		this.state = { status: 'uninitialized' }
		logger.info('Token state: uninitialized')
	}

	private transitionToInitializing(): void {
		this.state = { status: 'initializing' }
		logger.info('Token state: initializing')
	}

	private transitionToValid(tokenData: TokenData): void {
		this.state = { status: 'valid', tokenData }
		logger.info('Token state: valid')
	}

	private transitionToExpired(tokenData: TokenData): void {
		this.state = { status: 'expired', tokenData }
		logger.info('Token state: expired')
	}

	private transitionToRefreshing(tokenData: TokenData): void {
		this.state = { status: 'refreshing', tokenData }
		logger.info('Token state: refreshing')
	}

	private transitionToError(error: Error): void {
		this.state = { status: 'error', error }
		logger.error('Token state: error', { error })
	}

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
						if (this.isTokenExpired(validTokenData)) {
							this.transitionToExpired(validTokenData)
						} else {
							this.transitionToValid(validTokenData)
						}
					}
				}
				break

			case 'refresh':
				if (event.tokenData) {
					const validTokenData = this.ensureValidTokenData(event.tokenData)
					if (validTokenData) {
						this.transitionToValid(validTokenData)
					}
				}
				break

			case 'expire':
				if (this.state.status === 'valid' && 'tokenData' in this.state) {
					this.transitionToExpired(this.state.tokenData)
				}
				break

			case 'error':
				if (event.error) {
					this.transitionToError(event.error)
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

		this.transitionToInitializing()

		try {
			const tokenData = await this.tokenClient.getTokenData()
			const validTokenData = this.ensureValidTokenData(tokenData)

			if (!validTokenData) {
				logger.info('No valid token data available')
				this.transitionToUninitialized()
				return false
			}

			if (this.isTokenExpired(validTokenData)) {
				logger.info('Token is expired, attempting refresh')
				this.transitionToExpired(validTokenData)
				return await this.refresh()
			}

			logger.info('Token is valid')
			this.transitionToValid(validTokenData)
			return true
		} catch (error) {
			logger.error('Error initializing token state', { error })
			this.transitionToError(
				error instanceof Error ? error : new Error(String(error)),
			)
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
				this.transitionToExpired(this.state.tokenData)
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
	 *
	 * This is the central method for handling token refresh logic.
	 * All token refresh operations should go through this method to ensure
	 * consistent state management and proper handling of the refresh flow.
	 */
	async refresh(): Promise<boolean> {
		// Only allow refresh from valid or expired states to maintain consistency
		if (this.state.status !== 'expired' && this.state.status !== 'valid') {
			logger.warn('Cannot refresh from current state', {
				state: this.state.status,
			})
			return false
		}

		if (!('tokenData' in this.state)) {
			return false
		}

		// Track the current token data and update state to refreshing
		const currentTokenData = this.state.tokenData
		this.transitionToRefreshing(currentTokenData)

		try {
			// Use forceRefresh from the client which is more reliable than the regular refresh method
			// This is the only place where token refresh should be initiated
			const result: TokenRefreshResult = await this.tokenClient.forceRefresh({
				retryOnFailure: true,
				logDetails: true,
			})

			if (result.success && result.tokenData) {
				const validTokenData = this.ensureValidTokenData(result.tokenData)
				if (validTokenData) {
					this.transitionToValid(validTokenData)
					return true
				} else {
					this.transitionToError(
						new Error('Invalid token data received during refresh'),
					)
					return false
				}
			}

			this.transitionToError(result.error || new Error('Token refresh failed'))
			return false
		} catch (error) {
			logger.error('Error during token refresh', { error })
			this.transitionToError(
				error instanceof Error ? error : new Error(String(error)),
			)
			return false
		}
	}

	/**
	 * Handle reconnection scenario
	 *
	 * Centralizes reconnection logic and properly manages the token state
	 * transition during reconnection events.
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
			// Use client's handleReconnection but manage state ourselves
			const result = await this.tokenClient.handleReconnection({
				forceTokenRefresh: true,
				validateTokens: true,
			})

			// Update state based on reconnection result
			if (result.success) {
				const tokenData = await this.tokenClient.getTokenData()
				const validTokenData = this.ensureValidTokenData(tokenData)
				if (validTokenData) {
					// Update state based on token expiration
					if (this.isTokenExpired(validTokenData)) {
						this.transitionToExpired(validTokenData)
						// If token is expired, attempt to refresh it immediately
						logger.info(
							'Token is expired after reconnection, attempting refresh',
						)
						await this.refresh() // Handle the refresh flow through our centralized method
					} else {
						this.transitionToValid(validTokenData)
					}
				}
			}

			return result.success
		} catch (error) {
			logger.error('Reconnection error', { error })
			this.transitionToError(
				error instanceof Error ? error : new Error(String(error)),
			)
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
