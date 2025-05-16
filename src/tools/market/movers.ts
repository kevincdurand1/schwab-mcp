import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { marketData } from '@sudowealth/schwab-api'
import {
	GetMoversRequestPathParamsSchema,
	GetMoversRequestQueryParamsSchema,
} from '@sudowealth/schwab-api/schemas'
import { z } from 'zod'
import { logger } from '../../shared/logger'
import { mergeShapes, schwabTool } from '../../shared/utils'

// Create a combined schema for the movers tool
const GetMoversSchema = z.object(
	mergeShapes(
		GetMoversRequestQueryParamsSchema.shape,
		GetMoversRequestPathParamsSchema.shape,
	),
)

export function registerMoversTools(
	server: McpServer,
	getAccessToken: () => Promise<string>,
) {
	server.tool(
		'getMovers',
		mergeShapes(
			GetMoversRequestQueryParamsSchema.shape,
			GetMoversRequestPathParamsSchema.shape,
		),
		schwabTool(
			getAccessToken,
			GetMoversSchema,
			async (token, { symbol_id, sort, frequency }) => {
				logger.info('[getMovers] Fetching movers', {
					symbol_id,
					sort,
					frequency,
				})

				const movers = await marketData.movers.getMovers(token, {
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
