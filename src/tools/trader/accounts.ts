import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { z } from 'zod'
import { logger } from '../../shared/logger'
import { createTool, toolSuccess, toolError } from '../../shared/toolBuilder'

export function registerAccountTools(
	client: SchwabApiClient,
	server: McpServer,
) {
	createTool(client, server, {
		name: 'getAccounts',
		schema: client.schemas.GetAccountsRequestQueryParams,
		handler: async (queryParams, client) => {
			try {
				logger.info('Fetching accounts', {
					showPositions: queryParams?.fields,
				})
				const accounts = await client.trader.accounts.getAccounts({
					queryParams: { fields: queryParams?.fields },
				})

				const accountSummaries = accounts.map((acc: any) => ({
					...acc.securitiesAccount,
				}))

				logger.debug('Successfully fetched accounts', {
					count: accounts.length,
				})

				return toolSuccess({
					accounts: accountSummaries,
					count: accountSummaries.length,
				}, accounts.length > 0
					? 'Successfully fetched Schwab accounts'
					: 'No Schwab accounts found')
			} catch (error) {
				logger.error('Error fetching accounts', { error })
				return toolError(
					error instanceof Error
						? error
						: new Error('Unknown error fetching accounts'),
					{ source: 'getAccounts' }
				)
			}
		},
	})

	createTool(client, server, {
		name: 'getAccountNumbers',
		schema: z.object({}),
		handler: async (_params, client) => {
			try {
				logger.info('Fetching account numbers')
				const accounts = await client.trader.accounts.getAccountNumbers()

				logger.debug('Successfully fetched account numbers', {
					count: accounts.length,
				})

				return toolSuccess({
					accounts,
					count: accounts.length,
				}, accounts.length > 0
					? 'Successfully fetched Schwab accounts'
					: 'No Schwab accounts found')
			} catch (error) {
				logger.error('Error fetching account numbers', { error })
				return toolError(
					error instanceof Error
						? error
						: new Error('Unknown error fetching account numbers'),
					{ source: 'getAccountNumbers' }
				)
			}
		},
	})
}