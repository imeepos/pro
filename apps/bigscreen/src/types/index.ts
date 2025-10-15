// 基础数据类型
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// 舆情数据类型
export interface SentimentData extends BaseEntity {
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  source: 'weibo' | 'zhihu' | 'news' | 'other';
  author: string;
  platform: string;
  url?: string;
  tags: string[];
  location?: string;
  timestamp: string;
}

// 统计数据类型
export interface StatisticsData {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  growth: number;
  growthRate: number;
}

// 数据总览统计类型
export interface OverviewStatisticsData {
  eventCount: number;
  eventCountChange: number;
  postCount: number;
  postCountChange: number;
  userCount: number;
  userCountChange: number;
  interactionCount: number;
  interactionCountChange: number;
}

// 热点话题类型
export interface HotTopic extends BaseEntity {
  title: string;
  count: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  keywords: string[];
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

// 关键词数据类型
export interface KeywordData {
  name: string;
  value: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

// 时间序列数据类型
export interface TimeSeriesData {
  timestamp: string;
  value: number;
  positive?: number;
  negative?: number;
  neutral?: number;
}

// 地理位置数据类型
export interface LocationData {
  name: string;
  value: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  coordinates: [number, number];
}

// 事件项目类型
export interface EventItem {
  id: string;
  title: string;
  description: string;
  postCount: number;
  userCount: number;
  sentiment: { positive: number; negative: number; neutral: number };
  hotness: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  keywords: string[];
  createdAt: string;
  lastUpdate: string;
  trendData: number[];
}

// 热门事件类型（简化版EventItem）
export interface HotEvent {
  id: string;
  title: string;
  postCount: number;
  sentiment: { positive: number; negative: number; neutral: number };
  hotness: number;
  trend: 'up' | 'down' | 'stable';
  trendData: number[];
}

// 用户资料类型
export interface UserProfile {
  id: string;
  username: string;
  nickname: string;
  followers: number;
  following: number;
  posts: number;
  verified: boolean;
  location: string;
  riskLevel: 'high' | 'medium' | 'low';
  activities: {
    posts: number;
    comments: number;
  };
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  tags: string[];
  lastActive: string;
}

// 趋势数据类型
export interface TrendData {
  eventTrendData?: number[];
  postTrendData?: number[];
  userTrendData?: number[];
  hotnessData?: number[];
  [key: string]: any;
}

// 实时数据类型
export interface RealTimeData {
  statistics: StatisticsData;
  hotTopics: HotTopic[];
  keywords: KeywordData[];
  timeSeries: TimeSeriesData[];
  locations: LocationData[];
  recentPosts: SentimentData[];
}

// WebSocket 消息类型
export interface WebSocketMessage<T = unknown> {
  type: 'update' | 'alert' | 'heartbeat';
  data: T;
  timestamp: string;
}

// 系统状态类型
export interface SystemStatus {
  isOnline: boolean;
  lastUpdate: string;
  dataSource: {
    weibo: boolean;
    zhihu: boolean;
    news: boolean;
  };
  performance: {
    cpu: number;
    memory: number;
    network: number;
  };
}

// 图表配置类型
export interface ChartConfig<T = unknown> {
  type: 'line' | 'bar' | 'pie' | 'wordcloud' | 'map';
  title: string;
  data: T[];
  options?: Record<string, unknown>;
}

// 仪表板配置类型
export interface DashboardConfig {
  layout: 'grid' | 'flex';
  refreshInterval: number;
  autoRefresh: boolean;
  theme: 'dark' | 'light';
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

// 错误类型
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// 导出BLE Mesh相关类型
export * from './bleMesh';

// ECharts 相关类型
export interface EChartsTooltipParams {
  name: string;
  value: number | string;
  data?: unknown;
  color?: string;
  seriesName?: string;
  axisValue?: string;
}

export interface EChartsFormatterParams {
  name: string;
  value: number | string;
  data?: unknown;
  color?: string;
}
