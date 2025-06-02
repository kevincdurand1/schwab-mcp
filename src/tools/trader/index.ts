import {
	buildAccountDisplayMap,
	scrubAccountIdentifiers,
	GetAccountByNumberParams,
	GetAccountNumbersParams,
	GetOrdersParams,
	GetAccountsParams,
	GetOrdersByAccountParams,
	PlaceOrderParams,
	GetOrderByIdParams,
	CancelOrderParams,
	ReplaceOrderParams,
	GetTransactionsParams,
	GetTransactionByIdParams,
	GetUserPreferenceParams,
} from '@sudowealth/schwab-api'
import { logger } from '../../shared/log'
import { createToolSpec } from '../types'

export const toolSpecs = [
	createToolSpec({
		name: 'getAccounts',
		description: 'Get accounts',
		schema: GetAccountsParams,
		call: async (c, p) => {
			logger.info('[getAccounts] Fetching accounts', {
				showPositions: p?.fields,
			})
			const accounts = await c.trader.accounts.getAccounts({
				queryParams: { fields: p?.fields },
			})
			const accountSummaries = accounts.map((acc) => ({
				...acc.securitiesAccount,
			}))
			const displayMap = await buildAccountDisplayMap(c)
			return scrubAccountIdentifiers(accountSummaries, displayMap)
		},
	}),
	createToolSpec({
		name: 'getAccountNumbers',
		description: 'Get account numbers',
		schema: GetAccountNumbersParams,
		call: async (c, p) => {
			logger.info('[getAccountNumbers] Fetching account numbers')
			const accounts = await c.trader.accounts.getAccountNumbers(p)
			const displayMap = await buildAccountDisplayMap(c)
			return accounts.map((acc) => {
				return {
					accountDisplay: displayMap[acc.accountNumber],
					hashValue: acc.hashValue,
				}
			})
		},
	}),
	createToolSpec({
		name: 'getAccount',
		description: 'Get account',
		schema: GetAccountByNumberParams,
		call: async (c, p) => {
			const account = await c.trader.accounts.getAccountByNumber({
				pathParams: { accountNumber: p.accountNumber },
			})
			const displayMap = await buildAccountDisplayMap(c)
			return scrubAccountIdentifiers(account, displayMap)
		},
	}),
	createToolSpec({
		name: 'getOrders',
		description: 'Get orders',
		schema: GetOrdersParams,
		call: async (c, p) => {
			logger.info('[getOrders] Fetching orders', {
				maxResults: p.maxResults,
				hasDateFilter: !!p.fromEnteredTime || !!p.toEnteredTime,
			})
			const orders = await c.trader.orders.getOrders({ queryParams: p })
			const displayMap = await buildAccountDisplayMap(c)
			return scrubAccountIdentifiers(orders, displayMap)
		},
	}),
	createToolSpec({
		name: 'getOrdersByAccountNumber',
		description: 'Get orders by account number',
		schema: GetOrdersByAccountParams,
		call: async (c, p) => {
			const orders = await c.trader.orders.getOrdersByAccount({
				pathParams: { accountNumber: p.accountNumber },
				queryParams: p,
			})
			const displayMap = await buildAccountDisplayMap(c)
			return scrubAccountIdentifiers(orders, displayMap)
		},
	}),
	createToolSpec({
		name: 'placeOrder',
		description: 'Place order for a specific account',
		schema: PlaceOrderParams,
		call: async (c, p) => {
			const order = await c.trader.orders.placeOrderForAccount({
				pathParams: { accountNumber: p.accountNumber },
				body: p,
			})
			const displayMap = await buildAccountDisplayMap(c)
			return scrubAccountIdentifiers(order, displayMap)
		},
	}),
	createToolSpec({
		name: 'getOrder',
		description: 'Get order by order id for a specific account',
		schema: GetOrderByIdParams,
		call: async (c, p) => {
			const order = await c.trader.orders.getOrderByOrderId({
				pathParams: { accountNumber: p.accountNumber, orderId: p.orderId },
			})
			const displayMap = await buildAccountDisplayMap(c)
			return scrubAccountIdentifiers(order, displayMap)
		},
	}),
	createToolSpec({
		name: 'cancelOrder',
		description: 'Cancel order by order id for a specific account',
		schema: CancelOrderParams,
		call: async (c, p) => {
			const order = await c.trader.orders.cancelOrder({
				pathParams: { accountNumber: p.accountNumber, orderId: p.orderId },
			})
			const displayMap = await buildAccountDisplayMap(c)
			return scrubAccountIdentifiers(order, displayMap)
		},
	}),
	createToolSpec({
		name: 'replaceOrder',
		description: 'Replace order by order id for a specific account',
		schema: ReplaceOrderParams,
		call: async (c, p) => {
			const order = await c.trader.orders.replaceOrder({
				pathParams: { accountNumber: p.accountNumber, orderId: p.orderId },
				body: p,
			})
			const displayMap = await buildAccountDisplayMap(c)
			return scrubAccountIdentifiers(order, displayMap)
		},
	}),
	createToolSpec({
		name: 'getTransactions',
		description: 'Get transactions',
		schema: GetTransactionsParams,
		call: async (c, p) => {
			logger.info('[getTransactions] Fetching accounts')
			const accounts = await c.trader.accounts.getAccountNumbers()
			if (accounts.length === 0) return []
			logger.info('[getTransactions] Fetching transactions', {
				accountCount: accounts.length,
				startDate: p.startDate,
				endDate: p.endDate,
				hasType: !!p.types,
				symbol: p.symbol,
			})
			const transactions: unknown[] = []
			for (const account of accounts) {
				const accountTransactions = await c.trader.transactions.getTransactions(
					{
						pathParams: { accountNumber: account.hashValue },
						queryParams: {
							startDate: p.startDate,
							endDate: p.endDate,
							types: p.types,
							symbol: p.symbol,
						},
					},
				)
				logger.debug('[getTransactions] Transactions for account', {
					accountHash: account.hashValue,
					count: accountTransactions.length,
				})
				transactions.push(...accountTransactions)
			}
			const displayMap = await buildAccountDisplayMap(c)
			return scrubAccountIdentifiers(transactions, displayMap)
		},
	}),
	createToolSpec({
		name: 'getTransaction',
		description: 'Get transaction',
		schema: GetTransactionByIdParams,
		call: async (c, p) => {
			logger.info('[getTransaction] Fetching transaction', {
				transactionId: p.transactionId,
			})
		},
	}),
	createToolSpec({
		name: 'getUserPreference',
		description: 'Get user preference',
		schema: GetUserPreferenceParams,
		call: async (c, p) => {
			logger.info('[getUserPreference] Fetching user preference')
			const userPreference = await c.trader.userPreference.getUserPreference(p)
			if (userPreference.streamerInfo.length === 0) {
				return []
			}
			logger.info('[getUserPreference] User preference fetched', {
				hasAccounts: userPreference.accounts?.length > 0,
				accountCount: userPreference.accounts?.length || 0,
				hasStreamerInfo: userPreference.streamerInfo?.length > 0,
			})
			const displayMap = await buildAccountDisplayMap(c)
			return scrubAccountIdentifiers(userPreference, displayMap)
		},
	}),
] as const
