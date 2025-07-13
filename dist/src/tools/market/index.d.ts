/**
 * Market data tools for Generic Broker MCP
 * Works with any broker adapter (Schwab, Fidelity, TD Ameritrade, etc.)
 */
import { z } from 'zod';
export declare const toolSpecs: readonly [import("../types.js").ToolSpec<z.ZodObject<{
    symbols: z.ZodString;
    fields: z.ZodOptional<z.ZodString>;
    indicative: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    symbols: string;
    fields?: string | undefined;
    indicative?: boolean | undefined;
}, {
    symbols: string;
    fields?: string | undefined;
    indicative?: boolean | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
}, {
    symbol: string;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodString;
    projection: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    projection?: string | undefined;
}, {
    symbol: string;
    projection?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    markets: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    date?: string | undefined;
    markets?: string | undefined;
}, {
    date?: string | undefined;
    markets?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol_id: z.ZodString;
    sort: z.ZodOptional<z.ZodString>;
    frequency: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol_id: string;
    sort?: string | undefined;
    frequency?: string | undefined;
}, {
    symbol_id: string;
    sort?: string | undefined;
    frequency?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodString;
    contractType: z.ZodOptional<z.ZodEnum<["CALL", "PUT", "ALL"]>>;
    strikeCount: z.ZodOptional<z.ZodNumber>;
    includeUnderlyingQuote: z.ZodOptional<z.ZodBoolean>;
    strategy: z.ZodOptional<z.ZodEnum<["SINGLE", "ANALYTICAL", "COVERED", "VERTICAL", "CALENDAR", "STRANGLE", "STRADDLE", "BUTTERFLY", "CONDOR", "DIAGONAL", "COLLAR", "ROLL"]>>;
    interval: z.ZodOptional<z.ZodNumber>;
    strike: z.ZodOptional<z.ZodNumber>;
    range: z.ZodOptional<z.ZodString>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
    volatility: z.ZodOptional<z.ZodNumber>;
    underlyingPrice: z.ZodOptional<z.ZodNumber>;
    interestRate: z.ZodOptional<z.ZodNumber>;
    daysToExpiration: z.ZodOptional<z.ZodNumber>;
    expMonth: z.ZodOptional<z.ZodEnum<["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "ALL"]>>;
    optionType: z.ZodOptional<z.ZodString>;
    entitlement: z.ZodOptional<z.ZodEnum<["PN", "NP", "PP"]>>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    strike?: number | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
    contractType?: "CALL" | "PUT" | "ALL" | undefined;
    strikeCount?: number | undefined;
    includeUnderlyingQuote?: boolean | undefined;
    strategy?: "SINGLE" | "ANALYTICAL" | "COVERED" | "VERTICAL" | "CALENDAR" | "STRANGLE" | "STRADDLE" | "BUTTERFLY" | "CONDOR" | "DIAGONAL" | "COLLAR" | "ROLL" | undefined;
    interval?: number | undefined;
    range?: string | undefined;
    volatility?: number | undefined;
    underlyingPrice?: number | undefined;
    interestRate?: number | undefined;
    daysToExpiration?: number | undefined;
    expMonth?: "ALL" | "JAN" | "FEB" | "MAR" | "APR" | "MAY" | "JUN" | "JUL" | "AUG" | "SEP" | "OCT" | "NOV" | "DEC" | undefined;
    optionType?: string | undefined;
    entitlement?: "PN" | "NP" | "PP" | undefined;
}, {
    symbol: string;
    strike?: number | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
    contractType?: "CALL" | "PUT" | "ALL" | undefined;
    strikeCount?: number | undefined;
    includeUnderlyingQuote?: boolean | undefined;
    strategy?: "SINGLE" | "ANALYTICAL" | "COVERED" | "VERTICAL" | "CALENDAR" | "STRANGLE" | "STRADDLE" | "BUTTERFLY" | "CONDOR" | "DIAGONAL" | "COLLAR" | "ROLL" | undefined;
    interval?: number | undefined;
    range?: string | undefined;
    volatility?: number | undefined;
    underlyingPrice?: number | undefined;
    interestRate?: number | undefined;
    daysToExpiration?: number | undefined;
    expMonth?: "ALL" | "JAN" | "FEB" | "MAR" | "APR" | "MAY" | "JUN" | "JUL" | "AUG" | "SEP" | "OCT" | "NOV" | "DEC" | undefined;
    optionType?: string | undefined;
    entitlement?: "PN" | "NP" | "PP" | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodString;
    period: z.ZodOptional<z.ZodNumber>;
    periodType: z.ZodOptional<z.ZodString>;
    frequency: z.ZodOptional<z.ZodNumber>;
    frequencyType: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    startDate?: string | undefined;
    endDate?: string | undefined;
    frequency?: number | undefined;
    periodType?: string | undefined;
    period?: number | undefined;
    frequencyType?: string | undefined;
}, {
    symbol: string;
    startDate?: string | undefined;
    endDate?: string | undefined;
    frequency?: number | undefined;
    periodType?: string | undefined;
    period?: number | undefined;
    frequencyType?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    market_id: z.ZodString;
    date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    market_id: string;
    date?: string | undefined;
}, {
    market_id: string;
    date?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
}, {
    symbol: string;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    cusip_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    cusip_id: string;
}, {
    cusip_id: string;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodOptional<z.ZodString>;
    maxResults: z.ZodOptional<z.ZodNumber>;
    fromDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol?: string | undefined;
    maxResults?: number | undefined;
    fromDate?: string | undefined;
}, {
    symbol?: string | undefined;
    maxResults?: number | undefined;
    fromDate?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodOptional<z.ZodString>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    symbol?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodString;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    symbol: string;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
}, {
    symbol: string;
}>>];
export declare const marketTools: readonly [import("../types.js").ToolSpec<z.ZodObject<{
    symbols: z.ZodString;
    fields: z.ZodOptional<z.ZodString>;
    indicative: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    symbols: string;
    fields?: string | undefined;
    indicative?: boolean | undefined;
}, {
    symbols: string;
    fields?: string | undefined;
    indicative?: boolean | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
}, {
    symbol: string;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodString;
    projection: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    projection?: string | undefined;
}, {
    symbol: string;
    projection?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    markets: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    date?: string | undefined;
    markets?: string | undefined;
}, {
    date?: string | undefined;
    markets?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol_id: z.ZodString;
    sort: z.ZodOptional<z.ZodString>;
    frequency: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol_id: string;
    sort?: string | undefined;
    frequency?: string | undefined;
}, {
    symbol_id: string;
    sort?: string | undefined;
    frequency?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodString;
    contractType: z.ZodOptional<z.ZodEnum<["CALL", "PUT", "ALL"]>>;
    strikeCount: z.ZodOptional<z.ZodNumber>;
    includeUnderlyingQuote: z.ZodOptional<z.ZodBoolean>;
    strategy: z.ZodOptional<z.ZodEnum<["SINGLE", "ANALYTICAL", "COVERED", "VERTICAL", "CALENDAR", "STRANGLE", "STRADDLE", "BUTTERFLY", "CONDOR", "DIAGONAL", "COLLAR", "ROLL"]>>;
    interval: z.ZodOptional<z.ZodNumber>;
    strike: z.ZodOptional<z.ZodNumber>;
    range: z.ZodOptional<z.ZodString>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
    volatility: z.ZodOptional<z.ZodNumber>;
    underlyingPrice: z.ZodOptional<z.ZodNumber>;
    interestRate: z.ZodOptional<z.ZodNumber>;
    daysToExpiration: z.ZodOptional<z.ZodNumber>;
    expMonth: z.ZodOptional<z.ZodEnum<["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "ALL"]>>;
    optionType: z.ZodOptional<z.ZodString>;
    entitlement: z.ZodOptional<z.ZodEnum<["PN", "NP", "PP"]>>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    strike?: number | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
    contractType?: "CALL" | "PUT" | "ALL" | undefined;
    strikeCount?: number | undefined;
    includeUnderlyingQuote?: boolean | undefined;
    strategy?: "SINGLE" | "ANALYTICAL" | "COVERED" | "VERTICAL" | "CALENDAR" | "STRANGLE" | "STRADDLE" | "BUTTERFLY" | "CONDOR" | "DIAGONAL" | "COLLAR" | "ROLL" | undefined;
    interval?: number | undefined;
    range?: string | undefined;
    volatility?: number | undefined;
    underlyingPrice?: number | undefined;
    interestRate?: number | undefined;
    daysToExpiration?: number | undefined;
    expMonth?: "ALL" | "JAN" | "FEB" | "MAR" | "APR" | "MAY" | "JUN" | "JUL" | "AUG" | "SEP" | "OCT" | "NOV" | "DEC" | undefined;
    optionType?: string | undefined;
    entitlement?: "PN" | "NP" | "PP" | undefined;
}, {
    symbol: string;
    strike?: number | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
    contractType?: "CALL" | "PUT" | "ALL" | undefined;
    strikeCount?: number | undefined;
    includeUnderlyingQuote?: boolean | undefined;
    strategy?: "SINGLE" | "ANALYTICAL" | "COVERED" | "VERTICAL" | "CALENDAR" | "STRANGLE" | "STRADDLE" | "BUTTERFLY" | "CONDOR" | "DIAGONAL" | "COLLAR" | "ROLL" | undefined;
    interval?: number | undefined;
    range?: string | undefined;
    volatility?: number | undefined;
    underlyingPrice?: number | undefined;
    interestRate?: number | undefined;
    daysToExpiration?: number | undefined;
    expMonth?: "ALL" | "JAN" | "FEB" | "MAR" | "APR" | "MAY" | "JUN" | "JUL" | "AUG" | "SEP" | "OCT" | "NOV" | "DEC" | undefined;
    optionType?: string | undefined;
    entitlement?: "PN" | "NP" | "PP" | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodString;
    period: z.ZodOptional<z.ZodNumber>;
    periodType: z.ZodOptional<z.ZodString>;
    frequency: z.ZodOptional<z.ZodNumber>;
    frequencyType: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    startDate?: string | undefined;
    endDate?: string | undefined;
    frequency?: number | undefined;
    periodType?: string | undefined;
    period?: number | undefined;
    frequencyType?: string | undefined;
}, {
    symbol: string;
    startDate?: string | undefined;
    endDate?: string | undefined;
    frequency?: number | undefined;
    periodType?: string | undefined;
    period?: number | undefined;
    frequencyType?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    market_id: z.ZodString;
    date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    market_id: string;
    date?: string | undefined;
}, {
    market_id: string;
    date?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
}, {
    symbol: string;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    cusip_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    cusip_id: string;
}, {
    cusip_id: string;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodOptional<z.ZodString>;
    maxResults: z.ZodOptional<z.ZodNumber>;
    fromDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol?: string | undefined;
    maxResults?: number | undefined;
    fromDate?: string | undefined;
}, {
    symbol?: string | undefined;
    maxResults?: number | undefined;
    fromDate?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodOptional<z.ZodString>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    symbol?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodString;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    symbol: string;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}>>, import("../types.js").ToolSpec<z.ZodObject<{
    symbol: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
}, {
    symbol: string;
}>>];
