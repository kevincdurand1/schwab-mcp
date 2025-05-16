import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { marketData } from '@sudowealth/schwab-api'
import {
	GetOptionChainRequestQueryParamsSchema,
	GetOptionExpirationChainRequestQueryParamsSchema,
} from '@sudowealth/schwab-api/schemas'
import { logger } from '../../shared/logger'
import { schwabTool } from '../../shared/utils'

export function registerOptionsTools(
	server: McpServer,
	getAccessToken: () => Promise<string>,
) {
	server.tool(
		'getOptionChain',
		GetOptionChainRequestQueryParamsSchema.shape,
		schwabTool(
			getAccessToken,
			GetOptionChainRequestQueryParamsSchema,
			async (token, params) => {
				logger.info('[getOptionChain] Fetching option chain', {
					symbol: params.symbol,
				})

				const optionChain = await marketData.options.getOptionChain(token, {
					queryParams: params,
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
		GetOptionExpirationChainRequestQueryParamsSchema.shape,
		schwabTool(
			getAccessToken,
			GetOptionExpirationChainRequestQueryParamsSchema,
			async (token, { symbol }) => {
				logger.info(
					'[getOptionExpirationChain] Fetching option expiration chain',
					{ symbol },
				)

				const expirationChain =
					await marketData.options.getOptionExpirationChain(token, {
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
