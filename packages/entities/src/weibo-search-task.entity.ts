import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity.js';
import { WeiboAccountEntity } from './weibo-account.entity.js';
import { WeiboSearchTaskStatus } from '@pro/types';

// 重新导出枚举，保持向后兼容
export { WeiboSearchTaskStatus } from '@pro/types';

/**
 * 微博搜索任务实体
 * 负责管理微博关键词搜索的持续监控配置和执行状态
 */
@Entity('weibo_search_tasks')
@Index(['enabled', 'nextRunAt']) // 用于broker快速扫描待执行任务
@Index(['status']) // 用于监控和状态查询
export class WeiboSearchTaskEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 100 })
  keyword: string;

  @Column({ type: 'timestamp', name: 'start_date' })
  startDate: Date;

  /**
   * 历史回溯进度游标
   * 从当前时间向startDate递减，用于历史数据回溯
   * null表示尚未开始首次抓取
   */
  @Column({ type: 'timestamp', nullable: true, name: 'current_crawl_time' })
  currentCrawlTime?: Date;

  /**
   * 最新数据时间游标
   * 记录最新抓取到的数据时间，用于增量更新
   */
  @Column({ type: 'timestamp', nullable: true, name: 'latest_crawl_time' })
  latestCrawlTime?: Date;

  /**
   * 抓取间隔
   * 支持格式: '1h', '30m', '1d' 等
   */
  @Column({ type: 'varchar', length: 20, default: '1h', name: 'crawl_interval' })
  crawlInterval: string;

  /**
   * 下次执行时间
   * broker根据此时间判断是否需要生成子任务
   */
  @Column({ type: 'timestamp', nullable: true, name: 'next_run_at' })
  nextRunAt?: Date;

  /**
   * 指定使用的微博账号ID
   * 可选，不指定则自动选择
   */
  @Column({ type: 'int', nullable: true, name: 'weibo_account_id' })
  weiboAccountId?: number;

  /**
   * 是否启用账号轮换
   * 启用后会自动在多个有效账号间轮换，降低封禁风险
   */
  @Column({ type: 'boolean', default: false, name: 'enable_account_rotation' })
  enableAccountRotation: boolean;

  /**
   * 任务执行状态
   */
  @Column({
    type: 'enum',
    enum: WeiboSearchTaskStatus,
    default: WeiboSearchTaskStatus.PENDING,
  })
  status: WeiboSearchTaskStatus;

  /**
   * 任务是否启用
   * 禁用后broker不会调度此任务
   */
  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  /**
   * 任务进度
   * 已完成的段数，用于显示历史回溯进度
   */
  @Column({ type: 'int', default: 0 })
  progress: number;

  /**
   * 总段数预估
   * 用于进度条显示，实际段数可能动态变化
   */
  @Column({ type: 'int', default: 0 })
  totalSegments: number;

  /**
   * 连续无数据次数
   * 用于智能暂停机制，避免无意义的抓取
   */
  @Column({ type: 'int', default: 0, name: 'no_data_count' })
  noDataCount: number;

  /**
   * 无数据判定阈值
   * 连续noDataThreshold次无数据后自动暂停任务
   */
  @Column({ type: 'int', default: 3, name: 'no_data_threshold' })
  noDataThreshold: number;

  /**
   * 重试次数
   */
  @Column({ type: 'int', default: 0, name: 'retry_count' })
  retryCount: number;

  /**
   * 最大重试次数
   */
  @Column({ type: 'int', default: 3, name: 'max_retries' })
  maxRetries: number;

  /**
   * 错误信息
   * 记录最后一次失败的原因
   */
  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
    nullable: true
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'varchar', name: 'user_id', nullable: true })
  userId?: string;

  @ManyToOne(() => WeiboAccountEntity, { nullable: true })
  @JoinColumn({ name: 'weibo_account_id' })
  weiboAccount?: WeiboAccountEntity;

  /**
   * 经度
   * 地理坐标精度：10位整数，7位小数
   */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  /**
   * 纬度
   * 地理坐标精度：10位整数，7位小数
   */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  /**
   * 位置地址
   * 详细地址描述，最多500字符
   */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'location_address' })
  locationAddress?: string;

  /**
   * 位置名称
   * 地点名称，最多200字符
   */
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'location_name' })
  locationName?: string;

  /**
   * 检查是否需要执行首次抓取
   */
  get needsInitialCrawl(): boolean {
    return this.currentCrawlTime === null;
  }

  /**
   * 检查是否已完成历史数据回溯
   */
  get isHistoricalCrawlCompleted(): boolean {
    if(!this.currentCrawlTime) return false;
    return this.currentCrawlTime <= this.startDate;
  }

  /**
   * 检查是否可以重试
   */
  get canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }

  /**
   * 检查是否因无数据需要暂停
   */
  get shouldPauseForNoData(): boolean {
    return this.noDataCount >= this.noDataThreshold;
  }

  /**
   * 计算任务完成百分比
   */
  get progressPercentage(): number {
    if (this.totalSegments === 0) return 0;
    return Math.min(Math.round((this.progress / this.totalSegments) * 100), 100);
  }

  /**
   * 获取友好的状态描述
   */
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

  /**
   * 获取任务阶段描述
   */
  get phaseDescription(): string {
    if (this.needsInitialCrawl) return '等待首次抓取';
    if (this.isHistoricalCrawlCompleted) return '持续监控中';
    return '历史数据回溯中';
  }
}