import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { trader } from '@sudowealth/schwab-api'
import { z } from 'zod'
import { logger } from '../../shared/logger'
import { schwabTool } from '../utils'

// Define schema for getAccounts
const GetAccountsSchema = z.object({
  showPositions: z.boolean().default(false)
})

// Define schema for getAccountNumbers (empty schema)
const GetAccountNumbersSchema = z.object({})

export function registerAccountTools(
	server: McpServer,
	getAccessToken: () => Promise<string>
) {
	server.tool(
		'getAccounts',
		{ showPositions: z.boolean().default(false) },
		schwabTool(
			getAccessToken,
			GetAccountsSchema,
			async (token, { showPositions }) => {
				logger.info('Fetching accounts', { showPositions })
				const accounts = await trader.accounts.getAccounts(token, {
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
				logger.debug('Successfully fetched accounts', { count: accounts.length })
				return {
					content: [
						{ type: 'text', text: 'Successfully fetched Schwab accounts:' },
						{ type: 'text', text: JSON.stringify(accountSummaries, null, 2) },
					],
				}
			}
		)
	)

	server.tool(
		'getAccountNumbers',
		{},
		schwabTool(
			getAccessToken,
			GetAccountNumbersSchema,
			async (token) => {
				logger.info('Fetching account numbers')
				const accounts = await trader.accounts.getAccountNumbers(token)
				if (accounts.length === 0) {
					return {
						content: [{ type: 'text', text: 'No Schwab accounts found.' }],
					}
				}
				logger.debug('Successfully fetched account numbers', { count: accounts.length })
				return {
					content: [
						{ type: 'text', text: 'Successfully fetched Schwab accounts:' },
						{ type: 'text', text: JSON.stringify(accounts, null, 2) },
					],
				}
			}
		)
	)
}

