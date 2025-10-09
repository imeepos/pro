/**
 * HTTP 客户端封装
 */
export class HttpClient {
  constructor(private baseUrl: string) {}

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    const fullUrl = new URL(url, this.baseUrl);

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          fullUrl.searchParams.append(key, String(params[key]));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (data) {
      if (data instanceof FormData) {
        delete headers['Content-Type'];
        options.body = data;
      } else {
        options.body = JSON.stringify(data);
      }
    }

    const response = await fetch(fullUrl.toString(), options);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', url, undefined, params);
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>('POST', url, data);
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>('PUT', url, data);
  }

  async delete<T>(url: string): Promise<T> {
    return this.request<T>('DELETE', url);
  }

  private getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }
}
