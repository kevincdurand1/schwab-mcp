import OAuthProvider from '@cloudflare/workers-oauth-provider'
// @ts-ignore
import { McpAgent } from 'agents/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { SchwabHandler } from './schwab-handler'

// Context from the auth process, encrypted & stored in the auth token
// and provided to the MyMCP as this.props
type Props = {
  name: string
  email: string
  accessToken: string
}

// Zod schema for an individual position (simplified)
const SchwabPositionSchema = z.object({
  shortQuantity: z.number().optional(),
  averagePrice: z.number().optional(),
  currentDayProfitLoss: z.number().optional(),
  longQuantity: z.number().optional(),
  instrument: z
    .object({
      cusip: z.string().optional(),
      symbol: z.string().optional(),
      description: z.string().optional(),
      instrumentId: z.number().optional(),
      type: z.string().optional(),
    })
    .optional(),
  marketValue: z.number().optional(),
})

// Zod schema for balances (simplified, focusing on a few key fields)
const SchwabBalancesSchema = z.object({
  availableFunds: z.number().optional(),
  buyingPower: z.number().optional(),
  cashBalance: z.number().optional(), // from initialBalances
  accountValue: z.number().optional(), // from initialBalances
  equity: z.number().optional(),
  liquidationValue: z.number().optional(), // from initialBalances
})

// Zod schema for a single securities account
const SchwabSecuritiesAccountSchema = z.object({
  accountNumber: z.string(),
  isDayTrader: z.boolean().optional(),
  isClosingOnlyRestricted: z.boolean().optional(),
  positions: z.array(SchwabPositionSchema).optional(),
  initialBalances: SchwabBalancesSchema.optional(),
  currentBalances: SchwabBalancesSchema.optional(),
  projectedBalances: SchwabBalancesSchema.optional(),
})

// Zod schema for the array of accounts
const SchwabAccountsResponseSchema = z.array(
  z.object({
    securitiesAccount: SchwabSecuritiesAccountSchema,
  }),
)

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

        const schwabAccountsUrl = 'https://api.schwabapi.com/trader/v1/accounts?fields=positions'
        // Optional: add fields parameter e.g. ?fields=positions
        // const schwabAccountsUrl = 'https://api.schwabapi.com/trader/v1/accounts?fields=positions';

        try {
          console.log(`[MyMCP getSchwabAccounts] Fetching accounts from ${schwabAccountsUrl}`)
          const response = await fetch(schwabAccountsUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`[MyMCP getSchwabAccounts] Error fetching accounts: ${response.status} ${response.statusText} - ${errorText}`)
            return {
              content: [
                {
                  type: 'text',
                  text: `Error fetching Schwab accounts: ${response.status} ${response.statusText}. Details: ${errorText}`,
                },
              ],
            }
          }

          const rawData = await response.json()
          console.log('[MyMCP getSchwabAccounts] Raw accounts data:', JSON.stringify(rawData, null, 2))

          // Validate with Zod
          const parsedData = SchwabAccountsResponseSchema.safeParse(rawData)

          if (!parsedData.success) {
            console.error('[MyMCP getSchwabAccounts] Failed to parse Schwab accounts data:', parsedData.error)
            return {
              content: [
                {
                  type: 'text',
                  text: `Error parsing Schwab accounts data. ${parsedData.error.toString()}`,
                },
              ],
            }
          }

          const accounts = parsedData.data

          if (accounts.length === 0) {
            return { content: [{ type: 'text', text: 'No Schwab accounts found.' }] }
          }

          // Format the output
          const accountSummaries = accounts.map((acc) => ({
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
          console.error('[MyMCP getSchwabAccounts] Unexpected error:', error)
          return {
            content: [{ type: 'text', text: `An unexpected error occurred: ${error.message}` }],
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
