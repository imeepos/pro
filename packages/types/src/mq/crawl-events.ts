import { SourceType, SourcePlatform } from '../enums/raw-data.js';

/**
 * 原始数据就绪事件
 *
 * Crawler 完成抓取并存储到 MongoDB 后发布此事件
 * 触发 Cleaner 进行数据清洗
 *
 * 设计原则:
 * - 只传递引用 (rawDataId),不传递完整数据,保持消息轻量
 * - metadata 提供必要的上下文信息,辅助 Cleaner 决策处理策略
 */
export interface RawDataReadyEvent {
  /** MongoDB RawData 文档 ID - 数据的唯一标识 */
  rawDataId: string;

  /** 数据源类型 - 决定清洗策略 */
  sourceType: SourceType;

  /** 数据源平台 - 辅助路由和监控 */
  sourcePlatform: SourcePlatform;

  /** 数据源URL - 用于追溯和去重 */
  sourceUrl: string;

  /** 内容哈希 - 快速去重判断 */
  contentHash: string;

  /** 元数据 - 提供抓取上下文 */
  metadata?: {
    /** 关联的主任务ID */
    taskId?: number;

    /** 抓取关键词 (微博搜索场景) */
    keyword?: string;

    /** 抓取时间范围 */
    timeRange?: {
      start: string;
      end: string;
    };

    /** 数据大小(字节) - 辅助优先级调度 */
    fileSize?: number;

    /** 预估记录数 - 辅助资源分配 */
    estimatedRecords?: number;
  };

  /** 事件创建时间 - ISO 8601 格式 */
  createdAt: string;
}
