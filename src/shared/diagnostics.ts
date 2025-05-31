import { type EnhancedTokenManager } from '@sudowealth/schwab-api'
import { type Env, type ValidatedEnv } from '../../types/env'
import { buildConfig } from '../config'
import { makeKvTokenStore, type TokenIdentifiers } from './kvTokenStore'
import { logger } from './logger'

export interface DiagnosticOptions {
	env: Env
	validatedConfig?: ValidatedEnv
	tokenManager?: EnhancedTokenManager
	client?: unknown
	props?: TokenIdentifiers
}

export async function gatherDiagnostics({
	env,
	validatedConfig,
	tokenManager,
	client,
	props,
}: DiagnosticOptions): Promise<Record<string, any>> {
	logger.info('Gathering diagnostic information')
	const diagnosticInfo: Record<string, any> = {
		timestamp: new Date().toISOString(),
		hasTokenManager: !!tokenManager,
		hasClient: !!client,
		implementationType: tokenManager
			? tokenManager.constructor.name
			: 'undefined',
	}
	try {
		const config = validatedConfig ?? buildConfig(env)
		diagnosticInfo.environment = {
			hasClientId: !!config.SCHWAB_CLIENT_ID,
			hasClientSecret: !!config.SCHWAB_CLIENT_SECRET,
			hasRedirectUri: !!config.SCHWAB_REDIRECT_URI,
			hasCookieKey: !!config.COOKIE_ENCRYPTION_KEY,
			hasOAuthKV: !!config.OAUTH_KV,
		}

		if (config.OAUTH_KV && props) {
			const kvToken = makeKvTokenStore(config.OAUTH_KV)
			const tokenIds = {
				schwabUserId: props.schwabUserId,
				clientId: props.clientId,
			}
			try {
				const kvTokenData = await kvToken.load(tokenIds)
				diagnosticInfo.kvTokenStatus = {
					hasTokenInKV: !!kvTokenData,
					tokenKey: kvToken.kvKey(tokenIds),
					hasAccessToken: !!kvTokenData?.accessToken,
					hasRefreshToken: !!kvTokenData?.refreshToken,
					expiresAt: kvTokenData?.expiresAt
						? new Date(kvTokenData.expiresAt).toISOString()
						: undefined,
				}
			} catch (kvError) {
				diagnosticInfo.kvTokenError =
					kvError instanceof Error ? kvError.message : String(kvError)
			}
		}
	} catch (envError) {
		diagnosticInfo.environmentError =
			envError instanceof Error ? envError.message : String(envError)
	}

	if (tokenManager) {
		try {
			if (typeof (tokenManager as any).getDiagnostics === 'function') {
				diagnosticInfo.tokenManagerDiagnostics = await (
					tokenManager as any
				).getDiagnostics()
				const diag = diagnosticInfo.tokenManagerDiagnostics
				if (diag && typeof diag === 'object') {
					diagnosticInfo.tokenStatus = {
						hasValidAccessToken: !!(diag.hasAccessToken && diag.expiresIn > 0),
						hasExpiredAccessToken: !!(
							diag.hasAccessToken && diag.expiresIn <= 0
						),
						hasRefreshToken: !!diag.hasRefreshToken,
						expiresInSeconds: diag.expiresIn,
						lastTokenOperation: diag.lastTokenOperation,
					}
				}
			} else if (
				typeof (tokenManager as any).generateTokenReport === 'function'
			) {
				diagnosticInfo.tokenManagerReport = await (
					tokenManager as any
				).generateTokenReport()
			}
		} catch (diagError) {
			diagnosticInfo.tokenManagerDiagnosticError =
				diagError instanceof Error ? diagError.message : String(diagError)
		}
	}

	logger.info('Diagnostic information gathered', {
		timestamp: diagnosticInfo.timestamp,
		tokenStatusSummary: diagnosticInfo.tokenStatus
			? `AccessToken: ${diagnosticInfo.tokenStatus.hasValidAccessToken ? 'Valid' : 'Invalid/Expired'}, RefreshToken: ${diagnosticInfo.tokenStatus.hasRefreshToken ? 'Present' : 'Missing'}`
			: 'No token status available',
	})
	return diagnosticInfo
}
