import { invariant } from '@epic-web/invariant'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { marketData } from '@sudowealth/schwab-api'
import {
	GetMarketHoursByMarketIdRequestPathParamsSchema,
	GetMarketHoursByMarketIdRequestQueryParamsSchema,
	GetMarketHoursRequestQueryParamsSchema,
} from '@sudowealth/schwab-api/schemas'

export function registerMarketHoursTools(
	server: McpServer,
	getAccessToken: () => string | undefined,
) {
	server.tool(
		'getMarketHours',
		GetMarketHoursRequestQueryParamsSchema.shape,
		async ({ markets, date }) => {
			const accessToken = getAccessToken()
			invariant(accessToken, '[getMarketHours] Error: No access token.')

			try {
				const queryParams = {
					markets: Array.isArray(markets) ? markets : [markets],
					date,
				}
				console.log(
					`[getMarketHours] Fetching market hours for markets: ${queryParams.markets.join(',')} ${date ? `on date: ${date}` : ''}`,
				)

				const hours = await marketData.marketHours.getMarketHours(accessToken, {
					queryParams,
				})

				if (Object.keys(hours).length === 0) {
					return {
						content: [
							{
								type: 'text',
								text: `No market hours found for the specified criteria.`,
							},
						],
					}
				}

				return {
					content: [
						{
							type: 'text',
							text: 'Successfully fetched market hours:',
						},
						{ type: 'text', text: JSON.stringify(hours, null, 2) },
					],
				}
			} catch (error: any) {
				console.error('[getMarketHours] Error with Schwab API:', error)
				return {
					content: [
						{
							type: 'text',
							text: `An error occurred fetching market hours: ${error.message}`,
						},
					],
				}
			}
		},
	)

	server.tool(
		'getMarketHoursByMarketId',
		{
			...GetMarketHoursByMarketIdRequestQueryParamsSchema.shape,
			...GetMarketHoursByMarketIdRequestPathParamsSchema.shape,
		},
		async ({ market_id, date }) => {
			const accessToken = getAccessToken()
			invariant(
				accessToken,
				'[getMarketHoursByMarketId] Error: No access token.',
			)

			try {
				console.log(
					`[getMarketHoursByMarketId] Fetching market hours for market: ${market_id} ${date ? `on date: ${date}` : ''}`,
				)

				const hours = await marketData.marketHours.getMarketHoursByMarketId(
					accessToken,
					{ pathParams: { market_id }, queryParams: { date } },
				)

				if (!hours) {
					// Or check based on expected structure if an empty object is valid
					return {
						content: [
							{
								type: 'text',
								text: `No market hours found for market ID: ${market_id} ${date ? `on date: ${date}` : ''}.`,
							},
						],
					}
				}

				return {
					content: [
						{
							type: 'text',
							text: `Successfully fetched market hours for ${market_id}:`,
						},
						{ type: 'text', text: JSON.stringify(hours, null, 2) },
					],
				}
			} catch (error: any) {
				console.error(
					'[getMarketHoursByMarketId] Error with Schwab API:',
					error,
				)
				return {
					content: [
						{
							type: 'text',
							text: `An error occurred fetching market hours for ${market_id}: ${error.message}`,
						},
					],
				}
			}
		},
	)
}
