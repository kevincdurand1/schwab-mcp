export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: string;
  scope?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TokenStore {
  // Support both single-user and multi-user signatures
  get(userId?: string): Promise<TokenData | null>;
  set(userId: string, tokenData: TokenData): Promise<void>;
  set(tokenData: TokenData): Promise<void>;
  delete(userId?: string): Promise<void>;
  refresh(userId: string, newTokenData: Partial<TokenData>): Promise<void>;
  refresh(newTokenData: Partial<TokenData>): Promise<void>;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scope: string;
}