import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { invariant } from '@epic-web/invariant'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { trader } from '@sudowealth/schwab-api'
import { OrdersQuerySchema } from '@sudowealth/schwab-api/schemas'
import { DurableMCP } from 'workers-mcp'
import { z } from 'zod'
import { SchwabHandler } from './schwab-handler'

type Props = {
	name: string
	email: string
	accessToken: string
}

export class MyMCP extends DurableMCP<Props, Env> {
	server = new McpServer({
		name: 'Schwab MCP',
		version: '0.0.1',
	})

	async init() {
		this.server.tool(
			'getAccounts',
			{ showPositions: z.boolean().default(false) },
			async ({ showPositions }) => {
				const accessToken = this.props.accessToken
				invariant(accessToken, '[getAccounts] Error: No access token.')

				try {
					console.log('[getAccounts] Fetching accounts')
					const accounts = await trader.accounts.getAccounts(accessToken, {
						queryParams: { fields: showPositions ? 'positions' : undefined },
					})

					if (accounts.length === 0) {
						return {
							content: [{ type: 'text', text: 'No Schwab accounts found.' }],
						}
					}

					// Format the output
					const accountSummaries = accounts.map((acc: any) => ({
						...acc.securitiesAccount,
					}))

					return {
						content: [
							{ type: 'text', text: 'Successfully fetched Schwab accounts:' },
							{ type: 'text', text: JSON.stringify(accountSummaries, null, 2) },
						],
					}
				} catch (error: any) {
					console.error('[getAccounts] Error with schwabFetch:', error)
					return {
						content: [
							{
								type: 'text',
								text: `An error occurred fetching Schwab accounts: ${error.message}`,
							},
						],
					}
				}
			},
		)

		this.server.tool('getAccountNumbers', {}, async (_args: {}) => {
			const accessToken = this.props.accessToken
			invariant(accessToken, '[getAccountNumbers] Error: No access token.')

			try {
				const accounts = await trader.accounts.getAccountNumbers(accessToken)
				if (accounts.length === 0) {
					return {
						content: [{ type: 'text', text: 'No Schwab accounts found.' }],
					}
				}

				return {
					content: [
						{ type: 'text', text: 'Successfully fetched Schwab accounts:' },
						{ type: 'text', text: JSON.stringify(accounts, null, 2) },
					],
				}
			} catch (error: any) {
				console.error('[getAccountNumbers] Error with schwabFetch:', error)
				return {
					content: [
						{
							type: 'text',
							text: `An error occurred fetching Schwab accounts: ${error.message}`,
						},
					],
				}
			}
		})

		this.server.tool(
			'getOrders',
			OrdersQuerySchema.shape,
			async ({ maxResults, fromEnteredTime, toEnteredTime, status }) => {
				const accessToken = this.props.accessToken
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

		this.server.tool(
			'getTransactions',
			{}, // Empty object for paramsSchemaOrAnnotations (no input args)
			async (_args: {}, context: any) => {
				const accessToken = this.props.accessToken
				invariant(accessToken, '[getTransactions] Error: No access token.')

				try {
					console.log('[getTransactions] Fetching accounts')
					const transactions =
						await trader.transactions.getTransactions(accessToken)

					if (transactions.length === 0) {
						return {
							content: [
								{ type: 'text', text: 'No Schwab transactions found.' },
							],
						}
					}

					// Format the output
					const transactionSummaries = transactions.map((trans: any) => ({
						...trans,
					}))

					return {
						content: [
							{
								type: 'text',
								text: 'Successfully fetched Schwab transactions:',
							},
							// Stringify JSON data and return as text, based on SDK examples
							{
								type: 'text',
								text: JSON.stringify(transactionSummaries, null, 2),
							},
						],
					}
				} catch (error: any) {
					console.error('[getSchwabAccounts] Error with schwabFetch:', error)
					return {
						content: [
							{
								type: 'text',
								text: `An error occurred fetching Schwab accounts: ${error.message}`,
							},
						],
					}
				}
			},
		)
	}
}

export default new OAuthProvider({
	apiRoute: '/sse',
	// @ts-ignore
	apiHandler: MyMCP.mount('/sse') as any,
	defaultHandler: SchwabHandler as any,
	authorizeEndpoint: '/authorize',
	tokenEndpoint: '/token',
	clientRegistrationEndpoint: '/register',
})
