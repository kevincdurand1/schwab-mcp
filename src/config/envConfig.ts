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
	 * Gets the Schwab client ID
	 */
	public static get SCHWAB_CLIENT_ID(): string {
		return this.getInstance().env!.SCHWAB_CLIENT_ID
	}

	/**
	 * Gets the Schwab client secret
	 */
	public static get SCHWAB_CLIENT_SECRET(): string {
		return this.getInstance().env!.SCHWAB_CLIENT_SECRET
	}

	/**
	 * Gets the cookie encryption key
	 */
	public static get COOKIE_ENCRYPTION_KEY(): string {
		return this.getInstance().env!.COOKIE_ENCRYPTION_KEY
	}

	/**
	 * Gets the OAuth KV namespace
	 */
	public static get OAUTH_KV(): KVNamespace | undefined {
		return this.getInstance().env!.OAUTH_KV
	}

	/**
	 * Gets the raw Env object
	 *
	 * This should be used sparingly, only when access to the entire Env object is needed
	 */
	public static getRawEnv(): Env {
		return this.getInstance().env!
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

		const env = this.getInstance().env!
		return {
			initialized: true,
			hasClientId: !!env.SCHWAB_CLIENT_ID,
			hasClientSecret: !!env.SCHWAB_CLIENT_SECRET,
			hasCookieEncryptionKey: !!env.COOKIE_ENCRYPTION_KEY,
			hasOAuthKV: !!env.OAUTH_KV,
		}
	}
}
