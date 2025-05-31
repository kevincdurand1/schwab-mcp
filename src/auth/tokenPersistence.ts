import {
	type TokenData,
	type EnhancedTokenManagerOptions,
} from '@sudowealth/schwab-api'

export function mapTokenPersistence(
	load?: () => Promise<TokenData | null>,
	save?: (td: TokenData) => Promise<void>,
): Pick<EnhancedTokenManagerOptions, 'load' | 'save'> {
	const mappedLoad = load
		? async () => {
				const data = await load()
				if (!data) return null
				return {
					accessToken: data.accessToken,
					refreshToken: data.refreshToken,
					expiresAt: data.expiresAt,
				}
			}
		: undefined

	const mappedSave = save
		? async (td: TokenData) => {
				await save({
					accessToken: td.accessToken,
					refreshToken: td.refreshToken || '',
					expiresAt: td.expiresAt ?? 0,
				})
			}
		: undefined

	return { load: mappedLoad, save: mappedSave }
}
