import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { trader } from '@sudowealth/schwab-api'
import { z } from 'zod'
import { logger } from '../../shared/logger'
import { SchwabApiError, withToken } from '../utils'

export function registerAccountTools(
	server: McpServer,
	getAccessToken: () => Promise<string>,
) {
	server.tool(
		'getAccounts',
		{ showPositions: z.boolean().default(false) },
		withToken(getAccessToken, async (token, { showPositions }) => {
			try {
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
			} catch (error: any) {
				logger.error('Failed to fetch accounts', error)
				throw new SchwabApiError(
					error.status || 500,
					`Failed to fetch accounts: ${error.message}`
				)
			}
		}),
	)

	server.tool(
		'getAccountNumbers',
		{},
		withToken(getAccessToken, async (token) => {
			try {
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
			} catch (error: any) {
				logger.error('Failed to fetch account numbers', error)
				throw new SchwabApiError(
					error.status || 500,
					`Failed to fetch account numbers: ${error.message}`
				)
			}
		}),
	)
}
