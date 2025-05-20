import {
	EnhancedTokenManager,
	type FullAuthClient, // Import EnhancedTokenManager
} from '@sudowealth/schwab-api'
import { logger } from '../shared/logger'
import {
	type CodeFlowTokenData,
	type TokenLifecycleEvent,
	type TokenRefreshResult,
	type ReconnectionResult,
	// type SchwabCodeFlowAuth, // SchwabCodeFlowAuth is an MCP interface, not directly from schwab-api
} from './client'
import { type ITokenManager } from './tokenInterface'

// Use CodeFlowTokenData which is exported instead of TokenData
type TokenData = CodeFlowTokenData

/**
 * Token state machine states
 *
 * This enum represents all possible states the token can be in:
 * - uninitialized: Initial state with no token data (also used during initialization)
 * - valid: Token is loaded and valid (not expired)
 * - expired: Token is loaded but expired or will expire soon
 * - refreshing: Token refresh is in progress
 * - error: An error occurred during token operations
 */
type TokenState =
	| { status: 'uninitialized'; isInitializing?: boolean }
	| { status: 'valid'; tokenData: TokenData }
	| { status: 'expired'; tokenData: TokenData }
	| { status: 'refreshing'; tokenData: TokenData }
	| { status: 'error'; error: Error }

/**
 * Events emitted by the token state machine
 */
export type TokenStateEvent = {
	type: 'state-change' | 'refresh-attempt' | 'reconnect-attempt'
	previousState?: string
	newState?: string
	timestamp: number
	success?: boolean
	error?: Error
	metadata?: Record<string, any>
}

/**
 * Token state event listener type
 */
export type TokenStateEventListener = (event: TokenStateEvent) => void

/**
 * Result of token data validation
 */
interface ValidateTokenResult {
	valid: boolean
	tokenData?: TokenData
	reason?: string
}

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
	private tokenClient: FullAuthClient
	private lastReconnectTime = 0
	private stateEventListeners: TokenStateEventListener[] = [] // Declare the property

	/**
	 * Internal methods for state transitions to ensure consistent state updates
	 */
	private transitionToUninitialized(isInitializing: boolean = false): void {
		const previousState = this.state.status
		this.state = { status: 'uninitialized', isInitializing }

		const stateDescription = isInitializing ? 'initializing' : 'uninitialized'
		logger.info(`Token state: ${stateDescription}`)

		this.emitStateEvent({
			type: 'state-change',
			previousState,
			newState: 'uninitialized',
			timestamp: Date.now(),
			metadata: {
				isInitializing,
			},
		})
	}

	private transitionToValid(tokenData: TokenData): void {
		const previousState = this.state.status
		this.state = { status: 'valid', tokenData }
		logger.info('Token state: valid')

		this.emitStateEvent({
			type: 'state-change',
			previousState,
			newState: 'valid',
			timestamp: Date.now(),
			metadata: {
				expiresAt: tokenData.expiresAt,
				expiresIn: Math.floor((tokenData.expiresAt - Date.now()) / 1000),
			},
		})
	}

	private transitionToExpired(tokenData: TokenData): void {
		const previousState = this.state.status
		this.state = { status: 'expired', tokenData }
		logger.info('Token state: expired')

		this.emitStateEvent({
			type: 'state-change',
			previousState,
			newState: 'expired',
			timestamp: Date.now(),
			metadata: {
				expiresAt: tokenData.expiresAt,
				expiresIn: Math.floor((tokenData.expiresAt - Date.now()) / 1000),
			},
		})
	}

	private transitionToRefreshing(tokenData: TokenData): void {
		const previousState = this.state.status
		this.state = { status: 'refreshing', tokenData }
		logger.info('Token state: refreshing')

		this.emitStateEvent({
			type: 'state-change',
			previousState,
			newState: 'refreshing',
			timestamp: Date.now(),
			metadata: {
				expiresAt: tokenData.expiresAt,
				expiresIn: Math.floor((tokenData.expiresAt - Date.now()) / 1000),
			},
		})
	}

	private transitionToError(error: Error): void {
		const previousState = this.state.status
		this.state = { status: 'error', error }
		logger.error('Token state: error', { error })

		this.emitStateEvent({
			type: 'state-change',
			previousState,
			newState: 'error',
			timestamp: Date.now(),
			error,
		})
	}

	/**
	 * Emit a state event to all registered listeners
	 */
	private emitStateEvent(event: TokenStateEvent): void {
		// Add timestamp if not provided
		if (!event.timestamp) {
			event.timestamp = Date.now()
		}

		// Notify all listeners
		for (const listener of this.stateEventListeners) {
			try {
				listener(event)
			} catch (error) {
				logger.error('Error in token state event listener', { error })
			}
		}
	}

	/**
	 * Add a listener for token state events
	 */
	public onStateEvent(listener: TokenStateEventListener): void {
		this.stateEventListeners.push(listener)
	}

	/**
	 * Remove a listener for token state events
	 */
	public offStateEvent(listener: TokenStateEventListener): void {
		this.stateEventListeners = this.stateEventListeners.filter(
			(l: TokenStateEventListener) => l !== listener, // Added type for l
		)
	}

	constructor(tokenClient: FullAuthClient) {
		this.tokenClient = tokenClient

		// Subscribe to token events from the client
		// Using type assertion to safely access optional method
		// FullAuthClient itself does not define onTokenEvent, but EnhancedTokenManager does.
		// The tokenClient is expected to be an EnhancedTokenManager instance in practice.
		const clientWithEvents = this.tokenClient as FullAuthClient & {
			onTokenEvent?: (callback: (event: TokenLifecycleEvent) => void) => void
			// Add onPersistenceEvent if EnhancedTokenManager has it and it's relevant
			onPersistenceEvent?: (
				callback: (event: any, data: any, metadata?: any) => void,
			) => void
		}

		// Check for onTokenEvent (from SchwabCodeFlowAuth, potentially implemented by a wrapper or future EnhancedTokenManager)
		if (typeof clientWithEvents.onTokenEvent === 'function') {
			logger.info('Adding onTokenEvent listener to client')
			clientWithEvents.onTokenEvent(this.handleTokenEvent.bind(this))
		}
		// Check for onPersistenceEvent (from EnhancedTokenManager directly)
		else if (
			this.tokenClient instanceof EnhancedTokenManager &&
			typeof this.tokenClient.onPersistenceEvent === 'function'
		) {
			logger.info('Adding onPersistenceEvent listener to EnhancedTokenManager')
			this.tokenClient.onPersistenceEvent((event, data, metadata) => {
				// Adapt TokenPersistenceEvent to TokenLifecycleEvent or handle directly
				// This is a simplified adaptation; you might need more specific mapping
				this.handleTokenEvent({
					type:
						metadata?.operation === 'refresh'
							? 'refresh'
							: event.toString().startsWith('token_load')
								? 'load'
								: 'error',
					tokenData: data,
					error: metadata?.error ? new Error(metadata.error) : undefined,
					timestamp: Date.now(),
				})
			})
		}

		// Set up logging of state events
		this.onStateEvent((event) => {
			if (event.type === 'state-change') {
				logger.info(
					`Token state transition: ${event.previousState} -> ${event.newState}`,
				)
			} else {
				logger.debug(`Token event: ${event.type}`, {
					success: event.success,
					metadata: event.metadata,
				})
			}
		})
	}

	/**
	 * Handles token lifecycle events from the token client
	 */
	private handleTokenEvent(event: TokenLifecycleEvent): void {
		logger.info(`Token event: ${event.type}`)

		switch (event.type) {
			case 'load':
				if (event.tokenData) {
					const validationResult = this.validateTokenData(event.tokenData)

					if (validationResult.valid && validationResult.tokenData) {
						const validTokenData = validationResult.tokenData

						if (this.isTokenExpired(validTokenData)) {
							logger.info('Loaded token is expired, updating state')
							this.transitionToExpired(validTokenData)
						} else {
							logger.info('Loaded token is valid')
							this.transitionToValid(validTokenData)
						}
					} else if (validationResult.reason) {
						logger.warn(
							`Token load event validation failed: ${validationResult.reason}`,
						)
					}
				}
				break

			case 'refresh':
				if (event.tokenData) {
					const validationResult = this.validateTokenData(event.tokenData)

					if (validationResult.valid && validationResult.tokenData) {
						logger.info('Refreshed token received, updating state')
						this.transitionToValid(validationResult.tokenData)
					} else if (validationResult.reason) {
						logger.warn(
							`Token refresh event validation failed: ${validationResult.reason}`,
						)
					}
				}
				break

			case 'expire':
				if (this.state.status === 'valid' && 'tokenData' in this.state) {
					logger.info('Token expire event received')
					this.transitionToExpired(this.state.tokenData)
				}
				break

			case 'error':
				if (event.error) {
					logger.warn('Token error event received', { error: event.error })
					this.transitionToError(event.error)
				}
				break
		}
	}

	/**
	 * Validates that token data meets requirements and provides detailed feedback
	 *
	 * This centralized validation method checks all required token fields and returns
	 * a structured result with validation details. It's used throughout the class to
	 * ensure consistent token validation.
	 *
	 * @param tokenData The token data to validate
	 * @returns Validation result with tokenData if valid
	 */
	private validateTokenData(tokenData: any): ValidateTokenResult {
		// First check for null/undefined
		if (!tokenData) {
			return {
				valid: false,
				reason: 'Token data is null or undefined',
			}
		}

		// Check for required fields
		const missingFields = []
		if (!tokenData.accessToken) missingFields.push('accessToken')
		if (!tokenData.refreshToken) missingFields.push('refreshToken')
		if (!tokenData.expiresAt) missingFields.push('expiresAt')

		if (missingFields.length > 0) {
			return {
				valid: false,
				reason: `Token data missing required fields: ${missingFields.join(', ')}`,
			}
		}

		// All validation passed, return validated token data
		const validTokenData: TokenData = {
			accessToken: tokenData.accessToken,
			refreshToken: tokenData.refreshToken,
			expiresAt: tokenData.expiresAt,
			...tokenData,
		}

		return {
			valid: true,
			tokenData: validTokenData,
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
	public updateTokenClient(tokenClient: FullAuthClient): void {
		logger.info('Updating token client')
		this.tokenClient = tokenClient
	}

	/**
	 * Initialize the token state
	 *
	 * This method loads token data and transitions to the appropriate state.
	 * It uses the consolidated uninitialized state with isInitializing flag.
	 */
	public async initialize(): Promise<boolean> {
		// If already in a valid or refreshing state, don't re-initialize
		if (
			this.state.status !== 'uninitialized' &&
			this.state.status !== 'error'
		) {
			return this.state.status === 'valid'
		}

		// If already initializing, don't start a parallel initialization
		if (this.state.status === 'uninitialized' && this.state.isInitializing) {
			logger.info('Initialization already in progress')
			return false
		}

		// Mark as initializing
		this.transitionToUninitialized(true)

		try {
			const tokenData = await this.tokenClient.getTokenData()
			const validationResult = this.validateTokenData(tokenData)

			if (!validationResult.valid) {
				logger.info(
					`No valid token data available: ${validationResult.reason || 'unknown reason'}`,
				)
				this.transitionToUninitialized(false)
				return false
			}

			// We know tokenData is valid at this point
			const validTokenData = validationResult.tokenData!

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
	public async getAccessToken(): Promise<string | null> {
		if (this.state.status !== 'valid') {
			const valid = await this.ensureValidToken()
			if (!valid) return null
		}

		return 'tokenData' in this.state ? this.state.tokenData.accessToken : null
	}

	/**
	 * Ensure the token is valid, refreshing if necessary
	 *
	 * This method is the central validation point that ensures a valid token is available.
	 * It handles all possible states and takes appropriate action to get to a valid state.
	 */
	public async ensureValidToken(): Promise<boolean> {
		// Handle all possible states explicitly
		switch (this.state.status) {
			case 'uninitialized':
				// If initialization is already in progress, we should wait
				if (this.state.isInitializing) {
					logger.info('Token initialization in progress, waiting')
					return false
				}
				return await this.initialize()

			case 'valid':
				// Double-check token expiration
				if (
					'tokenData' in this.state &&
					this.isTokenExpired(this.state.tokenData)
				) {
					logger.info('Token is expired despite valid state, refreshing')
					this.transitionToExpired(this.state.tokenData)
					return await this.refresh()
				}
				return true

			case 'expired':
				// Refresh the token
				logger.info('Token is expired, refreshing')
				return await this.refresh()

			case 'error':
				// Attempt recovery through initialization
				logger.warn(
					'Token in error state, attempting recovery via initialization',
				)
				return await this.initialize()

			case 'refreshing':
				// Already in progress
				logger.info('Token refresh already in progress, waiting')
				return false

			default: {
				// This should never happen if all state types are properly handled
				// For TypeScript exhaustiveness checking, use a type assertion
				const unknownState = this.state as { status: string }
				logger.error(`Unhandled token state: ${unknownState.status}`)
				return false
			}
		}
	}

	/**
	 * Maximum number of refresh retries
	 */
	private readonly MAX_REFRESH_RETRIES = 3

	/**
	 * Internal refresh retry counter
	 */
	private refreshRetryCount = 0

	/**
	 * Performs the actual token refresh using whatever mechanism is available
	 *
	 * This method abstracts the underlying refresh mechanism and provides
	 * a centralized way to refresh tokens regardless of the client implementation.
	 */
	private async performTokenRefresh(): Promise<TokenRefreshResult> {
		logger.info(
			'Performing token refresh using schwab-api EnhancedTokenManager',
		)

		// Emit refresh attempt event at start
		this.emitStateEvent({
			type: 'refresh-attempt',
			timestamp: Date.now(),
			newState: this.state.status, // Current state
			metadata: {
				attempt: this.refreshRetryCount + 1,
				maxAttempts: this.MAX_REFRESH_RETRIES,
			},
		})

		try {
			if (typeof this.tokenClient.refreshIfNeeded === 'function') {
				logger.info('Using refreshIfNeeded({ force: true }) for token refresh')
				// refreshIfNeeded returns schwab-api's TokenData
				const schwabApiTokenData = await this.tokenClient.refreshIfNeeded({
					force: true,
				})

				// Map schwab-api's TokenData to your mcp's CodeFlowTokenData
				const mcpTokenData: CodeFlowTokenData = {
					accessToken: schwabApiTokenData.accessToken,
					refreshToken: schwabApiTokenData.refreshToken || '', // Ensure refreshToken is not undefined
					expiresAt: schwabApiTokenData.expiresAt || 0, // Ensure expiresAt is not undefined
					// ... copy other relevant fields if any
				}

				const result = { success: true, tokenData: mcpTokenData }

				// Emit event with result
				this.emitStateEvent({
					type: 'refresh-attempt',
					timestamp: Date.now(),
					success: true,
					metadata: {
						method: 'refreshIfNeeded',
						attempt: this.refreshRetryCount + 1,
						maxAttempts: this.MAX_REFRESH_RETRIES,
						hasTokenData: !!result.tokenData,
					},
				})

				return result
			}
			// Fall back to refresh method if refreshIfNeeded is not available
			else if (
				typeof this.tokenClient.refresh === 'function' &&
				this.state.status === 'refreshing' &&
				'tokenData' in this.state &&
				this.state.tokenData.refreshToken
			) {
				logger.info('Using refresh() method with refresh token')
				// refresh returns schwab-api's TokenData
				const schwabApiTokenData = await this.tokenClient.refresh(
					this.state.tokenData.refreshToken,
					{ force: true },
				)

				// Map schwab-api's TokenData to your mcp's CodeFlowTokenData
				const mcpTokenData: CodeFlowTokenData = {
					accessToken: schwabApiTokenData.accessToken,
					refreshToken: schwabApiTokenData.refreshToken || '', // Ensure refreshToken is not undefined
					expiresAt: schwabApiTokenData.expiresAt || 0, // Ensure expiresAt is not undefined
					// ... copy other relevant fields if any
				}

				const result = { success: true, tokenData: mcpTokenData }

				// Emit event with result
				this.emitStateEvent({
					type: 'refresh-attempt',
					timestamp: Date.now(),
					success: true,
					metadata: {
						method: 'refresh',
						attempt: this.refreshRetryCount + 1,
						maxAttempts: this.MAX_REFRESH_RETRIES,
						hasTokenData: !!result.tokenData,
					},
				})

				return result
			}

			const noMethodError = new Error(
				'Schwab API client does not support a suitable refresh mechanism (refreshIfNeeded or refresh).',
			)

			// Emit event with result
			this.emitStateEvent({
				type: 'refresh-attempt',
				timestamp: Date.now(),
				success: false,
				error: noMethodError,
				metadata: {
					method: 'none',
					attempt: this.refreshRetryCount + 1,
					maxAttempts: this.MAX_REFRESH_RETRIES,
				},
			})

			return { success: false, error: noMethodError }
		} catch (error) {
			logger.error('Error during token refresh operation', { error })

			const result = {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
			}

			// Emit event with result
			this.emitStateEvent({
				type: 'refresh-attempt',
				timestamp: Date.now(),
				success: false,
				error: result.error,
				metadata: {
					error: true,
					attempt: this.refreshRetryCount + 1,
					maxAttempts: this.MAX_REFRESH_RETRIES,
				},
			})

			return result
		}
	}

	/**
	 * Refresh the token
	 *
	 * This is the central method for handling token refresh logic.
	 * All token refresh operations should go through this method to ensure
	 * consistent state management and proper handling of the refresh flow.
	 */
	public async refresh(): Promise<boolean> {
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

		// Reset retry counter for new refresh attempts
		this.refreshRetryCount = 0

		return await this.executeRefreshWithRetry()
	}

	/**
	 * Execute a token refresh with automatic retry logic
	 *
	 * This handles the retry logic separately from the main refresh flow,
	 * making the code more maintainable and easier to understand.
	 */
	private async executeRefreshWithRetry(): Promise<boolean> {
		try {
			// Perform the actual token refresh
			const result = await this.performTokenRefresh()

			if (result.success && result.tokenData) {
				const validationResult = this.validateTokenData(result.tokenData)

				if (validationResult.valid && validationResult.tokenData) {
					this.transitionToValid(validationResult.tokenData)
					// Reset retry counter on success
					this.refreshRetryCount = 0
					return true
				} else {
					const errorMessage =
						validationResult.reason ||
						'Invalid token data received during refresh'
					logger.error(errorMessage)
					this.transitionToError(new Error(errorMessage))
					return false
				}
			}

			// Check if we should retry
			if (this.refreshRetryCount < this.MAX_REFRESH_RETRIES) {
				this.refreshRetryCount++

				// Calculate backoff time (exponential backoff)
				const backoffMs = Math.pow(1.5, this.refreshRetryCount) * 1000

				logger.info(
					`Refresh attempt failed, retrying in ${backoffMs}ms (attempt ${this.refreshRetryCount} of ${this.MAX_REFRESH_RETRIES})`,
				)

				// Wait for backoff time
				await new Promise((resolve) => setTimeout(resolve, backoffMs))

				// Retry the refresh
				return await this.executeRefreshWithRetry()
			}

			// If we've exhausted retries, transition to error state
			this.transitionToError(
				result.error || new Error('Token refresh failed after retries'),
			)
			return false
		} catch (error) {
			logger.error('Error during token refresh execution', { error })
			this.transitionToError(
				error instanceof Error ? error : new Error(String(error)),
			)
			return false
		}
	}

	/**
	 * Maximum number of reconnection retries
	 */
	private readonly MAX_RECONNECT_RETRIES = 3

	/**
	 * Internal reconnection retry counter
	 */
	private reconnectRetryCount = 0

	/**
	 * Minimum time between reconnection attempts in milliseconds (5 seconds)
	 */
	private readonly MIN_RECONNECT_INTERVAL_MS = 5000

	/**
	 * Performs the actual reconnection using multiple strategies
	 *
	 * This method attempts reconnection using various approaches, starting with
	 * the highest-level approaches and falling back to more basic methods if needed.
	 * The order of operations is:
	 *
	 * 1. Try using the client's reconnect method if available (EnhancedTokenManager)
	 * 2. If that fails, try to get the token data and validate it
	 * 3. If the token is expired, try to refresh it
	 * 4. If all else fails, try to initialize from scratch
	 */
	private async performReconnection(): Promise<ReconnectionResult> {
		logger.info('Attempting reconnection')

		// Emit reconnection attempt event
		this.emitStateEvent({
			type: 'reconnect-attempt',
			timestamp: Date.now(),
			newState: this.state.status,
			metadata: {
				attempt: this.reconnectRetryCount + 1,
				maxAttempts: this.MAX_RECONNECT_RETRIES,
			},
		})

		try {
			// Strategy 1: Use client's reconnect method if available (EnhancedTokenManager)
			if (
				this.tokenClient instanceof EnhancedTokenManager &&
				typeof this.tokenClient.reconnect === 'function'
			) {
				logger.info('Using EnhancedTokenManager reconnect method')
				const reconnectSuccessful = await this.tokenClient.reconnect()

				if (reconnectSuccessful) {
					logger.info('EnhancedTokenManager reconnect succeeded')

					// Get token data after successful reconnection
					const tokenData = await this.tokenClient.getTokenData()

					// Validate the token data
					const validationResult = this.validateTokenData(tokenData)

					if (!validationResult.valid) {
						const errorMsg =
							validationResult.reason || 'Invalid token data after reconnect'
						logger.error(errorMsg)

						return {
							success: false,
							tokenRestored: false,
							refreshPerformed: false,
							error: new Error(errorMsg),
						}
					}

					// Use the validated token data
					const validTokenData = validationResult.tokenData!

					// Create result with same format as handleReconnection
					const result = {
						success: true,
						tokenRestored: true,
						refreshPerformed: false, // reconnect() itself might refresh, but we mark it false here as this method didn't directly call refresh
						tokenData: validTokenData as CodeFlowTokenData,
						isExpired: this.isTokenExpired(validTokenData),
					} as ReconnectionResult & { isExpired?: boolean }

					// Emit success event
					this.emitStateEvent({
						type: 'reconnect-attempt',
						timestamp: Date.now(),
						success: true,
						metadata: {
							method: 'reconnect',
							attempt: this.reconnectRetryCount + 1,
							maxAttempts: this.MAX_RECONNECT_RETRIES,
							tokenRestored: result.tokenRestored,
							refreshPerformed: result.refreshPerformed,
						},
					})

					return result
				}

				// Emit failure event for reconnect
				this.emitStateEvent({
					type: 'reconnect-attempt',
					timestamp: Date.now(),
					success: false,
					metadata: {
						method: 'reconnect',
						attempt: this.reconnectRetryCount + 1,
						maxAttempts: this.MAX_RECONNECT_RETRIES,
						fallbackAvailable: true, // Fallback to manual reconnection
					},
				})

				logger.warn(
					'EnhancedTokenManager reconnect failed, falling back to manual reconnection',
				)
			}

			// Strategy 2: Manual reconnection by getting current token data and validating
			logger.info('Attempting manual reconnection')

			// Get current token data
			const tokenData = await this.tokenClient.getTokenData()

			// Validate the token data with more detailed feedback
			const validationResult = this.validateTokenData(tokenData)

			if (!validationResult.valid) {
				const errorMsg =
					validationResult.reason || 'Invalid token data during reconnection'
				logger.error(errorMsg)

				return {
					success: false,
					tokenRestored: false,
					refreshPerformed: false,
					error: new Error(errorMsg),
				}
			}

			// Use the validated token data
			const validTokenData = validationResult.tokenData!

			// Token restored but may be expired
			const tokenRestored = true
			let refreshPerformed = false

			// If token is expired, don't refresh here - we'll do it after returning
			// Just indicate whether it's expired so the caller knows
			const isExpired = this.isTokenExpired(validTokenData)

			return {
				success: true,
				tokenRestored,
				refreshPerformed,
				// Include token expiry information to help the caller
				// decide how to handle the situation
				isExpired,
				// Include the validated token data to avoid additional API call
				tokenData: validTokenData as CodeFlowTokenData,
			} as ReconnectionResult & { isExpired?: boolean }
		} catch (error) {
			logger.error('Error during reconnection attempt', { error })
			return {
				success: false,
				tokenRestored: false,
				refreshPerformed: false,
				error: error instanceof Error ? error : new Error(String(error)),
			}
		}
	}

	/**
	 * Handle reconnection scenario
	 *
	 * Centralizes reconnection logic and properly manages the token state
	 * transition during reconnection events.
	 *
	 * This method coordinates the entire reconnection process including
	 * state management, retry logic, and token refresh if needed.
	 */
	public async handleReconnection(): Promise<boolean> {
		// Avoid reconnecting too frequently
		const now = Date.now()
		if (now - this.lastReconnectTime < this.MIN_RECONNECT_INTERVAL_MS) {
			logger.info('Skipping reconnection, too soon after last attempt')
			return false
		}

		this.lastReconnectTime = now
		logger.info('Handling reconnection')

		// Reset retry counter for new reconnection attempts
		this.reconnectRetryCount = 0

		// Try reconnection with retries
		for (let attempt = 0; attempt <= this.MAX_RECONNECT_RETRIES; attempt++) {
			if (attempt > 0) {
				// Calculate backoff time for retries (exponential backoff)
				const backoffMs = Math.pow(1.5, attempt) * 1000
				logger.info(
					`Reconnection attempt ${attempt} failed, retrying in ${backoffMs}ms`,
				)

				// Wait before retrying
				await new Promise((resolve) => setTimeout(resolve, backoffMs))
			}

			try {
				// Attempt reconnection
				const result = await this.performReconnection()

				// If reconnection successful
				if (result.success) {
					let validTokenData

					// Check if reconnection result already includes valid token data
					if (result.tokenData) {
						// Use the token data from the reconnection result
						logger.info('Using token data from reconnection result')
						validTokenData = result.tokenData as CodeFlowTokenData
					} else {
						// Fallback: Get token data if not included in the result
						logger.info(
							'Token data not in reconnection result, fetching from client',
						)
						const tokenData = await this.tokenClient.getTokenData()
						if (!tokenData) {
							logger.warn('Reconnection succeeded but no token data available')
							continue // Try again
						}

						const validationResult = this.validateTokenData(tokenData)
						if (!validationResult.valid) {
							logger.warn(
								`Reconnection succeeded but token data is invalid: ${validationResult.reason || 'unknown reason'}`,
							)
							continue // Try again
						}

						validTokenData = validationResult.tokenData!
					}

					// Determine if token is expired
					const isExpired =
						'isExpired' in result &&
						typeof (result as any).isExpired === 'boolean'
							? (result as any).isExpired
							: this.isTokenExpired(validTokenData)

					// Update state based on token expiration
					if (isExpired) {
						logger.info('Token is expired after reconnection')
						this.transitionToExpired(validTokenData)

						// Attempt to refresh the token
						logger.info(
							'Attempting to refresh expired token after reconnection',
						)
						const refreshSuccess = await this.refresh()

						// Return overall reconnection success
						return refreshSuccess
					} else {
						// Token is valid, update state
						logger.info('Token is valid after reconnection')
						this.transitionToValid(validTokenData)
						return true
					}
				}
			} catch (error) {
				logger.error(`Reconnection attempt ${attempt + 1} failed with error`, {
					error,
				})
				// Continue with retry
			}
		}

		// If we've exhausted all retries
		logger.error('Reconnection failed after maximum retries')
		this.transitionToError(
			new Error('Reconnection failed after maximum retries'),
		)
		return false
	}

	/**
	 * Get diagnostic information about the current token state
	 */
	public getDiagnostics() {
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
