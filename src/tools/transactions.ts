import { invariant } from '@epic-web/invariant'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { trader } from '@sudowealth/schwab-api'
import { GetTransactionsRequestQueryParams } from '@sudowealth/schwab-api/schemas'

export function registerTransactionTools(
	server: McpServer,
	getAccessToken: () => string | undefined,
) {
	server.tool(
		'getTransactions',
		GetTransactionsRequestQueryParams.shape,
		async ({ startDate, endDate, types, symbol }) => {
			const accessToken = getAccessToken()
			invariant(accessToken, '[getTransactions] Error: No access token.')

			const accounts = await trader.accounts.getAccountNumbers(accessToken)
			if (accounts.length === 0) {
				return {
					content: [{ type: 'text', text: 'No Schwab accounts found.' }],
				}
			}

			try {
				console.log('[getTransactions] Fetching accounts')
				const transactions: any[] = []
				for (const account of accounts) {
					const accountTransactions = await trader.transactions.getTransactions(
						accessToken,
						{
							pathParams: { accountNumber: account.hashValue },
							queryParams: {
								startDate,
								endDate,
								types,
								symbol,
							},
						},
					)
					console.log(
						'[getTransactions] Transactions for account',
						account.hashValue,
						accountTransactions,
					)
					transactions.push(...accountTransactions)
				}

				if (transactions.length === 0) {
					return {
						content: [{ type: 'text', text: 'No Schwab transactions found.' }],
					}
				}

				// Format the output
				const transactionSummaries = transactions.map((trans: any) => ({
					...trans,
				}))

				return {
					content: [
						{
							type: 'text',
							text: 'Successfully fetched Schwab transactions:',
						},
						// Stringify JSON data and return as text, based on SDK examples
						{
							type: 'text',
							text: JSON.stringify(transactionSummaries, null, 2),
						},
					],
				}
			} catch (error: any) {
				console.error('[getSchwabAccounts] Error with schwabFetch:', error)
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
}
