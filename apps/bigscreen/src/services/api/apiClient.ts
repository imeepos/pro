/**
 * 增强版API客户端
 * 提供统一的错误处理、重试机制和响应拦截
 */

import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
  InternalAxiosRequestConfig 
} from 'axios';
import { createLogger } from '@/utils/logger';
import { errorHandler, ErrorCode, ErrorSeverity, withRetry } from '@/utils/errorHandler';

const logger = createLogger('APIClient');

// ================== 类型定义 ==================

export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
  timestamp?: number;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  status?: number;
}

export interface RequestConfig extends AxiosRequestConfig {
  retry?: {
    count?: number;
    delay?: number;
    backoff?: boolean;
  };
  timeout?: number;
  skipErrorHandler?: boolean;
}

// ================== API客户端类 ==================

class APIClient {
  private instance: AxiosInstance;
  private baseTimeout = 10000; // 10秒默认超时

  constructor(baseURL?: string) {
    this.instance = axios.create({
      baseURL: baseURL || (import.meta.env.VITE_API_BASE_URL as string) || '/api',
      timeout: this.baseTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * 设置拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // 添加请求日志
        logger.debug('API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
          data: config.data,
        });

        // 添加认证头
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 添加请求ID用于追踪
        config.headers['X-Request-ID'] = this.generateRequestId();

        return config;
      },
      (error: AxiosError) => {
        logger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // 记录成功响应
        logger.debug('API Response', {
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          status: response.status,
          data: response.data,
        });

        return this.processSuccessResponse(response);
      },
      (error: AxiosError) => {
        return this.processErrorResponse(error);
      }
    );
  }

  /**
   * 处理成功响应
   */
  private processSuccessResponse(response: AxiosResponse): AxiosResponse {
    const { data } = response;

    // 检查业务层面的错误
    if (this.isBusinessFailure(data)) {
      const businessError = Object.assign(
        new Error(data.message ?? 'Business logic error'),
        {
          code: data.code ?? 'BUSINESS_ERROR',
          details: data as Record<string, unknown>,
        },
      );
      throw businessError;
    }

    // 标准化响应格式
    if (data && typeof data === 'object' && !data.success && !data.data) {
      response.data = {
        success: true,
        data,
        timestamp: Date.now(),
      };
    }

    return response;
  }

  /**
   * 处理错误响应
   */
  private processErrorResponse(error: AxiosError): Promise<never> {
    const { response, request, config } = error;

    // 跳过错误处理的请求
    if ((config as RequestConfig)?.skipErrorHandler) {
      return Promise.reject(error);
    }

    let appError;

    if (response) {
      // 服务器响应错误
      appError = errorHandler.handleError(error, {
        component: 'APIClient',
        action: `${config?.method?.toUpperCase()} ${config?.url}`,
        metadata: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        },
      }, {
        code: this.mapHttpStatusToErrorCode(response.status),
        message: this.extractErrorMessage(response),
        severity: this.getErrorSeverity(response.status),
        details: {
          status: response.status,
          statusText: response.statusText,
          response: response.data,
        },
      });
    } else if (request) {
      // 网络错误
      appError = errorHandler.handleError(error, {
        component: 'APIClient',
        action: `${config?.method?.toUpperCase()} ${config?.url}`,
      }, {
        code: ErrorCode.NETWORK_ERROR,
        message: '网络连接失败，请检查网络设置',
        severity: ErrorSeverity.HIGH,
        retryable: true,
      });
    } else {
      // 请求配置错误
      appError = errorHandler.handleError(error, {
        component: 'APIClient',
        action: 'Request Setup',
      }, {
        code: ErrorCode.SYSTEM_ERROR,
        message: '请求配置错误',
        severity: ErrorSeverity.MEDIUM,
      });
    }

    return Promise.reject(appError);
  }

  /**
   * 映射HTTP状态码到错误代码
   */
  private mapHttpStatusToErrorCode(status: number): ErrorCode {
    const statusMap: Record<number, ErrorCode> = {
      400: ErrorCode.VALIDATION_ERROR,
      401: ErrorCode.UNAUTHORIZED,
      403: ErrorCode.FORBIDDEN,
      404: ErrorCode.NOT_FOUND,
      408: ErrorCode.TIMEOUT_ERROR,
      429: ErrorCode.RATE_LIMITED,
      500: ErrorCode.API_ERROR,
      502: ErrorCode.API_ERROR,
      503: ErrorCode.API_ERROR,
      504: ErrorCode.TIMEOUT_ERROR,
    };

    return statusMap[status] || ErrorCode.API_ERROR;
  }

  /**
   * 提取错误消息
   */
  private extractErrorMessage(response: AxiosResponse): string {
    const { data } = response;

    if (typeof data === 'string') {
      return data;
    }

    if (data && typeof data === 'object') {
      return data.message || data.error || data.msg || `HTTP ${response.status} Error`;
    }

    return `HTTP ${response.status} ${response.statusText}`;
  }

  /**
   * 获取错误严重程度
   */
  private getErrorSeverity(status: number): ErrorSeverity {
    if (status >= 500) return ErrorSeverity.HIGH;
    if (status >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * 获取认证令牌
   */
  private getAuthToken(): string | null {
    // 从localStorage、sessionStorage或其他地方获取token
    return localStorage.getItem('auth_token') || 
           sessionStorage.getItem('auth_token') || 
           null;
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 检查是否为业务失败响应
   */
  private isBusinessFailure(payload: unknown): payload is { success: false; message?: string; code?: string } {
    return Boolean(
      payload &&
      typeof payload === 'object' &&
      'success' in payload &&
      (payload as { success?: unknown }).success === false,
    );
  }

  /**
   * GET请求
   */
  async get<T = any>(url: string, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * PUT请求
   */
  async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(url: string, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  /**
   * 通用请求方法
   */
  async request<T = any>(config: RequestConfig): Promise<APIResponse<T>> {
    const { retry, ...axiosConfig } = config;

    // 如果配置了重试，使用重试机制
    if (retry && retry.count && retry.count > 0) {
      return withRetry(
        () => this.instance.request<APIResponse<T>>(axiosConfig).then(res => res.data),
        {
          maxRetries: retry.count,
          delay: retry.delay || 1000,
          backoff: retry.backoff !== false,
          context: {
            component: 'APIClient',
            action: `${config.method?.toUpperCase()} ${config.url}`,
          },
        }
      );
    }

    const response = await this.instance.request<APIResponse<T>>(axiosConfig);
    return response.data;
  }

  /**
   * 设置认证令牌
   */
  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
    this.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * 清除认证令牌
   */
  clearAuthToken(): void {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    delete this.instance.defaults.headers.common['Authorization'];
  }

  /**
   * 设置基础URL
   */
  setBaseURL(baseURL: string): void {
    this.instance.defaults.baseURL = baseURL;
  }

  /**
   * 设置默认超时时间
   */
  setTimeout(timeout: number): void {
    this.baseTimeout = timeout;
    this.instance.defaults.timeout = timeout;
  }

  /**
   * 获取原始axios实例（用于特殊需求）
   */
  getInstance(): AxiosInstance {
    return this.instance;
  }
}

// ================== 导出 ==================

// 创建默认实例
export const apiClient = new APIClient();

// 导出类型和工具
export { APIClient };
export type { APIResponse as APIResponseType, APIError as APIErrorType, RequestConfig as RequestConfigType };
