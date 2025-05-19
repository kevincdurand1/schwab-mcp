import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { logger } from '../../shared/logger'
import { createTool, toolSuccess, toolError } from '../../shared/toolBuilder'

export function registerOrderTools(
	client: SchwabApiClient,
	server: McpServer
) {
	createTool(client, server, {
		name: 'getOrders',
		schema: client.schemas.GetOrdersRequestQueryParams,
		handler: async (queryParams, client) => {
			try {
				logger.info('[getOrders] Fetching orders', {
					maxResults: queryParams.maxResults,
					hasDateFilter:
						!!queryParams.fromEnteredTime || !!queryParams.toEnteredTime,
				})

				const orders = await client.trader.orders.getOrders({ queryParams })

				if (orders.length === 0) {
					return toolSuccess([], 'No Schwab orders found.')
				}

				logger.debug('[getOrders] Successfully fetched orders', {
					count: orders.length,
				})

				return toolSuccess(orders, 'Successfully fetched Schwab orders')
			} catch (error) {
				logger.error('[getOrders] Error fetching orders', { error })
				return toolError(
					error instanceof Error
						? error
						: new Error('Unknown error fetching orders'),
					{ source: 'getOrders' }
				)
			}
		},
	})
}