import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { createLogger } from '@/utils/logger';
import { SentimentAPI, SystemAPI } from '@/services/api';
import { RealTimeData, SystemStatus, StatisticsData, KeywordData, LocationData, SentimentData } from '@/types';
import type { TimeRange } from '@/services/api';
import type { SentimentKeyword, SentimentLocationData, RecentPost, SentimentStatistics } from '@/services/api/sentiment';
import type { SystemPerformance } from '@/services/api/system';

interface UseRealTimeDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: RealTimeData) => void;
}

const logger = createLogger('useRealTimeData');

export const useRealTimeData = (options: UseRealTimeDataOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    onError,
    onSuccess,
  } = options;

  const {
    selectedTimeRange,
    setRealTimeData,
    setSystemStatus,
    setLoading,
    setError,
    dashboardConfig,
  } = useAppStore();

  const intervalRef = useRef<NodeJS.Timeout>();
  const isLoadingRef = useRef(false);

  // 获取实时数据
  const fetchRealTimeData = useCallback(async () => {
    if (isLoadingRef.current) return;

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      // 转换时间范围格式
      const timeRange: TimeRange = selectedTimeRange === 'today' ? '24h' : 
                                  selectedTimeRange === 'thisWeek' ? '7d' : '24h';
      
      // 并行获取所有数据
      const [
        sentimentStats,
        hotTopics,
        keywords,
        timeSeries,
        locationData,
        recentPosts,
      ]: [
        SentimentStatistics,
        any,
        SentimentKeyword[],
        any,
        SentimentLocationData[],
        RecentPost[]
      ] = await Promise.all([
        SentimentAPI.getStatistics(timeRange),
        SentimentAPI.getHotTopics(10),
        SentimentAPI.getKeywords(50),
        SentimentAPI.getTimeSeries(timeRange),
        SentimentAPI.getLocationData(),
        SentimentAPI.getRecentPosts(20),
      ]);

      // 转换数据格式以匹配 RealTimeData 类型
      const statistics: StatisticsData = {
        total: sentimentStats.totalAnalyzed,
        positive: sentimentStats.positive.count,
        negative: sentimentStats.negative.count,
        neutral: sentimentStats.neutral.count,
        growth: 0, // Mock data
        growthRate: 0 // Mock data
      };

      const convertedKeywords: KeywordData[] = keywords.map(k => ({
        name: k.keyword,
        value: k.count,
        sentiment: k.sentiment
      }));

      const convertedLocations: LocationData[] = locationData.map(l => ({
        name: l.region,
        value: l.total,
        sentiment: l.dominantSentiment,
        coordinates: l.coordinates || [0, 0]
      }));

      const convertedPosts: SentimentData[] = recentPosts.map(p => ({
        id: p.id,
        createdAt: p.publishTime,
        updatedAt: p.publishTime,
        content: p.content,
        sentiment: p.sentiment,
        score: p.sentimentScore,
        source: 'weibo' as const,
        author: p.author.username,
        platform: 'weibo',
        url: '',
        tags: p.tags,
        location: p.location,
        timestamp: p.publishTime
      }));

      const realTimeData: RealTimeData = {
        statistics,
        hotTopics,
        keywords: convertedKeywords,
        timeSeries,
        locations: convertedLocations,
        recentPosts: convertedPosts,
      };

      setRealTimeData(realTimeData);
      onSuccess?.(realTimeData);

    } catch (error) {
      logger.error('Failed to fetch real-time data:', error);
      const errorObj = {
        code: 'FETCH_REALTIME_DATA_ERROR',
        message: '获取实时数据失败',
        details: error instanceof Error ? { message: error.message } : { error: String(error) },
      };
      setError(errorObj);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [selectedTimeRange, setRealTimeData, setLoading, setError, onSuccess, onError]);

  // 获取系统状态
  const fetchSystemStatus = useCallback(async () => {
    try {
      const [status, performance]: [any, SystemPerformance] = await Promise.all([
        SystemAPI.getStatus(),
        SystemAPI.getPerformance(),
      ]);

      const systemStatus: SystemStatus = {
        ...status,
        performance: {
          cpu: performance.cpu.usage,
          memory: performance.memory.percentage,
          network: performance.network.incoming
        },
        lastUpdate: new Date().toISOString(),
      };

      setSystemStatus(systemStatus);
    } catch (error) {
      logger.error('Failed to fetch system status:', error);
    }
  }, [setSystemStatus]);

  // 手动刷新数据
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchRealTimeData(),
      fetchSystemStatus(),
    ]);
  }, [fetchRealTimeData, fetchSystemStatus]);

  // 启动自动刷新
  const startAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const interval = dashboardConfig.autoRefresh ? dashboardConfig.refreshInterval : refreshInterval;
    
    intervalRef.current = setInterval(() => {
      refreshData();
    }, interval);
  }, [refreshData, refreshInterval, dashboardConfig.autoRefresh, dashboardConfig.refreshInterval]);

  // 停止自动刷新
  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  // 初始化数据获取
  useEffect(() => {
    // 立即获取一次数据
    refreshData();

    // 如果启用自动刷新，则开始定时器
    if (autoRefresh && dashboardConfig.autoRefresh) {
      startAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [selectedTimeRange, autoRefresh, dashboardConfig.autoRefresh]);

  // 监听配置变化
  useEffect(() => {
    if (dashboardConfig.autoRefresh) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  }, [dashboardConfig.autoRefresh, dashboardConfig.refreshInterval, startAutoRefresh, stopAutoRefresh]);

  return {
    fetchRealTimeData,
    fetchSystemStatus,
    refreshData,
    startAutoRefresh,
    stopAutoRefresh,
  };
};
