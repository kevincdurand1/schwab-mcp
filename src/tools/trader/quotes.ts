import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { marketData } from '@sudowealth/schwab-api'
import {
	GetQuoteBySymbolIdRequestPathParamsSchema,
	GetQuoteBySymbolIdRequestQueryParamsSchema,
	GetQuotesRequestQueryParamsSchema,
} from '@sudowealth/schwab-api/schemas'
import { z } from 'zod'
import { logger } from '../../shared/logger'
import { mergeShapes, schwabTool } from '../utils'

// Create combined schema for getQuoteBySymbolId
const GetQuoteBySymbolIdSchema = z.object(
	mergeShapes(
		GetQuoteBySymbolIdRequestPathParamsSchema.shape,
		GetQuoteBySymbolIdRequestQueryParamsSchema.shape,
	),
)

export function registerQuotesTools(
	server: McpServer,
	getAccessToken: () => Promise<string>,
) {
	server.tool(
		'getQuotes',
		GetQuotesRequestQueryParamsSchema.shape,
		schwabTool(
			getAccessToken,
			GetQuotesRequestQueryParamsSchema,
			async (token, { symbols, fields, indicative }) => {
				logger.info('[getQuotes] Fetching quotes', { symbols, fields })

				const quotesData = await marketData.quotes.getQuotes(token, {
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
			...GetQuoteBySymbolIdRequestPathParamsSchema.shape,
			...GetQuoteBySymbolIdRequestQueryParamsSchema.shape,
		},
		schwabTool(
			getAccessToken,
			GetQuoteBySymbolIdSchema,
			async (token, { symbol_id, fields }) => {
				logger.info('[getQuoteBySymbolId] Fetching quote', {
					symbol_id,
					fields,
				})

				const quoteData = await marketData.quotes.getQuoteBySymbolId(token, {
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
