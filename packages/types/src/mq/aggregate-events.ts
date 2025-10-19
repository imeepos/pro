/**
 * 时间窗口类型
 *
 * 定义聚合的时间粒度
 */
export enum TimeWindowType {
  /** 小时级聚合 - 实时监控 */
  HOUR = 'hour',

  /** 天级聚合 - 日报 */
  DAY = 'day',

  /** 周级聚合 - 周报 */
  WEEK = 'week',

  /** 月级聚合 - 月报 */
  MONTH = 'month',
}

/**
 * 聚合指标类型
 *
 * 标识需要计算的聚合维度
 */
export enum AggregateMetric {
  /** 情感分布 - 正面/负面/中性比例 */
  SENTIMENT_DISTRIBUTION = 'sentiment_distribution',

  /** 热门关键词 - Top N 关键词及频次 */
  TOP_KEYWORDS = 'top_keywords',

  /** 热门主题 - Top N 主题及热度 */
  TOP_TOPICS = 'top_topics',

  /** 发布趋势 - 时间序列发布量 */
  POST_TREND = 'post_trend',

  /** 互动趋势 - 点赞/评论/转发趋势 */
  ENGAGEMENT_TREND = 'engagement_trend',

  /** 用户活跃度 - 活跃用户及贡献度 */
  USER_ACTIVITY = 'user_activity',
}

/**
 * 聚合任务事件
 *
 * 触发 Aggregator 对指定时间窗口的数据进行聚合
 * 通常由定时调度器触发,或分析完成后自动触发
 *
 * 设计原则:
 * - 明确的时间边界,支持增量聚合
 * - 灵活的指标选择,避免冗余计算
 */
export interface AggregateTaskEvent {
  /** 时间窗口类型 */
  windowType: TimeWindowType;

  /** 窗口开始时间 - ISO 8601 格式 */
  startTime: string;

  /** 窗口结束时间 - ISO 8601 格式 */
  endTime: string;

  /** 需要计算的聚合指标列表 */
  metrics: AggregateMetric[];

  /** 可选: 过滤条件 */
  filters?: {
    /** 指定关键词 (微博搜索场景) */
    keyword?: string;

    /** 指定任务ID */
    taskId?: number;

    /** 指定数据源平台 */
    platform?: string;
  };

  /** 可选: 聚合配置 */
  config?: {
    /** Top N 数量 (热门关键词/主题) */
    topN?: number;

    /** 是否强制重新计算 (默认使用缓存) */
    forceRecalculate?: boolean;

    /** 结果缓存时长(秒) */
    cacheTTL?: number;
  };

  /** 事件创建时间 - ISO 8601 格式 */
  createdAt: string;
}

/**
 * 聚合完成事件
 *
 * Aggregator 完成聚合后发布
 * 结果已存储到 PostgreSQL 并缓存到 Redis
 *
 * 设计原则:
 * - 提供 Redis 缓存键,支持快速查询
 * - aggregatedMetrics 提供结果摘要,完整数据在数据库/缓存中
 */
export interface AggregationCompleteEvent {
  /** 聚合窗口ID - PostgreSQL 聚合记录主键 */
  windowId: string;

  /** 时间窗口类型 */
  windowType: TimeWindowType;

  /** 窗口开始时间 - ISO 8601 格式 */
  startTime: string;

  /** 窗口结束时间 - ISO 8601 格式 */
  endTime: string;

  /** 聚合指标摘要 - 轻量级结果概览 */
  aggregatedMetrics: {
    /** 总处理记录数 */
    totalRecords: number;

    /** 覆盖的数据类型 */
    dataTypes: string[];

    /** 计算的指标类型 */
    computedMetrics: AggregateMetric[];
  };

  /** Redis 缓存键列表 - 用于快速查询聚合结果 */
  cacheKeys: {
    /** 情感分布缓存键 */
    sentimentDistribution?: string;

    /** 热门关键词缓存键 */
    topKeywords?: string;

    /** 热门主题缓存键 */
    topTopics?: string;

    /** 发布趋势缓存键 */
    postTrend?: string;

    /** 互动趋势缓存键 */
    engagementTrend?: string;

    /** 用户活跃度缓存键 */
    userActivity?: string;
  };

  /** 统计信息 */
  stats: {
    /** 聚合耗时(毫秒) */
    processingTimeMs: number;

    /** 数据覆盖率 (实际处理/预期处理) */
    coverageRate: number;
  };

  /** 事件创建时间 - ISO 8601 格式 */
  createdAt: string;
}
