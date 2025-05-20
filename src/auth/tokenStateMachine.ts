import {
	type EnhancedTokenManager,
	TokenPersistenceEvent,
} from '@sudowealth/schwab-api'
import { logger } from '../shared/logger'
import { type CodeFlowTokenData, type TokenLifecycleEvent } from './client'
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
 * Token state machine implementation that adapts EnhancedTokenManager to ITokenManager
 *
 * This class is the single source of truth for token state and handles all
 * aspects of token lifecycle including initialization, validation, refreshing,
 * and reconnection. It delegates core token operations to EnhancedTokenManager
 * while maintaining explicit state tracking for MCP-specific purposes.
 */
export class TokenStateMachine implements ITokenManager {
	private state: TokenState = { status: 'uninitialized' }
	private tokenClient: EnhancedTokenManager
	private lastReconnectTime = 0
	private stateEventListeners: TokenStateEventListener[] = []
	private refreshRetryCount = 0
	private maxRefreshRetries = 3

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
			(l: TokenStateEventListener) => l !== listener,
		)
	}

	constructor(tokenClient: EnhancedTokenManager) {
		this.tokenClient = tokenClient

		// Subscribe to EnhancedTokenManager persistence events
		logger.info('Adding onPersistenceEvent listener to EnhancedTokenManager')
		this.tokenClient.onPersistenceEvent((event, data, metadata) => {
			// Map EnhancedTokenManager's TokenPersistenceEvent to our TokenLifecycleEvent
			let lifecycleEventType: TokenLifecycleEvent['type'] = 'save'

			// Convert the event (enum) to a string for logging and mapping
			const eventType = event.toString()
			logger.debug(`TokenPersistenceEvent received: ${eventType}`, { metadata })

			// Map persistence events to lifecycle events based on the event type and metadata
			switch (event) {
				case TokenPersistenceEvent.TOKEN_LOADED:
					lifecycleEventType = 'load'
					break

				case TokenPersistenceEvent.TOKEN_SAVED:
					// If the save is related to a refresh operation, emit a refresh event
					if (
						metadata?.operation === 'refresh' ||
						eventType.includes('refresh')
					) {
						lifecycleEventType = 'refresh'
					} else {
						lifecycleEventType = 'save'
					}
					break

				case TokenPersistenceEvent.TOKEN_LOAD_FAILED:
				case TokenPersistenceEvent.TOKEN_SAVE_FAILED:
				case TokenPersistenceEvent.TOKEN_VALIDATION_FAILED:
					lifecycleEventType = 'error'
					break

				case TokenPersistenceEvent.TOKEN_VALIDATED:
					// For validation events we don't have a direct mapping
					// Use the current state to inform what kind of event to emit
					if (this.state.status === 'refreshing') {
						lifecycleEventType = 'refresh'
					} else {
						// Default to save as before
						lifecycleEventType = 'save'
					}
					break

				default:
					// For any other event, map to save (default)
					lifecycleEventType = 'save'
			}

			// Create the lifecycle event
			const lifecycleEvent: TokenLifecycleEvent = {
				type: lifecycleEventType,
				tokenData: data,
				error: metadata?.error ? new Error(metadata.error) : undefined,
				timestamp: Date.now(),
			}

			// Handle the mapped event
			this.handleTokenEvent(lifecycleEvent)
		})

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
	 * Handles token lifecycle events from the token client or internal transitions
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
	 * Leverages EnhancedTokenManager's validation when available
	 */
	private validateTokenData(tokenData: any): ValidateTokenResult {
		try {
			// Use EnhancedTokenManager's validation logic
			const enhancedValidation = this.tokenClient.validateToken(tokenData)

			if (!enhancedValidation.valid) {
				return {
					valid: false,
					reason: enhancedValidation.reason || 'Token validation failed',
				}
			}

			// If valid, still ensure our specific required fields are present
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
			return {
				valid: true,
				tokenData: {
					accessToken: tokenData.accessToken,
					refreshToken: tokenData.refreshToken,
					expiresAt: tokenData.expiresAt,
					...tokenData,
				},
			}
		} catch (error) {
			// If enhanced validation throws an error, fall back to basic validation
			logger.warn('Enhanced token validation failed', { error })

			// Basic validation (fallback)
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
	}

	/**
	 * Checks if a token is expired or will expire soon
	 * Uses EnhancedTokenManager's isAccessTokenNearingExpiration
	 */
	private isTokenExpired(tokenData: TokenData): boolean {
		// Default refresh threshold: 5 minutes (300000ms)
		const refreshThresholdMs = 300000

		try {
			return this.tokenClient.isAccessTokenNearingExpiration(
				tokenData.expiresAt,
				refreshThresholdMs,
			)
		} catch (error) {
			// If enhanced check fails, fall back to basic check
			logger.warn('Enhanced token expiration check failed', { error })

			// Basic check (fallback)
			return !!(
				tokenData.expiresAt &&
				Date.now() + refreshThresholdMs >= tokenData.expiresAt
			)
		}
	}

	/**
	 * Updates the token client
	 */
	public updateTokenClient(tokenClient: EnhancedTokenManager): void {
		logger.info('Updating token client')
		this.tokenClient = tokenClient
	}

	/**
	 * Initialize the token state
	 *
	 * This method loads token data from EnhancedTokenManager and transitions to the appropriate state.
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
			// Use EnhancedTokenManager to get token data
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
	 * Directly leverages EnhancedTokenManager's getAccessToken
	 */
	public async getAccessToken(): Promise<string | null> {
		// If in valid state, short-circuit for performance
		// and ensure tokenData is actually present (type guard)
		if (
			this.state.status === 'valid' &&
			'tokenData' in this.state &&
			this.state.tokenData
		) {
			return this.state.tokenData.accessToken
		}

		// Otherwise, try to ensure we have a valid token first by calling ensureValidToken.
		// ensureValidToken will attempt to initialize or refresh if necessary.
		const isValidOrCanBeMadeValid = await this.ensureValidToken()
		if (!isValidOrCanBeMadeValid) {
			logger.warn(
				'getAccessToken: ensureValidToken returned false, cannot provide token.',
			)
			return null
		}

		// After ensureValidToken, if it was successful, the state should ideally be 'valid'.
		// We can now attempt to get the token directly from EnhancedTokenManager,
		// which might do its own final checks or refresh.
		try {
			const token = await this.tokenClient.getAccessToken()

			// If EnhancedTokenManager provided a token, and our state machine isn't 'valid'
			// (or became invalid during the await), update our state.
			if (token) {
				// If our state isn't 'valid' or if the tokenData is stale, refresh our state.
				// This is important because ensureValidToken might have transitioned the state.
				if (
					this.state.status !== 'valid' ||
					(this.state.status === 'valid' &&
						'tokenData' in this.state &&
						this.state.tokenData.accessToken !== token)
				) {
					const currentTokenDataFromClient =
						await this.tokenClient.getTokenData()
					if (currentTokenDataFromClient) {
						const validationResult = this.validateTokenData(
							currentTokenDataFromClient,
						)
						if (validationResult.valid && validationResult.tokenData) {
							// Only transition if the new token data is actually different or state was not valid
							if (
								this.state.status !== 'valid' ||
								(this.state.status === 'valid' &&
									'tokenData' in this.state &&
									JSON.stringify(this.state.tokenData) !==
										JSON.stringify(validationResult.tokenData))
							) {
								this.transitionToValid(validationResult.tokenData)
							}
						} else {
							logger.warn(
								'getAccessToken: Token from client was non-null, but failed MCP validation.',
								{ reason: validationResult.reason },
							)
						}
					}
				}
			} else {
				// If token is null, ensure our state reflects that we don't have a valid token.
				// This might happen if ensureValidToken thought it was okay, but getAccessToken then failed.
				if (this.state.status === 'valid') {
					logger.warn(
						'getAccessToken: EnhancedTokenManager returned null, but state was valid. Re-evaluating state.',
					)
					// Potentially transition to error or re-initialize, or just log.
					// For now, we'll rely on the next call to ensureValidToken to fix it.
				}
			}
			return token
		} catch (error) {
			logger.error('Error getting access token from EnhancedTokenManager', {
				error,
			})
			// Transition to error state if fetching token fails catastrophically
			this.transitionToError(
				error instanceof Error ? error : new Error(String(error)),
			)
			return null
		}
	}

	/**
	 * Ensure the token is valid, refreshing if necessary
	 *
	 * This method is the central validation point that ensures a valid token is available.
	 * It delegates to EnhancedTokenManager for core token operations.
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
	 * Refresh the token
	 *
	 * Leverages EnhancedTokenManager's refreshIfNeeded method,
	 * while maintaining the TokenStateMachine state for MCP-specific purposes.
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

		// Reset retry count for this explicit refresh call
		this.refreshRetryCount = 0

		try {
			// Emit refresh attempt event
			this.emitStateEvent({
				type: 'refresh-attempt',
				timestamp: Date.now(),
				newState: this.state.status,
				metadata: { method: 'refreshIfNeeded' },
			})

			// Use EnhancedTokenManager to refresh the token
			// force: true ensures that refresh happens even if the token isn't expired yet
			const refreshedTokenData = await this.tokenClient.refreshIfNeeded({
				force: true,
			})

			if (refreshedTokenData) {
				// Validate the refreshed token data
				const validationResult = this.validateTokenData(refreshedTokenData)

				if (validationResult.valid && validationResult.tokenData) {
					// Token refresh successful
					this.transitionToValid(validationResult.tokenData)

					// Emit success event
					this.emitStateEvent({
						type: 'refresh-attempt',
						timestamp: Date.now(),
						success: true,
						metadata: {
							method: 'refreshIfNeeded',
							hasTokenData: true,
						},
					})

					return true
				} else {
					// Token validation failed
					const errorMessage =
						validationResult.reason || 'Invalid token data after refresh'
					logger.error(errorMessage)

					// Emit failure event
					this.emitStateEvent({
						type: 'refresh-attempt',
						timestamp: Date.now(),
						success: false,
						error: new Error(errorMessage),
						metadata: {
							method: 'refreshIfNeeded',
							validationFailed: true,
						},
					})

					this.transitionToError(new Error(errorMessage))
					return false
				}
			} else {
				// No token data returned
				logger.error('No token data returned from refreshIfNeeded')

				// Emit failure event
				this.emitStateEvent({
					type: 'refresh-attempt',
					timestamp: Date.now(),
					success: false,
					error: new Error('No token data returned from refreshIfNeeded'),
					metadata: {
						method: 'refreshIfNeeded',
						noTokenData: true,
					},
				})

				this.transitionToError(
					new Error('No token data returned from refreshIfNeeded'),
				)
				return false
			}
		} catch (error) {
			logger.error('Error during token refresh operation', { error })

			// Emit failure event
			this.emitStateEvent({
				type: 'refresh-attempt',
				timestamp: Date.now(),
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
				metadata: {
					error: true,
				},
			})

			this.transitionToError(
				error instanceof Error ? error : new Error(String(error)),
			)
			return false
		}
	}

	/**
	 * Minimum time between reconnection attempts in milliseconds (5 seconds)
	 */
	private readonly MIN_RECONNECT_INTERVAL_MS = 5000

	/**
	 * Handle reconnection scenario by delegating to EnhancedTokenManager's reconnect method
	 *
	 * Leverages EnhancedTokenManager's reconnect capability and maintains the
	 * TokenStateMachine state for MCP-specific purposes.
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

		// Emit reconnection attempt event
		this.emitStateEvent({
			type: 'reconnect-attempt',
			timestamp: Date.now(),
			newState: this.state.status,
		})

		try {
			// Use EnhancedTokenManager to reconnect
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

					// Emit failure event
					this.emitStateEvent({
						type: 'reconnect-attempt',
						timestamp: Date.now(),
						success: false,
						error: new Error(errorMsg),
						metadata: {
							method: 'reconnect',
							validationFailed: true,
						},
					})

					this.transitionToError(new Error(errorMsg))
					return false
				}

				// Use the validated token data
				const validTokenData = validationResult.tokenData!

				// Determine if token is expired
				const isExpired = this.isTokenExpired(validTokenData)

				// Emit success event
				this.emitStateEvent({
					type: 'reconnect-attempt',
					timestamp: Date.now(),
					success: true,
					metadata: {
						method: 'reconnect',
						tokenRestored: true,
						isExpired,
					},
				})

				if (isExpired) {
					// Token is expired after reconnection
					logger.info('Token is expired after reconnection')
					this.transitionToExpired(validTokenData)

					// Attempt to refresh the token
					logger.info('Attempting to refresh expired token after reconnection')
					return await this.refresh()
				} else {
					// Token is valid after reconnection
					logger.info('Token is valid after reconnection')
					this.transitionToValid(validTokenData)
					return true
				}
			} else {
				logger.warn('EnhancedTokenManager reconnect failed')

				// Emit failure event
				this.emitStateEvent({
					type: 'reconnect-attempt',
					timestamp: Date.now(),
					success: false,
					metadata: {
						method: 'reconnect',
						reconnectFailed: true,
					},
				})

				// If EnhancedTokenManager's reconnect failed, try to initialize from scratch
				logger.info('Attempting to initialize from scratch')
				return await this.initialize()
			}
		} catch (error) {
			logger.error('Error during reconnection handling', { error })

			// Emit failure event
			this.emitStateEvent({
				type: 'reconnect-attempt',
				timestamp: Date.now(),
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
				metadata: {
					error: true,
				},
			})

			this.transitionToError(
				error instanceof Error ? error : new Error(String(error)),
			)
			return false
		}
	}

	/**
	 * Get diagnostic information about the current token state
	 * Leverages EnhancedTokenManager's generateTokenReport
	 */
	public async getDiagnostics() {
		// Start with basic diagnostics from our own state
		const basicDiagnostics = {
			state: this.state.status,
			hasAccessToken:
				(this.state.status === 'valid' ||
					this.state.status === 'expired' ||
					this.state.status === 'refreshing') &&
				'tokenData' in this.state &&
				!!this.state.tokenData.accessToken,
			hasRefreshToken:
				(this.state.status === 'valid' ||
					this.state.status === 'expired' ||
					this.state.status === 'refreshing') &&
				'tokenData' in this.state &&
				!!this.state.tokenData.refreshToken,
			expiresIn:
				(this.state.status === 'valid' ||
					this.state.status === 'expired' ||
					this.state.status === 'refreshing') &&
				'tokenData' in this.state &&
				this.state.tokenData.expiresAt
					? Math.floor((this.state.tokenData.expiresAt - Date.now()) / 1000)
					: -1,
			lastReconnection:
				this.lastReconnectTime > 0
					? new Date(this.lastReconnectTime).toISOString()
					: 'never',
		}

		try {
			// Get the enhanced token manager's diagnostics (awaiting the Promise)
			const enhancedDiagnostics = await this.tokenClient.generateTokenReport()

			// Return combined diagnostics
			return {
				...basicDiagnostics,
				enhancedTokenManager: enhancedDiagnostics,
			}
		} catch (error) {
			logger.warn('Error getting enhanced token diagnostics', { error })

			// Return basic diagnostics with error info if enhanced diagnostics failed
			return {
				...basicDiagnostics,
				enhancedTokenManagerError:
					error instanceof Error ? error.message : String(error),
			}
		}
	}
}
