import { Mutex } from 'async-mutex'
import { type SchwabAuth } from './schwabAuth'

export interface TokenSet {
	accessToken: string
	refreshToken: string
	expiresAt: number // epoch-ms
}

export class TokenManager {
	private token: TokenSet
	private refreshMutex = new Mutex()
	private refreshPromise: Promise<void> | null = null

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
		// Use the mutex to prevent multiple concurrent refresh attempts
		await this.refreshMutex.runExclusive(async () => {
			// Double-check expiration inside the mutex lock
			// Another thread might have refreshed the token while we were waiting
			if (Date.now() < this.token.expiresAt - 60_000)
				return
				
			// If there's already a refresh in progress, wait for it
			if (this.refreshPromise) {
				await this.refreshPromise
				return
			}
			
			// Create the promise before any await to ensure it's captured
			this.refreshPromise = this.performRefresh()
			
			try {
				await this.refreshPromise
			} finally {
				this.refreshPromise = null
			}
		})
	}
	
	private async performRefresh(): Promise<void> {
		await this.auth.refresh(this.token.refreshToken, async (newToken) => {
			// Only update the token once we've successfully persisted it
			this.token = newToken
		})
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
