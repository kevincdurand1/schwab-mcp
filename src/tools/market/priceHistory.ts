import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { logger } from '../../shared/logger'
import { createTool, toolSuccess, toolError } from '../../shared/toolBuilder'

export function registerPriceHistoryTools(
	client: SchwabApiClient,
	server: McpServer,
) {
	createTool(client, server, {
		name: 'getPriceHistory',
		schema: client.schemas.GetPriceHistoryRequestQueryParamsSchema,
		handler: async (params, client) => {
			try {
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

				if (
					history.empty ||
					!history.candles ||
					history.candles.length === 0
				) {
					return toolSuccess(
						[],
						`No price history found for symbol: ${params.symbol} with the given parameters.`
					)
				}

				logger.debug('[getPriceHistory] Successfully fetched price history', {
					symbol: params.symbol,
					candleCount: history.candles?.length || 0,
				})

				return toolSuccess(
					history,
					`Successfully fetched price history for ${params.symbol}`
				)
			} catch (error) {
				logger.error('[getPriceHistory] Error fetching price history', {
					error,
					symbol: params.symbol,
				})
				return toolError(
					error instanceof Error
						? error
						: new Error('Unknown error fetching price history'),
					{ source: 'getPriceHistory', symbol: params.symbol }
				)
			}
		},
	})
}