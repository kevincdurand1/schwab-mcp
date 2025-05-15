import { invariant } from '@epic-web/invariant'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { marketData } from '@sudowealth/schwab-api'
import { GetPriceHistoryRequestQueryParamsSchema } from '@sudowealth/schwab-api/schemas'

export function registerPriceHistoryTools(
	server: McpServer,
	getAccessToken: () => Promise<string>,
) {
	server.tool(
		'getPriceHistory',
		GetPriceHistoryRequestQueryParamsSchema.shape,
		async (params) => {
			const accessToken = await getAccessToken()
			invariant(accessToken, '[getPriceHistory] Error: No access token.')

			try {
				console.log(
					`[getPriceHistory] Fetching price history for symbol: ${params.symbol}`,
				)
				const history = await marketData.priceHistory.getPriceHistory(
					accessToken,
					{ queryParams: params },
				)

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
			} catch (error: any) {
				console.error('[getPriceHistory] Error with Schwab API:', error)
				return {
					content: [
						{
							type: 'text',
							text: `An error occurred fetching price history for ${params.symbol}: ${error.message}`,
						},
					],
				}
			}
		},
	)
}
