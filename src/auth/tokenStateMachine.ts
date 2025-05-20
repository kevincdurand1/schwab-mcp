import {
	EnhancedTokenManager,
	type FullAuthClient, // Import EnhancedTokenManager
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
	private tokenClient: FullAuthClient
	private lastReconnectTime = 0
	private stateEventListeners: TokenStateEventListener[] = []

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

	constructor(tokenClient: FullAuthClient) {
		this.tokenClient = tokenClient

		// Check if tokenClient is an EnhancedTokenManager instance and subscribe to its events
		if (
			this.tokenClient instanceof EnhancedTokenManager &&
			typeof this.tokenClient.onPersistenceEvent === 'function'
		) {
			logger.info('Adding onPersistenceEvent listener to EnhancedTokenManager')
			this.tokenClient.onPersistenceEvent((event, data, metadata) => {
				// Map EnhancedTokenManager persistence events to TokenStateMachine lifecycle events
				// This leverages the existing enhanced token manager event system
				const eventType = event.toString()
				const lifecycleEvent: TokenLifecycleEvent = {
					type:
						eventType === 'token_load_success'
							? 'load'
							: eventType === 'token_refresh_success'
								? 'refresh'
								: eventType === 'token_load_error' ||
									  eventType === 'token_refresh_error'
									? 'error'
									: 'save',
					tokenData: data,
					error: metadata?.error ? new Error(metadata.error) : undefined,
					timestamp: Date.now(),
				}

				this.handleTokenEvent(lifecycleEvent)
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
	 *
	 * This method leverages EnhancedTokenManager's validation when available,
	 * and falls back to basic field validation when needed.
	 */
	private validateTokenData(tokenData: any): ValidateTokenResult {
		// If the tokenClient is an EnhancedTokenManager, use its validateToken method if available
		if (
			this.tokenClient instanceof EnhancedTokenManager &&
			typeof this.tokenClient.validateToken === 'function'
		) {
			try {
				// Use the enhanced token manager's validation logic
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
			}
		}

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

	/**
	 * Checks if a token is expired or will expire soon
	 * Uses EnhancedTokenManager's isAccessTokenNearingExpiration if available
	 */
	private isTokenExpired(tokenData: TokenData): boolean {
		// Default refresh threshold: 5 minutes (300000ms)
		const refreshThresholdMs = 300000

		// If the tokenClient is an EnhancedTokenManager, use its token expiration check
		if (
			this.tokenClient instanceof EnhancedTokenManager &&
			typeof this.tokenClient.isAccessTokenNearingExpiration === 'function'
		) {
			try {
				return this.tokenClient.isAccessTokenNearingExpiration(
					tokenData.expiresAt,
					refreshThresholdMs,
				)
			} catch (error) {
				// If enhanced check fails, fall back to basic check
				logger.warn('Enhanced token expiration check failed', { error })
			}
		}

		// Basic check (fallback)
		return !!(
			tokenData.expiresAt &&
			Date.now() + refreshThresholdMs >= tokenData.expiresAt
		)
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
	 * Directly leverages EnhancedTokenManager's getAccessToken when possible
	 */
	public async getAccessToken(): Promise<string | null> {
		// If in valid state, short-circuit for performance
		if (this.state.status === 'valid' && 'tokenData' in this.state) {
			return this.state.tokenData.accessToken
		}

		// Otherwise, try to ensure we have a valid token first
		const valid = await this.ensureValidToken()
		if (!valid) return null

		// Now use the token client's getAccessToken method directly
		// This will automatically refresh if needed
		if (this.tokenClient instanceof EnhancedTokenManager) {
			try {
				const token = await this.tokenClient.getAccessToken()

				// If we get a token, update our state if needed
				if (token) {
					// Check if we need to update the state (only if not already valid)
					if (
						this.state.status === 'uninitialized' ||
						this.state.status === 'expired' ||
						this.state.status === 'refreshing' ||
						this.state.status === 'error'
					) {
						const tokenData = await this.tokenClient.getTokenData()
						if (tokenData) {
							const validationResult = this.validateTokenData(tokenData)
							if (validationResult.valid && validationResult.tokenData) {
								this.transitionToValid(validationResult.tokenData)
							}
						}
					}
				}

				return token
			} catch (error) {
				logger.error('Error getting access token from EnhancedTokenManager', {
					error,
				})
				return null
			}
		}

		// Fallback to our own state
		return 'tokenData' in this.state ? this.state.tokenData.accessToken : null
	}

	/**
	 * Ensure the token is valid, refreshing if necessary
	 *
	 * This method is the central validation point that ensures a valid token is available.
	 * It delegates to EnhancedTokenManager when possible for core token operations.
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
	 * This method directly leverages EnhancedTokenManager's refreshIfNeeded method,
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

		try {
			// Emit refresh attempt event
			this.emitStateEvent({
				type: 'refresh-attempt',
				timestamp: Date.now(),
				newState: this.state.status,
				metadata: { method: 'refreshIfNeeded' },
			})

			// Check if we can use EnhancedTokenManager's refreshIfNeeded method
			if (typeof this.tokenClient.refreshIfNeeded === 'function') {
				logger.info(
					'Using EnhancedTokenManager.refreshIfNeeded for token refresh',
				)

				// Use the enhanced token manager to refresh the token
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
			}

			// If refreshIfNeeded is not available, try direct refresh
			if (
				typeof this.tokenClient.refresh === 'function' &&
				'tokenData' in this.state &&
				this.state.tokenData.refreshToken
			) {
				logger.info('Using direct refresh method with refresh token')

				// Use the token client's refresh method directly
				const refreshedTokenData = await this.tokenClient.refresh(
					this.state.tokenData.refreshToken,
					{ force: true },
				)

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
								method: 'refresh',
								hasTokenData: true,
							},
						})

						return true
					} else {
						// Token validation failed
						const errorMessage =
							validationResult.reason ||
							'Invalid token data after direct refresh'
						logger.error(errorMessage)

						// Emit failure event
						this.emitStateEvent({
							type: 'refresh-attempt',
							timestamp: Date.now(),
							success: false,
							error: new Error(errorMessage),
							metadata: {
								method: 'refresh',
								validationFailed: true,
							},
						})

						this.transitionToError(new Error(errorMessage))
						return false
					}
				} else {
					// No token data returned
					logger.error('No token data returned from direct refresh')

					// Emit failure event
					this.emitStateEvent({
						type: 'refresh-attempt',
						timestamp: Date.now(),
						success: false,
						error: new Error('No token data returned from direct refresh'),
						metadata: {
							method: 'refresh',
							noTokenData: true,
						},
					})

					this.transitionToError(
						new Error('No token data returned from direct refresh'),
					)
					return false
				}
			}

			// If neither refresh method is available
			const noMethodError = new Error(
				'Schwab API client does not support a suitable refresh mechanism.',
			)

			// Emit failure event
			this.emitStateEvent({
				type: 'refresh-attempt',
				timestamp: Date.now(),
				success: false,
				error: noMethodError,
				metadata: {
					method: 'none',
				},
			})

			this.transitionToError(noMethodError)
			return false
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
	 * This simplified implementation leverages the EnhancedTokenManager's reconnect capability
	 * and focuses on maintaining the TokenStateMachine state for MCP-specific purposes.
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
			// Check if we can use EnhancedTokenManager's reconnect method
			if (
				this.tokenClient instanceof EnhancedTokenManager &&
				typeof this.tokenClient.reconnect === 'function'
			) {
				logger.info('Using EnhancedTokenManager reconnect method')

				// Use enhanced token manager to reconnect
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
						logger.info(
							'Attempting to refresh expired token after reconnection',
						)
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
			}

			// If EnhancedTokenManager's reconnect is not available, try to initialize from scratch
			logger.info(
				'EnhancedTokenManager reconnect not available, attempting to initialize from scratch',
			)
			return await this.initialize()
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
	 * Leverages EnhancedTokenManager's generateTokenReport when available
	 */
	public getDiagnostics() {
		// Start with basic diagnostics from our own state
		const basicDiagnostics = {
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

		// If the tokenClient is an EnhancedTokenManager, add its diagnostics
		if (
			this.tokenClient instanceof EnhancedTokenManager &&
			typeof this.tokenClient.generateTokenReport === 'function'
		) {
			try {
				// Get the enhanced token manager's diagnostics
				const enhancedDiagnostics = this.tokenClient.generateTokenReport()

				// Create a safe object copy to avoid ESLint no-misused-promises error
				const safeReport = { ...Object(enhancedDiagnostics) }

				// Return combined diagnostics
				return {
					...basicDiagnostics,
					enhancedTokenManager: safeReport,
				}
			} catch (error) {
				logger.warn('Error getting enhanced token diagnostics', { error })
			}
		}

		// Return basic diagnostics if enhanced diagnostics are not available
		return basicDiagnostics
	}
}
