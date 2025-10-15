/**
 * 统一错误处理工具
 * 提供标准化的错误处理、报告和恢复机制
 */

import { createLogger } from './logger';

const logger = createLogger('ErrorHandler');

// ================== 错误类型定义 ==================

export enum ErrorCode {
  // 网络错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  
  // API错误
  API_ERROR = 'API_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // WebSocket错误
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  WEBSOCKET_CONNECTION_FAILED = 'WEBSOCKET_CONNECTION_FAILED',
  WEBSOCKET_MESSAGE_ERROR = 'WEBSOCKET_MESSAGE_ERROR',
  
  // 业务逻辑错误
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  DATA_PROCESSING_ERROR = 'DATA_PROCESSING_ERROR',
  CHART_RENDER_ERROR = 'CHART_RENDER_ERROR',
  
  // 系统错误
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  
  // 用户错误
  USER_INPUT_ERROR = 'USER_INPUT_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  
  // 未知错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ErrorSeverity {
  LOW = 'low',       // 不影响核心功能
  MEDIUM = 'medium', // 影响部分功能
  HIGH = 'high',     // 影响核心功能
  CRITICAL = 'critical' // 系统不可用
}

export interface AppError {
  code: ErrorCode;
  message: string;
  severity: ErrorSeverity;
  timestamp: string;
  source?: string;
  details?: Record<string, unknown>;
  stack?: string;
  originalError?: Error;
  userMessage?: string; // 用户友好的错误提示
  recoverable?: boolean; // 是否可恢复
  retryable?: boolean;   // 是否可重试
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

// ================== 错误处理器类 ==================

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: ((error: AppError) => void)[] = [];
  private errorHistory: AppError[] = [];
  private maxHistorySize = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 处理错误
   */
  handleError(
    error: unknown,
    context?: ErrorContext,
    customMapping?: Partial<AppError>
  ): AppError {
    const appError = this.transformError(error, context, customMapping);
    
    // 记录错误
    this.logError(appError);
    
    // 添加到历史记录
    this.addToHistory(appError);
    
    // 通知监听器
    this.notifyListeners(appError);
    
    return appError;
  }

  /**
   * 转换错误为标准格式
   */
  private transformError(
    error: unknown,
    context?: ErrorContext,
    customMapping?: Partial<AppError>
  ): AppError {
    const baseError: AppError = {
      code: ErrorCode.UNKNOWN_ERROR,
      message: 'An unknown error occurred',
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date().toISOString(),
      source: context?.component,
      recoverable: true,
      retryable: false,
    };

    // 处理已知的AppError
    if (this.isAppError(error)) {
      return { ...baseError, ...error };
    }

    // 处理原生Error对象
    if (error instanceof Error) {
      const mappedError = this.mapNativeError(error, context);
      return {
        ...baseError,
        ...mappedError,
        originalError: error,
        stack: error.stack,
      };
    }

    // 处理字符串错误
    if (typeof error === 'string') {
      return {
        ...baseError,
        message: error,
        code: ErrorCode.SYSTEM_ERROR,
      };
    }

    // 处理其他类型的错误
    return {
      ...baseError,
      message: String(error),
      details: { originalError: error },
      ...customMapping,
    };
  }

  /**
   * 映射原生错误
   */
  private mapNativeError(error: Error, context?: ErrorContext): Partial<AppError> {
    const message = error.message.toLowerCase();

    // 网络错误
    if (message.includes('network') || message.includes('fetch')) {
      return {
        code: ErrorCode.NETWORK_ERROR,
        message: error.message,
        severity: ErrorSeverity.HIGH,
        userMessage: '网络连接异常，请检查网络设置',
        retryable: true,
      };
    }

    // 超时错误
    if (message.includes('timeout') || message.includes('aborted')) {
      return {
        code: ErrorCode.TIMEOUT_ERROR,
        message: error.message,
        severity: ErrorSeverity.MEDIUM,
        userMessage: '请求超时，请重试',
        retryable: true,
      };
    }

    // API错误
    if (message.includes('unauthorized') || message.includes('401')) {
      return {
        code: ErrorCode.UNAUTHORIZED,
        message: error.message,
        severity: ErrorSeverity.HIGH,
        userMessage: '登录已过期，请重新登录',
        recoverable: false,
      };
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return {
        code: ErrorCode.FORBIDDEN,
        message: error.message,
        severity: ErrorSeverity.HIGH,
        userMessage: '没有访问权限',
        recoverable: false,
      };
    }

    if (message.includes('not found') || message.includes('404')) {
      return {
        code: ErrorCode.NOT_FOUND,
        message: error.message,
        severity: ErrorSeverity.LOW,
        userMessage: '请求的资源不存在',
      };
    }

    // 业务逻辑错误
    if (context?.component?.includes('Chart')) {
      return {
        code: ErrorCode.CHART_RENDER_ERROR,
        message: error.message,
        severity: ErrorSeverity.MEDIUM,
        userMessage: '图表渲染失败，正在重试',
        retryable: true,
      };
    }

    // WebSocket错误
    if (message.includes('websocket') || message.includes('socket')) {
      return {
        code: ErrorCode.WEBSOCKET_ERROR,
        message: error.message,
        severity: ErrorSeverity.MEDIUM,
        userMessage: '实时连接异常，正在重连',
        retryable: true,
      };
    }

    // 默认错误映射
    return {
      code: ErrorCode.SYSTEM_ERROR,
      message: error.message,
      severity: ErrorSeverity.MEDIUM,
    };
  }

  /**
   * 检查是否为AppError
   */
  private isAppError(error: unknown): error is AppError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'severity' in error
    );
  }

  /**
   * 记录错误日志
   */
  private logError(error: AppError): void {
    const logData = {
      code: error.code,
      message: error.message,
      severity: error.severity,
      source: error.source,
      timestamp: error.timestamp,
      details: error.details,
    };

    switch (error.severity) {
      case ErrorSeverity.LOW:
        logger.warn('Low severity error', logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium severity error', logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('High severity error', error.originalError || logData);
        break;
      case ErrorSeverity.CRITICAL:
        logger.error('Critical error', error.originalError || logData);
        break;
    }
  }

  /**
   * 添加到错误历史
   */
  private addToHistory(error: AppError): void {
    this.errorHistory.unshift(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 通知错误监听器
   */
  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        logger.error('Error in error listener', listenerError);
      }
    });
  }

  /**
   * 添加错误监听器
   */
  addErrorListener(listener: (error: AppError) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * 移除错误监听器
   */
  removeErrorListener(listener: (error: AppError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(limit?: number): AppError[] {
    return limit ? this.errorHistory.slice(0, limit) : [...this.errorHistory];
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCode: Record<ErrorCode, number>;
    recent: AppError[];
  } {
    const bySeverity = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };

    const byCode: Record<ErrorCode, number> = {} as Record<ErrorCode, number>;

    this.errorHistory.forEach(error => {
      bySeverity[error.severity]++;
      byCode[error.code] = (byCode[error.code] || 0) + 1;
    });

    return {
      total: this.errorHistory.length,
      bySeverity,
      byCode,
      recent: this.errorHistory.slice(0, 10),
    };
  }
}

// ================== 工具函数 ==================

/**
 * 全局错误处理器实例
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * 处理错误的便捷函数
 */
export function handleError(
  error: unknown,
  context?: ErrorContext,
  customMapping?: Partial<AppError>
): AppError {
  return errorHandler.handleError(error, context, customMapping);
}

/**
 * 安全执行异步函数
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context?: ErrorContext,
  fallback?: T
): Promise<{ data?: T; error?: AppError }> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    const appError = handleError(error, context);
    return { error: appError, data: fallback };
  }
}

/**
 * 安全执行同步函数
 */
export function safeSync<T>(
  fn: () => T,
  context?: ErrorContext,
  fallback?: T
): { data?: T; error?: AppError } {
  try {
    const data = fn();
    return { data };
  } catch (error) {
    const appError = handleError(error, context);
    return { error: appError, data: fallback };
  }
}

/**
 * 重试机制
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: boolean;
    context?: ErrorContext;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = true, context } = options;
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw handleError(error, context);
      }
      
      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw handleError(lastError, context);
}

/**
 * 错误边界装饰器
 */
export function withErrorBoundary<T extends (...args: any[]) => any>(
  fn: T,
  context?: ErrorContext
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      
      // 处理Promise返回值
      if (result && typeof result.catch === 'function') {
        return result.catch((error: unknown) => {
          throw handleError(error, context);
        });
      }
      
      return result;
    } catch (error) {
      throw handleError(error, context);
    }
  }) as T;
}

/**
 * 创建错误
 */
export function createError(
  code: ErrorCode,
  message: string,
  options?: Partial<AppError>
): AppError {
  return {
    code,
    message,
    severity: ErrorSeverity.MEDIUM,
    timestamp: new Date().toISOString(),
    recoverable: true,
    retryable: false,
    ...options,
  };
}