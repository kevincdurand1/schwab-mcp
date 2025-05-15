import { invariant } from '@epic-web/invariant'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { marketData } from '@sudowealth/schwab-api'
import {
	GetMoversRequestPathParamsSchema,
	GetMoversRequestQueryParamsSchema,
} from '@sudowealth/schwab-api/schemas'

export function registerMoversTools(
	server: McpServer,
	getAccessToken: () => string | undefined,
) {
	server.tool(
		'getMovers',
		{
			...GetMoversRequestQueryParamsSchema.shape,
			...GetMoversRequestPathParamsSchema.shape,
		},
		async ({ symbolId, sort, frequency }) => {
			const accessToken = getAccessToken()
			invariant(accessToken, '[getMovers] Error: No access token.')

			try {
				console.log(
					`[getMovers] Fetching movers for symbol: ${symbolId} ${sort ? `sorted by: ${sort}` : ''} ${frequency !== undefined ? `with frequency: ${frequency}` : ''}`,
				)

				const movers = await marketData.movers.getMovers(accessToken, {
					pathParams: { symbolId },
					queryParams: { sort, frequency },
				})

				if (!movers || !movers.screeners || movers.screeners.length === 0) {
					return {
						content: [
							{
								type: 'text',
								text: `No movers found for symbol: ${symbolId}.`,
							},
						],
					}
				}

				return {
					content: [
						{
							type: 'text',
							text: `Successfully fetched movers for ${symbolId}:`,
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
							text: `An error occurred fetching movers for ${symbolId}: ${error.message}`,
						},
					],
				}
			}
		},
	)
}
