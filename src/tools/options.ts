import { invariant } from '@epic-web/invariant'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { marketData } from '@sudowealth/schwab-api'
import {
	GetOptionChainRequestQueryParamsSchema,
	GetOptionExpirationChainRequestQueryParamsSchema,
} from '@sudowealth/schwab-api/schemas'

export function registerOptionsTools(
	server: McpServer,
	getAccessToken: () => Promise<string>,
) {
	server.tool(
		'getOptionChain',
		GetOptionChainRequestQueryParamsSchema.shape,
		async (params) => {
			const accessToken = await getAccessToken()
			invariant(accessToken, '[getOptionChain] Error: No access token.')

			try {
				console.log(
					`[getOptionChain] Fetching option chain for symbol: ${params.symbol}`,
				)
				const optionChain = await marketData.options.getOptionChain(
					accessToken,
					{ queryParams: params },
				)

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
			} catch (error: any) {
				console.error('[getOptionChain] Error with Schwab API:', error)
				return {
					content: [
						{
							type: 'text',
							text: `An error occurred fetching option chain for ${params.symbol}: ${error.message}`,
						},
					],
				}
			}
		},
	)

	server.tool(
		'getOptionExpirationChain',
		GetOptionExpirationChainRequestQueryParamsSchema.shape,
		async ({ symbol }) => {
			const accessToken = await getAccessToken()
			invariant(
				accessToken,
				'[getOptionExpirationChain] Error: No access token.',
			)

			try {
				console.log(
					`[getOptionExpirationChain] Fetching option expiration chain for symbol: ${symbol}`,
				)
				const expirationChain =
					await marketData.options.getOptionExpirationChain(accessToken, {
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
			} catch (error: any) {
				console.error(
					'[getOptionExpirationChain] Error with Schwab API:',
					error,
				)
				return {
					content: [
						{
							type: 'text',
							text: `An error occurred fetching option expiration chain for ${symbol}: ${error.message}`,
						},
					],
				}
			}
		},
	)
}
