import { logger } from '../shared/logger'
import { type Env } from '../types/env'

/**
 * Central configuration module for accessing environment variables
 *
 * This module provides type-safe access to environment variables defined in the Env interface.
 * It centralizes all environment variable references to avoid duplication and reduce the risk
 * of typos when accessing environment variables throughout the codebase.
 */
export class EnvConfig {
	private static instance: EnvConfig | null = null
	private env: Env | null = null

	private constructor() {}

	/**
	 * Initializes the environment configuration with the provided Env object
	 *
	 * @param env Environment variables
	 */
	public static initialize(env: Env): void {
		if (!EnvConfig.instance) {
			EnvConfig.instance = new EnvConfig()
		}
		EnvConfig.instance.env = env
		logger.info('Environment configuration initialized')
	}

	/**
	 * Gets the singleton instance of EnvConfig
	 *
	 * @returns The EnvConfig instance
	 * @throws Error if EnvConfig has not been initialized
	 */
	private static getInstance(): EnvConfig {
		if (!EnvConfig.instance || !EnvConfig.instance.env) {
			logger.error('EnvConfig not initialized')
			throw new Error(
				'EnvConfig not initialized. Call EnvConfig.initialize(env) first.',
			)
		}
		return EnvConfig.instance
	}

	/**
	 * Validates that a required environment variable exists and is not empty
	 *
	 * @param variableName The name of the environment variable
	 * @param value The value of the environment variable
	 * @throws Error if the environment variable is missing or empty
	 */
	private static validateRequiredVariable(
		variableName: string,
		value: string | undefined,
	): string {
		if (!value) {
			logger.error(
				`Required environment variable ${variableName} is missing or empty`,
			)
			throw new Error(
				`Required environment variable ${variableName} is missing or empty`,
			)
		}
		return value
	}

	/**
	 * Gets the Schwab client ID
	 * @throws Error if the client ID is missing or empty
	 */
	public static get SCHWAB_CLIENT_ID(): string {
		const value = this.getInstance().env!.SCHWAB_CLIENT_ID
		return this.validateRequiredVariable('SCHWAB_CLIENT_ID', value)
	}

	/**
	 * Gets the Schwab client secret
	 * @throws Error if the client secret is missing or empty
	 */
	public static get SCHWAB_CLIENT_SECRET(): string {
		const value = this.getInstance().env!.SCHWAB_CLIENT_SECRET
		return this.validateRequiredVariable('SCHWAB_CLIENT_SECRET', value)
	}

	/**
	 * Gets the cookie encryption key
	 * @throws Error if the cookie encryption key is missing or empty
	 */
	public static get COOKIE_ENCRYPTION_KEY(): string {
		const value = this.getInstance().env!.COOKIE_ENCRYPTION_KEY
		return this.validateRequiredVariable('COOKIE_ENCRYPTION_KEY', value)
	}

	/**
	 * Gets the OAuth KV namespace
	 * Note: This is optional, so no validation is performed
	 */
	public static get OAUTH_KV(): KVNamespace | undefined {
		return this.getInstance().env!.OAUTH_KV
	}

	/**
	 * Checks if the EnvConfig has been initialized
	 *
	 * @returns True if initialized, false otherwise
	 */
	public static isInitialized(): boolean {
		return !!EnvConfig.instance && !!EnvConfig.instance.env
	}

	/**
	 * Gets diagnostic information about the EnvConfig state
	 * Useful for troubleshooting configuration issues
	 *
	 * @returns Diagnostic information about the EnvConfig
	 */
	public static getDiagnostics(): Record<string, any> {
		if (!this.isInitialized()) {
			return {
				initialized: false,
				error: 'EnvConfig not initialized',
			}
		}

		// Use try-catch to safely check for required variables without throwing
		let hasClientId = false
		let hasClientSecret = false
		let hasCookieEncryptionKey = false
		let hasOAuthKV = false

		try {
			hasClientId = !!this.SCHWAB_CLIENT_ID
		} catch (e) {
			logger.error('Error getting SCHWAB_CLIENT_ID', e)
		}

		try {
			hasClientSecret = !!this.SCHWAB_CLIENT_SECRET
		} catch (e) {
			logger.error('Error getting SCHWAB_CLIENT_SECRET', e)
		}

		try {
			hasCookieEncryptionKey = !!this.COOKIE_ENCRYPTION_KEY
		} catch (e) {
			logger.error('Error getting COOKIE_ENCRYPTION_KEY', e)
		}

		hasOAuthKV = !!this.OAUTH_KV

		return {
			initialized: true,
			hasClientId,
			hasClientSecret,
			hasCookieEncryptionKey,
			hasOAuthKV,
		}
	}
}
