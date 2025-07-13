/**
 * Types for our custom Schwab API client
 */

// OAuth Token Types
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: string;
  scope: string;
  createdAt: string;
  updatedAt?: string;
}

// Token Manager Interface
export interface TokenManager {
  load(): Promise<TokenData>;
  save(tokenData: Partial<TokenData>): Promise<void>;
  refresh?(refreshToken: string, clientId: string, clientSecret: string): Promise<TokenData>;
}

// API Response Types
export interface SchwabApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

// Account Types
export interface Account {
  accountNumber: string;
  type: string;
  displayName?: string;
  positions?: Position[];
  balances?: AccountBalances;
  [key: string]: any; // Allow additional fields
}

export interface Position {
  symbol: string;
  quantity: number;
  marketValue: number;
  averagePrice?: number;
  [key: string]: any;
}

export interface AccountBalances {
  cashBalance?: number;
  totalValue?: number;
  buyingPower?: number;
  [key: string]: any;
}

// Quote Types
export interface Quote {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  bid?: number;
  ask?: number;
  [key: string]: any;
}

// Order Types
export interface Order {
  orderId: string;
  accountNumber: string;
  symbol: string;
  quantity: number;
  status: string;
  orderType?: string;
  side?: 'BUY' | 'SELL';
  [key: string]: any;
}

// Transaction Types
export interface Transaction {
  transactionId: string;
  accountNumber: string;
  type: string;
  amount: number;
  date: string;
  symbol?: string;
  [key: string]: any;
}

// API Client Configuration
export interface SchwabApiConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl?: string;
  tokenManager: TokenManager;
}

// API Parameters
export interface GetAccountsParams {
  fields?: string;
}

export interface GetQuotesParams {
  symbols: string[];
  fields?: string;
  indicative?: boolean;
}

export interface GetOrdersParams {
  accountNumber: string;
  maxResults?: number;
  fromEnteredTime?: string;
  toEnteredTime?: string;
  status?: string;
}

export interface GetTransactionsParams {
  accountNumber: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

// Error Types
export class SchwabApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SchwabApiError';
  }
}

export class SchwabAuthError extends SchwabApiError {
  constructor(message: string, details?: any) {
    super(message, 401, 'AUTH_ERROR', details);
    this.name = 'SchwabAuthError';
  }
}