import { SourceType } from '../enums/raw-data.js';

/**
 * 任务优先级
 *
 * 基于业务价值和时效性的分级策略
 */
export enum TaskPriority {
  /** 低优先级 - 历史数据回溯 */
  LOW = 'low',

  /** 正常优先级 - 常规调度任务 */
  NORMAL = 'normal',

  /** 高优先级 - 热点事件,时效性敏感 */
  HIGH = 'high',

  /** 紧急优先级 - 手动触发的关键任务 */
  URGENT = 'urgent',
}

/**
 * 清洗任务事件
 *
 * 触发 Cleaner 对指定原始数据进行清洗
 * 可由 Crawler 自动触发,或由 System 手动/定时触发
 *
 * 设计原则:
 * - 明确的任务优先级,支持资源调度优化
 * - 可选的并发控制参数,避免 Cleaner 过载
 */
export interface CleanTaskEvent {
  /** MongoDB RawData 文档 ID */
  rawDataId: string;

  /** 数据源类型 - 决定解析器选择 */
  sourceType: SourceType;

  /** 任务优先级 - 影响调度顺序 */
  priority: TaskPriority;

  /** 可选: 重试次数 (首次为0) */
  retryCount?: number;

  /** 可选: 上次失败原因 (重试场景) */
  lastError?: string;

  /** 事件创建时间 - ISO 8601 格式 */
  createdAt: string;
}

/**
 * 清洗完成事件
 *
 * Cleaner 完成数据清洗并存储到 PostgreSQL 后发布
 * 触发 Analyzer 进行数据分析
 *
 * 设计原则:
 * - 传递提取的实体ID列表,而非完整数据
 * - 通过 extractedEntities 提供数据概览,辅助分析决策
 */
export interface CleanedDataEvent {
  /** 原始数据ID - 追溯源头 */
  rawDataId: string;

  /** 数据源类型 */
  sourceType: SourceType;

  /** 提取的实体概览 - 使用ID引用而非完整数据 */
  extractedEntities: {
    /** 提取的帖子ID列表 */
    postIds: string[];

    /** 提取的评论ID列表 */
    commentIds: string[];

    /** 提取的用户ID列表 */
    userIds: string[];
  };

  /** 统计信息 - 辅助监控和优先级调度 */
  stats: {
    /** 总处理记录数 */
    totalRecords: number;

    /** 成功解析记录数 */
    successCount: number;

    /** 跳过记录数 (重复/无效) */
    skippedCount: number;

    /** 处理耗时(毫秒) */
    processingTimeMs: number;
  };

  /** 事件创建时间 - ISO 8601 格式 */
  createdAt: string;
}
