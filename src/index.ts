import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { trader } from '@sudowealth/schwab-api'
// @ts-ignore
import { McpAgent } from 'agents/mcp'
import { z } from 'zod'
import { SchwabHandler } from './schwab-handler'

// Context from the auth process, encrypted & stored in the auth token
// and provided to the MyMCP as this.props
type Props = {
	name: string
	email: string
	accessToken: string
}

export class MyMCP extends McpAgent<Props, Env> {
	public props!: Props // Declare props to satisfy TypeScript

	server = new McpServer({
		name: 'Schwab OAuth Proxy Demo',
		version: '0.0.1',
	})

	constructor(state: DurableObjectState, env: Env) {
		super(state, env)
		// console.log('[constructor] Initialized. Env:', env) // Removed for cleanup
		// Props are usually injected by the OAuthProvider wrapper after auth, not at initial construction.
		// We are trying to find where they become available.
	}

	async init() {
		this.server.tool(
			'add',
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => {
				// console.log('[tool:add] this.props:', this.props); // Linter error: Property 'props' does not exist on type 'MyMCP'
				// We need to find the correct way to access props within a tool or request handler.
				// For now, we'll just perform the addition.
				// console.log('[tool:add] Called with a:', a, 'b:', b); // Removed for cleanup
				return {
					content: [{ type: 'text', text: String(a + b) }],
				}
			},
		)

		// const getSchwabAccountsInputSchema = z.object({}); // Not strictly needed if we pass {} directly

		this.server.tool(
			'getAccounts',
			{}, // Empty object for paramsSchemaOrAnnotations (no input args)
			async (_args: {}, context: any) => {
				// Access accessToken directly from the agent instance's props
				const accessToken = this.props?.accessToken

				if (!accessToken) {
					console.error(
						'[getSchwabAccounts] Error: Access token not available in this.props.',
					)
					return {
						content: [
							{
								type: 'text',
								text: 'Error: Access token not available. Authentication may be required.',
							},
						],
					}
				}

				try {
					console.log('[getAccounts] Fetching accounts')
					const accounts = await trader.accounts.getAccounts(accessToken, {
						queryParams: { fields: 'positions' },
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
							// Stringify JSON data and return as text, based on SDK examples
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

		this.server.tool(
			'getAccountNumbers',
			{}, // Empty object for paramsSchemaOrAnnotations (no input args)
			async (_args: {}, context: any) => {
				// Access accessToken directly from the agent instance's props
				const accessToken = this.props?.accessToken

				if (!accessToken) {
					console.error(
						'[getAccountNumbers] Error: Access token not available in this.props.',
					)
					return {
						content: [
							{
								type: 'text',
								text: 'Error: Access token not available. Authentication may be required.',
							},
						],
					}
				}

				try {
					console.log('[getAccountNumbers] Fetching accounts')
					const accounts = await trader.accounts.getAccountNumbers(accessToken)

					if (accounts.length === 0) {
						return {
							content: [{ type: 'text', text: 'No Schwab accounts found.' }],
						}
					}

					return {
						content: [
							{ type: 'text', text: 'Successfully fetched Schwab accounts:' },
							// Stringify JSON data and return as text, based on SDK examples
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
			},
		)

		this.server.tool(
			'getOrders',
			{}, // Empty object for paramsSchemaOrAnnotations (no input args)
			async (_args: {}, context: any) => {
				// Access accessToken directly from the agent instance's props
				const accessToken = this.props?.accessToken

				if (!accessToken) {
					console.error(
						'[getOrders] Error: Access token not available in this.props.',
					)
					return {
						content: [
							{
								type: 'text',
								text: 'Error: Access token not available. Authentication may be required.',
							},
						],
					}
				}

				try {
					console.log('[getOrders] Fetching orders')

					// Calculate dynamic date range
					const toDate = new Date()
					const fromDate = new Date()
					fromDate.setDate(toDate.getDate() - 60) // Example: last 60 days
					const formatAsISO = (date: Date) => date.toISOString()

					const orders = await trader.orders.getOrders(accessToken, {
						queryParams: {
							fromEnteredTime: formatAsISO(fromDate),
							toEnteredTime: formatAsISO(toDate),
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
							// Stringify JSON data and return as text, based on SDK examples
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
			'getSchwabTransactions',
			{}, // Empty object for paramsSchemaOrAnnotations (no input args)
			async (_args: {}, context: any) => {
				// Access accessToken directly from the agent instance's props
				const accessToken = this.props?.accessToken

				if (!accessToken) {
					console.error(
						'[getSchwabTransactions] Error: Access token not available in this.props.',
					)
					return {
						content: [
							{
								type: 'text',
								text: 'Error: Access token not available. Authentication may be required.',
							},
						],
					}
				}

				try {
					console.log('[getSchwabAccounts] Fetching accounts')
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
