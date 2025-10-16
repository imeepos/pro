/**
 * 小时统计数据接口定义
 * 支持按小时维度的统计查询和曲线图展示
 */

export enum HourlyStatsType {
  /** 任务执行统计 */
  TASK_EXECUTION = 'task_execution',
  /** 消息处理统计 */
  MESSAGE_PROCESSING = 'message_processing',
  /** 性能统计 */
  PERFORMANCE = 'performance',
  /** 用户活跃度 */
  USER_ACTIVITY = 'user_activity',
}

export interface HourlyStatsPoint {
  /** 时间点 (ISO 8601格式) */
  hour: string;
  /** 统计数量 */
  count: number;
  /** 占比 (可选) */
  percentage?: number;
  /** 趋势 (可选) */
  trend?: 'up' | 'down' | 'stable';
}

export interface HourlyStatsTimeRange {
  /** 开始时间 */
  start: string;
  /** 结束时间 */
  end: string;
  /** 时区 */
  timezone: string;
}

export interface HourlyStatsSummary {
  /** 总数 */
  total: number;
  /** 平均值 */
  average: number;
  /** 峰值 */
  peak: {
    hour: string;
    count: number;
  };
  /** 增长率 (可选) */
  growth?: number;
}

export interface HourlyStatsResponse {
  /** 时间范围 */
  timeRange: HourlyStatsTimeRange;
  /** 统计数据点 */
  data: HourlyStatsPoint[];
  /** 汇总信息 */
  summary: HourlyStatsSummary;
}

export interface HourlyStatsQuery {
  /** 统计类型 */
  type: HourlyStatsType;
  /** 开始日期 */
  startDate: Date;
  /** 结束日期 */
  endDate: Date;
  /** 时区 (默认 Asia/Shanghai) */
  timezone?: string;
  /** 聚合间隔 (默认 hour) */
  interval?: 'hour' | 'day' | 'week' | 'month';
}

export interface HourlyStatsRecord {
  /** 统计类型 */
  type: HourlyStatsType;
  /** 时间戳 */
  timestamp: number;
  /** 统计数量 */
  count: number;
  /** 额外元数据 */
  metadata?: Record<string, any>;
}

export interface HourlyStatsCache {
  /** Redis键 */
  key: string;
  /** 过期时间(秒) */
  ttl: number;
  /** 是否启用缓存 */
  enabled: boolean;
}

export const HOURLY_STATS_TTL = {
  /** 最近24小时数据缓存 1小时 */
  RECENT_HOURS: 60 * 60,
  /** 最近7天数据缓存 6小时 */
  RECENT_DAYS: 6 * 60 * 60,
  /** 历史数据缓存 24小时 */
  HISTORICAL: 24 * 60 * 60,
} as const;

export const HOURLY_STATS_CONFIG = {
  /** 最大查询天数 */
  MAX_QUERY_DAYS: 365,
  /** 默认查询天数 */
  DEFAULT_QUERY_DAYS: 7,
  /** 单次查询最大小时数 */
  MAX_HOURS_PER_QUERY: 24 * 30, // 30天
  /** 数据分片大小 */
  SHARD_SIZE: 24, // 按天分片
} as const;