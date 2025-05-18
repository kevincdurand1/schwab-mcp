import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { z } from 'zod'
import { logger } from '../../shared/logger'
import { mergeShapes, schwabTool } from '../../shared/utils'

export function registerMoversTools(
	server: McpServer,
	client: SchwabApiClient,
) {
	server.tool(
		'getMovers',
		mergeShapes(
			client.schemas.GetMoversRequestQueryParamsSchema.shape,
			client.schemas.GetMoversRequestPathParamsSchema.shape,
		),
		schwabTool(
			client,
			z.object(
				mergeShapes(
					client.schemas.GetMoversRequestQueryParamsSchema.shape,
					client.schemas.GetMoversRequestPathParamsSchema.shape,
				),
			),
			async ({ symbol_id, sort, frequency }) => {
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
					return {
						content: [
							{
								type: 'text',
								text: `No movers found for symbol: ${symbol_id}.`,
							},
						],
					}
				}

				logger.debug('[getMovers] Successfully fetched movers', {
					symbol: symbol_id,
					count: movers.screeners.length,
				})

				return {
					content: [
						{
							type: 'text',
							text: `Successfully fetched movers for ${symbol_id}:`,
						},
						{
							type: 'text',
							text: JSON.stringify(movers.screeners, null, 2),
						},
					],
				}
			},
		),
	)
}
