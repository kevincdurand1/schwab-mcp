/**
 * Schwab API Client - Core HTTP client with authentication
 */

import { 
  type SchwabApiConfig, 
  type TokenData, 
  type SchwabApiResponse,
  SchwabApiError, 
  SchwabAuthError 
} from './types.js';

export class SchwabApiClient {
  private readonly baseUrl: string;
  private readonly tokenManager;

  constructor(private config: SchwabApiConfig) {
    this.baseUrl = config.baseUrl || 'https://api.schwabapi.com';
    this.tokenManager = config.tokenManager;
  }

  /**
   * Make an authenticated request to the Schwab API
   */
  async request<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<SchwabApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get current tokens
    let tokenData: TokenData;
    try {
      tokenData = await this.tokenManager.load();
    } catch (error) {
      throw new SchwabAuthError('Failed to load authentication tokens', error);
    }

    // Check if token needs refresh (5 minutes before expiry)
    const expirationTime = new Date(tokenData.expiresAt);
    const now = new Date();
    const timeToExpiry = expirationTime.getTime() - now.getTime();
    const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    if (timeToExpiry < REFRESH_THRESHOLD) {
      try {
        console.error('[SchwabAPI] Token expires soon, refreshing...');
        const refreshedTokenData = await this.tokenManager.refresh?.(
          tokenData.refreshToken,
          this.config.clientId,
          this.config.clientSecret
        );
        if (refreshedTokenData) {
          tokenData = refreshedTokenData;
        }
      } catch (refreshError) {
        console.error('[SchwabAPI] Token refresh failed:', refreshError);
        // Continue with existing token, might still work
      }
    }

    // Prepare request headers
    const headers: Record<string, string> = {
      'Authorization': `${tokenData.tokenType} ${tokenData.accessToken}`,
      'Accept': 'application/json'
    };

    // Add custom headers if provided
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    // Only add Content-Type for requests with body
    if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      headers['Content-Type'] = 'application/json';
    }


    // Make the request
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // Handle authentication errors
      if (response.status === 401) {
        throw new SchwabAuthError(`Unauthorized access to ${endpoint}. Token may be invalid or expired.`);
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = { message: errorText };
        }
        
        throw new SchwabApiError(
          `API Error for ${options.method || 'GET'} ${endpoint}: ${response.statusText}`,
          response.status,
          `HTTP_${response.status}`,
          errorDetails
        );
      }

      // Parse response
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as any;
      }

      return {
        data,
        status: response.status,
        headers: responseHeaders
      };

    } catch (error) {
      if (error instanceof SchwabApiError || error instanceof SchwabAuthError) {
        throw error;
      }
      
      throw new SchwabApiError(
        `Network error when calling ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        'NETWORK_ERROR',
        error
      );
    }
  }

  /**
   * GET request helper
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<SchwabApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            searchParams.append(key, value.join(','));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * POST request helper
   */
  async post<T = any>(endpoint: string, body?: any): Promise<SchwabApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  /**
   * PUT request helper
   */
  async put<T = any>(endpoint: string, body?: any): Promise<SchwabApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  /**
   * DELETE request helper
   */
  async delete<T = any>(endpoint: string): Promise<SchwabApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}