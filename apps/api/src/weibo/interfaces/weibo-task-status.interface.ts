/**
 * 微博任务状态更新消息接口
 * 从Crawler服务发送到API服务，用于同步任务执行状态
 */

export interface WeiboTaskStatusMessage {
  /** 任务ID */
  taskId: number;

  /** 任务状态 */
  status: 'running' | 'completed' | 'failed' | 'timeout';

  /** 当前抓取时间节点 */
  currentCrawlTime?: Date;

  /** 最新抓取时间节点 */
  latestCrawlTime?: Date;

  /** 下次执行时间 */
  nextRunAt?: Date;

  /** 任务进度百分比 */
  progress?: number;

  /** 错误信息 */
  errorMessage?: string;

  /** 更新时间戳 */
  updatedAt: Date;
}

/**
 * 任务状态消费者配置接口
 */
export interface TaskStatusConsumerConfig {
  /** 队列名称 */
  queueName: string;

  /** 消费者标签 */
  consumerTag: string;

  /** 预取数量 */
  prefetchCount: number;

  /** 重试配置 */
  retryConfig: {
    /** 最大重试次数 */
    maxRetries: number;
    /** 重试延迟基数（毫秒） */
    retryDelayBase: number;
  };
}

/**
 * 消息处理结果枚举
 */
export enum MessageProcessResult {
  /** 处理成功 */
  SUCCESS = 'success',
  /** 处理失败，可重试 */
  RETRY = 'retry',
  /** 处理失败，不可重试 */
  FAILED = 'failed',
}

/**
 * 消费者处理统计信息
 */
export interface ConsumerStats {
  /** 总处理消息数 */
  totalMessages: number;

  /** 成功处理数 */
  successCount: number;

  /** 失败处理数 */
  failureCount: number;

  /** 重试处理数 */
  retryCount: number;

  /** 平均处理时间（毫秒） */
  avgProcessingTime: number;

  /** 最后处理时间 */
  lastProcessedAt?: Date;
}