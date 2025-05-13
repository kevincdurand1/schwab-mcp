import OAuthProvider from '@cloudflare/workers-oauth-provider'
// @ts-ignore
import { McpAgent } from 'agents/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { SchwabHandler } from './schwab-handler'
import { getAccounts, getOrders } from './lib/schwabApi/endpoints'

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
    // console.log('[MyMCP constructor] Initialized. Env:', env) // Removed for cleanup
    // Props are usually injected by the OAuthProvider wrapper after auth, not at initial construction.
    // We are trying to find where they become available.
  }

  async init() {
    this.server.tool('add', { a: z.number(), b: z.number() }, async ({ a, b }) => {
      // console.log('[MyMCP tool:add] this.props:', this.props); // Linter error: Property 'props' does not exist on type 'MyMCP'
      // We need to find the correct way to access props within a tool or request handler.
      // For now, we'll just perform the addition.
      // console.log('[MyMCP tool:add] Called with a:', a, 'b:', b); // Removed for cleanup
      return {
        content: [{ type: 'text', text: String(a + b) }],
      }
    })

    // const getSchwabAccountsInputSchema = z.object({}); // Not strictly needed if we pass {} directly

    this.server.tool(
      'getSchwabAccounts',
      {}, // Empty object for paramsSchemaOrAnnotations (no input args)
      async (_args: {}, context: any) => {
        // Access accessToken directly from the agent instance's props
        const accessToken = this.props?.accessToken

        if (!accessToken) {
          console.error('[MyMCP getSchwabAccounts] Error: Access token not available in this.props.')
          return {
            content: [{ type: 'text', text: 'Error: Access token not available. Authentication may be required.' }],
          }
        }

        try {
          console.log('[MyMCP getSchwabAccounts] Fetching accounts using schwabFetch')
          const accounts = await getAccounts(accessToken, {
            queryParams: { fields: 'positions' },
          })

          if (accounts.length === 0) {
            return { content: [{ type: 'text', text: 'No Schwab accounts found.' }] }
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
          console.error('[MyMCP getSchwabAccounts] Error with schwabFetch:', error)
          return {
            content: [{ type: 'text', text: `An error occurred fetching Schwab accounts: ${error.message}` }],
          }
        }
      },
    )

    // Added: Tool to get recent orders for an account
    this.server.tool(
      'getRecentOrders',
      { accountNumber: z.string() }, // Pass the raw shape, not the Zod object instance
      // Callback receives parsed args ({ accountNumber }) as the first param
      async ({ accountNumber }: { accountNumber: string }) => {
        const accessToken = this.props?.accessToken
        if (!accessToken) {
          return {
            content: [{ type: 'text', text: 'Error: Access token not available. Authentication may be required.' }],
          }
        }

        try {
          const orders = await getOrders(accessToken, {
            pathParams: { accountNumber },
            queryParams: { maxResults: 10 }, // Fetch latest 10
          })
          return { content: [{ type: 'text', text: JSON.stringify(orders, null, 2) }] }
        } catch (error: any) {
          console.error(`[MyMCP getRecentOrders] Error fetching orders for account ${accountNumber}:`, error)
          return {
            content: [{ type: 'text', text: `An error occurred fetching orders: ${error.message}` }],
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
