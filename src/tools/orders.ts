import { invariant } from '@epic-web/invariant'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { trader } from '@sudowealth/schwab-api'
import { GetOrdersRequestQueryParams } from '@sudowealth/schwab-api/schemas'

export function registerOrderTools(
	server: McpServer,
	getAccessToken: () => string | undefined,
) {
	server.tool(
		'getOrders',
		GetOrdersRequestQueryParams.shape,
		async ({ maxResults, fromEnteredTime, toEnteredTime, status }) => {
			const accessToken = getAccessToken()
			invariant(accessToken, '[getOrders] Error: No access token.')

			try {
				console.log('[getOrders] Fetching orders')
				const orders = await trader.orders.getOrders(accessToken, {
					queryParams: {
						maxResults,
						fromEnteredTime,
						toEnteredTime,
						status,
					},
				})

				if (orders.length === 0) {
					return {
						content: [{ type: 'text', text: 'No Schwab orders found.' }],
					}
				}

				return {
					content: [
						{ type: 'text', text: 'Successfully fetched Schwab orders:' },
						{ type: 'text', text: JSON.stringify(orders, null, 2) },
					],
				}
			} catch (error: any) {
				console.error('[getOrders] Error with schwabFetch:', error)
				return {
					content: [
						{
							type: 'text',
							text: `An error occurred fetching Schwab orders: ${error.message}`,
						},
					],
				}
			}
		},
	)
}
