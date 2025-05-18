import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { logger } from '../../shared/logger'
import { schwabTool } from '../../shared/utils'

export function registerInstrumentTools(
	server: McpServer,
	client: SchwabApiClient,
) {
	server.tool(
		'searchInstruments',
		client.schemas.GetInstrumentsRequestQueryParamsSchema.shape,
		schwabTool(
			client,
			client.schemas.GetInstrumentsRequestQueryParamsSchema,
			async ({ symbol, projection }) => {
				logger.info('[searchInstruments] Fetching instruments', {
					symbol,
					projection,
				})

				const instruments = await client.marketData.instruments.getInstruments({
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
