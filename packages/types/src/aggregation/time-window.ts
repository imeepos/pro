import { TimeWindowType } from '../mq/aggregate-events.js';

/**
 * 时间窗口
 *
 * 定义聚合的时间边界
 */
export interface TimeWindow {
  /** 窗口类型 */
  type: TimeWindowType;

  /** 窗口开始时间 - ISO 8601 格式 */
  startTime: string;

  /** 窗口结束时间 - ISO 8601 格式 */
  endTime: string;

  /** 可选: 窗口标识符 (如: 2024-W01, 2024-01, 2024-01-15) */
  identifier?: string;
}

/**
 * 情感分布聚合
 *
 * 时间窗口内的情感分类统计
 */
export interface SentimentDistribution {
  /** 正面情感数量 */
  positive: number;

  /** 负面情感数量 */
  negative: number;

  /** 中性情感数量 */
  neutral: number;

  /** 总数 */
  total: number;

  /** 可选: 平均情感得分 */
  averageScore?: number;
}

/**
 * 关键词热度
 *
 * 关键词及其统计指标
 */
export interface KeywordHeat {
  /** 关键词 */
  keyword: string;

  /** 出现频次 */
  frequency: number;

  /** 热度得分 (综合频次、时效性等因素) */
  heatScore: number;

  /** 可选: 趋势 (相比上一窗口的变化率) */
  trend?: number;
}

/**
 * 主题热度
 *
 * 主题及其统计指标
 */
export interface TopicHeat {
  /** 主题ID */
  topicId: string;

  /** 主题标签 */
  label: string;

  /** 相关文档数量 */
  documentCount: number;

  /** 热度得分 */
  heatScore: number;

  /** 可选: 趋势 (相比上一窗口的变化率) */
  trend?: number;
}

/**
 * 时间序列数据点
 *
 * 用于趋势图的数据点
 */
export interface TimeSeriesDataPoint {
  /** 时间戳 - ISO 8601 格式 */
  timestamp: string;

  /** 数值 */
  value: number;
}

/**
 * 用户活跃度
 *
 * 用户及其活跃度指标
 */
export interface UserActivity {
  /** 用户ID */
  userId: string;

  /** 用户名/昵称 */
  username: string;

  /** 发布数量 */
  postCount: number;

  /** 评论数量 */
  commentCount: number;

  /** 获得的互动总数 (点赞+评论+转发) */
  engagementReceived: number;

  /** 影响力得分 (综合发布量、互动量等) */
  influenceScore: number;
}

/**
 * 聚合指标
 *
 * 时间窗口内的完整聚合结果
 */
export interface AggregatedMetrics {
  /** 时间窗口 */
  window: TimeWindow;

  /** 可选: 情感分布 */
  sentimentDistribution?: SentimentDistribution;

  /** 可选: 热门关键词 (Top N) */
  topKeywords?: KeywordHeat[];

  /** 可选: 热门主题 (Top N) */
  topTopics?: TopicHeat[];

  /** 可选: 发布趋势 (时间序列) */
  postTrend?: TimeSeriesDataPoint[];

  /** 可选: 互动趋势 (时间序列) */
  engagementTrend?: TimeSeriesDataPoint[];

  /** 可选: 活跃用户 (Top N) */
  topUsers?: UserActivity[];

  /** 元数据 */
  metadata: {
    /** 总记录数 */
    totalRecords: number;

    /** 聚合时间戳 - ISO 8601 格式 */
    aggregatedAt: string;

    /** 数据完整性 (实际记录数/预期记录数) */
    completeness: number;
  };
}
