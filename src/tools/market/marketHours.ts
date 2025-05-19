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
	createTool(client, server, {
		name: 'getMarketHours',
		schema: client.schemas.GetMarketHoursRequestQueryParamsSchema,
		handler: async (params, client) => {
			try {
				const { markets, date } = params

				logger.info('[getMarketHours] Fetching market hours', {
					markets: markets.join(','),
					date,
				})

				const hours = await client.marketData.marketHours.getMarketHours({
					queryParams: {
						markets,
						date: date ? new Date(date).toISOString() : undefined,
					},
				})

				if (Object.keys(hours).length === 0) {
					return toolSuccess(
						[],
						'No market hours found for the specified criteria.',
					)
				}

				logger.debug('[getMarketHours] Successfully fetched market hours', {
					marketCount: Object.keys(hours).length,
				})

				return toolSuccess(hours, 'Successfully fetched market hours')
			} catch (error) {
				logger.error('[getMarketHours] Error fetching market hours', {
					error,
				})
				return toolError(
					error instanceof Error
						? error
						: new Error('Unknown error fetching market hours'),
					{ source: 'getMarketHours' },
				)
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

				if (!hours) {
					return toolSuccess(
						[],
						`No market hours found for market ID: ${market_id} ${date ? `on date: ${date}` : ''}.`,
					)
				}

				logger.debug(
					'[getMarketHoursByMarketId] Successfully fetched market hours',
					{
						market_id,
					},
				)

				return toolSuccess(
					hours,
					`Successfully fetched market hours for ${market_id}`,
				)
			} catch (error) {
				const marketId = params.market_id
				logger.error('[getMarketHoursByMarketId] Error fetching market hours', {
					error,
					marketId,
				})
				return toolError(
					error instanceof Error
						? error
						: new Error('Unknown error fetching market hours'),
					{ source: 'getMarketHoursByMarketId', marketId },
				)
			}
		},
	})
}
