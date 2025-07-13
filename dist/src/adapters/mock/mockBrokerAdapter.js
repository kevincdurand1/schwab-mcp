/**
 * Mock Broker Adapter
 * For testing and development without real API calls
 */
// ===============================
// Mock Data
// ===============================
const mockAccounts = [
    {
        accountNumber: "12345678",
        accountName: "Mock Trading Account",
        type: "MARGIN",
        balance: 50000,
        positions: [
            {
                symbol: "AAPL",
                quantity: 100,
                marketValue: 17500,
                averagePrice: 175.00,
                unrealizedPL: 2500
            },
            {
                symbol: "GOOGL",
                quantity: 50,
                marketValue: 8500,
                averagePrice: 170.00,
                unrealizedPL: -1000
            }
        ]
    },
    {
        accountNumber: "87654321",
        accountName: "Mock Retirement Account",
        type: "IRA",
        balance: 125000,
        positions: [
            {
                symbol: "SPY",
                quantity: 200,
                marketValue: 85000,
                averagePrice: 425.00,
                unrealizedPL: 5000
            }
        ]
    }
];
const mockQuotes = {
    "AAPL": {
        symbol: "AAPL",
        price: 175.00,
        bid: 174.95,
        ask: 175.05,
        volume: 45000000,
        change: 2.50,
        changePercent: 1.45,
        high: 176.00,
        low: 173.50,
        lastUpdated: new Date().toISOString()
    },
    "GOOGL": {
        symbol: "GOOGL",
        price: 170.00,
        bid: 169.95,
        ask: 170.05,
        volume: 25000000,
        change: -2.00,
        changePercent: -1.16,
        high: 172.00,
        low: 169.00,
        lastUpdated: new Date().toISOString()
    },
    "SPY": {
        symbol: "SPY",
        price: 425.00,
        bid: 424.95,
        ask: 425.05,
        volume: 80000000,
        change: 1.25,
        changePercent: 0.29,
        high: 426.00,
        low: 423.50,
        lastUpdated: new Date().toISOString()
    }
};
const mockOrders = [
    {
        orderId: "ORD001",
        accountNumber: "12345678",
        symbol: "AAPL",
        quantity: 10,
        status: "FILLED",
        orderType: "MARKET",
        side: "BUY",
        price: 175.00,
        filledQuantity: 10,
        orderDate: new Date().toISOString()
    },
    {
        orderId: "ORD002",
        accountNumber: "12345678",
        symbol: "GOOGL",
        quantity: 5,
        status: "PENDING",
        orderType: "LIMIT",
        side: "SELL",
        price: 172.00,
        filledQuantity: 0,
        orderDate: new Date().toISOString()
    }
];
const mockTransactions = [
    {
        transactionId: "TXN001",
        accountNumber: "12345678",
        type: "BUY",
        amount: -1750.00,
        date: new Date().toISOString(),
        symbol: "AAPL",
        quantity: 10,
        price: 175.00,
        description: "Bought 10 shares of AAPL at $175.00"
    },
    {
        transactionId: "TXN002",
        accountNumber: "87654321",
        type: "DIVIDEND",
        amount: 125.50,
        date: new Date().toISOString(),
        symbol: "SPY",
        description: "Dividend payment from SPY"
    }
];
// ===============================
// Mock API Implementations
// ===============================
class MockAccountsAPI {
    async getAccounts(params) {
        console.error('[MockBroker] getAccounts called with params:', params);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockAccounts;
    }
    async getAccountNumbers(params) {
        console.error('[MockBroker] getAccountNumbers called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 50));
        return mockAccounts.map(acc => acc.accountNumber);
    }
}
class MockQuotesAPI {
    async getQuotes(params) {
        console.error('[MockBroker] getQuotes called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 100));
        const symbols = params.symbols.split(',').map(s => s.trim().toUpperCase());
        return symbols.map(symbol => mockQuotes[symbol] || {
            symbol,
            price: Math.random() * 100 + 50,
            bid: 0,
            ask: 0,
            volume: Math.floor(Math.random() * 1000000),
            lastUpdated: new Date().toISOString()
        });
    }
    async getQuote(symbol) {
        console.error('[MockBroker] getQuote called for symbol:', symbol);
        await new Promise(resolve => setTimeout(resolve, 50));
        return mockQuotes[symbol.toUpperCase()] || {
            symbol: symbol.toUpperCase(),
            price: Math.random() * 100 + 50,
            bid: 0,
            ask: 0,
            volume: Math.floor(Math.random() * 1000000),
            lastUpdated: new Date().toISOString()
        };
    }
}
class MockOrdersAPI {
    async getOrders(params) {
        console.error('[MockBroker] getOrders called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockOrders.filter(order => !params.accountNumber || order.accountNumber === params.accountNumber);
    }
    async placeOrder(params) {
        console.error('[MockBroker] placeOrder called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 200));
        const newOrder = {
            orderId: `ORD${Date.now()}`,
            accountNumber: params.accountNumber || "12345678",
            symbol: params.symbol || "MOCK",
            quantity: params.quantity || 1,
            status: "PENDING",
            orderType: params.orderType || "MARKET",
            side: params.side || "BUY",
            price: params.price || 0,
            filledQuantity: 0,
            orderDate: new Date().toISOString()
        };
        mockOrders.push(newOrder);
        return newOrder;
    }
    async replaceOrder(params) {
        console.error('[MockBroker] replaceOrder called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 150));
        const orderIndex = mockOrders.findIndex(o => o.orderId === params.orderId && o.accountNumber === params.accountNumber);
        if (orderIndex === -1) {
            throw new Error(`Order ${params.orderId} not found`);
        }
        // Update the existing order with new parameters
        const existingOrder = mockOrders[orderIndex]; // We know it exists due to the check above
        const updatedOrder = {
            orderId: existingOrder.orderId,
            accountNumber: existingOrder.accountNumber,
            symbol: params.symbol || existingOrder.symbol,
            quantity: params.quantity || existingOrder.quantity,
            side: params.side || existingOrder.side,
            status: "PENDING", // Reset status when replaced
            orderType: params.orderType || existingOrder.orderType,
            price: params.price || existingOrder.price,
            orderDate: new Date().toISOString() // Update order date
        };
        mockOrders[orderIndex] = updatedOrder;
        return updatedOrder;
    }
    async cancelOrder(orderId, accountNumber) {
        console.error('[MockBroker] cancelOrder called for order:', orderId, 'account:', accountNumber);
        await new Promise(resolve => setTimeout(resolve, 100));
        const order = mockOrders.find(o => o.orderId === orderId && o.accountNumber === accountNumber);
        if (order) {
            order.status = "CANCELLED";
            return order;
        }
        throw new Error(`Order ${orderId} not found`);
    }
}
class MockTransactionsAPI {
    async getTransactions(params) {
        console.error('[MockBroker] getTransactions called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockTransactions.filter(txn => !params.accountNumber || txn.accountNumber === params.accountNumber);
    }
    async getTransaction(transactionId, accountNumber) {
        console.error('[MockBroker] getTransaction called for:', transactionId, 'account:', accountNumber);
        await new Promise(resolve => setTimeout(resolve, 50));
        const transaction = mockTransactions.find(t => t.transactionId === transactionId && t.accountNumber === accountNumber);
        if (!transaction) {
            throw new Error(`Transaction ${transactionId} not found`);
        }
        return transaction;
    }
}
class MockMarketDataAPI {
    quotesAPI;
    constructor() {
        this.quotesAPI = new MockQuotesAPI();
    }
    async getQuotes(params) {
        return this.quotesAPI.getQuotes(params);
    }
    async getPriceHistory(params) {
        console.error('[MockBroker] getPriceHistory called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 150));
        // Generate mock price history
        const days = 30;
        const candles = [];
        let price = 100;
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const open = price + (Math.random() - 0.5) * 2;
            const high = open + Math.random() * 3;
            const low = open - Math.random() * 3;
            const close = low + Math.random() * (high - low);
            const volume = Math.floor(Math.random() * 1000000);
            candles.push({
                datetime: date.toISOString(),
                open: Math.round(open * 100) / 100,
                high: Math.round(high * 100) / 100,
                low: Math.round(low * 100) / 100,
                close: Math.round(close * 100) / 100,
                volume
            });
            price = close;
        }
        return { candles: candles.reverse() };
    }
    async getMarketHours(params) {
        console.error('[MockBroker] getMarketHours called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
            equity: {
                isOpen: true,
                nextOpen: "09:30",
                nextClose: "16:00",
                timezone: "EST"
            },
            forex: {
                isOpen: true,
                nextOpen: "17:00",
                nextClose: "17:00",
                timezone: "EST"
            }
        };
    }
    async getMovers(params) {
        console.error('[MockBroker] getMovers called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 100));
        return [
            { symbol: "AAPL", change: 2.50, changePercent: 1.45 },
            { symbol: "GOOGL", change: -2.00, changePercent: -1.16 },
            { symbol: "MSFT", change: 3.25, changePercent: 0.85 }
        ];
    }
    async getOptionChain(params) {
        console.error('[MockBroker] getOptionChain called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
            symbol: params.symbol,
            status: "SUCCESS",
            underlyingPrice: 175.00,
            callExpDateMap: {
                "2024-01-19": {
                    "170.0": [{
                            putCall: "CALL",
                            symbol: `${params.symbol}_011924C170`,
                            bid: 5.20,
                            ask: 5.30,
                            last: 5.25,
                            mark: 5.25,
                            bidSize: 100,
                            askSize: 100,
                            volatility: 0.25,
                            delta: 0.65,
                            gamma: 0.05,
                            theta: -0.02,
                            vega: 0.15
                        }]
                }
            }
        };
    }
    async searchInstruments(params) {
        console.error('[MockBroker] searchInstruments called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
            [params.symbol]: {
                cusip: "037833100",
                symbol: params.symbol,
                description: `${params.symbol} - Mock Description`,
                exchange: "NASDAQ",
                assetType: "EQUITY"
            }
        };
    }
    async getInstrumentByCusip(params) {
        console.error('[MockBroker] getInstrumentByCusip called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
            cusip: params.cusip_id,
            symbol: "MOCK",
            description: "Mock Instrument - Retrieved by CUSIP",
            exchange: "NASDAQ",
            assetType: "EQUITY"
        };
    }
    async getNews(params) {
        console.error('[MockBroker] getNews called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 150));
        const mockNews = [
            {
                headline: `${params.symbol || 'Market'} reaches new highs amid strong earnings`,
                summary: "Strong quarterly results drive investor confidence",
                url: "https://example.com/news/1",
                source: "Mock Financial News",
                publishedDate: new Date().toISOString(),
                symbols: params.symbol ? [params.symbol] : ["SPY", "QQQ"]
            },
            {
                headline: "Federal Reserve maintains current interest rates",
                summary: "Fed officials signal measured approach to monetary policy",
                url: "https://example.com/news/2",
                source: "Mock Economic Times",
                publishedDate: new Date(Date.now() - 3600000).toISOString(),
                symbols: ["SPY"]
            }
        ];
        return mockNews.slice(0, params.maxResults || 10);
    }
    async getEarningsCalendar(params) {
        console.error('[MockBroker] getEarningsCalendar called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 120));
        const mockEarnings = [
            {
                symbol: params.symbol || "AAPL",
                companyName: "Mock Apple Inc.",
                earningsDate: new Date(Date.now() + 86400000).toISOString(),
                estimatedEPS: 1.25,
                actualEPS: undefined
            },
            {
                symbol: params.symbol || "GOOGL",
                companyName: "Mock Alphabet Inc.",
                earningsDate: new Date(Date.now() + 172800000).toISOString(),
                estimatedEPS: 2.15,
                actualEPS: undefined
            }
        ];
        return params.symbol ? mockEarnings.filter(e => e.symbol === params.symbol) : mockEarnings;
    }
    async getDividendHistory(params) {
        console.error('[MockBroker] getDividendHistory called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 100));
        const mockDividends = [
            {
                symbol: params.symbol,
                exDate: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
                payDate: new Date(Date.now() - 2419200000).toISOString(), // 28 days ago
                amount: 0.25,
                frequency: "Quarterly"
            },
            {
                symbol: params.symbol,
                exDate: new Date(Date.now() - 10368000000).toISOString(), // 120 days ago
                payDate: new Date(Date.now() - 10195200000).toISOString(), // 118 days ago
                amount: 0.23,
                frequency: "Quarterly"
            }
        ];
        return mockDividends;
    }
    async getCompanyProfile(params) {
        console.error('[MockBroker] getCompanyProfile called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
            symbol: params.symbol,
            companyName: `Mock ${params.symbol} Corporation`,
            description: `Mock company profile for ${params.symbol}. This is a simulated profile for testing purposes.`,
            sector: "Technology",
            industry: "Software & Services",
            marketCap: Math.floor(Math.random() * 1000000000000),
            employees: Math.floor(Math.random() * 100000)
        };
    }
}
// ===============================
// Additional Mock API Classes
// ===============================
// Mock data for new APIs
const mockWatchlists = [
    {
        watchlistId: "WL001",
        name: "Tech Stocks",
        description: "My favorite technology companies",
        symbols: ["AAPL", "GOOGL", "MSFT", "AMZN"]
    },
    {
        watchlistId: "WL002",
        name: "Growth Stocks",
        description: "High growth potential stocks",
        symbols: ["TSLA", "NVDA", "AMD"]
    }
];
class MockPortfolioAPI {
    async getPositions(params) {
        console.error('[MockBroker] getPositions called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 100));
        // Extract positions from mock accounts
        if (params.accountNumber) {
            const account = mockAccounts.find(acc => acc.accountNumber === params.accountNumber);
            return account?.positions || [];
        }
        return mockAccounts.flatMap(acc => acc.positions || []);
    }
    async getPortfolioSummary(params) {
        console.error('[MockBroker] getPortfolioSummary called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 120));
        const account = params.accountNumber
            ? mockAccounts.find(acc => acc.accountNumber === params.accountNumber)
            : mockAccounts[0];
        if (!account) {
            throw new Error('Account not found');
        }
        const totalValue = (account.balance || 0) + (account.positions?.reduce((sum, pos) => sum + (pos.marketValue || 0), 0) || 0);
        const dayChange = Math.random() * 2000 - 1000; // Random daily change
        return {
            accountNumber: account.accountNumber,
            totalValue,
            totalCash: account.balance || 0,
            totalEquity: account.positions?.reduce((sum, pos) => sum + (pos.marketValue || 0), 0) || 0,
            dayChange,
            dayChangePercent: totalValue > 0 ? (dayChange / totalValue) * 100 : 0,
            positions: account.positions || []
        };
    }
    async getPerformance(params) {
        console.error('[MockBroker] getPerformance called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 100));
        const totalReturn = Math.random() * 20000 - 5000; // Random return
        const dayReturn = Math.random() * 2000 - 1000; // Random daily return
        return {
            accountNumber: params.accountNumber || mockAccounts[0]?.accountNumber || "12345678",
            totalReturn,
            totalReturnPercent: Math.random() * 20 - 5, // Random percentage
            dayReturn,
            dayReturnPercent: Math.random() * 4 - 2, // Random daily percentage
            startDate: params.startDate || new Date(Date.now() - 31536000000).toISOString(), // 1 year ago
            endDate: params.endDate || new Date().toISOString()
        };
    }
}
class MockWatchlistAPI {
    async getWatchlists(params) {
        console.error('[MockBroker] getWatchlists called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 80));
        return [...mockWatchlists];
    }
    async createWatchlist(params) {
        console.error('[MockBroker] createWatchlist called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 100));
        const newWatchlist = {
            watchlistId: `WL${Date.now()}`,
            name: params.name,
            description: params.description,
            symbols: []
        };
        mockWatchlists.push(newWatchlist);
        return newWatchlist;
    }
    async addToWatchlist(params) {
        console.error('[MockBroker] addToWatchlist called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 60));
        const watchlist = mockWatchlists.find(wl => wl.watchlistId === params.watchlistId);
        if (!watchlist) {
            throw new Error(`Watchlist ${params.watchlistId} not found`);
        }
        if (!watchlist.symbols.includes(params.symbol)) {
            watchlist.symbols.push(params.symbol);
        }
        return { success: true, message: `Added ${params.symbol} to ${watchlist.name}` };
    }
    async removeFromWatchlist(params) {
        console.error('[MockBroker] removeFromWatchlist called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 60));
        const watchlist = mockWatchlists.find(wl => wl.watchlistId === params.watchlistId);
        if (!watchlist) {
            throw new Error(`Watchlist ${params.watchlistId} not found`);
        }
        const index = watchlist.symbols.indexOf(params.symbol);
        if (index > -1) {
            watchlist.symbols.splice(index, 1);
        }
        return { success: true, message: `Removed ${params.symbol} from ${watchlist.name}` };
    }
}
class MockActivityAPI {
    async getAccountActivity(params) {
        console.error('[MockBroker] getAccountActivity called with params:', params);
        await new Promise(resolve => setTimeout(resolve, 100));
        const mockActivity = [
            {
                activityId: "ACT001",
                accountNumber: params.accountNumber || mockAccounts[0]?.accountNumber || "12345678",
                type: "TRADE",
                description: "Bought 10 shares of AAPL at $175.00",
                amount: -1750.00,
                date: new Date().toISOString()
            },
            {
                activityId: "ACT002",
                accountNumber: params.accountNumber || mockAccounts[0]?.accountNumber || "12345678",
                type: "DIVIDEND",
                description: "Dividend payment from SPY",
                amount: 125.50,
                date: new Date(Date.now() - 86400000).toISOString()
            },
            {
                activityId: "ACT003",
                accountNumber: params.accountNumber || mockAccounts[0]?.accountNumber || "12345678",
                type: "INTEREST",
                description: "Interest credit",
                amount: 5.25,
                date: new Date(Date.now() - 172800000).toISOString()
            }
        ];
        return mockActivity
            .filter(activity => !params.accountNumber || activity.accountNumber === params.accountNumber)
            .slice(0, params.maxResults || 10);
    }
}
// ===============================
// Mock Broker Client
// ===============================
export class MockBrokerAdapter {
    brokerName = 'mock';
    accounts;
    quotes;
    orders;
    transactions;
    marketData;
    portfolio;
    watchlists;
    activity;
    constructor() {
        this.accounts = new MockAccountsAPI();
        this.quotes = new MockQuotesAPI();
        this.orders = new MockOrdersAPI();
        this.transactions = new MockTransactionsAPI();
        this.marketData = new MockMarketDataAPI();
        this.portfolio = new MockPortfolioAPI();
        this.watchlists = new MockWatchlistAPI();
        this.activity = new MockActivityAPI();
    }
    static async create(accessToken) {
        console.error('[MockBroker] Creating mock broker adapter with token:', accessToken ? 'PROVIDED' : 'MISSING');
        // Simulate async creation
        await new Promise(resolve => setTimeout(resolve, 10));
        return new MockBrokerAdapter();
    }
}
//# sourceMappingURL=mockBrokerAdapter.js.map