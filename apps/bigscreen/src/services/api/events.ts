/**
 * 事件相关API服务
 */

import { apiUtils as apiClient } from './client';
import type { ApiResponse, EventItem, HotEvent } from '../../types';

// 事件列表查询参数
export interface EventsListParams {
  category?: string;
  search?: string;
  limit?: number;
}

// 使用统一的 EventItem 类型
export type EventInfo = EventItem;

// 事件详情 - 扩展 EventItem
export interface EventDetail extends EventItem {
  content: string;
  relatedUsers: string[];
  relatedPosts: string[];
  statistics: {
    totalPosts: number;
    totalUsers: number;
    totalInteractions: number;
    peakTime: string;
  };
  timeline: EventTimelineItem[];
}

// 事件时间线项
export interface EventTimelineItem {
  timestamp: string;
  action: string;
  description: string;
  userId?: string;
  postId?: string;
}

// 事件分类
export interface EventCategory {
  id: string;
  name: string;
  description?: string;
  count: number;
  color?: string;
}

// 事件趋势数据
export interface EventTrendData {
  date: string;
  count: number;
  category: string;
}

// HotEvent 类型已在上面导入

// 事件时间序列数据
export interface EventTimeSeriesData {
  timestamp: string;
  posts: number;
  users: number;
  interactions: number;
}

// 事件趋势图表数据
export interface EventTrendsChart {
  timeline: string[];
  postVolume: number[];
  sentimentScores: number[];
  userEngagement: number[];
}

// 影响力用户
export interface InfluenceUser {
  userId: string;
  username: string;
  avatar?: string;
  followers: number;
  influence: number;
  postCount: number;
  interactionCount: number;
  sentimentScore: number;
}

// 地理分布数据
export interface EventGeographicData {
  region: string;
  province?: string;
  city?: string;
  count: number;
  coordinates?: [number, number];
  percentage: number;
}

export const EventsAPI = {
  // 获取事件列表
  getEventsList: async (params?: EventsListParams): Promise<EventInfo[]> => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const url = `/api/events/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get<ApiResponse<EventInfo[]>>(url);
    return response.data;
  },

  // 获取事件分类
  getCategories: async (): Promise<EventCategory[]> => {
    const response = await apiClient.get<ApiResponse<EventCategory[]>>('/api/events/categories');
    return response.data;
  },

  // 获取事件趋势数据
  getTrendData: async (): Promise<EventTrendData[]> => {
    const response = await apiClient.get<ApiResponse<EventTrendData[]>>('/api/events/trend-data');
    return response.data;
  },

  // 获取热门事件列表
  getHotList: async (): Promise<HotEvent[]> => {
    const response = await apiClient.get<ApiResponse<HotEvent[]>>('/api/events/hot-list');
    return response.data;
  },

  // 获取事件详情
  getEventDetail: async (eventId: string): Promise<EventDetail> => {
    const response = await apiClient.get<ApiResponse<EventDetail>>(`/api/events/${eventId}`);
    return response.data;
  },

  // 获取事件时间序列数据
  getEventTimeSeries: async (eventId: string): Promise<EventTimeSeriesData[]> => {
    const response = await apiClient.get<ApiResponse<EventTimeSeriesData[]>>(`/api/events/${eventId}/timeseries`);
    return response.data;
  },

  // 获取事件趋势图表数据
  getEventTrends: async (eventId: string): Promise<EventTrendsChart> => {
    const response = await apiClient.get<ApiResponse<EventTrendsChart>>(`/api/events/${eventId}/trends`);
    return response.data;
  },

  // 获取影响力用户
  getInfluenceUsers: async (eventId: string): Promise<InfluenceUser[]> => {
    const response = await apiClient.get<ApiResponse<InfluenceUser[]>>(`/api/events/${eventId}/influence-users`);
    return response.data;
  },

  // 获取地理分布数据
  getGeographic: async (eventId: string): Promise<EventGeographicData[]> => {
    const response = await apiClient.get<ApiResponse<EventGeographicData[]>>(`/api/events/${eventId}/geographic`);
    return response.data;
  },
};