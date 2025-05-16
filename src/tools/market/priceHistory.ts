import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { marketData } from '@sudowealth/schwab-api'
import { GetPriceHistoryRequestQueryParamsSchema } from '@sudowealth/schwab-api/schemas'
import { logger } from '../../shared/logger'
import { schwabTool } from '../../shared/utils'

export function registerPriceHistoryTools(
	server: McpServer,
	getAccessToken: () => Promise<string>,
) {
	server.tool(
		'getPriceHistory',
		GetPriceHistoryRequestQueryParamsSchema.shape,
		schwabTool(
			getAccessToken,
			GetPriceHistoryRequestQueryParamsSchema,
			async (token, params) => {
				logger.info('[getPriceHistory] Fetching price history', {
					symbol: params.symbol,
					period: params.period,
					periodType: params.periodType,
					frequency: params.frequency,
					frequencyType: params.frequencyType,
				})

				const history = await marketData.priceHistory.getPriceHistory(token, {
					queryParams: params,
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
