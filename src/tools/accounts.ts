import { invariant } from '@epic-web/invariant'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { trader } from '@sudowealth/schwab-api'
import { z } from 'zod'

export function registerAccountTools(
	server: McpServer,
	getAccessToken: () => string | undefined,
) {
	server.tool(
		'getAccounts',
		{ showPositions: z.boolean().default(false) },
		async ({ showPositions }) => {
			const accessToken = getAccessToken()
			invariant(accessToken, '[getAccounts] Error: No access token.')

			try {
				console.log('[getAccounts] Fetching accounts')
				const accounts = await trader.accounts.getAccounts(accessToken, {
					queryParams: { fields: showPositions ? 'positions' : undefined },
				})

				if (accounts.length === 0) {
					return {
						content: [{ type: 'text', text: 'No Schwab accounts found.' }],
					}
				}
				const accountSummaries = accounts.map((acc: any) => ({
					...acc.securitiesAccount,
				}))
				return {
					content: [
						{ type: 'text', text: 'Successfully fetched Schwab accounts:' },
						{ type: 'text', text: JSON.stringify(accountSummaries, null, 2) },
					],
				}
			} catch (error: any) {
				console.error('[getAccounts] Error with schwabFetch:', error)
				return {
					content: [
						{
							type: 'text',
							text: `An error occurred fetching Schwab accounts: ${error.message}`,
						},
					],
				}
			}
		},
	)

	server.tool('getAccountNumbers', {}, async (_args: {}) => {
		const accessToken = getAccessToken()
		invariant(accessToken, '[getAccountNumbers] Error: No access token.')

		try {
			const accounts = await trader.accounts.getAccountNumbers(accessToken)
			if (accounts.length === 0) {
				return {
					content: [{ type: 'text', text: 'No Schwab accounts found.' }],
				}
			}
			return {
				content: [
					{ type: 'text', text: 'Successfully fetched Schwab accounts:' },
					{ type: 'text', text: JSON.stringify(accounts, null, 2) },
				],
			}
		} catch (error: any) {
			console.error('[getAccountNumbers] Error with schwabFetch:', error)
			return {
				content: [
					{
						type: 'text',
						text: `An error occurred fetching Schwab accounts: ${error.message}`,
					},
				],
			}
		}
	})
}
