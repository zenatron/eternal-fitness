// 🚀 UNIFIED API CLIENT
// Single source of truth for client-side API calls

/**
 * API Error class for client-side error handling
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any,
    public errorId?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Standard API response format
 */
export interface ApiResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    message: string;
    id?: string;
    details?: any;
  };
}

/**
 * Unified API client with consistent error handling and response parsing
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Make API request with unified error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ApiErrorResponse;
        throw new ApiClientError(
          errorData.error.message || 'API request failed',
          response.status,
          errorData.error.details,
          errorData.error.id
        );
      }

      return (data as ApiResponse<T>).data;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      // Network or parsing errors
      throw new ApiClientError(
        'Network error or invalid response',
        0,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = params 
      ? `${endpoint}?${new URLSearchParams(params).toString()}`
      : endpoint;
    
    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Simple GET request
 */
export function apiGet<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  return apiClient.get<T>(endpoint, params);
}

/**
 * Simple POST request
 */
export function apiPost<T>(endpoint: string, data?: any): Promise<T> {
  return apiClient.post<T>(endpoint, data);
}

/**
 * Simple PUT request
 */
export function apiPut<T>(endpoint: string, data?: any): Promise<T> {
  return apiClient.put<T>(endpoint, data);
}

/**
 * Simple PATCH request
 */
export function apiPatch<T>(endpoint: string, data?: any): Promise<T> {
  return apiClient.patch<T>(endpoint, data);
}

/**
 * Simple DELETE request
 */
export function apiDelete<T>(endpoint: string): Promise<T> {
  return apiClient.delete<T>(endpoint);
}
