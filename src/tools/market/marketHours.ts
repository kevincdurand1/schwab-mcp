import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { marketData } from '@sudowealth/schwab-api'
import {
	GetMarketHoursByMarketIdRequestPathParamsSchema,
	GetMarketHoursByMarketIdRequestQueryParamsSchema,
	GetMarketHoursRequestQueryParamsSchema,
} from '@sudowealth/schwab-api/schemas'
import { z } from 'zod'
import { logger } from '../../shared/logger'
import { mergeShapes, schwabTool } from '../utils'

// Create combined schema for getMarketHoursByMarketId
const GetMarketHoursByMarketIdSchema = z.object(
	mergeShapes(
		GetMarketHoursByMarketIdRequestQueryParamsSchema.shape,
		GetMarketHoursByMarketIdRequestPathParamsSchema.shape,
	),
)

export function registerMarketHoursTools(
	server: McpServer,
	getAccessToken: () => Promise<string>,
) {
	server.tool(
		'getMarketHours',
		GetMarketHoursRequestQueryParamsSchema.shape,
		schwabTool(
			getAccessToken,
			GetMarketHoursRequestQueryParamsSchema,
			async (
				token: string,
				{
					markets,
					date,
				}: z.infer<typeof GetMarketHoursRequestQueryParamsSchema>,
			) => {
				const queryParams = {
					markets: Array.isArray(markets) ? markets : [markets],
					date,
				}

				logger.info('[getMarketHours] Fetching market hours', {
					markets: queryParams.markets.join(','),
					date,
				})

				const hours = await marketData.marketHours.getMarketHours(token, {
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

				logger.debug('[getMarketHours] Successfully fetched market hours', {
					marketCount: Object.keys(hours).length,
				})

				return {
					content: [
						{
							type: 'text',
							text: 'Successfully fetched market hours:',
						},
						{ type: 'text', text: JSON.stringify(hours, null, 2) },
					],
				}
			},
		),
	)

	server.tool(
		'getMarketHoursByMarketId',
		{
			...GetMarketHoursByMarketIdRequestQueryParamsSchema.shape,
			...GetMarketHoursByMarketIdRequestPathParamsSchema.shape,
		},
		schwabTool(
			getAccessToken,
			GetMarketHoursByMarketIdSchema,
			async (
				token: string,
				{ market_id, date }: z.infer<typeof GetMarketHoursByMarketIdSchema>,
			) => {
				logger.info('[getMarketHoursByMarketId] Fetching market hours', {
					market_id,
					date,
				})

				const hours = await marketData.marketHours.getMarketHoursByMarketId(
					token,
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

				logger.debug(
					'[getMarketHoursByMarketId] Successfully fetched market hours',
					{
						market_id,
					},
				)

				return {
					content: [
						{
							type: 'text',
							text: `Successfully fetched market hours for ${market_id}:`,
						},
						{ type: 'text', text: JSON.stringify(hours, null, 2) },
					],
				}
			},
		),
	)
}
