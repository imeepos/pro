/**
 * 错误通知组件
 * 显示和管理错误通知
 */

import React from 'react';
import { X, AlertTriangle, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { ErrorNotification as ErrorNotificationType, UseErrorHandlerReturn } from '@/hooks/useErrorHandler';
import { ErrorSeverity } from '@/utils/errorHandler';
import { cn } from '@/utils';

interface ErrorNotificationProps {
  errors: ErrorNotificationType[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onRetry?: () => void;
  className?: string;
}

interface SingleErrorProps {
  error: ErrorNotificationType;
  onDismiss: (id: string) => void;
  onRetry?: () => void;
}

/**
 * 单个错误通知组件
 */
function SingleError({ error, onDismiss, onRetry }: SingleErrorProps) {
  const { error: appError, id } = error;

  // 根据严重程度选择样式
  const getSeverityStyles = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          icon: <AlertCircle className="w-5 h-5 text-red-500" />,
          iconBg: 'bg-red-100',
        };
      case ErrorSeverity.HIGH:
        return {
          container: 'bg-orange-50 border-orange-200 text-orange-800',
          icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
          iconBg: 'bg-orange-100',
        };
      case ErrorSeverity.MEDIUM:
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
          iconBg: 'bg-yellow-100',
        };
      case ErrorSeverity.LOW:
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          icon: <Info className="w-5 h-5 text-blue-500" />,
          iconBg: 'bg-blue-100',
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200 text-gray-800',
          icon: <Info className="w-5 h-5 text-gray-500" />,
          iconBg: 'bg-gray-100',
        };
    }
  };

  const styles = getSeverityStyles(appError.severity);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-sm transition-all duration-300',
        styles.container,
        error.dismissed && 'opacity-0 scale-95'
      )}
    >
      {/* 错误图标 */}
      <div className={cn('flex-shrink-0 p-1 rounded-full', styles.iconBg)}>
        {styles.icon}
      </div>

      {/* 错误内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* 错误标题 */}
            <h4 className="text-sm font-medium">
              {appError.userMessage || appError.message}
            </h4>

            {/* 错误详情 */}
            {appError.code && (
              <p className="mt-1 text-xs opacity-75">
                错误代码: {appError.code}
              </p>
            )}

            {/* 错误来源 */}
            {appError.source && (
              <p className="mt-1 text-xs opacity-75">
                来源: {appError.source}
              </p>
            )}

            {/* 时间戳 */}
            <p className="mt-1 text-xs opacity-60">
              {new Date(error.timestamp).toLocaleTimeString()}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 ml-3">
            {/* 重试按钮 */}
            {appError.retryable && onRetry && (
              <button
                onClick={onRetry}
                className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
                title="重试"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* 关闭按钮 */}
            <button
              onClick={() => onDismiss(id)}
              className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 错误通知容器组件
 */
export function ErrorNotification({
  errors,
  onDismiss,
  onDismissAll,
  onRetry,
  className,
}: ErrorNotificationProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* 批量操作栏 */}
      {errors.length > 1 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
          <span className="text-sm text-gray-600">
            共 {errors.length} 个错误
          </span>
          <button
            onClick={onDismissAll}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            全部关闭
          </button>
        </div>
      )}

      {/* 错误列表 */}
      <div className="space-y-2">
        {errors.map((error) => (
          <SingleError
            key={error.id}
            error={error}
            onDismiss={onDismiss}
            onRetry={onRetry}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 错误通知提供者组件
 * 用于全局错误通知管理
 */
interface ErrorNotificationProviderProps {
  errorHandler: UseErrorHandlerReturn;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  children: React.ReactNode;
}

export function ErrorNotificationProvider({
  errorHandler,
  position = 'top-right',
  maxVisible = 3,
  children,
}: ErrorNotificationProviderProps) {
  const {
    errors,
    dismissError,
    dismissAllErrors,
    retryLastFailedOperation,
  } = errorHandler;

  // 只显示前N个错误
  const visibleErrors = errors.slice(0, maxVisible);

  // 位置样式
  const getPositionStyles = (pos: string) => {
    switch (pos) {
      case 'top-right':
        return 'fixed top-4 right-4 z-50';
      case 'top-left':
        return 'fixed top-4 left-4 z-50';
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50';
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-50';
      default:
        return 'fixed top-4 right-4 z-50';
    }
  };

  return (
    <>
      {children}
      
      {/* 错误通知容器 */}
      {visibleErrors.length > 0 && (
        <div className={cn(getPositionStyles(position), 'w-96 max-w-[calc(100vw-2rem)]')}>
          <ErrorNotification
            errors={visibleErrors}
            onDismiss={dismissError}
            onDismissAll={dismissAllErrors}
            onRetry={retryLastFailedOperation}
          />
        </div>
      )}
    </>
  );
}

/**
 * 错误统计面板组件
 */
interface ErrorStatsPanelProps {
  errorStats: {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCode: Record<string, number>;
    recent: any[];
  };
  onClearHistory: () => void;
  className?: string;
}

export function ErrorStatsPanel({
  errorStats,
  onClearHistory,
  className,
}: ErrorStatsPanelProps) {
  const { total, bySeverity, recent } = errorStats;

  if (total === 0) {
    return (
      <div className={cn('p-4 text-center text-gray-500', className)}>
        <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>暂无错误记录</p>
      </div>
    );
  }

  return (
    <div className={cn('p-4 space-y-4', className)}>
      {/* 统计概览 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-sm text-gray-600">总错误数</div>
        </div>
        
        <div className="p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {bySeverity[ErrorSeverity.CRITICAL] + bySeverity[ErrorSeverity.HIGH]}
          </div>
          <div className="text-sm text-red-600">严重错误</div>
        </div>
      </div>

      {/* 严重程度分布 */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">按严重程度分布</h4>
        
        {Object.entries(bySeverity).map(([severity, count]) => {
          if (count === 0) return null;
          
          const percentage = (count / total) * 100;
          const severityColors = {
            [ErrorSeverity.CRITICAL]: 'bg-red-500',
            [ErrorSeverity.HIGH]: 'bg-orange-500',
            [ErrorSeverity.MEDIUM]: 'bg-yellow-500',
            [ErrorSeverity.LOW]: 'bg-blue-500',
          };
          
          return (
            <div key={severity} className="flex items-center gap-3">
              <div className="w-16 text-xs text-gray-600 capitalize">
                {severity}
              </div>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn('h-full', severityColors[severity as ErrorSeverity])}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-8 text-xs text-gray-600 text-right">
                {count}
              </div>
            </div>
          );
        })}
      </div>

      {/* 最近错误 */}
      {recent.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">最近错误</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {recent.slice(0, 5).map((error, index) => (
              <div key={index} className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                <div className="font-medium">{error.code}</div>
                <div className="truncate">{error.message}</div>
                <div className="text-gray-400">
                  {new Date(error.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 清除按钮 */}
      <button
        onClick={onClearHistory}
        className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
      >
        清除错误历史
      </button>
    </div>
  );
}