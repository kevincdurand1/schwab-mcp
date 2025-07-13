/**
 * Schwab API Endpoints - High-level API methods
 */
export class SchwabApiEndpoints {
    client;
    constructor(client) {
        this.client = client;
    }
    // ===============================
    // ACCOUNTS API
    // ===============================
    /**
     * Get all accounts for the authenticated user
     */
    async getAccounts(params = {}) {
        // Don't send fields parameter if not specified - let Schwab use defaults
        const queryParams = {};
        if (params.fields) {
            queryParams.fields = params.fields;
        }
        const response = await this.client.get('/trader/v1/accounts', queryParams);
        return response.data;
    }
    /**
     * Get account numbers only
     */
    async getAccountNumbers(params = {}) {
        const accounts = await this.getAccounts(params);
        return accounts.map(account => account.accountNumber);
    }
    /**
     * Get specific account details
     */
    async getAccount(accountNumber, fields) {
        const queryParams = fields ? { fields } : {};
        const response = await this.client.get(`/trader/v1/accounts/${accountNumber}`, queryParams);
        return response.data;
    }
    // ===============================
    // MARKET DATA API
    // ===============================
    /**
     * Get quotes for one or more symbols
     */
    async getQuotes(params) {
        const queryParams = {
            symbols: params.symbols.join(',')
        };
        if (params.fields) {
            queryParams.fields = params.fields;
        }
        if (params.indicative !== undefined) {
            queryParams.indicative = params.indicative;
        }
        const response = await this.client.get('/marketdata/v1/quotes', queryParams);
        return response.data;
    }
    /**
     * Get quote for a single symbol
     */
    async getQuote(symbol, fields) {
        const queryParams = fields ? { fields } : {};
        const response = await this.client.get(`/marketdata/v1/${symbol}/quotes`, queryParams);
        return response.data;
    }
    /**
     * Get price history for a symbol
     */
    async getPriceHistory(symbol, params = {}) {
        const queryParams = { symbol };
        if (params.periodType)
            queryParams.periodType = params.periodType;
        if (params.period !== undefined)
            queryParams.period = params.period;
        if (params.frequencyType)
            queryParams.frequencyType = params.frequencyType;
        if (params.frequency !== undefined)
            queryParams.frequency = params.frequency;
        if (params.startDate !== undefined)
            queryParams.startDate = params.startDate;
        if (params.endDate !== undefined)
            queryParams.endDate = params.endDate;
        if (params.needExtendedHoursData !== undefined)
            queryParams.needExtendedHoursData = params.needExtendedHoursData;
        if (params.needPreviousClose !== undefined)
            queryParams.needPreviousClose = params.needPreviousClose;
        const response = await this.client.get(`/marketdata/v1/pricehistory`, queryParams);
        return response.data;
    }
    /**
     * Get option chains for a symbol - Complete Schwab API implementation
     */
    async getOptionChains(symbol, params = {}) {
        const queryParams = { symbol };
        // Basic parameters
        if (params.contractType)
            queryParams.contractType = params.contractType;
        if (params.strikeCount !== undefined)
            queryParams.strikeCount = params.strikeCount;
        if (params.includeUnderlyingQuote !== undefined)
            queryParams.includeUnderlyingQuote = params.includeUnderlyingQuote;
        // Strategy parameters
        if (params.strategy)
            queryParams.strategy = params.strategy;
        if (params.interval !== undefined)
            queryParams.interval = params.interval;
        if (params.strike !== undefined)
            queryParams.strike = params.strike;
        if (params.range)
            queryParams.range = params.range;
        // Date parameters (yyyy-MM-dd format)
        if (params.fromDate)
            queryParams.fromDate = params.fromDate;
        if (params.toDate)
            queryParams.toDate = params.toDate;
        // ANALYTICAL strategy parameters
        if (params.volatility !== undefined)
            queryParams.volatility = params.volatility;
        if (params.underlyingPrice !== undefined)
            queryParams.underlyingPrice = params.underlyingPrice;
        if (params.interestRate !== undefined)
            queryParams.interestRate = params.interestRate;
        if (params.daysToExpiration !== undefined)
            queryParams.daysToExpiration = params.daysToExpiration;
        // Expiration and type parameters
        if (params.expMonth)
            queryParams.expMonth = params.expMonth;
        if (params.optionType)
            queryParams.optionType = params.optionType;
        if (params.entitlement)
            queryParams.entitlement = params.entitlement;
        const response = await this.client.get('/marketdata/v1/chains', queryParams);
        return response.data;
    }
    // ===============================
    // ORDERS API
    // ===============================
    /**
     * Get orders for an account
     */
    async getOrders(params) {
        const queryParams = {};
        if (params.maxResults !== undefined)
            queryParams.maxResults = params.maxResults;
        if (params.fromEnteredTime)
            queryParams.fromEnteredTime = params.fromEnteredTime;
        if (params.toEnteredTime)
            queryParams.toEnteredTime = params.toEnteredTime;
        if (params.status)
            queryParams.status = params.status;
        const response = await this.client.get(`/trader/v1/accounts/${params.accountNumber}/orders`, queryParams);
        return response.data;
    }
    /**
     * Get all orders across all accounts
     */
    async getAllOrders(params = {}) {
        const queryParams = {};
        if (params.maxResults !== undefined)
            queryParams.maxResults = params.maxResults;
        if (params.fromEnteredTime)
            queryParams.fromEnteredTime = params.fromEnteredTime;
        if (params.toEnteredTime)
            queryParams.toEnteredTime = params.toEnteredTime;
        if (params.status)
            queryParams.status = params.status;
        const response = await this.client.get('/trader/v1/orders', queryParams);
        return response.data;
    }
    /**
     * Get specific order
     */
    async getOrder(accountNumber, orderId) {
        const response = await this.client.get(`/trader/v1/accounts/${accountNumber}/orders/${orderId}`);
        return response.data;
    }
    /**
     * Place an order
     */
    async placeOrder(accountNumber, orderData) {
        const response = await this.client.post(`/trader/v1/accounts/${accountNumber}/orders`, orderData);
        return response.data;
    }
    /**
     * Replace/modify an order
     */
    async replaceOrder(accountNumber, orderId, orderData) {
        const response = await this.client.put(`/trader/v1/accounts/${accountNumber}/orders/${orderId}`, orderData);
        return response.data;
    }
    /**
     * Cancel an order
     */
    async cancelOrder(accountNumber, orderId) {
        const response = await this.client.delete(`/trader/v1/accounts/${accountNumber}/orders/${orderId}`);
        return response.data;
    }
    // ===============================
    // TRANSACTIONS API
    // ===============================
    /**
     * Get transactions for an account
     */
    async getTransactions(params) {
        const queryParams = {};
        if (params.type)
            queryParams.type = params.type;
        if (params.startDate)
            queryParams.startDate = params.startDate;
        if (params.endDate)
            queryParams.endDate = params.endDate;
        const response = await this.client.get(`/trader/v1/accounts/${params.accountNumber}/transactions`, queryParams);
        return response.data;
    }
    /**
     * Get specific transaction
     */
    async getTransaction(accountNumber, transactionId) {
        const response = await this.client.get(`/trader/v1/accounts/${accountNumber}/transactions/${transactionId}`);
        return response.data;
    }
    // ===============================
    // USER PREFERENCES API
    // ===============================
    /**
     * Get user preferences
     */
    async getUserPreferences() {
        const response = await this.client.get('/trader/v1/userpreference');
        return response.data;
    }
    // ===============================
    // MOVERS API
    // ===============================
    /**
     * Get market movers
     */
    async getMovers(index, direction, change) {
        const response = await this.client.get(`/marketdata/v1/movers/${index}`, {
            direction,
            change
        });
        return response.data;
    }
    /**
     * Get market hours for markets
     */
    async getMarketHours(markets, date) {
        const queryParams = {
            markets: markets.join(',')
        };
        if (date)
            queryParams.date = date;
        const response = await this.client.get('/marketdata/v1/markets', queryParams);
        return response.data;
    }
    /**
     * Search instruments by symbol or description
     */
    async searchInstruments(symbol, projection) {
        const response = await this.client.get('/marketdata/v1/instruments', {
            symbol,
            projection
        });
        return response.data;
    }
    /**
     * Get instrument by CUSIP
     */
    async getInstrumentByCusip(cusip) {
        const response = await this.client.get(`/marketdata/v1/instruments/${cusip}`);
        return response.data;
    }
    // ===============================
    // ADDITIONAL ENDPOINTS
    // ===============================
    /**
     * Get account positions
     */
    async getPositions(accountNumber, fields) {
        const queryParams = {};
        if (fields)
            queryParams.fields = fields;
        const response = await this.client.get(`/trader/v1/accounts/${accountNumber}/positions`, queryParams);
        return response.data;
    }
    /**
     * Get watchlists for an account
     */
    async getWatchlists(accountNumber) {
        const response = await this.client.get(`/trader/v1/accounts/${accountNumber}/watchlists`);
        return response.data;
    }
    /**
     * Get specific watchlist
     */
    async getWatchlist(accountNumber, watchlistId) {
        const response = await this.client.get(`/trader/v1/accounts/${accountNumber}/watchlists/${watchlistId}`);
        return response.data;
    }
    /**
     * Create a new watchlist
     */
    async createWatchlist(accountNumber, watchlistData) {
        const response = await this.client.post(`/trader/v1/accounts/${accountNumber}/watchlists`, watchlistData);
        return response.data;
    }
    /**
     * Update a watchlist
     */
    async updateWatchlist(accountNumber, watchlistId, watchlistData) {
        const response = await this.client.put(`/trader/v1/accounts/${accountNumber}/watchlists/${watchlistId}`, watchlistData);
        return response.data;
    }
    /**
     * Delete a watchlist
     */
    async deleteWatchlist(accountNumber, watchlistId) {
        const response = await this.client.delete(`/trader/v1/accounts/${accountNumber}/watchlists/${watchlistId}`);
        return response.data;
    }
}
//# sourceMappingURL=endpoints.js.map