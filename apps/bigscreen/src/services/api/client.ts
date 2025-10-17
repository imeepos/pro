/**
 * API客户端配置
 * 统一的HTTP请求配置和错误处理
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { createLogger } from '@/utils/logger';

// API错误类型
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// 扩展的Axios错误
export interface ExtendedAxiosError extends AxiosError {
  apiError?: ApiError;
}

const logger = createLogger('ApiClient');

const isApiErrorEnvelope = (value: unknown): value is { error: ApiError } =>
  typeof value === 'object' && value !== null && 'error' in value;

// 请求拦截器 - 添加通用配置
function requestInterceptor(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  // 添加时间戳防止缓存
  if (config.method === 'get') {
    config.params = {
      ...config.params,
      _t: Date.now(),
    };
  }

  // 添加请求头
  config.headers.set('Content-Type', 'application/json');

  return config;
}

// 响应拦截器 - 统一错误处理
function responseInterceptor(response: AxiosResponse): AxiosResponse {
  // 检查业务状态码
  if (response.data && !response.data.success) {
    const errorMessage = response.data.error?.message || '请求失败';
    const apiError = isApiErrorEnvelope(response.data) ? response.data.error : undefined;
    const enhancedError: ExtendedAxiosError = Object.assign(
      new AxiosError(
        errorMessage,
        undefined,
        response.config,
        response.request,
        response,
      ),
      {
        apiError: apiError ?? {
          code: 'BUSINESS_ERROR',
          message: errorMessage,
          details: response.data,
        },
      },
    );
    throw enhancedError;
  }

  return response;
}

// 错误拦截器
function errorInterceptor(error: ExtendedAxiosError): Promise<never> {
  // 网络错误
  if (!error.response) {
    logger.error('Network Error:', error);
    return Promise.reject({
      code: 'NETWORK_ERROR',
      message: '网络连接失败，请检查网络设置',
      details: error.message,
    });
  }

  // HTTP错误
  const { status, data } = error.response;
  
  let apiError: ApiError;
  
  if (isApiErrorEnvelope(data)) {
    // 服务器返回的错误信息
    apiError = data.error;
  } else {
    // 根据HTTP状态码生成错误信息
    switch (status) {
      case 400:
        apiError = { code: 'BAD_REQUEST', message: '请求参数错误' };
        break;
      case 401:
        apiError = { code: 'UNAUTHORIZED', message: '未授权访问' };
        break;
      case 403:
        apiError = { code: 'FORBIDDEN', message: '禁止访问' };
        break;
      case 404:
        apiError = { code: 'NOT_FOUND', message: '请求的资源不存在' };
        break;
      case 429:
        apiError = { code: 'RATE_LIMIT', message: '请求过于频繁，请稍后再试' };
        break;
      case 500:
        apiError = { code: 'INTERNAL_ERROR', message: '服务器内部错误' };
        break;
      case 502:
        apiError = { code: 'BAD_GATEWAY', message: '网关错误' };
        break;
      case 503:
        apiError = { code: 'SERVICE_UNAVAILABLE', message: '服务暂不可用' };
        break;
      default:
        apiError = { code: 'UNKNOWN_ERROR', message: `未知错误 (${status})` };
    }
  }

  logger.error(`API Error [${status}]:`, apiError);
  return Promise.reject(apiError);
}

// 创建API客户端实例
function createApiClient(): AxiosInstance {
  // 在Mock模式下使用空的baseURL，让vite-plugin-mock处理
  const isMockMode = import.meta.env.VITE_ENABLE_MOCK === 'true';
  const baseURL = isMockMode ? '' : (import.meta.env.VITE_API_BASE_URL || '');
  
  const client = axios.create({
    baseURL,
    timeout: 30000, // 30秒超时
    validateStatus: (status) => status < 500, // 不要自动抛出4xx错误
  });

  // 添加拦截器
  client.interceptors.request.use(requestInterceptor);
  client.interceptors.response.use(responseInterceptor, errorInterceptor);

  return client;
}

// 导出API客户端实例
export const apiClient = createApiClient();

// 请求工具函数
export const apiUtils = {
  // GET请求
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.get<T>(url, config);
    return response.data;
  },

  // POST请求
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.post<T>(url, data, config);
    return response.data;
  },

  // PUT请求
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.put<T>(url, data, config);
    return response.data;
  },

  // DELETE请求
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.delete<T>(url, config);
    return response.data;
  },

  // 取消请求
  cancelToken: axios.CancelToken,
  isCancel: axios.isCancel,
};

// 请求重试工具
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      const isLastRetry = i === maxRetries - 1;
      
      if (isLastRetry) {
        throw error;
      }

      // 指数退避延迟
      const retryDelay = delay * Math.pow(2, i);
      logger.warn(`Request failed, retrying in ${retryDelay}ms... (${i + 1}/${maxRetries})`, error);
      
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error('Max retries exceeded');
}

// 并发请求工具
export async function batchRequests<T>(
  requests: Array<() => Promise<T>>,
  concurrency: number = 5
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(request => request()));
    results.push(...batchResults);
  }
  
  return results;
}
