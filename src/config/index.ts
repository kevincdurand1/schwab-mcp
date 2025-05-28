import type { Env, ValidatedEnv } from '../../types/env'
import { buildConfig } from './appConfig'

let cachedConfig: ValidatedEnv | undefined

/**
 * Initialize and cache the application configuration.
 * Should be called from the Worker `setup()` phase.
 */
export function initConfig(env: Env): ValidatedEnv {
	if (!cachedConfig) {
		cachedConfig = buildConfig(env)
	}
	return cachedConfig
}

/**
 * Retrieve the previously initialised configuration.
 */
export function getConfig(): ValidatedEnv {
	if (!cachedConfig) {
		throw new Error('Config has not been initialised')
	}
	return cachedConfig
}

export { buildConfig }
