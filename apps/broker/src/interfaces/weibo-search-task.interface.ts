/**
 * 微博搜索任务状态枚举
 */
export enum WeiboSearchTaskStatus {
  PENDING = 'pending',   // 等待执行
  RUNNING = 'running',   // 正在执行
  PAUSED = 'paused',     // 已暂停
  FAILED = 'failed',     // 执行失败
  TIMEOUT = 'timeout',   // 执行超时
}

/**
 * 微博搜索任务实体接口
 * 注意：实际部署时应该使用 @pro/api/src/entities/weibo-search-task.entity
 */
export interface WeiboSearchTaskEntity {
  id: number;
  keyword: string;
  startDate: Date;
  currentCrawlTime?: Date;
  latestCrawlTime?: Date;
  crawlInterval: string;
  nextRunAt?: Date;
  weiboAccountId?: number;
  enableAccountRotation: boolean;
  status: WeiboSearchTaskStatus;
  enabled: boolean;
  progress: number;
  totalSegments: number;
  noDataCount: number;
  noDataThreshold: number;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;

  // 计算属性
  needsInitialCrawl?: boolean;
  isHistoricalCrawlCompleted?: boolean;
  canRetry?: boolean;
  shouldPauseForNoData?: boolean;
  progressPercentage?: number;
  statusDescription?: string;
  phaseDescription?: string;
}