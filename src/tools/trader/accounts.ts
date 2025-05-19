import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { z } from 'zod'
import { logger } from '../../shared/logger'
import { schwabTool } from '../../shared/utils'

export function registerAccountTools(
	server: McpServer,
	client: SchwabApiClient,
) {
	server.tool(
		'getAccounts',
		client.schemas.GetAccountsRequestQueryParams.shape,
		async (args) =>
			await schwabTool(
				client,
				client.schemas.GetAccountsRequestQueryParams,
				async (queryParams) => {
					logger.info('Fetching accounts', {
						showPositions: queryParams?.fields,
					})
					const accounts = await client.trader.accounts.getAccounts({
						queryParams: { fields: queryParams?.fields },
					})

					if (accounts.length === 0) {
						return {
							content: [{ type: 'text', text: 'No Schwab accounts found.' }],
						}
					}
					const accountSummaries = accounts.map((acc: any) => ({
						...acc.securitiesAccount,
					}))
					logger.debug('Successfully fetched accounts', {
						count: accounts.length,
					})
					return {
						content: [
							{ type: 'text', text: 'Successfully fetched Schwab accounts:' },
							{ type: 'text', text: JSON.stringify(accountSummaries, null, 2) },
						],
					}
				},
			)(args),
	)

	server.tool(
		'getAccountNumbers',
		{},
		async (args) =>
			await schwabTool(client, z.object({}), async () => {
				logger.info('Fetching account numbers')
				const accounts = await client.trader.accounts.getAccountNumbers()
				if (accounts.length === 0) {
					return {
						content: [{ type: 'text', text: 'No Schwab accounts found.' }],
					}
				}
				logger.debug('Successfully fetched account numbers', {
					count: accounts.length,
				})
				return {
					content: [
						{ type: 'text', text: 'Successfully fetched Schwab accounts:' },
						{ type: 'text', text: JSON.stringify(accounts, null, 2) },
					],
				}
			})(args),
	)
}
