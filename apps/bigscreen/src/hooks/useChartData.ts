/**
 * 图表数据获取Hooks
 * 统一管理图表数据的获取、缓存和状态
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createLogger } from '@/utils/logger';
import { ChartsAPI } from '@/services/api';
import { useAppStore } from '@/stores/useAppStore';

// 通用数据状态类型
export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const logger = createLogger('useChartData');

// 通用的数据获取Hook
function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  dependencies: unknown[] = [],
  options: {
    immediate?: boolean;
    cacheTime?: number;
    retryCount?: number;
  } = {}
): DataState<T> & { refetch: () => Promise<void>; isStale: boolean } {
  const {
    immediate = true,
    cacheTime = 5 * 60 * 1000, // 5分钟缓存
    retryCount = 3,
  } = options;

  const [state, setState] = useState<DataState<T>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 检查数据是否过期
  const isStale = state.lastUpdated 
    ? Date.now() - state.lastUpdated > cacheTime
    : true;

  const fetchData = useCallback(async (): Promise<void> => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的AbortController
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchFn();
      
      // 检查请求是否被取消
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setState({
        data,
        loading: false,
        error: null,
        lastUpdated: Date.now(),
      });

      retryCountRef.current = 0;
    } catch (error: any) {
      // 检查请求是否被取消
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const errorMessage = error.message || '数据获取失败';
      
      // 重试逻辑
      if (retryCountRef.current < retryCount) {
        retryCountRef.current++;
        logger.warn(`数据获取失败，正在重试... (${retryCountRef.current}/${retryCount})`, error);
        
        // 延迟重试
        setTimeout(() => {
          fetchData();
        }, Math.pow(2, retryCountRef.current) * 1000);
        
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, dependencies);

  // 手动刷新数据
  const refetch = useCallback(async (): Promise<void> => {
    retryCountRef.current = 0;
    await fetchData();
  }, [fetchData]);

  // 自动获取数据
  useEffect(() => {
    if (immediate) {
      fetchData();
    }

    // 清理函数
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, immediate]);

  return {
    ...state,
    refetch,
    isStale,
  };
}

// 年龄分布数据Hook
export function useAgeDistribution() {
  const { selectedTimeRange } = useAppStore();
  
  return useAsyncData(
    () => ChartsAPI.getAgeDistribution(selectedTimeRange),
    [selectedTimeRange],
    { cacheTime: 10 * 60 * 1000 } // 10分钟缓存
  );
}

// 性别分布数据Hook
export function useGenderDistribution() {
  const { selectedTimeRange } = useAppStore();
  
  return useAsyncData(
    () => ChartsAPI.getGenderDistribution(selectedTimeRange),
    [selectedTimeRange],
    { cacheTime: 10 * 60 * 1000 }
  );
}

// 情感趋势数据Hook
export function useSentimentTrend(hours: number = 24) {
  return useAsyncData(
    () => ChartsAPI.getSentimentTrend(hours),
    [hours],
    { cacheTime: 2 * 60 * 1000 } // 2分钟缓存，数据更新较频繁
  );
}

// 地理分布数据Hook
export function useGeographicData() {
  const { selectedTimeRange } = useAppStore();
  
  return useAsyncData(
    () => ChartsAPI.getGeographicData(selectedTimeRange),
    [selectedTimeRange],
    { cacheTime: 15 * 60 * 1000 } // 15分钟缓存
  );
}

// 事件类型数据Hook
export function useEventTypes() {
  const { selectedTimeRange } = useAppStore();
  
  return useAsyncData(
    () => ChartsAPI.getEventTypes(selectedTimeRange),
    [selectedTimeRange],
    { cacheTime: 5 * 60 * 1000 }
  );
}

// 词云数据Hook
export function useWordCloudData(count: number = 50) {
  return useAsyncData(
    () => ChartsAPI.getWordCloudData(count),
    [count],
    { cacheTime: 3 * 60 * 1000 }
  );
}

// 事件计数时间序列Hook
export function useEventCountSeries(days: number = 7) {
  return useAsyncData(
    () => ChartsAPI.getEventCountSeries(days),
    [days],
    { cacheTime: 5 * 60 * 1000 }
  );
}

// 帖子计数时间序列Hook
export function usePostCountSeries(days: number = 7) {
  return useAsyncData(
    () => ChartsAPI.getPostCountSeries(days),
    [days],
    { cacheTime: 5 * 60 * 1000 }
  );
}

// 简单情感分析数据Hook
export function useSentimentData() {
  return useAsyncData(
    () => ChartsAPI.getSentimentData(),
    [],
    { cacheTime: 5 * 60 * 1000 }
  );
}

// 批量图表数据Hook
export function useBatchChartData(chartTypes: string[]) {
  return useAsyncData(
    () => ChartsAPI.getBatchChartData(chartTypes),
    [chartTypes.join(',')],
    { cacheTime: 5 * 60 * 1000 }
  );
}

// 组合Hook - 获取仪表板所需的所有数据
export function useDashboardData() {
  const ageDistribution = useAgeDistribution();
  const genderDistribution = useGenderDistribution();
  const sentimentTrend = useSentimentTrend();
  const geographic = useGeographicData();
  const eventTypes = useEventTypes();
  const wordCloud = useWordCloudData();

  // 计算总体加载状态
  const loading = [
    ageDistribution.loading,
    genderDistribution.loading,
    sentimentTrend.loading,
    geographic.loading,
    eventTypes.loading,
    wordCloud.loading,
  ].some(Boolean);

  // 计算错误状态
  const errors = [
    ageDistribution.error,
    genderDistribution.error,
    sentimentTrend.error,
    geographic.error,
    eventTypes.error,
    wordCloud.error,
  ].filter(Boolean);

  // 检查是否有数据过期
  const hasStaleData = [
    ageDistribution.isStale,
    genderDistribution.isStale,
    sentimentTrend.isStale,
    geographic.isStale,
    eventTypes.isStale,
    wordCloud.isStale,
  ].some(Boolean);

  // 刷新所有数据
  const refetchAll = useCallback(async () => {
    await Promise.all([
      ageDistribution.refetch(),
      genderDistribution.refetch(),
      sentimentTrend.refetch(),
      geographic.refetch(),
      eventTypes.refetch(),
      wordCloud.refetch(),
    ]);
  }, [
    ageDistribution.refetch,
    genderDistribution.refetch,
    sentimentTrend.refetch,
    geographic.refetch,
    eventTypes.refetch,
    wordCloud.refetch,
  ]);

  return {
    data: {
      ageDistribution: ageDistribution.data,
      genderDistribution: genderDistribution.data,
      sentimentTrend: sentimentTrend.data,
      geographic: geographic.data,
      eventTypes: eventTypes.data,
      wordCloud: wordCloud.data,
    },
    loading,
    errors,
    hasStaleData,
    refetchAll,
  };
}

// 实时数据更新Hook
export function useRealTimeChartData(
  interval: number = 30000, // 30秒更新一次
  enabled: boolean = true
) {
  const sentimentTrend = useSentimentTrend();
  const eventCountSeries = useEventCountSeries();
  const postCountSeries = usePostCountSeries();

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      // 只刷新实时性要求高的数据
      sentimentTrend.refetch();
      eventCountSeries.refetch();
      postCountSeries.refetch();
    }, interval);

    return () => clearInterval(timer);
  }, [interval, enabled, sentimentTrend.refetch, eventCountSeries.refetch, postCountSeries.refetch]);

  return {
    sentimentTrend: sentimentTrend.data,
    eventCountSeries: eventCountSeries.data,
    postCountSeries: postCountSeries.data,
    loading: sentimentTrend.loading || eventCountSeries.loading || postCountSeries.loading,
    errors: [sentimentTrend.error, eventCountSeries.error, postCountSeries.error].filter(Boolean),
  };
}