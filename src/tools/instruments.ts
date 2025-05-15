import { invariant } from '@epic-web/invariant'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { marketData } from '@sudowealth/schwab-api'
import { GetInstrumentsRequestQueryParamsSchema } from '@sudowealth/schwab-api/schemas'

export function registerInstrumentTools(
	server: McpServer,
	getAccessToken: () => string | undefined,
) {
	server.tool(
		'searchInstruments',
		GetInstrumentsRequestQueryParamsSchema.shape,
		async ({ symbol, projection }) => {
			const accessToken = getAccessToken()
			invariant(accessToken, '[searchInstruments] Error: No access token.')

			try {
				console.log(
					`[searchInstruments] Fetching instrument for symbol: ${symbol} with projection: ${projection}`,
				)
				const instruments = await marketData.instruments.getInstruments(
					accessToken,
					{
						queryParams: { symbol, projection },
					},
				)

				if (
					!instruments ||
					(Array.isArray(instruments) && instruments.length === 0)
				) {
					return {
						content: [
							{
								type: 'text',
								text: `No instruments found for symbol: ${symbol} with projection: ${projection}.`,
							},
						],
					}
				}

				return {
					content: [
						{
							type: 'text',
							text: `Successfully fetched instruments for symbol: ${symbol}:`,
						},
						{ type: 'text', text: JSON.stringify(instruments, null, 2) },
					],
				}
			} catch (error: any) {
				console.error('[searchInstruments] Error with Schwab API:', error)
				return {
					content: [
						{
							type: 'text',
							text: `An error occurred fetching instruments: ${error.message}`,
						},
					],
				}
			}
		},
	)
}
