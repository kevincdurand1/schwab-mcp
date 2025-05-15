import  { type SchwabAuth } from './schwabAuth'

export interface TokenSet {
	accessToken: string
	refreshToken: string
	expiresAt: number // epoch-ms
}

export class TokenManager {
	private token: TokenSet

	constructor(
		initial: TokenSet,
		private auth: SchwabAuth,
	) {
		this.token = initial
	}

	/** Always resolves to a non-expired access token. */
	async getAccessToken(): Promise<string> {
		// If token is still valid (with 1 minute buffer), return it
		if (Date.now() < this.token.expiresAt - 60_000)
			return this.token.accessToken
		
		// Otherwise refresh it
		await this.refresh()
		return this.token.accessToken
	}

	private async refresh(): Promise<void> {
		const t = await this.auth.refresh(this.token.refreshToken)
		this.token = t
	}

	// expose for optional manual retry
	async forceRefresh(): Promise<void> {
		await this.refresh()
	}

	/** Get the current token set (for persistence) */
	getTokenSet(): TokenSet {
		return { ...this.token }
	}
}
