import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { z } from 'zod'
import { logger } from '../../shared/logger'
import { schwabTool } from '../../shared/utils'

// Define schema for getAccounts
const GetAccountsSchema = z.object({
	showPositions: z.boolean().default(false),
})

// Define schema for getAccountNumbers (empty schema)
const GetAccountNumbersSchema = z.object({})

export function registerAccountTools(
	server: McpServer,
	client: SchwabApiClient,
) {
	server.tool(
		'getAccounts',
		{ showPositions: z.boolean().default(false) },
		schwabTool(client, GetAccountsSchema, async ({ showPositions }) => {
			logger.info('Fetching accounts', { showPositions })
			const accounts = await client.trader.accounts.getAccounts({
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
			logger.debug('Successfully fetched accounts', {
				count: accounts.length,
			})
			return {
				content: [
					{ type: 'text', text: 'Successfully fetched Schwab accounts:' },
					{ type: 'text', text: JSON.stringify(accountSummaries, null, 2) },
				],
			}
		}),
	)

	server.tool(
		'getAccountNumbers',
		{},
		schwabTool(client, GetAccountNumbersSchema, async () => {
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
		}),
	)
}
