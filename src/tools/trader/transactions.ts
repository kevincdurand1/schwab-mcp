import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { trader } from '@sudowealth/schwab-api'
import { GetTransactionsRequestQueryParams } from '@sudowealth/schwab-api/schemas'
import { logger } from '../../shared/logger'
import { schwabTool } from '../utils'

export function registerTransactionTools(
	server: McpServer,
	getAccessToken: () => Promise<string>,
) {
	server.tool(
		'getTransactions',
		GetTransactionsRequestQueryParams.shape,
		schwabTool(
			getAccessToken,
			GetTransactionsRequestQueryParams,
			async (token, { startDate, endDate, types, symbol }) => {
			// First get all account numbers
			const accounts = await trader.accounts.getAccountNumbers(token)
			if (accounts.length === 0) {
				return {
					content: [{ type: 'text', text: 'No Schwab accounts found.' }],
				}
			}

			logger.info('[getTransactions] Fetching transactions', { 
				accountCount: accounts.length,
				startDate,
				endDate,
				hasTypes: !!types,
				symbol
			})
			
			const transactions: any[] = []
			for (const account of accounts) {
				const accountTransactions = await trader.transactions.getTransactions(
					token,
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
				logger.debug('[getTransactions] Transactions for account', {
					accountHash: account.hashValue,
					count: accountTransactions.length
				})
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

			logger.debug('[getTransactions] Successfully fetched all transactions', { 
				totalCount: transactions.length 
			})
			
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
		}),
	)
}
