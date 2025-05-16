import { createSchwabAuthLite, type SchwabAuth } from '@sudowealth/schwab-api'

/**
 * Creates a SchwabAuth service instance using the provided environment variables
 */
export function createSchwabAuth(
	env: {
		SCHWAB_CLIENT_ID: string
		SCHWAB_CLIENT_SECRET: string
	},
	redirectUri: string,
): SchwabAuth {
	// Use the simplified auth client from schwab-api
	return createSchwabAuthLite({
		clientId: env.SCHWAB_CLIENT_ID,
		clientSecret: env.SCHWAB_CLIENT_SECRET,
		redirectUri,
	})
}
