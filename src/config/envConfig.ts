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
			const errorMessage = `Required environment variable ${variableName} is missing or empty`
			logger.error(errorMessage)
			throw new Error(errorMessage)
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

		// Define a properly typed diagnostics object
		interface EnvDiagnostics {
			initialized: boolean
			hasSCHWAB_CLIENT_ID?: boolean
			hasSCHWAB_CLIENT_SECRET?: boolean
			hasCOOKIE_ENCRYPTION_KEY?: boolean
			hasOAuthKV: boolean
			missingVars: string[]
		}

		// Check required variables safely without excessive logging
		const diagnostics: EnvDiagnostics = {
			initialized: true,
			hasOAuthKV: false,
			missingVars: [],
		}

		// Required variables
		const requiredVars = [
			{ name: 'SCHWAB_CLIENT_ID', accessor: () => this.SCHWAB_CLIENT_ID },
			{
				name: 'SCHWAB_CLIENT_SECRET',
				accessor: () => this.SCHWAB_CLIENT_SECRET,
			},
			{
				name: 'COOKIE_ENCRYPTION_KEY',
				accessor: () => this.COOKIE_ENCRYPTION_KEY,
			},
		]

		// Check each required variable
		for (const v of requiredVars) {
			try {
				const value = v.accessor()
				// Use type assertion to safely set dynamic property
				;(diagnostics as Record<string, any>)[`has${v.name}`] = !!value
			} catch (e) {
				// Use type assertion to safely set dynamic property
				;(diagnostics as Record<string, any>)[`has${v.name}`] = false
				diagnostics.missingVars.push(v.name)
				console.error(`Missing required environment variable: ${v.name}, ${e}`)
			}
		}

		// Optional variables
		diagnostics.hasOAuthKV = !!this.OAUTH_KV

		// If any required variables are missing, log once with all missing variables
		if (diagnostics.missingVars.length > 0) {
			logger.error(
				`Missing required environment variables: ${diagnostics.missingVars.join(', ')}`,
			)
		}

		return diagnostics
	}
}
