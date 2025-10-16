/**
 * HTTP 客户端封装
 */
export class HttpClient {
  private readonly tokenKey: string;

  constructor(private baseUrl: string, tokenKey: string = 'access_token') {
    this.tokenKey = tokenKey;
  }

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    const fullUrl = new URL(url, this.baseUrl);
    console.log(`[HttpClient] ${method} ${fullUrl.toString()}`);

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
      console.log('[HttpClient] 使用 Authorization token');
    } else {
      console.warn('[HttpClient] 未找到 Authorization token');
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

    console.log(`[HttpClient] 响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[HttpClient] HTTP错误 ${response.status}:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    const raw = await response.text();
    if (!raw) {
      return undefined as T;
    }

    try {
      const result = JSON.parse(raw);
      return result?.data !== undefined ? result.data : result;
    } catch (error) {
      throw new Error('解析响应失败');
    }
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

  async delete<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>('DELETE', url, undefined, params);
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>('PATCH', url, data);
  }

  /**
   * 上传文件，支持进度回调
   */
  async upload<T>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const fullUrl = new URL(url, this.baseUrl);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result.data !== undefined ? result.data : result);
          } catch (error) {
            reject(new Error('解析响应失败'));
          }
        } else {
          reject(new Error(`HTTP error! status: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('网络请求失败'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('请求已取消'));
      });

      xhr.open('POST', fullUrl.toString());

      const token = this.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }

  private getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }
}
