/**
 * API Test Helpers
 * 
 * Provides helper functions for making API requests in tests
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4000';

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

/**
 * Make a POST request to an API endpoint
 */
export async function apiPost<T = any>(
  endpoint: string,
  body: any,
  headers: Record<string, string> = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data,
    error: data.error,
  };
}

/**
 * Make a GET request to an API endpoint
 */
export async function apiGet<T = any>(
  endpoint: string,
  headers: Record<string, string> = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data,
    error: data.error,
  };
}

