import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { logger } from '../../shared/logger'
import { createTool, toolSuccess, toolError } from '../../shared/toolBuilder'

export function registerTransactionTools(
	client: SchwabApiClient,
	server: McpServer,
) {
	createTool(client, server, {
		name: 'getTransactions',
		schema: client.schemas.GetTransactionsRequestQueryParams,
		handler: async ({ startDate, endDate, types, symbol }, client) => {
			try {
				// First get all account numbers
				const accounts = await client.trader.accounts.getAccountNumbers()
				if (accounts.length === 0) {
					return toolSuccess([], 'No Schwab accounts found.')
				}

				logger.info('[getTransactions] Fetching transactions', {
					accountCount: accounts.length,
					startDate,
					endDate,
					hasTypes: !!types,
					symbol,
				})

				const transactions: any[] = []
				for (const account of accounts) {
					const accountTransactions =
						await client.trader.transactions.getTransactions({
							pathParams: { accountNumber: account.hashValue },
							queryParams: {
								startDate,
								endDate,
								types,
								symbol,
							},
						})
					logger.debug('[getTransactions] Transactions for account', {
						accountHash: account.hashValue,
						count: accountTransactions.length,
					})
					transactions.push(...accountTransactions)
				}

				if (transactions.length === 0) {
					return toolSuccess([], 'No Schwab transactions found.')
				}

				// Format the output
				const transactionSummaries = transactions.map((trans: any) => ({
					...trans,
				}))

				logger.debug(
					'[getTransactions] Successfully fetched all transactions',
					{
						totalCount: transactions.length,
					},
				)

				return toolSuccess(
					transactionSummaries,
					'Successfully fetched Schwab transactions'
				)
			} catch (error) {
				logger.error('[getTransactions] Error fetching transactions', { error })
				return toolError(
					error instanceof Error
						? error
						: new Error('Unknown error fetching transactions'),
					{ source: 'getTransactions' }
				)
			}
		},
	})
}