import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { logger } from '../../shared/logger'
import { createTool, toolSuccess, toolError } from '../../shared/toolBuilder'

export function registerInstrumentTools(
	client: SchwabApiClient,
	server: McpServer,
) {
	createTool(client, server, {
		name: 'searchInstruments',
		schema: client.schemas.GetInstrumentsRequestQueryParamsSchema,
		handler: async ({ symbol, projection }, client) => {
			try {
				logger.info('[searchInstruments] Fetching instruments', {
					symbol,
					projection,
				})

				const instruments = await client.marketData.instruments.getInstruments({
					queryParams: { symbol, projection },
				})

				if (
					!instruments ||
					(Array.isArray(instruments) && instruments.length === 0)
				) {
					return toolSuccess(
						[],
						`No instruments found for symbol: ${symbol} with projection: ${projection}.`,
					)
				}

				const instrumentCount = Array.isArray(instruments)
					? instruments.length
					: 1
				logger.debug('[searchInstruments] Successfully fetched instruments', {
					symbol,
					count: instrumentCount,
				})

				return toolSuccess(
					instruments,
					`Successfully fetched instruments for symbol: ${symbol}`,
				)
			} catch (error) {
				logger.error('[searchInstruments] Error fetching instruments', {
					error,
					symbol,
					projection,
				})

				return toolError(
					error instanceof Error
						? error
						: new Error('Unknown error fetching instruments'),
					{ source: 'searchInstruments', symbol, projection },
				)
			}
		},
	})
}
