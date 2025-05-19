import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { z } from 'zod'
import { logger } from '../../shared/logger'
import { createTool, toolSuccess, toolError } from '../../shared/toolBuilder'
import { mergeShapes } from '../../shared/utils'

export function registerQuotesTools(
	client: SchwabApiClient,
	server: McpServer,
) {
	createTool(client, server, {
		name: 'getQuotes',
		schema: client.schemas.GetQuotesRequestQueryParamsSchema,
		handler: async ({ symbols, fields, indicative }, client) => {
			try {
				logger.info('[getQuotes] Fetching quotes', { symbols, fields })

				const quotesData = await client.marketData.quotes.getQuotes({
					queryParams: { symbols, fields, indicative },
				})

				if (Object.keys(quotesData).length === 0) {
					return toolSuccess(
						[],
						`No quotes found for symbols: ${symbols}.`
					)
				}

				logger.debug('[getQuotes] Successfully fetched quotes', {
					symbols,
					count: Object.keys(quotesData).length,
				})

				return toolSuccess(
					quotesData,
					`Successfully fetched quotes for ${symbols}`
				)
			} catch (error) {
				logger.error('[getQuotes] Error fetching quotes', {
					error,
					symbols,
				})
				return toolError(
					error instanceof Error
						? error
						: new Error('Unknown error fetching quotes'),
					{ source: 'getQuotes', symbols }
				)
			}
		},
	})

	createTool(client, server, {
		name: 'getQuoteBySymbolId',
		schema: z.object(
			mergeShapes(
				client.schemas.GetQuoteBySymbolIdRequestPathParamsSchema.shape,
				client.schemas.GetQuoteBySymbolIdRequestQueryParamsSchema.shape,
			),
		),
		handler: async ({ symbol_id, fields }, client) => {
			try {
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
					return toolSuccess(
						{},
						`No quote found for symbol: ${symbol_id}.`
					)
				}

				logger.debug('[getQuoteBySymbolId] Successfully fetched quote', {
					symbol_id,
				})

				return toolSuccess(
					quoteData[symbol_id.toUpperCase()],
					`Successfully fetched quote for ${symbol_id}`
				)
			} catch (error) {
				logger.error('[getQuoteBySymbolId] Error fetching quote', {
					error,
					symbol_id,
				})
				return toolError(
					error instanceof Error
						? error
						: new Error('Unknown error fetching quote'),
					{ source: 'getQuoteBySymbolId', symbol_id }
				)
			}
		},
	})
}