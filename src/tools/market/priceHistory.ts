import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { logger } from '../../shared/logger'
import { schwabTool } from '../../shared/utils'

export function registerPriceHistoryTools(
	server: McpServer,
	client: SchwabApiClient,
) {
	server.tool(
		'getPriceHistory',
		client.schemas.GetPriceHistoryRequestQueryParamsSchema.shape,
		schwabTool(
			client,
			client.schemas.GetPriceHistoryRequestQueryParamsSchema,
			async (params) => {
				logger.info('[getPriceHistory] Fetching price history', {
					symbol: params.symbol,
					period: params.period,
					periodType: params.periodType,
					frequency: params.frequency,
					frequencyType: params.frequencyType,
				})

				const history = await client.marketData.priceHistory.getPriceHistory({
					queryParams: {
						symbol: params.symbol,
						period: params.period,
						periodType: params.periodType,
						frequency: params.frequency,
						frequencyType: params.frequencyType,
						startDate: params.startDate,
						endDate: params.endDate,
					},
				})

				if (history.empty || !history.candles || history.candles.length === 0) {
					return {
						content: [
							{
								type: 'text',
								text: `No price history found for symbol: ${params.symbol} with the given parameters.`,
							},
						],
					}
				}

				logger.debug('[getPriceHistory] Successfully fetched price history', {
					symbol: params.symbol,
					candleCount: history.candles?.length || 0,
				})

				return {
					content: [
						{
							type: 'text',
							text: `Successfully fetched price history for ${params.symbol}:`,
						},
						{
							type: 'text',
							text: JSON.stringify(history, null, 2),
						},
					],
				}
			},
		),
	)
}
