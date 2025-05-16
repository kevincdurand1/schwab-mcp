import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { marketData } from '@sudowealth/schwab-api'
import { GetInstrumentsRequestQueryParamsSchema } from '@sudowealth/schwab-api/schemas'
import { logger } from '../../shared/logger'
import { schwabTool } from '../utils'

export function registerInstrumentTools(
	server: McpServer,
	getAccessToken: () => Promise<string>,
) {
	server.tool(
		'searchInstruments',
		GetInstrumentsRequestQueryParamsSchema.shape,
		schwabTool(
			getAccessToken,
			GetInstrumentsRequestQueryParamsSchema,
			async (token, { symbol, projection }) => {
				logger.info('[searchInstruments] Fetching instruments', {
					symbol,
					projection,
				})

				const instruments = await marketData.instruments.getInstruments(token, {
					queryParams: { symbol, projection },
				})

				if (
					!instruments ||
					(Array.isArray(instruments) && instruments.length === 0)
				) {
					return {
						content: [
							{
								type: 'text',
								text: `No instruments found for symbol: ${symbol} with projection: ${projection}.`,
							},
						],
					}
				}

				const instrumentCount = Array.isArray(instruments)
					? instruments.length
					: 1
				logger.debug('[searchInstruments] Successfully fetched instruments', {
					symbol,
					count: instrumentCount,
				})

				return {
					content: [
						{
							type: 'text',
							text: `Successfully fetched instruments for symbol: ${symbol}:`,
						},
						{ type: 'text', text: JSON.stringify(instruments, null, 2) },
					],
				}
			},
		),
	)
}
