import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type SchwabApiClient } from '@sudowealth/schwab-api'
import { logger } from '../../shared/logger'
import { schwabTool } from '../../shared/utils'

export function registerOptionsTools(
	server: McpServer,
	client: SchwabApiClient,
) {
	server.tool(
		'getOptionChain',
		client.schemas.GetOptionChainRequestQueryParamsSchema.shape,
		schwabTool(
			client,
			client.schemas.GetOptionChainRequestQueryParamsSchema,
			async (params) => {
				logger.info('[getOptionChain] Fetching option chain', {
					symbol: params.symbol,
				})

				const optionChain = await client.marketData.options.getOptionChain({
					queryParams: {
						symbol: params.symbol,
					},
				})

				if (!optionChain || optionChain.status !== 'SUCCESS') {
					return {
						content: [
							{
								type: 'text',
								text: `Could not fetch option chain for ${params.symbol}. Status: ${optionChain?.status}`,
							},
						],
					}
				}

				logger.debug('[getOptionChain] Successfully fetched option chain', {
					symbol: params.symbol,
					status: optionChain.status,
				})

				return {
					content: [
						{
							type: 'text',
							text: `Successfully fetched option chain for ${params.symbol}:`,
						},
						{
							type: 'text',
							text: JSON.stringify(optionChain, null, 2),
						},
					],
				}
			},
		),
	)

	server.tool(
		'getOptionExpirationChain',
		client.schemas.GetOptionExpirationChainRequestQueryParamsSchema.shape,
		schwabTool(
			client,
			client.schemas.GetOptionExpirationChainRequestQueryParamsSchema,
			async (params) => {
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
					return {
						content: [
							{
								type: 'text',
								text: `Could not fetch option expiration chain for ${symbol}.`,
							},
						],
					}
				}

				logger.debug(
					'[getOptionExpirationChain] Successfully fetched expiration chain',
					{
						symbol,
					},
				)

				return {
					content: [
						{
							type: 'text',
							text: `Successfully fetched option expiration chain for ${symbol}:`,
						},
						{
							type: 'text',
							text: JSON.stringify(expirationChain, null, 2),
						},
					],
				}
			},
		),
	)
}
