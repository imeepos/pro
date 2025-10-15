/**
 * 通用API服务
 */

import { apiUtils as apiClient } from './client';
import type { ApiResponse } from '../../types';

// 日期序列数据类型
export interface DateSeriesData {
  date: string;
  count: number;
}

// 情感曲线数据类型
export interface EmotionCurveData {
  hours: string[];
  positiveData: number[];
  negativeData: number[];
  neutralData: number[];
}

// 情感饼图数据类型
export interface SentimentPieData {
  name: string;
  value: number;
  color: string;
}

// 事件类型数据类型
export interface EventTypeData {
  name: string;
  value: number;
  color: string;
}

// 帖子数量历史数据类型
export interface PostCountHistoryData {
  date: string;
  count: number;
}

// 通用API类
export class CommonAPI {
  // 获取日期序列数据
  static async getDateSeries(days: number = 7): Promise<DateSeriesData[]> {
    const response = await apiClient.get<ApiResponse<DateSeriesData[]>>(
      `/api/common/date-series?days=${days}`
    );
    return response.data;
  }

  // 获取情感曲线数据
  static async getEmotionCurve(points: number = 7): Promise<EmotionCurveData> {
    const response = await apiClient.get<ApiResponse<EmotionCurveData>>(
      `/api/common/emotion-curve?points=${points}`
    );
    return response.data;
  }

  // 获取情感饼图数据
  static async getSentimentPie(): Promise<SentimentPieData[]> {
    const response = await apiClient.get<ApiResponse<SentimentPieData[]>>(
      '/api/common/sentiment-pie'
    );
    return response.data;
  }

  // 获取事件类型统计
  static async getEventTypes(): Promise<EventTypeData[]> {
    const response = await apiClient.get<ApiResponse<EventTypeData[]>>(
      '/api/common/event-types'
    );
    return response.data;
  }

  // 获取帖子数量历史数据
  static async getPostCountHistory(days: number = 7): Promise<PostCountHistoryData[]> {
    const response = await apiClient.get<ApiResponse<PostCountHistoryData[]>>(
      `/api/common/post-count-history?days=${days}`
    );
    return response.data;
  }
}

// 导出便捷方法
export const {
  getDateSeries,
  getEmotionCurve,
  getSentimentPie,
  getEventTypes,
  getPostCountHistory,
} = CommonAPI;