/**
 * Trading tools for Generic Broker MCP
 * Provides account management and order execution capabilities
 * Works with any broker adapter (Schwab, Fidelity, TD Ameritrade, etc.)
 */

import {
	GetAccountsParamsSchema,
	GetOrdersParamsSchema,
	GetOrderParamsSchema,
	GetTransactionsParamsSchema,
	GetUserPreferenceParamsSchema,
	PlaceOrderParamsSchema,
	ReplaceOrderParamsSchema,
	GetPositionsParamsSchema,
	GetPortfolioSummaryParamsSchema,
	GetPerformanceParamsSchema,
	GetWatchlistsParamsSchema,
	CreateWatchlistParamsSchema,
	AddToWatchlistParamsSchema,
	RemoveFromWatchlistParamsSchema,
	GetAccountActivityParamsSchema,
} from '../../core/types.js'
import { createToolSpec } from '../types.js'

// Use console.error for logging to avoid polluting stdout (MCP communication channel)
const log = {
  info: (msg: string, data?: any) => console.error(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
  debug: (msg: string, data?: any) => console.error(`[DEBUG] ${msg}`, data || ''),
};

export const toolSpecs = [
	createToolSpec({
		name: 'getAccounts',
		description: 'Get a list of accounts for the authenticated user',
		schema: GetAccountsParamsSchema,
		call: async (c, p) => {
			log.info('[getAccounts] Fetching accounts', {
				fields: p.fields,
			})
			return await c.accounts.getAccounts(p)
		},
	}),
	createToolSpec({
		name: 'getAccountNumbers',
		description: 'Get account numbers for the authenticated user',
		schema: GetAccountsParamsSchema,
		call: async (c, p) => {
			log.info('[getAccountNumbers] Fetching account numbers')
			return await c.accounts.getAccountNumbers(p)
		},
	}),
	createToolSpec({
		name: 'getOrders',
		description: 'Get orders with optional filtering by status, time range, and symbol',
		schema: GetOrdersParamsSchema,
		call: async (c, p) => {
			log.info('[getOrders] Fetching orders', {
				accountNumber: p.accountNumber,
				maxResults: p.maxResults,
				status: p.status,
			})
			return await c.orders.getOrders(p)
		},
	}),
	createToolSpec({
		name: 'getOrder',
		description: 'Get a specific order by ID',
		schema: GetOrderParamsSchema,
		call: async (c, p) => {
			log.info('[getOrder] Fetching order', {
				orderId: p.orderId,
				accountNumber: p.accountNumber,
			})
			// Use getOrders with specific filters to find the order
			const orders = await c.orders.getOrders({ 
				accountNumber: p.accountNumber,
				maxResults: 1000 // Search through orders to find the specific one
			})
			const order = orders.find(o => o.orderId === p.orderId)
			if (!order) {
				throw new Error(`Order ${p.orderId} not found`)
			}
			return order
		},
	}),
	createToolSpec({
		name: 'getOrdersByAccountNumber',
		description: 'Get orders for a specific account number',
		schema: GetOrdersParamsSchema,
		call: async (c, p) => {
			log.info('[getOrdersByAccountNumber] Fetching orders by account', {
				accountNumber: p.accountNumber,
			})
			if (!p.accountNumber) {
				throw new Error('Account number is required')
			}
			return await c.orders.getOrders(p)
		},
	}),
	createToolSpec({
		name: 'getTransactions',
		description: 'Get transaction history with optional filtering',
		schema: GetTransactionsParamsSchema,
		call: async (c, p) => {
			log.info('[getTransactions] Fetching transactions', {
				accountNumber: p.accountNumber,
				startDate: p.startDate,
				endDate: p.endDate,
				symbol: p.symbol,
			})
			return await c.transactions.getTransactions(p)
		},
	}),
	createToolSpec({
		name: 'getUserPreference',
		description: 'Get user trading preferences and settings',
		schema: GetUserPreferenceParamsSchema,
		call: async (c, p) => {
			log.info('[getUserPreference] Fetching user preferences')
			// For now, return a placeholder as this would need to be implemented in the broker adapters
			return {
				message: 'User preferences not yet implemented in generic broker interface',
				supportedBroker: c.brokerName
			}
		},
	}),
	createToolSpec({
		name: 'cancelOrder',
		description: 'Cancel an order (Experimental)',
		schema: GetOrderParamsSchema,
		call: async (c, p) => {
			log.info('[cancelOrder] Canceling order', {
				orderId: p.orderId,
				accountNumber: p.accountNumber,
			})
			return await c.orders.cancelOrder(p.orderId, p.accountNumber)
		},
	}),
	createToolSpec({
		name: 'placeOrder',
		description: 'Place a new order (Experimental)',
		schema: PlaceOrderParamsSchema,
		call: async (c, p) => {
			log.info('[placeOrder] Placing order', {
				accountNumber: p.accountNumber,
				symbol: p.symbol,
				quantity: p.quantity,
				side: p.side,
				orderType: p.orderType,
			})
			return await c.orders.placeOrder(p)
		},
	}),
	createToolSpec({
		name: 'replaceOrder',
		description: 'Replace an existing order (Experimental)',
		schema: ReplaceOrderParamsSchema,
		call: async (c, p) => {
			log.info('[replaceOrder] Replacing order', {
				orderId: p.orderId,
				accountNumber: p.accountNumber,
				symbol: p.symbol,
				quantity: p.quantity,
				side: p.side,
				orderType: p.orderType,
			})
			return await c.orders.replaceOrder(p)
		},
	}),
	createToolSpec({
		name: 'getPositions',
		description: 'Get detailed position information with P&L',
		schema: GetPositionsParamsSchema,
		call: async (c, p) => {
			log.info('[getPositions] Fetching positions', {
				accountNumber: p.accountNumber,
			})
			return await c.portfolio.getPositions(p)
		},
	}),
	createToolSpec({
		name: 'getPortfolioSummary',
		description: 'Get portfolio overview with total value and day change',
		schema: GetPortfolioSummaryParamsSchema,
		call: async (c, p) => {
			log.info('[getPortfolioSummary] Fetching portfolio summary', {
				accountNumber: p.accountNumber,
			})
			return await c.portfolio.getPortfolioSummary(p)
		},
	}),
	createToolSpec({
		name: 'getPerformance',
		description: 'Get performance metrics and returns',
		schema: GetPerformanceParamsSchema,
		call: async (c, p) => {
			log.info('[getPerformance] Fetching performance', {
				accountNumber: p.accountNumber,
				startDate: p.startDate,
				endDate: p.endDate,
			})
			return await c.portfolio.getPerformance(p)
		},
	}),
	createToolSpec({
		name: 'getWatchlists',
		description: 'Get user\'s watchlists',
		schema: GetWatchlistsParamsSchema,
		call: async (c, p) => {
			log.info('[getWatchlists] Fetching watchlists')
			return await c.watchlists.getWatchlists(p)
		},
	}),
	createToolSpec({
		name: 'createWatchlist',
		description: 'Create a new watchlist',
		schema: CreateWatchlistParamsSchema,
		call: async (c, p) => {
			log.info('[createWatchlist] Creating watchlist', {
				name: p.name,
				description: p.description,
			})
			return await c.watchlists.createWatchlist(p)
		},
	}),
	createToolSpec({
		name: 'addToWatchlist',
		description: 'Add a symbol to a watchlist',
		schema: AddToWatchlistParamsSchema,
		call: async (c, p) => {
			log.info('[addToWatchlist] Adding symbol to watchlist', {
				watchlistId: p.watchlistId,
				symbol: p.symbol,
			})
			return await c.watchlists.addToWatchlist(p)
		},
	}),
	createToolSpec({
		name: 'removeFromWatchlist',
		description: 'Remove a symbol from a watchlist',
		schema: RemoveFromWatchlistParamsSchema,
		call: async (c, p) => {
			log.info('[removeFromWatchlist] Removing symbol from watchlist', {
				watchlistId: p.watchlistId,
				symbol: p.symbol,
			})
			return await c.watchlists.removeFromWatchlist(p)
		},
	}),
	createToolSpec({
		name: 'getAccountActivity',
		description: 'Get recent account activity feed',
		schema: GetAccountActivityParamsSchema,
		call: async (c, p) => {
			log.info('[getAccountActivity] Fetching account activity', {
				accountNumber: p.accountNumber,
				maxResults: p.maxResults,
				fromDate: p.fromDate,
			})
			return await c.activity.getAccountActivity(p)
		},
	}),
] as const

export const traderTools = toolSpecs
