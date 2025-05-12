import { z } from 'zod'
import { SecuritiesAccount, AccountNumberHash } from './schemas'
import { SchwabApiError } from '../lib/errors'
import { schwabFetch } from '../lib/schwabApi/http'
import { Props } from '../utils'

// --- Schemas for GET /accounts/accountNumbers ---
export const AccountNumbersResponseSchema = z.array(AccountNumberHash)
// No parameters schema needed as it takes no params.

// --- Schemas for GET /accounts ---
// Each item in the response array for GET /accounts is an "Account" object
// which contains a "securitiesAccount".
const Account = z.object({
  securitiesAccount: SecuritiesAccount,
})
export const AccountsResponseSchema = z.array(Account)
type AccountsResponseSchema = z.infer<typeof AccountsResponseSchema>

// --- Schemas for GET /accounts/{accountNumber} ---
// Response is wrapped in an Account object according to the spec image
export const SingleAccountResponseSchema = Account

// Parameter for GET /accounts/{accountNumber}
// Note: The actual {accountNumber} used here should be the hashValue
export const SingleAccountParamsSchema = z.object({
  accountNumber: z.string(), // This will be the hashValue
  fields: z.enum(['positions']).optional(), // Assuming this endpoint also accepts the 'fields' param
})

// Context type expected by the run function
// Adjust if McpAgent or the server provides a different context structure
type ToolContext = {
  props: Props
  [key: string]: any
}

// Parameters for GET /accounts (specific to this tool)
export const AccountsParamsSchema = z.object({
  fields: z.enum(['positions']).optional(),
})

// Schema for the raw API response for GET /accounts (before extracting securitiesAccount)
// This uses the imported SecuritiesAccount schema.
export const SchwabAccountsResponseSchema = z.array(
  z.object({
    securitiesAccount: SecuritiesAccount, // Use the imported schema
  }),
)
export type SchwabAccountsResponseSchema = z.infer<typeof SchwabAccountsResponseSchema>

export const getSchwabAccountsTool = {
  name: 'getSchwabAccounts',
  paramsSchema: AccountsParamsSchema, // Use the locally defined params schema
  run: async (args: z.infer<typeof AccountsParamsSchema>, context: ToolContext) => {
    console.log('[getSchwabAccountsTool run] Entered. Args:', JSON.stringify(args))

    // Debug context more thoroughly
    console.log('[getSchwabAccountsTool run] Context exists:', !!context)
    if (context) {
      console.log('[getSchwabAccountsTool run] Context keys:', Object.keys(context).join(', '))
      console.log('[getSchwabAccountsTool run] Context props exists:', !!context?.props)

      if (context.props) {
        console.log('[getSchwabAccountsTool run] Context props keys:', Object.keys(context.props).join(', '))
        console.log('[getSchwabAccountsTool run] Context props accessToken exists:', !!context?.props?.accessToken)
        if (context.props.accessToken) {
          // Log safely - only show the first few characters
          console.log('[getSchwabAccountsTool run] Access token (partial):', context.props.accessToken.substring(0, 10) + '...')
        }
      }
    }

    // The accessToken should come from the wrapper
    const accessToken = context.props?.accessToken

    // Add check for missing access token
    if (!accessToken) {
      console.error('[getSchwabAccountsTool] Access token is missing from context.props')
      return {
        isError: true,
        content: [{ type: 'text', text: 'Error: Authentication required - Access token missing in tool context.' }],
      }
    }

    try {
      // Get the accounts
      let data
      try {
        console.log('[getSchwabAccountsTool] Calling schwabFetch for /trader/v1/accounts...')
        console.log('[getSchwabAccountsTool] Using access token (first 10 chars):', accessToken.substring(0, 10))

        // Log request details
        console.log('[getSchwabAccountsTool] Request details:', {
          endpoint: '/trader/v1/accounts',
          method: 'GET',
          queryParams: args ? JSON.stringify(args) : 'none',
        })

        const response = await schwabFetch<AccountsResponseSchema>('/trader/v1/accounts', accessToken, {
          method: 'GET',
          queryParams: args,
        })

        console.log('[getSchwabAccountsTool] Schwab API responded with data, count:', response.length)

        // Map the data to extract securitiesAccount
        data = response.map((a) => a.securitiesAccount)
        console.log('[getSchwabAccountsTool] Successfully mapped account data, entries:', data.length)
      } catch (error: any) {
        console.error('[getSchwabAccountsTool] Error in schwabFetch:', error)

        // Add more specific debugging for network errors
        if (error instanceof TypeError) {
          if (error.message.includes('json')) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Error processing response: Invalid JSON format received from the Schwab API.' }],
            }
          }

          if (error.message.includes('network') || error.message.includes('fetch')) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Error: Network request failed. Please check your connection and try again.' }],
            }
          }
        }

        // Handle SchwabApiError specifically
        if (error instanceof SchwabApiError || error.name === 'SchwabApiError') {
          const apiError = error as SchwabApiError
          if (apiError.status === 401 || apiError.status === 403) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Authentication error: Your session may have expired. Please try authenticating again.' }],
            }
          }

          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Schwab API Error (${apiError.status}): ${apiError.message}. ${apiError.body ? `Details: ${JSON.stringify(apiError.body)}` : ''}`,
              },
            ],
          }
        }

        throw error // Re-throw to be caught by the outer catch block
      }

      if (!data || data.length === 0) {
        return { content: [{ type: 'text', text: 'No Schwab accounts found.' }] }
      }

      console.log('[getSchwabAccountsTool] Successfully mapped account data, returning response')

      // Format the successful response
      return {
        content: [
          { type: 'text', text: 'Successfully fetched Schwab accounts:' },
          { type: 'text', text: JSON.stringify(data, null, 2) }, // data is now SchwabAccount[]
        ],
      }
    } catch (error: unknown) {
      // Error handling for API call or data parsing remains here
      console.error('[getSchwabAccountsTool] Error fetching accounts:', error)
      if (error instanceof SchwabApiError) {
        if (error.status === 401 || error.status === 403) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Authentication error: Your session may have expired. Please try authenticating again.' }],
          }
        }

        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Schwab API Error (${error.status}): ${error.message}. ${error.body ? `Details: ${JSON.stringify(error.body)}` : ''}`,
            },
          ],
        }
      }

      // TypeErrors often indicate issues with response parsing
      if (error instanceof TypeError) {
        return {
          isError: true,
          content: [
            { type: 'text', text: `Data processing error: ${error.message}. This may indicate an issue with the API response format.` },
          ],
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
      return {
        isError: true,
        content: [{ type: 'text', text: `An unexpected error occurred: ${errorMessage}` }],
      }
    }
  },
} as const // Use 'as const' for stricter typing of the tool object
