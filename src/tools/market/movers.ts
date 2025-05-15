import { invariant } from '@epic-web/invariant'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { marketData } from '@sudowealth/schwab-api'
import {
	GetMoversRequestPathParamsSchema,
	GetMoversRequestQueryParamsSchema,
} from '@sudowealth/schwab-api/schemas'

export function registerMoversTools(
	server: McpServer,
	getAccessToken: () => Promise<string>,
) {
	server.tool(
		'getMovers',
		{
			...GetMoversRequestQueryParamsSchema.shape,
			...GetMoversRequestPathParamsSchema.shape,
		},
		async ({ symbol_id, sort, frequency }) => {
			const accessToken = await getAccessToken()
			invariant(accessToken, '[getMovers] Error: No access token.')

			try {
				console.log(
					`[getMovers] Fetching movers for symbol: ${symbol_id} ${sort ? `sorted by: ${sort}` : ''} ${frequency !== undefined ? `with frequency: ${frequency}` : ''}`,
				)

				const movers = await marketData.movers.getMovers(accessToken, {
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
			} catch (error: any) {
				console.error('[getMovers] Error with Schwab API:', error)
				return {
					content: [
						{
							type: 'text',
							text: `An error occurred fetching movers for ${symbol_id}: ${error.message}`,
						},
					],
				}
			}
		},
	)
}
