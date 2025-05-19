import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { z } from 'zod'
import { logger } from '../../shared/logger'
import { mergeShapes, schwabTool } from '../../shared/utils'

export function registerMarketHoursTools(
	server: McpServer,
	client: SchwabApiClient,
) {
	server.tool(
		'getMarketHours',
		client.schemas.GetMarketHoursRequestQueryParamsSchema.shape,
		async (args) =>
			await schwabTool(
				client,
				client.schemas.GetMarketHoursRequestQueryParamsSchema,
				async (params) => {
					const { markets, date } = params

					logger.info('[getMarketHours] Fetching market hours', {
						markets: markets.join(','),
						date,
					})

					return client.marketData.marketHours
						.getMarketHours({
							queryParams: {
								markets,
								date: date ? new Date(date).toISOString() : undefined,
							},
						})
						.then((hours) => {
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

							logger.debug(
								'[getMarketHours] Successfully fetched market hours',
								{
									marketCount: Object.keys(hours).length,
								},
							)

							return {
								content: [
									{
										type: 'text',
										text: 'Successfully fetched market hours:',
									},
									{ type: 'text', text: JSON.stringify(hours, null, 2) },
								],
							}
						})
				},
			)(args),
	)

	server.tool(
		'getMarketHoursByMarketId',
		{
			...client.schemas.GetMarketHoursByMarketIdRequestQueryParamsSchema.shape,
			...client.schemas.GetMarketHoursByMarketIdRequestPathParamsSchema.shape,
		},
		async (args, extra) =>
			await schwabTool(
				client,
				z.object(
					mergeShapes(
						client.schemas.GetMarketHoursByMarketIdRequestQueryParamsSchema
							.shape,
						client.schemas.GetMarketHoursByMarketIdRequestPathParamsSchema
							.shape,
					),
				),
				async (params) => {
					const { market_id, date } = params
					logger.info('[getMarketHoursByMarketId] Fetching market hours', {
						market_id,
						date,
					})

					const hours =
						await client.marketData.marketHours.getMarketHoursByMarketId({
							pathParams: { market_id },
							queryParams: { date },
						})

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
			)(args),
	)
}
