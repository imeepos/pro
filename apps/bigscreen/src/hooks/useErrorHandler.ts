/**
 * 错误处理React Hook
 * 提供组件级别的错误处理和用户通知
 */

import { useCallback, useEffect, useState } from 'react';
import { errorHandler, AppError, ErrorSeverity } from '@/utils/errorHandler';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useErrorHandler');

export interface ErrorNotification {
  id: string;
  error: AppError;
  timestamp: number;
  dismissed?: boolean;
}

export interface UseErrorHandlerReturn {
  errors: ErrorNotification[];
  hasErrors: boolean;
  criticalErrors: ErrorNotification[];
  dismissError: (id: string) => void;
  dismissAllErrors: () => void;
  clearErrors: () => void;
  handleError: (error: unknown, context?: Record<string, unknown>) => void;
  retryLastFailedOperation?: () => void;
}

export interface UseErrorHandlerOptions {
  maxErrors?: number;
  autoDissmissAfter?: number; // 自动消失时间（毫秒）
  showNotifications?: boolean;
  component?: string;
}

/**
 * 错误处理Hook
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    maxErrors = 5,
    autoDissmissAfter = 5000,
    showNotifications = true,
    component = 'Unknown',
  } = options;

  const [errors, setErrors] = useState<ErrorNotification[]>([]);
  const [lastFailedOperation, setLastFailedOperation] = useState<(() => void) | null>(null);

  // 生成唯一ID
  const generateId = useCallback(() => {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 处理错误
  const handleError = useCallback((
    error: unknown,
    context: Record<string, unknown> = {}
  ) => {
    const appError = errorHandler.handleError(error, {
      component,
      ...context,
    });

    const notification: ErrorNotification = {
      id: generateId(),
      error: appError,
      timestamp: Date.now(),
    };

    setErrors(prev => {
      const newErrors = [notification, ...prev].slice(0, maxErrors);
      return newErrors;
    });

    // 记录操作用于重试
    if (appError.retryable && context.retryOperation) {
      setLastFailedOperation(() => context.retryOperation as () => void);
    }

    logger.error('Component error handled', {
      component,
      errorCode: appError.code,
      errorMessage: appError.message,
      severity: appError.severity,
    });
  }, [component, generateId, maxErrors]);

  // 消除单个错误
  const dismissError = useCallback((id: string) => {
    setErrors(prev => prev.map(error => 
      error.id === id ? { ...error, dismissed: true } : error
    ));

    // 延迟移除以允许动画
    setTimeout(() => {
      setErrors(prev => prev.filter(error => error.id !== id));
    }, 300);
  }, []);

  // 消除所有错误
  const dismissAllErrors = useCallback(() => {
    setErrors(prev => prev.map(error => ({ ...error, dismissed: true })));
    
    setTimeout(() => {
      setErrors([]);
    }, 300);
  }, []);

  // 清除所有错误（无动画）
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // 重试最后失败的操作
  const retryLastFailedOperation = useCallback(() => {
    if (lastFailedOperation) {
      try {
        lastFailedOperation();
        setLastFailedOperation(null);
      } catch (error) {
        handleError(error, { retryOperation: lastFailedOperation });
      }
    }
  }, [lastFailedOperation, handleError]);

  // 自动消失逻辑
  useEffect(() => {
    if (!autoDissmissAfter || !showNotifications) return;

    const timers: NodeJS.Timeout[] = [];

    errors.forEach(error => {
      if (error.dismissed) return;

      // 严重错误不自动消失
      if (error.error.severity === ErrorSeverity.CRITICAL) return;

      const timeLeft = autoDissmissAfter - (Date.now() - error.timestamp);
      if (timeLeft > 0) {
        const timer = setTimeout(() => {
          dismissError(error.id);
        }, timeLeft);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [errors, autoDissmissAfter, showNotifications, dismissError]);

  // 全局错误监听器
  useEffect(() => {
    const handleGlobalError = (appError: AppError) => {
      // 只处理与当前组件相关的错误
      if (appError.source === component) {
        const notification: ErrorNotification = {
          id: generateId(),
          error: appError,
          timestamp: Date.now(),
        };

        setErrors(prev => [notification, ...prev].slice(0, maxErrors));
      }
    };

    errorHandler.addErrorListener(handleGlobalError);

    return () => {
      errorHandler.removeErrorListener(handleGlobalError);
    };
  }, [component, generateId, maxErrors]);

  // 计算衍生状态
  const hasErrors = errors.length > 0;
  const criticalErrors = errors.filter(
    error => error.error.severity === ErrorSeverity.CRITICAL && !error.dismissed
  );

  return {
    errors: errors.filter(error => !error.dismissed),
    hasErrors,
    criticalErrors,
    dismissError,
    dismissAllErrors,
    clearErrors,
    handleError,
    retryLastFailedOperation: lastFailedOperation ? retryLastFailedOperation : undefined,
  };
}

/**
 * 全局错误状态Hook
 */
export function useGlobalErrorState() {
  const [errorStats, setErrorStats] = useState(() => errorHandler.getErrorStats());

  useEffect(() => {
    const updateStats = () => {
      setErrorStats(errorHandler.getErrorStats());
    };

    // 监听错误变化
    errorHandler.addErrorListener(updateStats);

    // 定期更新统计
    const interval = setInterval(updateStats, 30000); // 每30秒更新一次

    return () => {
      errorHandler.removeErrorListener(updateStats);
      clearInterval(interval);
    };
  }, []);

  return {
    errorStats,
    errorHistory: errorHandler.getErrorHistory(20), // 最近20个错误
    clearHistory: () => errorHandler.clearErrorHistory(),
  };
}

/**
 * 错误边界Hook
 * 用于捕获组件树中的错误
 */
export function useErrorBoundary(componentName: string) {
  const { handleError } = useErrorHandler({ component: componentName });

  const captureError = useCallback((error: Error, errorInfo?: any) => {
    handleError(error, {
      errorInfo,
      boundaryComponent: componentName,
    });
  }, [handleError, componentName]);

  return { captureError };
}

/**
 * API错误处理Hook
 * 专门用于处理API相关错误
 */
export function useApiErrorHandler(apiName: string) {
  const { handleError, ...rest } = useErrorHandler({
    component: `API_${apiName}`,
    maxErrors: 3,
    autoDissmissAfter: 8000,
  });

  const handleApiError = useCallback((
    error: unknown,
    context: {
      endpoint?: string;
      method?: string;
      retryOperation?: () => void;
    } = {}
  ) => {
    handleError(error, {
      apiName,
      ...context,
    });
  }, [handleError, apiName]);

  return {
    ...rest,
    handleApiError,
  };
}