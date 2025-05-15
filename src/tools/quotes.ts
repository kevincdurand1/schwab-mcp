import { invariant } from '@epic-web/invariant'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { marketData } from '@sudowealth/schwab-api'
import {
	GetQuoteBySymbolIdRequestPathParamsSchema,
	GetQuoteBySymbolIdRequestQueryParamsSchema,
	GetQuotesRequestQueryParamsSchema,
} from '@sudowealth/schwab-api/schemas'

export function registerQuotesTools(
	server: McpServer,
	getAccessToken: () => string | undefined,
) {
	server.tool(
		'getQuotes',
		GetQuotesRequestQueryParamsSchema.shape,
		async ({ symbols, fields, indicative }) => {
			const accessToken = getAccessToken()
			invariant(accessToken, '[getQuotes] Error: No access token.')

			try {
				console.log(
					`[getQuotes] Fetching quotes for symbols: ${symbols} with fields: ${fields}`,
				)
				const quotesData = await marketData.quotes.getQuotes(accessToken, {
					queryParams: { symbols, fields, indicative },
				})

				if (Object.keys(quotesData).length === 0) {
					return {
						content: [
							{
								type: 'text',
								text: `No quotes found for symbols: ${symbols}.`,
							},
						],
					}
				}

				return {
					content: [
						{
							type: 'text',
							text: `Successfully fetched quotes for ${symbols}:`,
						},
						{
							type: 'text',
							text: JSON.stringify(quotesData, null, 2),
						},
					],
				}
			} catch (error: any) {
				console.error('[getQuotes] Error with Schwab API:', error)
				return {
					content: [
						{
							type: 'text',
							text: `An error occurred fetching quotes for ${symbols}: ${error.message}`,
						},
					],
				}
			}
		},
	)

	server.tool(
		'getQuoteBySymbolId',
		{
			...GetQuoteBySymbolIdRequestPathParamsSchema.shape,
			...GetQuoteBySymbolIdRequestQueryParamsSchema.shape,
		},
		async ({ symbol_id, fields }) => {
			const accessToken = getAccessToken()
			invariant(accessToken, '[getQuoteBySymbolId] Error: No access token.')

			try {
				console.log(
					`[getQuoteBySymbolId] Fetching quote for symbol: ${symbol_id} with fields: ${fields}`,
				)
				const quoteData = await marketData.quotes.getQuoteBySymbolId(
					accessToken,
					{
						pathParams: { symbol_id },
						queryParams: { fields },
					},
				)
				// The response for a single symbol is also a map { symbol: quoteDetails }
				if (
					!quoteData ||
					Object.keys(quoteData).length === 0 ||
					!quoteData[symbol_id.toUpperCase()]
				) {
					return {
						content: [
							{
								type: 'text',
								text: `No quote found for symbol: ${symbol_id}.`,
							},
						],
					}
				}

				return {
					content: [
						{
							type: 'text',
							text: `Successfully fetched quote for ${symbol_id}:`,
						},
						{
							type: 'text',
							text: JSON.stringify(quoteData[symbol_id.toUpperCase()], null, 2),
						},
					],
				}
			} catch (error: any) {
				console.error('[getQuoteBySymbolId] Error with Schwab API:', error)
				return {
					content: [
						{
							type: 'text',
							text: `An error occurred fetching quote for ${symbol_id}: ${error.message}`,
						},
					],
				}
			}
		},
	)
}
