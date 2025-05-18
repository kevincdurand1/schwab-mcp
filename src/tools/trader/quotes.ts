import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { z } from 'zod'
import { logger } from '../../shared/logger'
import { mergeShapes, schwabTool } from '../../shared/utils'

export function registerQuotesTools(
	server: McpServer,
	client: SchwabApiClient,
) {
	server.tool(
		'getQuotes',
		client.schemas.GetQuotesRequestQueryParamsSchema.shape,
		schwabTool(
			client,
			client.schemas.GetQuotesRequestQueryParamsSchema,
			async ({ symbols, fields, indicative }) => {
				logger.info('[getQuotes] Fetching quotes', { symbols, fields })

				const quotesData = await client.marketData.quotes.getQuotes({
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

				logger.debug('[getQuotes] Successfully fetched quotes', {
					symbols,
					count: Object.keys(quotesData).length,
				})

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
			},
		),
	)

	server.tool(
		'getQuoteBySymbolId',
		{
			...client.schemas.GetQuoteBySymbolIdRequestPathParamsSchema.shape,
			...client.schemas.GetQuoteBySymbolIdRequestQueryParamsSchema.shape,
		},
		schwabTool(
			client,
			z.object(
				mergeShapes(
					client.schemas.GetQuoteBySymbolIdRequestPathParamsSchema.shape,
					client.schemas.GetQuoteBySymbolIdRequestQueryParamsSchema.shape,
				),
			),
			async ({ symbol_id, fields }) => {
				logger.info('[getQuoteBySymbolId] Fetching quote', {
					symbol_id,
					fields,
				})

				const quoteData = await client.marketData.quotes.getQuoteBySymbolId({
					pathParams: { symbol_id },
					queryParams: { fields },
				})
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

				logger.debug('[getQuoteBySymbolId] Successfully fetched quote', {
					symbol_id,
				})

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
			},
		),
	)
}
