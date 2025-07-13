/**
 * Schwab API Client - Core HTTP client with authentication
 */
import { type SchwabApiConfig, type SchwabApiResponse } from './types.js';
export declare class SchwabApiClient {
    private config;
    private readonly baseUrl;
    private readonly tokenManager;
    constructor(config: SchwabApiConfig);
    /**
     * Make an authenticated request to the Schwab API
     */
    request<T = any>(endpoint: string, options?: RequestInit): Promise<SchwabApiResponse<T>>;
    /**
     * GET request helper
     */
    get<T = any>(endpoint: string, params?: Record<string, any>): Promise<SchwabApiResponse<T>>;
    /**
     * POST request helper
     */
    post<T = any>(endpoint: string, body?: any): Promise<SchwabApiResponse<T>>;
    /**
     * PUT request helper
     */
    put<T = any>(endpoint: string, body?: any): Promise<SchwabApiResponse<T>>;
    /**
     * DELETE request helper
     */
    delete<T = any>(endpoint: string): Promise<SchwabApiResponse<T>>;
}
