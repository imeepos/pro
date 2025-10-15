/**
 * 情感分析API服务
 */

import { apiUtils as apiClient } from './client';
import type { ApiResponse, HotTopic, TimeSeriesData } from '../../types';
import type { TimeRange } from './types';

// 实时数据类型
export interface SentimentRealTimeData {
  timestamp: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  trend: {
    positive: 'up' | 'down' | 'stable';
    negative: 'up' | 'down' | 'stable';
    neutral: 'up' | 'down' | 'stable';
  };
}

// 统计数据类型
export interface SentimentStatistics {
  totalAnalyzed: number;
  positive: {
    count: number;
    percentage: number;
    avgScore: number;
  };
  negative: {
    count: number;
    percentage: number;
    avgScore: number;
  };
  neutral: {
    count: number;
    percentage: number;
    avgScore: number;
  };
  overallScore: number;
  confidenceLevel: number;
}

// HotTopic 类型已在上面导入

// 关键词类型
export interface SentimentKeyword {
  keyword: string;
  count: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  weight: number;
  associatedTopics: string[];
  frequency: number;
}

// 时间序列数据类型
export type SentimentTimeSeries = TimeSeriesData;

// 地理位置数据类型
export interface SentimentLocationData {
  region: string;
  province?: string;
  city?: string;
  coordinates?: [number, number];
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  avgScore: number;
  dominantSentiment: 'positive' | 'negative' | 'neutral';
}

// 最新帖子类型
export interface RecentPost {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  confidence: number;
  publishTime: string;
  location?: string;
  tags: string[];
  interactions: {
    likes: number;
    comments: number;
    shares: number;
  };
}

// 搜索过滤器类型
export interface SentimentSearchFilters {
  sentiment?: 'positive' | 'negative' | 'neutral';
  timeRange?: TimeRange;
  location?: string;
  author?: string;
  minScore?: number;
  maxScore?: number;
  tags?: string[];
  sortBy?: 'time' | 'score' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

// 搜索结果类型
export interface SentimentSearchResult {
  posts: RecentPost[];
  total: number;
  page: number;
  pageSize: number;
  aggregations: {
    sentimentBreakdown: {
      positive: number;
      negative: number;
      neutral: number;
    };
    timeDistribution: Record<string, number>;
    locationDistribution: Record<string, number>;
  };
}

export const SentimentAPI = {
  // 获取实时数据
  getRealTimeData: async (timeRange: TimeRange = '24h'): Promise<SentimentRealTimeData> => {
    const response = await apiClient.get<ApiResponse<SentimentRealTimeData>>(`/api/sentiment/realtime?range=${timeRange}`);
    return response.data;
  },

  // 获取统计数据
  getStatistics: async (timeRange: TimeRange = '24h'): Promise<SentimentStatistics> => {
    const response = await apiClient.get<ApiResponse<SentimentStatistics>>(`/api/sentiment/statistics?range=${timeRange}`);
    return response.data;
  },

  // 获取热点话题
  getHotTopics: async (limit: number = 10): Promise<HotTopic[]> => {
    const response = await apiClient.get<ApiResponse<HotTopic[]>>(`/api/sentiment/hot-topics?limit=${limit}`);
    return response.data;
  },

  // 获取关键词
  getKeywords: async (limit: number = 50): Promise<SentimentKeyword[]> => {
    const response = await apiClient.get<ApiResponse<SentimentKeyword[]>>(`/api/sentiment/keywords?limit=${limit}`);
    return response.data;
  },

  // 获取时间序列数据
  getTimeSeries: async (timeRange: TimeRange = '24h'): Promise<SentimentTimeSeries[]> => {
    const response = await apiClient.get<ApiResponse<SentimentTimeSeries[]>>(`/api/sentiment/time-series?range=${timeRange}`);
    return response.data;
  },

  // 获取地理位置数据
  getLocationData: async (): Promise<SentimentLocationData[]> => {
    const response = await apiClient.get<ApiResponse<SentimentLocationData[]>>('/api/sentiment/locations');
    return response.data;
  },

  // 获取最新帖子
  getRecentPosts: async (limit: number = 20): Promise<RecentPost[]> => {
    const response = await apiClient.get<ApiResponse<RecentPost[]>>(`/api/sentiment/recent-posts?limit=${limit}`);
    return response.data;
  },

  // 搜索相关内容
  search: async (query: string, filters?: SentimentSearchFilters): Promise<SentimentSearchResult> => {
    const response = await apiClient.post<ApiResponse<SentimentSearchResult>>('/api/sentiment/search', { query, filters });
    return response.data;
  },
};