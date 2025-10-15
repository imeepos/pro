/**
 * 概览页面API服务
 */

import { apiUtils as apiClient } from './client';
import type { ApiResponse, OverviewStatisticsData } from '../../types';

// 使用统一的 OverviewStatisticsData 类型
export type OverviewStatistics = OverviewStatisticsData;

// 情感数据类型
export interface OverviewSentiment {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  trend: 'rising' | 'stable' | 'falling';
  avgScore: number;
}

// 使用统一的 LocationData 类型
export interface OverviewLocation {
  region: string;
  province?: string;
  city?: string;
  count: number;
  percentage: number;
  coordinates?: [number, number];
  trend: 'up' | 'down' | 'stable';
}

export const OverviewAPI = {
  // 获取统计数据
  getStatistics: async (timeRange?: string): Promise<OverviewStatistics> => {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    const response = await apiClient.get<ApiResponse<OverviewStatistics>>(`/api/overview/statistics${params}`);
    return response.data;
  },

  // 获取情感数据
  getSentiment: async (timeRange?: string): Promise<OverviewSentiment> => {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    const response = await apiClient.get<ApiResponse<OverviewSentiment>>(`/api/overview/sentiment${params}`);
    return response.data;
  },

  // 获取地理位置数据
  getLocations: async (timeRange?: string): Promise<OverviewLocation[]> => {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    const response = await apiClient.get<ApiResponse<OverviewLocation[]>>(`/api/overview/locations${params}`);
    return response.data;
  },
};