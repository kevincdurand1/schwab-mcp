/**
 * Trading tools for Generic Broker MCP
 * Provides account management and order execution capabilities
 * Works with any broker adapter (Schwab, Fidelity, TD Ameritrade, etc.)
 */
export declare const toolSpecs: readonly [import("../types.js").ToolSpec<import("zod").ZodObject<{
    fields: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    fields?: string | undefined;
}, {
    fields?: string | undefined;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    fields: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    fields?: string | undefined;
}, {
    fields?: string | undefined;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
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
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    orderId: import("zod").ZodString;
    accountNumber: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny, {
    accountNumber: string;
    orderId: string;
}, {
    accountNumber: string;
    orderId: string;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
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
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
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
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    orderId: import("zod").ZodString;
    accountNumber: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny, {
    accountNumber: string;
    orderId: string;
}, {
    accountNumber: string;
    orderId: string;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
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
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
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
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    accountNumber: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    accountNumber?: string | undefined;
}, {
    accountNumber?: string | undefined;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    accountNumber: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    accountNumber?: string | undefined;
}, {
    accountNumber?: string | undefined;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
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
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    name: import("zod").ZodString;
    description: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    name: string;
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    watchlistId: import("zod").ZodString;
    symbol: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny, {
    symbol: string;
    watchlistId: string;
}, {
    symbol: string;
    watchlistId: string;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    watchlistId: import("zod").ZodString;
    symbol: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny, {
    symbol: string;
    watchlistId: string;
}, {
    symbol: string;
    watchlistId: string;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
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
}>>];
export declare const traderTools: readonly [import("../types.js").ToolSpec<import("zod").ZodObject<{
    fields: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    fields?: string | undefined;
}, {
    fields?: string | undefined;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    fields: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    fields?: string | undefined;
}, {
    fields?: string | undefined;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
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
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    orderId: import("zod").ZodString;
    accountNumber: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny, {
    accountNumber: string;
    orderId: string;
}, {
    accountNumber: string;
    orderId: string;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
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
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
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
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    orderId: import("zod").ZodString;
    accountNumber: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny, {
    accountNumber: string;
    orderId: string;
}, {
    accountNumber: string;
    orderId: string;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
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
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
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
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    accountNumber: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    accountNumber?: string | undefined;
}, {
    accountNumber?: string | undefined;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    accountNumber: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    accountNumber?: string | undefined;
}, {
    accountNumber?: string | undefined;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
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
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{}, "strip", import("zod").ZodTypeAny, {}, {}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    name: import("zod").ZodString;
    description: import("zod").ZodOptional<import("zod").ZodString>;
}, "strip", import("zod").ZodTypeAny, {
    name: string;
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    watchlistId: import("zod").ZodString;
    symbol: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny, {
    symbol: string;
    watchlistId: string;
}, {
    symbol: string;
    watchlistId: string;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
    watchlistId: import("zod").ZodString;
    symbol: import("zod").ZodString;
}, "strip", import("zod").ZodTypeAny, {
    symbol: string;
    watchlistId: string;
}, {
    symbol: string;
    watchlistId: string;
}>>, import("../types.js").ToolSpec<import("zod").ZodObject<{
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
}>>];
