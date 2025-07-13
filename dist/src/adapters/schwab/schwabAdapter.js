/**
 * Schwab Broker Adapter using our custom API client
 * Implements the generic broker interface for Schwab
 */
import { createSchwabApiClient, createRedisTokenManager } from '../../lib/schwab-api/index.js';
// Use console.error for logging to avoid polluting stdout (MCP communication channel)
const log = {
    info: (msg, data) => console.error(`[SchwabAdapter] ${msg}`, data || ''),
    error: (msg, data) => console.error(`[SchwabAdapter] ${msg}`, data || ''),
};
// Response size management
const MAX_RESPONSE_SIZE = 900000; // ~900KB to stay under 1MB limit
function checkResponseSize(response, operation, symbol) {
    const responseStr = JSON.stringify(response);
    if (responseStr.length <= MAX_RESPONSE_SIZE) {
        return response;
    }
    log.info(`${operation} response too large (${responseStr.length} chars)${symbol ? ` for ${symbol}` : ''}, truncating`);
    // For general responses, just add metadata and warn
    return {
        ...response,
        _metadata: {
            truncated: true,
            originalSize: responseStr.length,
            message: `Response truncated due to size (${Math.round(responseStr.length / 1024)}KB). Use more specific parameters to reduce data size.`,
            suggestion: 'Consider using filters like date ranges, strike counts, or other limiting parameters.'
        }
    };
}
function createBrokerError(error, operation) {
    const message = error?.message || 'Unknown error';
    const details = error?.details || error;
    return new Error(`[Schwab] ${operation}: ${message}. Details: ${JSON.stringify(details)}`);
}
// ===============================
// API Implementations
// ===============================
class SchwabAccountsAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    async getAccounts(params) {
        try {
            const response = await this.client.getAccounts({
                fields: params.fields
            });
            return response.map(mapSchwabAccount);
        }
        catch (error) {
            throw createBrokerError(error, 'getAccounts');
        }
    }
    async getAccountNumbers(params) {
        try {
            const accounts = await this.getAccounts(params || {});
            return accounts.map(account => account.accountNumber);
        }
        catch (error) {
            throw createBrokerError(error, 'getAccountNumbers');
        }
    }
}
class SchwabQuotesAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    async getQuotes(params) {
        try {
            const symbols = params.symbols.split(',');
            const response = await this.client.getQuotes({
                symbols,
                fields: params.fields,
                indicative: params.indicative
            });
            return Object.values(response).map(mapSchwabQuote);
        }
        catch (error) {
            throw createBrokerError(error, 'getQuotes');
        }
    }
    async getQuote(symbol, fields) {
        try {
            const response = await this.client.getQuote(symbol, fields);
            return mapSchwabQuote(response);
        }
        catch (error) {
            throw createBrokerError(error, 'getQuote');
        }
    }
}
class SchwabOrdersAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    async getOrders(params) {
        try {
            const response = await this.client.getOrders({
                accountNumber: params.accountNumber || '',
                maxResults: params.maxResults,
                fromEnteredTime: params.fromEnteredTime,
                toEnteredTime: params.toEnteredTime,
                status: params.status
            });
            const mapped = response.map(mapSchwabOrder);
            // Check response size for large order lists
            const sizeChecked = checkResponseSize(mapped, 'getOrders', params.accountNumber);
            return Array.isArray(sizeChecked) ? sizeChecked : [sizeChecked];
        }
        catch (error) {
            throw createBrokerError(error, 'getOrders');
        }
    }
    async getOrder(orderId, accountNumber) {
        try {
            const response = await this.client.getOrder(accountNumber, orderId);
            return mapSchwabOrder(response);
        }
        catch (error) {
            throw createBrokerError(error, 'getOrder');
        }
    }
    async getOrdersByAccountNumber(params) {
        return this.getOrders(params);
    }
    async cancelOrder(orderId, accountNumber) {
        try {
            await this.client.cancelOrder(accountNumber, orderId);
        }
        catch (error) {
            throw createBrokerError(error, 'cancelOrder');
        }
    }
    async placeOrder(params) {
        try {
            const orderData = {
                orderType: params.orderType || 'MARKET',
                session: 'NORMAL',
                duration: params.duration || 'DAY',
                orderStrategyType: 'SINGLE',
                orderLegCollection: [
                    {
                        instruction: params.side || 'BUY',
                        quantity: params.quantity,
                        instrument: {
                            symbol: params.symbol,
                            assetType: 'EQUITY'
                        }
                    }
                ]
            };
            // Add price for limit orders
            if (params.orderType === 'LIMIT' && params.price) {
                orderData.price = params.price;
            }
            const response = await this.client.placeOrder(params.accountNumber || '', orderData);
            // Return a basic order object since Schwab returns order ID in headers
            return {
                orderId: response.orderId || 'PENDING',
                accountNumber: params.accountNumber || '',
                symbol: params.symbol || '',
                quantity: params.quantity || 0,
                status: 'QUEUED'
            };
        }
        catch (error) {
            throw createBrokerError(error, 'placeOrder');
        }
    }
    async replaceOrder(params) {
        try {
            const orderData = {
                orderType: params.orderType || 'MARKET',
                session: 'NORMAL',
                duration: params.duration || 'DAY',
                orderStrategyType: 'SINGLE',
                orderLegCollection: [
                    {
                        instruction: params.side || 'BUY',
                        quantity: params.quantity,
                        instrument: {
                            symbol: params.symbol,
                            assetType: 'EQUITY'
                        }
                    }
                ]
            };
            // Add price for limit orders
            if (params.orderType === 'LIMIT' && params.price) {
                orderData.price = params.price;
            }
            const response = await this.client.replaceOrder(params.accountNumber || '', params.orderId || '', orderData);
            // Return updated order object
            return {
                orderId: params.orderId || '',
                accountNumber: params.accountNumber || '',
                symbol: params.symbol || '',
                quantity: params.quantity || 0,
                status: 'REPLACED'
            };
        }
        catch (error) {
            throw createBrokerError(error, 'replaceOrder');
        }
    }
}
class SchwabTransactionsAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    async getTransactions(params) {
        try {
            const response = await this.client.getTransactions({
                accountNumber: params.accountNumber || '',
                type: params.type,
                startDate: params.startDate,
                endDate: params.endDate
            });
            const mapped = response.map(mapSchwabTransaction);
            // Check response size for large transaction lists
            const sizeChecked = checkResponseSize(mapped, 'getTransactions', params.accountNumber);
            return Array.isArray(sizeChecked) ? sizeChecked : [sizeChecked];
        }
        catch (error) {
            throw createBrokerError(error, 'getTransactions');
        }
    }
    async getTransaction(transactionId, accountNumber) {
        try {
            const response = await this.client.getTransaction(accountNumber, transactionId);
            return mapSchwabTransaction(response);
        }
        catch (error) {
            throw createBrokerError(error, 'getTransaction');
        }
    }
}
class SchwabMarketDataAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    async getQuotes(params) {
        try {
            const symbols = typeof params.symbols === 'string' ? params.symbols.split(',') : params.symbols;
            const response = await this.client.getQuotes({
                symbols,
                fields: params.fields,
                indicative: params.indicative
            });
            return Object.values(response).map(mapSchwabQuote);
        }
        catch (error) {
            throw createBrokerError(error, 'getQuotes');
        }
    }
    async getPriceHistory(params) {
        try {
            const response = await this.client.getPriceHistory(params.symbol, {
                periodType: params.periodType,
                period: params.period,
                frequencyType: params.frequencyType,
                frequency: params.frequency,
                startDate: params.startDate,
                endDate: params.endDate,
                needExtendedHoursData: params.needExtendedHoursData,
                needPreviousClose: params.needPreviousClose
            });
            // Handle large price history responses
            return this.truncatePriceHistoryResponse(response, params.symbol);
        }
        catch (error) {
            throw createBrokerError(error, 'getPriceHistory');
        }
    }
    truncatePriceHistoryResponse(response, symbol) {
        const MAX_RESPONSE_SIZE = 900000; // ~900KB to stay under 1MB limit
        const responseStr = JSON.stringify(response);
        if (responseStr.length <= MAX_RESPONSE_SIZE) {
            return response;
        }
        log.info(`[SchwabAdapter] Price history response too large (${responseStr.length} chars), truncating for ${symbol}`);
        const candles = response.candles || [];
        const totalCandles = candles.length;
        if (totalCandles === 0) {
            return response;
        }
        // Keep a reasonable sample of candles (every nth candle + recent data)
        const maxCandles = 500; // Reasonable limit for analysis
        let sampledCandles = [];
        if (totalCandles <= maxCandles) {
            sampledCandles = candles;
        }
        else {
            // Keep recent candles (last 100) + evenly distributed historical samples
            const recentCandles = candles.slice(-100);
            const historicalCandles = candles.slice(0, -100);
            const sampleRatio = Math.ceil(historicalCandles.length / (maxCandles - 100));
            const sampledHistorical = historicalCandles.filter((_, index) => index % sampleRatio === 0);
            sampledCandles = [...sampledHistorical, ...recentCandles];
        }
        const truncated = {
            ...response,
            candles: sampledCandles,
            _metadata: {
                truncated: true,
                originalCandles: totalCandles,
                sampledCandles: sampledCandles.length,
                originalSize: responseStr.length,
                truncatedSize: 0, // Will be calculated after
                message: `Price history data was truncated from ${totalCandles} to ${sampledCandles.length} candles due to size (${Math.round(responseStr.length / 1024)}KB). Recent data is preserved with historical sampling.`
            }
        };
        // Calculate final size
        const truncatedStr = JSON.stringify(truncated);
        truncated._metadata.truncatedSize = truncatedStr.length;
        return truncated;
    }
    async getOptionChain(params) {
        try {
            const response = await this.client.getOptionChains(params.symbol, {
                contractType: params.contractType,
                strikeCount: params.strikeCount,
                includeUnderlyingQuote: params.includeUnderlyingQuote,
                strategy: params.strategy,
                interval: params.interval,
                strike: params.strike,
                range: params.range,
                fromDate: params.fromDate,
                toDate: params.toDate,
                volatility: params.volatility,
                underlyingPrice: params.underlyingPrice,
                interestRate: params.interestRate,
                daysToExpiration: params.daysToExpiration,
                expMonth: params.expMonth,
                optionType: params.optionType,
                entitlement: params.entitlement
            });
            // Handle large option chain responses
            return this.truncateOptionChainResponse(response, params.symbol);
        }
        catch (error) {
            throw createBrokerError(error, 'getOptionChain');
        }
    }
    truncateOptionChainResponse(response, symbol) {
        const MAX_RESPONSE_SIZE = 900000; // ~900KB to stay under 1MB limit
        const responseStr = JSON.stringify(response);
        if (responseStr.length <= MAX_RESPONSE_SIZE) {
            return response;
        }
        log.info(`[SchwabAdapter] Option chain response too large (${responseStr.length} chars), truncating for ${symbol}`);
        // Create summarized response
        const summary = {
            symbol: response.symbol || symbol,
            status: response.status,
            strategy: response.strategy,
            interval: response.interval,
            isDelayed: response.isDelayed,
            isIndex: response.isIndex,
            daysToExpiration: response.daysToExpiration,
            interestRate: response.interestRate,
            underlyingPrice: response.underlyingPrice,
            volatility: response.volatility,
            // Summarize call and put maps
            callExpDateMap: this.summarizeOptionMap(response.callExpDateMap, 'CALL'),
            putExpDateMap: this.summarizeOptionMap(response.putExpDateMap, 'PUT'),
            // Add metadata about truncation
            _metadata: {
                truncated: true,
                originalSize: responseStr.length,
                truncatedSize: 0, // Will be calculated after
                message: `Option chain data was truncated due to size (${Math.round(responseStr.length / 1024)}KB). This summary includes key strikes and expirations. Use more specific parameters (strikeCount, range, expMonth) for detailed data.`
            }
        };
        // Calculate final size
        const summaryStr = JSON.stringify(summary);
        summary._metadata.truncatedSize = summaryStr.length;
        return summary;
    }
    summarizeOptionMap(optionMap, type) {
        if (!optionMap)
            return null;
        const summarized = {};
        const expirationDates = Object.keys(optionMap).slice(0, 5); // Limit to 5 expiration dates
        for (const expDate of expirationDates) {
            const strikes = optionMap[expDate];
            if (!strikes)
                continue;
            const strikeKeys = Object.keys(strikes);
            const totalStrikes = strikeKeys.length;
            // Keep ATM and nearby strikes
            const middleIndex = Math.floor(strikeKeys.length / 2);
            const keepIndices = [
                Math.max(0, middleIndex - 2),
                middleIndex - 1,
                middleIndex,
                middleIndex + 1,
                Math.min(strikeKeys.length - 1, middleIndex + 2)
            ].filter((index, pos, arr) => arr.indexOf(index) === pos && index >= 0 && index < strikeKeys.length);
            const summarizedStrikes = {};
            for (const index of keepIndices) {
                const strikeKey = strikeKeys[index];
                if (!strikeKey)
                    continue;
                const options = strikes[strikeKey];
                if (options && options.length > 0) {
                    // Keep only essential option data
                    summarizedStrikes[strikeKey] = options.map((option) => ({
                        putCall: option.putCall,
                        symbol: option.symbol,
                        bid: option.bid,
                        ask: option.ask,
                        last: option.last,
                        mark: option.mark,
                        bidSize: option.bidSize,
                        askSize: option.askSize,
                        lastSize: option.lastSize,
                        highPrice: option.highPrice,
                        lowPrice: option.lowPrice,
                        openPrice: option.openPrice,
                        closePrice: option.closePrice,
                        totalVolume: option.totalVolume,
                        openInterest: option.openInterest,
                        volatility: option.volatility,
                        delta: option.delta,
                        gamma: option.gamma,
                        theta: option.theta,
                        vega: option.vega,
                        strikePrice: option.strikePrice,
                        expirationDate: option.expirationDate,
                        daysToExpiration: option.daysToExpiration,
                        timeValue: option.timeValue,
                        intrinsicValue: option.intrinsicValue,
                        inTheMoney: option.inTheMoney
                    }));
                }
            }
            summarized[expDate] = {
                strikes: summarizedStrikes,
                _summary: {
                    totalStrikes: totalStrikes,
                    showing: Object.keys(summarizedStrikes).length,
                    note: totalStrikes > 5 ? `Showing ${Object.keys(summarizedStrikes).length} of ${totalStrikes} strikes (ATM and nearby)` : undefined
                }
            };
        }
        return {
            ...summarized,
            _summary: {
                totalExpirations: Object.keys(optionMap).length,
                showing: expirationDates.length,
                type: type,
                note: Object.keys(optionMap).length > 5 ? `Showing ${expirationDates.length} of ${Object.keys(optionMap).length} expiration dates` : undefined
            }
        };
    }
    async getOptionChains(params) {
        return this.getOptionChain(params);
    }
    async getMovers(params) {
        try {
            const response = await this.client.getMovers(params.index, params.direction, params.change);
            return response;
        }
        catch (error) {
            throw createBrokerError(error, 'getMovers');
        }
    }
    async getMarketHours(params) {
        try {
            const response = await this.client.getMarketHours(params.markets, params.date);
            return response;
        }
        catch (error) {
            throw createBrokerError(error, 'getMarketHours');
        }
    }
    async searchInstruments(params) {
        try {
            const response = await this.client.searchInstruments(params.symbol, params.projection);
            return response;
        }
        catch (error) {
            throw createBrokerError(error, 'searchInstruments');
        }
    }
    async getInstrument(params) {
        try {
            const response = await this.client.getInstrumentByCusip(params.cusip);
            return response;
        }
        catch (error) {
            throw createBrokerError(error, 'getInstrument');
        }
    }
    async getHistoricalData(params) {
        return this.getPriceHistory(params);
    }
    async getInstrumentByCusip(params) {
        try {
            const response = await this.client.getInstrumentByCusip(params.cusip);
            return response;
        }
        catch (error) {
            throw createBrokerError(error, 'getInstrumentByCusip');
        }
    }
    async getNews(_params) {
        throw new Error('getNews not implemented - not available in Schwab API');
    }
    async getEarningsCalendar(_params) {
        throw new Error('getEarningsCalendar not implemented - not available in Schwab API');
    }
    async getDividendHistory(_params) {
        throw new Error('getDividendHistory not implemented - not available in Schwab API');
    }
    async getCompanyProfile(_params) {
        throw new Error('getCompanyProfile not implemented - not available in Schwab API');
    }
}
class SchwabPortfolioAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    async getPositions(params) {
        try {
            const response = await this.client.getPositions(params.accountNumber || '');
            return Array.isArray(response) ? response : [response];
        }
        catch (error) {
            throw createBrokerError(error, 'getPositions');
        }
    }
    async getPortfolioSummary(params) {
        try {
            // Use account details to get portfolio summary
            const response = await this.client.getAccount(params.accountNumber || '', 'positions');
            return {
                accountNumber: response.accountNumber,
                totalValue: response.securitiesAccount?.currentBalances?.liquidationValue,
                dayChange: response.securitiesAccount?.currentBalances?.totalMarketValue - response.securitiesAccount?.currentBalances?.dayTradingBuyingPower,
                positions: response.securitiesAccount?.positions || []
            };
        }
        catch (error) {
            throw createBrokerError(error, 'getPortfolioSummary');
        }
    }
    async getPerformance(_params) {
        throw new Error('getPerformance not implemented - performance data not available via basic Schwab API');
    }
}
class SchwabWatchlistAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    async getWatchlists(_params) {
        try {
            // GetWatchlistsParams doesn't have accountNumber, need to get it elsewhere
            const response = await this.client.getWatchlists('');
            return Array.isArray(response) ? response : [response];
        }
        catch (error) {
            throw createBrokerError(error, 'getWatchlists');
        }
    }
    async createWatchlist(params) {
        try {
            const watchlistData = {
                name: params.name,
                description: params.description,
                watchlistItems: [] // CreateWatchlistParams doesn't have symbols field
            };
            // Account number needs to come from elsewhere or be hardcoded
            const response = await this.client.createWatchlist('', watchlistData);
            return response;
        }
        catch (error) {
            throw createBrokerError(error, 'createWatchlist');
        }
    }
    async addToWatchlist(params) {
        try {
            // Get existing watchlist (account number needs to come from elsewhere)
            const watchlist = await this.client.getWatchlist('', params.watchlistId);
            // Add new symbol
            const newItem = {
                instrument: {
                    symbol: params.symbol,
                    assetType: 'EQUITY'
                }
            };
            watchlist.watchlistItems = watchlist.watchlistItems || [];
            watchlist.watchlistItems.push(newItem);
            // Update the watchlist
            await this.client.updateWatchlist('', params.watchlistId, watchlist);
        }
        catch (error) {
            throw createBrokerError(error, 'addToWatchlist');
        }
    }
    async removeFromWatchlist(params) {
        try {
            // Get existing watchlist (account number needs to come from elsewhere)
            const watchlist = await this.client.getWatchlist('', params.watchlistId);
            // Remove the symbol
            watchlist.watchlistItems = (watchlist.watchlistItems || []).filter((item) => item.instrument?.symbol !== params.symbol);
            // Update the watchlist
            await this.client.updateWatchlist('', params.watchlistId, watchlist);
        }
        catch (error) {
            throw createBrokerError(error, 'removeFromWatchlist');
        }
    }
}
class SchwabActivityAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    async getAccountActivity(params) {
        try {
            // Use transactions API to get account activity
            const response = await this.client.getTransactions({
                accountNumber: params.accountNumber || '',
                type: undefined, // GetAccountActivityParams doesn't have type field
                startDate: params.fromDate, // Different field name
                endDate: undefined // GetAccountActivityParams doesn't have endDate
            });
            return Array.isArray(response) ? response : [response];
        }
        catch (error) {
            throw createBrokerError(error, 'getAccountActivity');
        }
    }
    async getUserPreference(_params) {
        try {
            const response = await this.client.getUserPreferences();
            return response;
        }
        catch (error) {
            throw createBrokerError(error, 'getUserPreference');
        }
    }
}
// ===============================
// Data Mappers
// ===============================
function mapSchwabAccount(schwabAccount) {
    return {
        accountNumber: schwabAccount.accountNumber || schwabAccount.securitiesAccount?.accountNumber || '',
        type: schwabAccount.type || schwabAccount.securitiesAccount?.type || '',
        displayName: schwabAccount.displayName,
        positions: schwabAccount.securitiesAccount?.positions || schwabAccount.positions,
        balances: schwabAccount.securitiesAccount?.currentBalances || schwabAccount.currentBalances,
        ...schwabAccount // Include all original fields
    };
}
function mapSchwabQuote(schwabQuote) {
    return {
        symbol: schwabQuote.symbol || '',
        price: schwabQuote.mark || schwabQuote.lastPrice || schwabQuote.quote?.lastPrice || 0,
        change: schwabQuote.netChange || schwabQuote.quote?.netChange,
        changePercent: schwabQuote.netPercentChange || schwabQuote.quote?.netPercentChange,
        bid: schwabQuote.bidPrice || schwabQuote.quote?.bidPrice,
        ask: schwabQuote.askPrice || schwabQuote.quote?.askPrice,
        volume: schwabQuote.totalVolume || schwabQuote.quote?.totalVolume,
        ...schwabQuote // Include all original fields
    };
}
function mapSchwabOrder(schwabOrder) {
    return {
        orderId: schwabOrder.orderId || '',
        accountNumber: schwabOrder.accountNumber || '',
        symbol: schwabOrder.orderLegCollection?.[0]?.instrument?.symbol || '',
        quantity: schwabOrder.orderLegCollection?.[0]?.quantity || 0,
        status: schwabOrder.status || '',
        ...schwabOrder // Include all original fields
    };
}
function mapSchwabTransaction(schwabTransaction) {
    return {
        transactionId: schwabTransaction.transactionId || '',
        accountNumber: schwabTransaction.accountNumber || '',
        type: schwabTransaction.type || '',
        amount: schwabTransaction.netAmount || 0,
        date: schwabTransaction.transactionDate || '',
        ...schwabTransaction // Include all original fields
    };
}
// ===============================
// Main Broker Client
// ===============================
export class SchwabBrokerAdapter {
    schwabClient;
    brokerName = 'schwab';
    accounts;
    quotes;
    orders;
    transactions;
    marketData;
    portfolio;
    watchlists;
    activity;
    constructor(schwabClient) {
        this.schwabClient = schwabClient;
        this.accounts = new SchwabAccountsAPI(schwabClient);
        this.quotes = new SchwabQuotesAPI(schwabClient);
        this.orders = new SchwabOrdersAPI(schwabClient);
        this.transactions = new SchwabTransactionsAPI(schwabClient);
        this.marketData = new SchwabMarketDataAPI(schwabClient);
        this.portfolio = new SchwabPortfolioAPI(schwabClient);
        this.watchlists = new SchwabWatchlistAPI(schwabClient);
        this.activity = new SchwabActivityAPI(schwabClient);
    }
}
/**
 * Create a Schwab broker adapter with Redis token storage
 */
export async function createSchwabBrokerAdapter(redisClient) {
    if (!redisClient || !redisClient.isOpen) {
        throw new Error('Redis client must be provided and connected');
    }
    const tokenManager = createRedisTokenManager(redisClient);
    const schwabClient = createSchwabApiClient({
        clientId: process.env.SCHWAB_CLIENT_ID,
        clientSecret: process.env.SCHWAB_CLIENT_SECRET,
        redirectUri: process.env.SCHWAB_REDIRECT_URI || 'https://127.0.0.1:5001/api/SchwabAuth/callback',
        tokenManager
    });
    log.info('Created Schwab broker adapter with custom API client');
    return new SchwabBrokerAdapter(schwabClient);
}
//# sourceMappingURL=schwabAdapter.js.map