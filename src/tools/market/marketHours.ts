import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { z } from 'zod'
import { logger } from '../../shared/logger'
import { createTool, toolSuccess, toolError } from '../../shared/toolBuilder'
import { mergeShapes } from '../../shared/utils'

export function registerMarketHoursTools(
	client: SchwabApiClient,
	server: McpServer,
) {
	const name = 'getMarketHours'
	createTool(client, server, {
		name,
		schema: client.schemas.GetMarketHoursRequestQueryParamsSchema,
		handler: async (params, client) => {
			try {
				const { markets, date } = params

				logger.info(`[${name}] Fetching market hours`, params)

				const hours = await client.marketData.marketHours.getMarketHours({
					queryParams: {
						markets,
						date: date ? new Date(date).toISOString() : undefined,
					},
				})

				return toolSuccess({
					data: hours,
					message:
						Object.keys(hours).length === 0
							? 'No market hours found for the specified criteria.'
							: 'Successfully fetched market hours',
					source: 'getMarketHours',
				})
			} catch (error) {
				return toolError(error, { source: 'getMarketHours' })
			}
		},
	})

	createTool(client, server, {
		name: 'getMarketHoursByMarketId',
		schema: z.object(
			mergeShapes(
				client.schemas.GetMarketHoursByMarketIdRequestQueryParamsSchema.shape,
				client.schemas.GetMarketHoursByMarketIdRequestPathParamsSchema.shape,
			),
		),
		handler: async (params, client) => {
			try {
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

				return toolSuccess({
					data: hours,
					message: hours
						? `Successfully fetched market hours for ${market_id}`
						: `No market hours found for market ID: ${market_id}`,
					source: 'getMarketHoursByMarketId',
				})
			} catch (error) {
				return toolError(error, {
					source: 'getMarketHoursByMarketId',
					marketId: params.market_id,
				})
			}
		},
	})
}
