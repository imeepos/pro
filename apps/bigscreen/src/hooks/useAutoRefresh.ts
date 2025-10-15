import { useEffect, useCallback, useRef, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { createLogger } from '@/utils/logger';

interface UseAutoRefreshOptions {
  onRefresh: () => void | Promise<void>;
  interval?: number;
  enabled?: boolean;
  immediate?: boolean;
}

const logger = createLogger('useAutoRefresh');

export const useAutoRefresh = (options: UseAutoRefreshOptions) => {
  const {
    onRefresh,
    interval = 30000, // 30 seconds
    enabled = true,
    immediate = true,
  } = options;

  const { dashboardConfig } = useAppStore();
  const [countdown, setCountdown] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const isRefreshingRef = useRef(false);

  // 获取实际的刷新间隔
  const actualInterval = dashboardConfig.autoRefresh ? dashboardConfig.refreshInterval : interval;

  // 执行刷新
  const executeRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    try {
      isRefreshingRef.current = true;
      await onRefresh();
      setCountdown(Math.floor(actualInterval / 1000));
    } catch (error) {
      logger.error('Auto refresh failed:', error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [onRefresh, actualInterval]);

  // 启动自动刷新
  const start = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    setIsActive(true);
    setCountdown(Math.floor(actualInterval / 1000));

    // 立即执行一次（如果启用）
    if (immediate) {
      executeRefresh();
    }

    // 设置刷新定时器
    intervalRef.current = setInterval(() => {
      executeRefresh();
    }, actualInterval);

    // 设置倒计时定时器
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return Math.floor(actualInterval / 1000);
        }
        return prev - 1;
      });
    }, 1000);
  }, [actualInterval, immediate, executeRefresh]);

  // 停止自动刷新
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = undefined;
    }
    setIsActive(false);
    setCountdown(0);
  }, []);

  // 重置定时器
  const reset = useCallback(() => {
    if (isActive) {
      stop();
      start();
    }
  }, [isActive, stop, start]);

  // 手动触发刷新
  const trigger = useCallback(async () => {
    await executeRefresh();
    reset();
  }, [executeRefresh, reset]);

  // 监听配置变化
  useEffect(() => {
    if (enabled && dashboardConfig.autoRefresh) {
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [enabled, dashboardConfig.autoRefresh, start, stop]);

  // 监听间隔变化
  useEffect(() => {
    if (isActive) {
      reset();
    }
  }, [actualInterval, reset, isActive]);

  // 清理
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isActive,
    countdown,
    start,
    stop,
    reset,
    trigger,
    isRefreshing: isRefreshingRef.current,
  };
};
