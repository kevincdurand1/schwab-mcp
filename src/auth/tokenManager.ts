import { createAuthClient } from '@sudowealth/schwab-api'

export interface TokenSet {
	accessToken: string
	refreshToken: string
	expiresAt: number // epoch-ms
}

export class TokenManager {
	private token: TokenSet
	private refreshing: Promise<void> | null = null

	constructor(
		initial: TokenSet,
		private env: Env, // provides client ID/secret
	) {
		this.token = initial
		this.auth = createAuthClient({
			clientId: env.SCHWAB_CLIENT_ID,
			clientSecret: env.SCHWAB_CLIENT_SECRET,
			redirectUri: 'https://schwab-mcp.dyeoman2.workers.dev/callback',
			load: async () => ({ ...initial }),
			save: async (_t) => {
				// noop – real persistence handled by DurableMCP (see index.ts)
			},
		})
	}

	/** Always resolves to a non-expired access token. */
	async getAccessToken(): Promise<string> {
		if (Date.now() < this.token.expiresAt - 60_000)
			return this.token.accessToken
		if (!this.refreshing) this.refreshing = this.refresh()
		await this.refreshing
		return this.token.accessToken
	}

	private async refresh(): Promise<void> {
		try {
			const t = await this.auth.refreshTokens()
			this.token = {
				accessToken: t.accessToken,
				refreshToken: t.refreshToken ?? this.token.refreshToken,
				expiresAt: t.expiresAt,
			}
		} finally {
			this.refreshing = null
		}
	}

	// expose for optional manual retry
	async forceRefresh(): Promise<void> {
		this.refreshing ??= this.refresh()
		await this.refreshing
	}

	/** Get the current token set (for persistence) */
	getTokenSet(): TokenSet {
		return { ...this.token }
	}

	// --------------------------------------------------------------------------
	private readonly auth
}
