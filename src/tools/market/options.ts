import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { logger } from '../../shared/logger'
import { createTool, toolSuccess, toolError } from '../../shared/toolBuilder'

export function registerOptionsTools(
	client: SchwabApiClient,
	server: McpServer,
) {
	createTool(client, server, {
		name: 'getOptionChain',
		schema: client.schemas.GetOptionChainRequestQueryParamsSchema,
		handler: async (params, client) => {
			try {
				logger.info('[getOptionChain] Fetching option chain', {
					symbol: params.symbol,
				})

				const optionChain = await client.marketData.options.getOptionChain({
					queryParams: {
						symbol: params.symbol,
					},
				})

				if (!optionChain || optionChain.status !== 'SUCCESS') {
					return toolError(
						`Could not fetch option chain for ${params.symbol}. Status: ${optionChain?.status}`,
						{ symbol: params.symbol }
					)
				}

				logger.debug('[getOptionChain] Successfully fetched option chain', {
					symbol: params.symbol,
					status: optionChain.status,
				})

				return toolSuccess(
					optionChain,
					`Successfully fetched option chain for ${params.symbol}`
				)
			} catch (error) {
				logger.error('[getOptionChain] Error fetching option chain', {
					error,
					symbol: params.symbol,
				})
				return toolError(
					error instanceof Error
						? error
						: new Error('Unknown error fetching option chain'),
					{ source: 'getOptionChain', symbol: params.symbol }
				)
			}
		},
	})

	createTool(client, server, {
		name: 'getOptionExpirationChain',
		schema: client.schemas.GetOptionExpirationChainRequestQueryParamsSchema,
		handler: async (params, client) => {
			try {
				const { symbol } = params
				logger.info(
					'[getOptionExpirationChain] Fetching option expiration chain',
					{ symbol },
				)

				const expirationChain =
					await client.marketData.options.getOptionExpirationChain({
						queryParams: { symbol },
					})

				if (!expirationChain) {
					return toolError(
						`Could not fetch option expiration chain for ${symbol}.`,
						{ symbol }
					)
				}

				logger.debug(
					'[getOptionExpirationChain] Successfully fetched expiration chain',
					{
						symbol,
					},
				)

				return toolSuccess(
					expirationChain,
					`Successfully fetched option expiration chain for ${symbol}`
				)
			} catch (error) {
				logger.error(
					'[getOptionExpirationChain] Error fetching expiration chain',
					{ error, symbol: params.symbol }
				)
				return toolError(
					error instanceof Error
						? error
						: new Error('Unknown error fetching option expiration chain'),
					{ source: 'getOptionExpirationChain', symbol: params.symbol }
				)
			}
		},
	})
}