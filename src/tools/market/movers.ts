import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { z } from 'zod'
import { logger } from '../../shared/logger'
import { createTool, toolSuccess, toolError } from '../../shared/toolBuilder'
import { mergeShapes } from '../../shared/utils'

export function registerMoversTools(
	client: SchwabApiClient,
	server: McpServer,
) {
	createTool(client, server, {
		name: 'getMovers',
		schema: z.object(
			mergeShapes(
				client.schemas.GetMoversRequestQueryParamsSchema.shape,
				client.schemas.GetMoversRequestPathParamsSchema.shape,
			),
		),
		handler: async ({ symbol_id, sort, frequency }, client) => {
			try {
				logger.info('[getMovers] Fetching movers', {
					symbol_id,
					sort,
					frequency,
				})

				const movers = await client.marketData.movers.getMovers({
					pathParams: { symbol_id },
					queryParams: { sort, frequency },
				})

				if (!movers || !movers.screeners || movers.screeners.length === 0) {
					return toolSuccess(
						[],
						`No movers found for symbol: ${symbol_id}.`,
					)
				}

				logger.debug('[getMovers] Successfully fetched movers', {
					symbol: symbol_id,
					count: movers.screeners.length,
				})

				return toolSuccess(
					movers.screeners,
					`Successfully fetched movers for ${symbol_id}`,
				)
			} catch (error) {
				logger.error('[getMovers] Error fetching movers', {
					error,
					symbol_id,
				})
				return toolError(
					error instanceof Error
						? error
						: new Error('Unknown error fetching movers'),
					{ source: 'getMovers', symbol_id },
				)
			}
		},
	})
}