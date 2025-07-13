export * from './types';
export declare const allToolSpecs: (import("./types").ToolSpec<import("zod").ZodObject<{
    symbols: import("zod").ZodString;
    fields: import("zod").ZodOptional<import("zod").ZodString>;
    indicative: import("zod").ZodOptional<import("zod").ZodBoolean>;
}, "strip", import("zod").ZodTypeAny, {
    symbols: string;
    fields?: string | undefined;
    indicative?: boolean | undefined;
}, {
    symbols: string;
    fields?: string | undefined;
    indicative?: boolean | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    symbol: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny, {
    symbol: string;
}, {
    symbol: string;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    symbol: import("zod").ZodString;
    projection: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    symbol: string;
    projection?: string | undefined;
}, {
    symbol: string;
    projection?: string | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    markets: import("zod").ZodOptional<import("zod").ZodString>;
    date: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    date?: string | undefined;
    markets?: string | undefined;
}, {
    date?: string | undefined;
    markets?: string | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    symbol_id: import("zod").ZodString;
    sort: import("zod").ZodOptional<import("zod").ZodString>;
    frequency: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    symbol_id: string;
    sort?: string | undefined;
    frequency?: string | undefined;
}, {
    symbol_id: string;
    sort?: string | undefined;
    frequency?: string | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    symbol: import("zod").ZodString;
    contractType: import("zod").ZodOptional<import("zod").ZodEnum<["CALL", "PUT", "ALL"]>>;
    strikeCount: import("zod").ZodOptional<import("zod").ZodNumber>;
    includeUnderlyingQuote: import("zod").ZodOptional<import("zod").ZodBoolean>;
    strategy: import("zod").ZodOptional<import("zod").ZodEnum<["SINGLE", "ANALYTICAL", "COVERED", "VERTICAL", "CALENDAR", "STRANGLE", "STRADDLE", "BUTTERFLY", "CONDOR", "DIAGONAL", "COLLAR", "ROLL"]>>;
    interval: import("zod").ZodOptional<import("zod").ZodNumber>;
    strike: import("zod").ZodOptional<import("zod").ZodNumber>;
    range: import("zod").ZodOptional<import("zod").ZodString>;
    fromDate: import("zod").ZodOptional<import("zod").ZodString>;
    toDate: import("zod").ZodOptional<import("zod").ZodString>;
    volatility: import("zod").ZodOptional<import("zod").ZodNumber>;
    underlyingPrice: import("zod").ZodOptional<import("zod").ZodNumber>;
    interestRate: import("zod").ZodOptional<import("zod").ZodNumber>;
    daysToExpiration: import("zod").ZodOptional<import("zod").ZodNumber>;
    expMonth: import("zod").ZodOptional<import("zod").ZodEnum<["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "ALL"]>>;
    optionType: import("zod").ZodOptional<import("zod").ZodString>;
    entitlement: import("zod").ZodOptional<import("zod").ZodEnum<["PN", "NP", "PP"]>>;
}, "strip", import("zod").ZodTypeAny, {
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
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    symbol: import("zod").ZodString;
    period: import("zod").ZodOptional<import("zod").ZodNumber>;
    periodType: import("zod").ZodOptional<import("zod").ZodString>;
    frequency: import("zod").ZodOptional<import("zod").ZodNumber>;
    frequencyType: import("zod").ZodOptional<import("zod").ZodString>;
    startDate: import("zod").ZodOptional<import("zod").ZodString>;
    endDate: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
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
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    market_id: import("zod").ZodString;
    date: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    market_id: string;
    date?: string | undefined;
}, {
    market_id: string;
    date?: string | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    cusip_id: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny, {
    cusip_id: string;
}, {
    cusip_id: string;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    symbol: import("zod").ZodOptional<import("zod").ZodString>;
    maxResults: import("zod").ZodOptional<import("zod").ZodNumber>;
    fromDate: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    symbol?: string | undefined;
    maxResults?: number | undefined;
    fromDate?: string | undefined;
}, {
    symbol?: string | undefined;
    maxResults?: number | undefined;
    fromDate?: string | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    symbol: import("zod").ZodOptional<import("zod").ZodString>;
    fromDate: import("zod").ZodOptional<import("zod").ZodString>;
    toDate: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    symbol?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    symbol?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    symbol: import("zod").ZodString;
    fromDate: import("zod").ZodOptional<import("zod").ZodString>;
    toDate: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    symbol: string;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    symbol: string;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    fields: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    fields?: string | undefined;
}, {
    fields?: string | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    accountNumber: import("zod").ZodOptional<import("zod").ZodString>;
    maxResults: import("zod").ZodOptional<import("zod").ZodNumber>;
    fromEnteredTime: import("zod").ZodOptional<import("zod").ZodString>;
    toEnteredTime: import("zod").ZodOptional<import("zod").ZodString>;
    status: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    status?: string | undefined;
    accountNumber?: string | undefined;
    maxResults?: number | undefined;
    fromEnteredTime?: string | undefined;
    toEnteredTime?: string | undefined;
}, {
    status?: string | undefined;
    accountNumber?: string | undefined;
    maxResults?: number | undefined;
    fromEnteredTime?: string | undefined;
    toEnteredTime?: string | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    orderId: import("zod").ZodString;
    accountNumber: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny, {
    accountNumber: string;
    orderId: string;
}, {
    accountNumber: string;
    orderId: string;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    accountNumber: import("zod").ZodOptional<import("zod").ZodString>;
    startDate: import("zod").ZodOptional<import("zod").ZodString>;
    endDate: import("zod").ZodOptional<import("zod").ZodString>;
    symbol: import("zod").ZodOptional<import("zod").ZodString>;
    type: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    symbol?: string | undefined;
    type?: string | undefined;
    accountNumber?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    symbol?: string | undefined;
    type?: string | undefined;
    accountNumber?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    accountNumber: import("zod").ZodString;
    symbol: import("zod").ZodString;
    quantity: import("zod").ZodNumber;
    side: import("zod").ZodEnum<["BUY", "SELL"]>;
    orderType: import("zod").ZodEnum<["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]>;
    price: import("zod").ZodOptional<import("zod").ZodNumber>;
    duration: import("zod").ZodOptional<import("zod").ZodEnum<["DAY", "GTC", "FILL_OR_KILL"]>>;
}, "strip", import("zod").ZodTypeAny, {
    symbol: string;
    accountNumber: string;
    quantity: number;
    side: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
    price?: number | undefined;
    duration?: "DAY" | "GTC" | "FILL_OR_KILL" | undefined;
}, {
    symbol: string;
    accountNumber: string;
    quantity: number;
    side: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
    price?: number | undefined;
    duration?: "DAY" | "GTC" | "FILL_OR_KILL" | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    orderId: import("zod").ZodString;
    accountNumber: import("zod").ZodString;
    symbol: import("zod").ZodString;
    quantity: import("zod").ZodNumber;
    side: import("zod").ZodEnum<["BUY", "SELL"]>;
    orderType: import("zod").ZodEnum<["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]>;
    price: import("zod").ZodOptional<import("zod").ZodNumber>;
    duration: import("zod").ZodOptional<import("zod").ZodEnum<["DAY", "GTC", "FILL_OR_KILL"]>>;
}, "strip", import("zod").ZodTypeAny, {
    symbol: string;
    accountNumber: string;
    orderId: string;
    quantity: number;
    side: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
    price?: number | undefined;
    duration?: "DAY" | "GTC" | "FILL_OR_KILL" | undefined;
}, {
    symbol: string;
    accountNumber: string;
    orderId: string;
    quantity: number;
    side: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
    price?: number | undefined;
    duration?: "DAY" | "GTC" | "FILL_OR_KILL" | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    accountNumber: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    accountNumber?: string | undefined;
}, {
    accountNumber?: string | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    accountNumber: import("zod").ZodOptional<import("zod").ZodString>;
    startDate: import("zod").ZodOptional<import("zod").ZodString>;
    endDate: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    accountNumber?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    accountNumber?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    name: import("zod").ZodString;
    description: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    name: string;
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    watchlistId: import("zod").ZodString;
    symbol: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny, {
    symbol: string;
    watchlistId: string;
}, {
    symbol: string;
    watchlistId: string;
}>> | import("./types").ToolSpec<import("zod").ZodObject<{
    accountNumber: import("zod").ZodOptional<import("zod").ZodString>;
    maxResults: import("zod").ZodOptional<import("zod").ZodNumber>;
    fromDate: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    accountNumber?: string | undefined;
    maxResults?: number | undefined;
    fromDate?: string | undefined;
}, {
    accountNumber?: string | undefined;
    maxResults?: number | undefined;
    fromDate?: string | undefined;
}>>)[];
