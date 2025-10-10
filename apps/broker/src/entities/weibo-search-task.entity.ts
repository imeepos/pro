import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

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
 * 微博搜索任务实体
 * 注意：这是 broker 使用的临时版本
 * 实际部署时应该使用 @pro/api/src/entities/weibo-search-task.entity
 */
@Entity('weibo_search_tasks')
@Index(['enabled', 'nextRunAt'])
@Index(['status'])
export class WeiboSearchTaskEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 100 })
  keyword: string;

  @Column({ type: 'timestamp', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'current_crawl_time' })
  currentCrawlTime?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'latest_crawl_time' })
  latestCrawlTime?: Date;

  @Column({ type: 'varchar', length: 20, default: '1h', name: 'crawl_interval' })
  crawlInterval: string;

  @Column({ type: 'timestamp', nullable: true, name: 'next_run_at' })
  nextRunAt?: Date;

  @Column({ type: 'int', nullable: true, name: 'weibo_account_id' })
  weiboAccountId?: number;

  @Column({ type: 'boolean', default: false, name: 'enable_account_rotation' })
  enableAccountRotation: boolean;

  @Index()
  @Column({
    type: 'enum',
    enum: WeiboSearchTaskStatus,
    default: WeiboSearchTaskStatus.PENDING,
  })
  status: WeiboSearchTaskStatus;

  @Index()
  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'int', default: 0 })
  totalSegments: number;

  @Column({ type: 'int', default: 0, name: 'no_data_count' })
  noDataCount: number;

  @Column({ type: 'int', default: 3, name: 'no_data_threshold' })
  noDataThreshold: number;

  @Column({ type: 'int', default: 0, name: 'retry_count' })
  retryCount: number;

  @Column({ type: 'int', default: 3, name: 'max_retries' })
  maxRetries: number;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'varchar', name: 'user_id', nullable: true })
  userId?: string;

  // 计算属性方法
  get needsInitialCrawl(): boolean {
    return this.currentCrawlTime === null;
  }

  get isHistoricalCrawlCompleted(): boolean {
    return this.currentCrawlTime !== null && this.currentCrawlTime <= this.startDate;
  }

  get canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }

  get shouldPauseForNoData(): boolean {
    return this.noDataCount >= this.noDataThreshold;
  }

  get progressPercentage(): number {
    if (this.totalSegments === 0) return 0;
    return Math.min(Math.round((this.progress / this.totalSegments) * 100), 100);
  }

  get statusDescription(): string {
    const statusMap = {
      [WeiboSearchTaskStatus.PENDING]: '等待执行',
      [WeiboSearchTaskStatus.RUNNING]: '正在执行',
      [WeiboSearchTaskStatus.PAUSED]: '已暂停',
      [WeiboSearchTaskStatus.FAILED]: '执行失败',
      [WeiboSearchTaskStatus.TIMEOUT]: '执行超时',
    };
    return statusMap[this.status];
  }

  get phaseDescription(): string {
    if (this.needsInitialCrawl) return '等待首次抓取';
    if (this.isHistoricalCrawlCompleted) return '持续监控中';
    return '历史数据回溯中';
  }
}