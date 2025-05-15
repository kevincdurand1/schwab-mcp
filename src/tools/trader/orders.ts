import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { trader } from '@sudowealth/schwab-api'
import { GetOrdersRequestQueryParams } from '@sudowealth/schwab-api/schemas'
import { logger } from '../../shared/logger'
import { schwabTool } from '../utils'

export function registerOrderTools(
	server: McpServer,
	getAccessToken: () => Promise<string>,
) {
	server.tool(
		'getOrders',
			GetOrdersRequestQueryParams.shape,
			schwabTool(
				getAccessToken,
				GetOrdersRequestQueryParams,
				async (token, queryParams) => {
			logger.info('[getOrders] Fetching orders', { 
				maxResults: queryParams.maxResults,
				hasDateFilter: !!queryParams.fromEnteredTime || !!queryParams.toEnteredTime 
			})
			
			const orders = await trader.orders.getOrders(token, {
				queryParams
			})

			if (orders.length === 0) {
				return {
					content: [{ type: 'text', text: 'No Schwab orders found.' }],
				}
			}

			logger.debug('[getOrders] Successfully fetched orders', { count: orders.length })
			
			return {
				content: [
					{ type: 'text', text: 'Successfully fetched Schwab orders:' },
					{ type: 'text', text: JSON.stringify(orders, null, 2) },
				],
			}
		}),
	)
}
