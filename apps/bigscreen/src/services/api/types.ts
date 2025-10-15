/**
 * 共享API类型定义
 * 统一管理所有API服务的通用类型
 */

// 重新导出统一类型定义
export type {
  ApiResponse,
  BaseEntity,
  SentimentData,
  StatisticsData,
  OverviewStatisticsData,
  HotTopic,
  KeywordData,
  TimeSeriesData,
  LocationData,
  EventItem,
  HotEvent,
  UserProfile,
  TrendData,
  RealTimeData,
  WebSocketMessage,
  SystemStatus,
  ChartConfig,
  DashboardConfig,
  AppError
} from '../../types';

// 时间范围类型
export type TimeRange = '1h' | '6h' | '12h' | '24h' | '7d' | '30d';

// 分页参数类型
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  limit?: number;
}

// 排序参数类型
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 通用查询参数类型
export interface BaseQueryParams extends PaginationParams, SortParams {
  search?: string;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}