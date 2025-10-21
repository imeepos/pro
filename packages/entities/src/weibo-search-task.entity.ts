import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserEntity } from './user.entity.js';
import { WeiboSubTaskEntity } from './weibo-sub-task.entity.js';

/**
 * 微博搜索任务实体 - 配置与执行彻底分离的艺术设计
 *
 * 设计哲学:
 * - 存在即合理: 每个字段都有其不可替代的存在意义
 * - 优雅即简约: 通过精简的结构传递复杂的业务配置
 * - 性能即艺术: 在代码美感与运行效率间找到完美平衡
 *
 * 架构特点:
 * - 配置专注: 只保留核心配置字段，执行状态交由子任务管理
 * - 轻量化设计: 22个字段简化为7个，体现"少即是多"的设计哲学
 * - 性能优化: 精简的结构大幅提升查询和存储效率
 * - 关联清晰: 通过一对多关系与子任务建立血脉联系
 */
@Entity('weibo_search_tasks')
@Index(['enabled', 'nextRunAt']) // 优化broker调度扫描性能
@Index(['keyword']) // 优化关键词查询性能
export class WeiboSearchTaskEntity {
  /**
   * 主键 - 任务在数字世界中的唯一标识
   * 每个搜索任务都有其不可替代的存在价值
   */
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * 搜索关键词 - 信息探索的核心
   * 连接用户意图与海量数据的桥梁，是信息检索的起点
   */
  @Index()
  @Column({ type: 'varchar', length: 100 })
  keyword: string;

  /**
   * 监控起始时间 - 信息采集的时间原点
   * 定义搜索任务的历史边界，标志着信息探索的起点
   */
  @Index()
  @Column({ type: 'timestamp', name: 'start_date' })
  startDate: Date;

  /**
   * 最新数据时间游标 - 增量抓取的导航标
   * 记录最新抓取到的数据时间，指导增量更新的方向
   * null表示尚未开始抓取，等待第一次探索
   */
  @Index()
  @Column({ type: 'timestamp', nullable: true, name: 'latest_crawl_time' })
  latestCrawlTime?: Date;

  /**
   * 抓取间隔 - 控制采集频率的韵律
   * 支持cron表达式格式: '1h', '30m', '1d' 等
   * 定义任务执行的时间节拍，平衡效率与资源消耗
   */
  @Column({ type: 'varchar', length: 20, default: '1h', name: 'crawl_interval' })
  crawlInterval: string;

  /**
   * 下次执行时间 - 任务调度的节拍器
   * broker根据此时间判断是否需要生成新的子任务
   * 精确控制任务执行时机，实现智能调度
   */
  @Index()
  @Column({ type: 'timestamp', nullable: true, name: 'next_run_at' })
  nextRunAt?: Date;

  /**
   * 是否启用 - 任务生命力的开关
   * 控制任务的活跃状态，禁用后broker将停止调度
   * 优雅地控制任务生命周期，避免无意义的资源消耗
   */
  @Index()
  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // ==================== 关联关系 ====================

  /**
   * 用户关联 - 任务的归属者
   * 建立任务与用户的血脉联系，体现责任与归属
   */
  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
    nullable: true
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'varchar', name: 'user_id', nullable: true })
  userId?: string;

  /**
   * 子任务集合 - 配置与执行的桥梁
   * 通过一对多关系连接执行层面的子任务，实现彻底的职责分离
   */
  @OneToMany(() => WeiboSubTaskEntity, subTask => subTask.task, {
    cascade: true, // 主任务删除时，子任务随之消失
    eager: false   // 按需加载，避免性能问题
  })
  subTasks: WeiboSubTaskEntity[];

  // ==================== 虚拟字段和计算属性 ====================

  /**
   * 检查是否需要执行首次抓取
   * 通过latestCrawlTime是否为null判断任务是否已经开始
   */
  get needsInitialCrawl(): boolean {
    return this.latestCrawlTime === null;
  }

  /**
   * 检查是否已达到调度时机
   * broker根据此判断是否需要生成新的子任务
   */
  get isDueForExecution(): boolean {
    if (!this.enabled) return false;
    if (!this.nextRunAt) return true; // 如果没有设置下次执行时间，立即执行
    return this.nextRunAt <= new Date();
  }

  /**
   * 获取当前任务状态描述
   * 基于配置信息推断任务的整体状态
   */
  get taskPhaseDescription(): string {
    if (!this.enabled) return '已休眠';
    if (this.needsInitialCrawl) return '等待启航';
    if (this.nextRunAt && this.nextRunAt > new Date()) return '静候时机';
    return '持续监控';
  }

  /**
   * 计算任务配置的健康度评分
   * 基于配置合理性进行评估，满分100分
   */
  get configurationHealthScore(): number {
    let score = 100;

    // 检查关键词质量
    if (!this.keyword || this.keyword.length < 2) score -= 30;
    if (this.keyword.length > 50) score -= 10;

    // 检查时间配置合理性
    const now = new Date();
    if (this.startDate > now) score -= 20; // 开始时间在未来
    const daysSinceStart = (now.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceStart > 365) score -= 10; // 监控时间过长

    // 检查抓取间隔合理性
    const intervalMinutes = this.parseIntervalToMinutes(this.crawlInterval);
    if (intervalMinutes < 5) score -= 20; // 过于频繁
    if (intervalMinutes > 1440) score -= 10; // 过于稀疏

    return Math.max(0, Math.round(score));
  }

  /**
   * 解析抓取间隔为分钟数
   * 支持格式: '1h', '30m', '1d' 等
   */
  private parseIntervalToMinutes(interval: string): number {
    const match = interval.match(/^(\d+)([hmd])$/);
    if (!match) return 60; // 默认1小时

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm': return value;
      case 'h': return value * 60;
      case 'd': return value * 60 * 24;
      default: return 60;
    }
  }

  /**
   * 检查任务配置是否完整
   * 确保所有必要的配置字段都已正确设置
   */
  get isConfigurationComplete(): boolean {
    return !!(this.keyword &&
              this.startDate &&
              this.crawlInterval);
  }

  /**
   * 获取友好的抓取间隔描述
   * 将技术格式转换为人类可读的描述
   */
  get intervalDescription(): string {
    const minutes = this.parseIntervalToMinutes(this.crawlInterval);

    if (minutes < 60) return `${minutes}分钟`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}小时`;
    return `${Math.round(minutes / 1440)}天`;
  }

  /**
   * 计算下次执行的等待时间
   * 返回距离下次执行的描述性文本
   */
  get nextExecutionWaitTime(): string {
    if (!this.nextRunAt) return '立即执行';
    if (!this.enabled) return '已禁用';

    const now = new Date();
    const diff = this.nextRunAt.getTime() - now.getTime();

    if (diff <= 0) return '已到期';

    const minutes = Math.round(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}分钟后`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}小时后`;

    const days = Math.round(hours / 24);
    return `${days}天后`;
  }
}