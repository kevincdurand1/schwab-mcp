/**
 * Market data tools for Generic Broker MCP
 * Works with any broker adapter (Schwab, Fidelity, TD Ameritrade, etc.)
 */
import { GetQuotesParamsSchema, GetMarketHoursByMarketIdParamsSchema, GetOptionExpirationChainParamsSchema, GetInstrumentByCusipParamsSchema, GetNewsParamsSchema, GetEarningsCalendarParamsSchema, GetDividendHistoryParamsSchema, GetCompanyProfileParamsSchema, } from '../../core/types.js';
import { createToolSpec } from '../types.js';
import { z } from 'zod';
// Generic parameter schemas for market data tools
const GetQuoteBySymbolParamsSchema = z.object({
    symbol: z.string().describe('Stock symbol to get quote for')
});
const GetInstrumentsParamsSchema = z.object({
    symbol: z.string().describe('Symbol to search for'),
    projection: z.string().optional().describe('Projection type for instrument data')
});
const GetPriceHistoryParamsSchema = z.object({
    symbol: z.string().describe('Stock symbol'),
    period: z.number().optional().describe('Period for price history'),
    periodType: z.string().optional().describe('Period type (day, month, year, ytd)'),
    frequency: z.number().optional().describe('Frequency of data'),
    frequencyType: z.string().optional().describe('Frequency type (minute, daily, weekly, monthly)'),
    startDate: z.string().optional().describe('Start date for history'),
    endDate: z.string().optional().describe('End date for history')
});
const GetMarketHoursParamsSchema = z.object({
    markets: z.string().optional().describe('Markets to get hours for'),
    date: z.string().optional().describe('Date to check market hours')
});
const GetMoversParamsSchema = z.object({
    symbol_id: z.string().describe('Index symbol ($SPX, $COMPX, $DJI)'),
    sort: z.string().optional().describe('Sort order (VOLUME, TRADES, PERCENT_CHANGE_UP, PERCENT_CHANGE_DOWN)'),
    frequency: z.string().optional().describe('Frequency (0 = once, 1 = every minute)')
});
const GetOptionChainParamsSchema = z.object({
    symbol: z.string().describe('Underlying symbol (e.g., AAPL)'),
    contractType: z.enum(['CALL', 'PUT', 'ALL']).optional().describe('Contract type - CALL, PUT, or ALL'),
    strikeCount: z.number().int().optional().describe('Number of strikes to return above/below ATM price'),
    includeUnderlyingQuote: z.boolean().optional().describe('Include underlying quotes'),
    strategy: z.enum(['SINGLE', 'ANALYTICAL', 'COVERED', 'VERTICAL', 'CALENDAR', 'STRANGLE', 'STRADDLE', 'BUTTERFLY', 'CONDOR', 'DIAGONAL', 'COLLAR', 'ROLL']).optional().describe('Option chain strategy (default: SINGLE)'),
    interval: z.number().optional().describe('Strike interval for spread strategy chains'),
    strike: z.number().optional().describe('Specific strike price'),
    range: z.string().optional().describe('Range (ITM/NTM/OTM etc.)'),
    fromDate: z.string().optional().describe('From date (yyyy-MM-dd format)'),
    toDate: z.string().optional().describe('To date (yyyy-MM-dd format)'),
    volatility: z.number().optional().describe('Volatility for ANALYTICAL strategy calculations'),
    underlyingPrice: z.number().optional().describe('Underlying price for ANALYTICAL strategy calculations'),
    interestRate: z.number().optional().describe('Interest rate for ANALYTICAL strategy calculations'),
    daysToExpiration: z.number().int().optional().describe('Days to expiration for ANALYTICAL strategy calculations'),
    expMonth: z.enum(['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'ALL']).optional().describe('Expiration month'),
    optionType: z.string().optional().describe('Option type'),
    entitlement: z.enum(['PN', 'NP', 'PP']).optional().describe('Client entitlement (PN=NonPayingPro, NP=NonPro, PP=PayingPro)')
});
// Use console.error for logging to avoid polluting stdout (MCP communication channel)  
const log = {
    info: (msg, data) => console.error(`[INFO] ${msg}`, data || ''),
    error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
};
export const toolSpecs = [
    createToolSpec({
        name: 'getQuotes',
        description: 'Get quotes for a list of symbols',
        schema: GetQuotesParamsSchema,
        call: async (c, p) => {
            log.info('[getQuotes] Fetching quotes', {
                symbols: p.symbols,
                fields: p.fields,
            });
            return await c.marketData.getQuotes(p);
        },
    }),
    createToolSpec({
        name: 'getQuoteBySymbol',
        description: 'Get quote for a single symbol',
        schema: GetQuoteBySymbolParamsSchema,
        call: async (c, p) => {
            log.info('[getQuoteBySymbol] Fetching quote', {
                symbol: p.symbol,
            });
            return await c.quotes.getQuote(p.symbol);
        },
    }),
    createToolSpec({
        name: 'searchInstruments',
        description: 'Search for instruments by symbols and projections',
        schema: GetInstrumentsParamsSchema,
        call: async (c, p) => {
            log.info('[searchInstruments] Searching instruments', {
                symbol: p.symbol,
                projection: p.projection,
            });
            return await c.marketData.searchInstruments(p);
        },
    }),
    createToolSpec({
        name: 'getMarketHours',
        description: 'Get market hours for different markets',
        schema: GetMarketHoursParamsSchema,
        call: async (c, p) => {
            log.info('[getMarketHours] Fetching market hours', {
                markets: p.markets,
                date: p.date,
            });
            return await c.marketData.getMarketHours(p);
        },
    }),
    createToolSpec({
        name: 'getMovers',
        description: 'Get movers for a specific index',
        schema: GetMoversParamsSchema,
        call: async (c, p) => {
            log.info('[getMovers] Fetching movers', {
                symbol_id: p.symbol_id,
                sort: p.sort,
                frequency: p.frequency,
            });
            return await c.marketData.getMovers(p);
        },
    }),
    createToolSpec({
        name: 'getOptionChain',
        description: 'Get option chain for an optionable symbol',
        schema: GetOptionChainParamsSchema,
        call: async (c, p) => {
            log.info('[getOptionChain] Fetching option chain', {
                symbol: p.symbol,
            });
            return await c.marketData.getOptionChain(p);
        },
    }),
    createToolSpec({
        name: 'getPriceHistory',
        description: 'Get price history for a specific symbol and date range',
        schema: GetPriceHistoryParamsSchema,
        call: async (c, p) => {
            log.info('[getPriceHistory] Fetching price history', {
                symbol: p.symbol,
                period: p.period,
                periodType: p.periodType,
            });
            return await c.marketData.getPriceHistory(p);
        },
    }),
    createToolSpec({
        name: 'getMarketHoursByMarketId',
        description: 'Get market hours for a specific market ID',
        schema: GetMarketHoursByMarketIdParamsSchema,
        call: async (c, p) => {
            log.info('[getMarketHoursByMarketId] Fetching market hours', {
                market_id: p.market_id,
                date: p.date,
            });
            // Use the generic getMarketHours method with market_id parameter
            return await c.marketData.getMarketHours({ market_id: p.market_id, date: p.date });
        },
    }),
    createToolSpec({
        name: 'getOptionExpirationChain',
        description: 'Get option expiration chain for an optionable symbol',
        schema: GetOptionExpirationChainParamsSchema,
        call: async (c, p) => {
            log.info('[getOptionExpirationChain] Fetching option expiration chain', {
                symbol: p.symbol,
            });
            // Use the generic getOptionChain method with expiration flag
            return await c.marketData.getOptionChain({ symbol: p.symbol, expiration: true });
        },
    }),
    createToolSpec({
        name: 'getInstrumentByCusip',
        description: 'Get instrument information by CUSIP identifier',
        schema: GetInstrumentByCusipParamsSchema,
        call: async (c, p) => {
            log.info('[getInstrumentByCusip] Fetching instrument by CUSIP', {
                cusip_id: p.cusip_id,
            });
            return await c.marketData.getInstrumentByCusip(p);
        },
    }),
    createToolSpec({
        name: 'getNews',
        description: 'Get market news for symbols or general market news',
        schema: GetNewsParamsSchema,
        call: async (c, p) => {
            log.info('[getNews] Fetching news', {
                symbol: p.symbol,
                maxResults: p.maxResults,
                fromDate: p.fromDate,
            });
            return await c.marketData.getNews(p);
        },
    }),
    createToolSpec({
        name: 'getEarningsCalendar',
        description: 'Get earnings calendar for symbols or all earnings',
        schema: GetEarningsCalendarParamsSchema,
        call: async (c, p) => {
            log.info('[getEarningsCalendar] Fetching earnings calendar', {
                symbol: p.symbol,
                fromDate: p.fromDate,
                toDate: p.toDate,
            });
            return await c.marketData.getEarningsCalendar(p);
        },
    }),
    createToolSpec({
        name: 'getDividendHistory',
        description: 'Get dividend history for a symbol',
        schema: GetDividendHistoryParamsSchema,
        call: async (c, p) => {
            log.info('[getDividendHistory] Fetching dividend history', {
                symbol: p.symbol,
                fromDate: p.fromDate,
                toDate: p.toDate,
            });
            return await c.marketData.getDividendHistory(p);
        },
    }),
    createToolSpec({
        name: 'getCompanyProfile',
        description: 'Get company profile and fundamental data for a symbol',
        schema: GetCompanyProfileParamsSchema,
        call: async (c, p) => {
            log.info('[getCompanyProfile] Fetching company profile', {
                symbol: p.symbol,
            });
            return await c.marketData.getCompanyProfile(p);
        },
    }),
];
export const marketTools = toolSpecs;
//# sourceMappingURL=index.js.map