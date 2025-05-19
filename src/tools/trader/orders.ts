import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { logger } from '../../shared/logger'
import { schwabTool } from '../../shared/utils'

export function registerOrderTools(server: McpServer, client: SchwabApiClient) {
	server.tool(
		'getOrders',
		client.schemas.GetOrdersRequestQueryParams.shape,
		async (args) =>
			await schwabTool(
				client,
				client.schemas.GetOrdersRequestQueryParams,
				async (queryParams) => {
					logger.info('[getOrders] Fetching orders', {
						maxResults: queryParams.maxResults,
						hasDateFilter:
							!!queryParams.fromEnteredTime || !!queryParams.toEnteredTime,
					})

					const orders = await client.trader.orders.getOrders({ queryParams })

					if (orders.length === 0) {
						return {
							content: [{ type: 'text', text: 'No Schwab orders found.' }],
						}
					}

					logger.debug('[getOrders] Successfully fetched orders', {
						count: orders.length,
					})

					return {
						content: [
							{ type: 'text', text: 'Successfully fetched Schwab orders:' },
							{ type: 'text', text: JSON.stringify(orders, null, 2) },
						],
					}
				},
			)(args),
	)
}
