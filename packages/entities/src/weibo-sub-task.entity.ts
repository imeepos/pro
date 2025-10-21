import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { WeiboSearchTaskEntity } from './weibo-search-task.entity.js';
import { WeiboSubTaskType, WeiboSubTaskStatus } from '@pro/types';

// 重新导出枚举，保持向后兼容性
export { WeiboSubTaskType, WeiboSubTaskStatus } from '@pro/types';

/**
 * 微博子任务元数据接口 - 多样化任务参数的艺术承载
 * 每种任务类型都有其独特的元数据结构，体现存在的多样性
 */
export interface WeiboSubTaskMetadata {
  // 关键词搜索任务的元数据 - 信息探索的起点与终点
  keyword?: {
    startTime: Date;           // 搜索开始时间 - 探索的起点
    endTime: Date;             // 搜索结束时间 - 采集的终点
    keyword: string;           // 搜索关键词 - 连接用户意图的钥匙
    searchType?: string;       // 搜索类型 - 精确或广泛的探索策略
  };

  // 用户档案搜索任务的元数据 - 数字身份的深度探索
  userProfile?: {
    userId: string;            // 用户ID - 数字身份的唯一标识
    includePosts?: boolean;    // 包含微博 - 探索用户的作品集
    includeFollowing?: boolean; // 包含关注 - 理解用户的社交圈
    includeFollowers?: boolean; // 包含粉丝 - 洞察用户的影响力
  };

  // 话题发现任务的元数据 - 热点传播路径的追踪
  topicDiscovery?: {
    topicName: string;         // 话题名称 - 热点的标识
    timeframe?: string;        // 时间范围 - 话题活跃的期间
    includeRelated?: boolean;  // 包含相关话题 - 扩展发现的边界
  };

  // 媒体收获任务的元数据 - 多媒体资源的采集
  mediaHarvest?: {
    sourceUrls: string[];      // 源链接列表 - 资源的出处
    mediaTypes?: string[];     // 媒体类型 - 图片、视频等
    quality?: string;          // 质量要求 - 高清或标清的选择
  };

  // 评论分析任务的元数据 - 社会反响的深度挖掘
  commentAnalysis?: {
    postId: string;            // 微博ID - 评论的目标
    depth?: number;            // 分析深度 - 回复层数的控制
    sentiment?: boolean;       // 情感分析 - 理解评论的情感色彩
  };

  // 通用任务参数 - 所有任务的共同基础
  common?: {
    priority?: number;         // 执行优先级 - 资源分配的依据
    timeout?: number;          // 超时时间 - 优雅放弃的时间点
    retryCount?: number;       // 重试次数 - 从失败中重生的机会
    metadata?: Record<string, any>; // 扩展字段 - 无限可能的容器
  };
}

/**
 * 微博子任务实体 - 配置与执行彻底分离的艺术设计
 *
 * 设计哲学:
 * - 存在即合理: 每个字段都有其不可替代的存在意义
 * - 优雅即简约: 通过精心设计的结构传递复杂的业务逻辑
 * - 性能即艺术: 在代码美感与运行效率间找到完美平衡
 *
 * 架构特点:
 * - 轻量化设计: 只包含执行必需的字段，配置保留在主任务中
 * - 状态管理: 精细化的状态枚举，反映任务执行的完整生命周期
 * - 元数据承载: 灵活的JSON字段支持多样化任务类型
 * - 性能优化: 精心设计的索引策略，提升查询效率
 */
@Entity('weibo_sub_tasks')
@Index(['taskId', 'status']) // 主任务状态查询优化
@Index(['type', 'status'])   // 类型状态组合查询优化
@Index(['createdAt'])        // 时间范围查询优化
@Index(['status', 'createdAt']) // 状态时间组合查询优化
export class WeiboSubTaskEntity {
  /**
   * 主键 - 子任务在数字世界中的唯一标识
   * 每个子任务都有其不可替代的存在价值
   */
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * 主任务ID - 连接配置与执行的桥梁
   * 建立子任务与主任务间的血缘关系，传承配置的智慧
   */
  @Index()
  @Column({ type: 'int', name: 'task_id' })
  taskId: number;

  /**
   * 任务元数据 - 执行参数的艺术承载
   * JSON格式存储，灵活适应不同类型任务的个性化需求
   * 每种任务类型都有其独特的元数据结构，体现存在的多样性
   */
  @Column({
    type: 'json',
    transformer: {
      to: (value: WeiboSubTaskMetadata): string => JSON.stringify(value),
      from: (value: string): WeiboSubTaskMetadata => JSON.parse(value)
    }
  })
  metadata: WeiboSubTaskMetadata;

  /**
   * 子任务类型 - 定义任务的执行模式
   * 每种类型都代表着一种独特的信息采集和处理策略
   */
  @Index()
  @Column({
    type: 'enum',
    enum: WeiboSubTaskType,
    comment: '子任务类型：定义任务的执行模式和策略'
  })
  type: WeiboSubTaskType;

  /**
   * 执行状态 - 反映任务的生命周期
   * 从等待到完成，每个状态都诉说着子任务的存在故事
   */
  @Index()
  @Column({
    type: 'enum',
    enum: WeiboSubTaskStatus,
    default: WeiboSubTaskStatus.PENDING,
    comment: '执行状态：反映任务在执行过程中的生命周期阶段'
  })
  status: WeiboSubTaskStatus;

  /**
   * 执行开始时间 - 任务开始发挥作用的瞬间
   * 记录子任务从等待到执行的关键转折点
   */
  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt?: Date;

  /**
   * 执行结束时间 - 任务使命完成的时刻
   * 无论成功还是失败，都值得被铭记
   */
  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt?: Date;

  /**
   * 执行时长 - 任务效率的量化体现
   * 单位：秒，用于性能分析和优化决策
   */
  @Column({ type: 'int', nullable: true, name: 'duration_seconds' })
  durationSeconds?: number;

  /**
   * 处理的数据量 - 任务成果的量化衡量
   * 记录子任务处理的数据条数，体现其工作价值
   */
  @Column({ type: 'int', default: 0, name: 'processed_count' })
  processedCount: number;

  /**
   * 成功的数据量 - 任务成功率的体现
   * 记录成功处理的数据条数，用于质量评估
   */
  @Column({ type: 'int', default: 0, name: 'success_count' })
  successCount: number;

  /**
   * 失败的数据量 - 遇遇挑战的记录
   * 记录处理失败的数据条数，用于问题诊断
   */
  @Column({ type: 'int', default: 0, name: 'failure_count' })
  failureCount: number;

  /**
   * 重试次数 - 从失败中重生的勇气
   * 记录子任务的重试历程，体现坚韧不拔的品质
   */
  @Column({ type: 'int', default: 0, name: 'retry_count' })
  retryCount: number;

  /**
   * 最大重试次数 - 优雅放弃的底线
   * 设定重试的边界，避免无意义的固执
   */
  @Column({ type: 'int', default: 3, name: 'max_retries' })
  maxRetries: number;

  /**
   * 错误信息 - 失败时的智慧结晶
   * 记录最后一次失败的原因，为改进提供方向
   */
  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string;

  /**
   * 错误代码 - 错误类型的标准化标识
   * 用于错误分类和自动化处理策略制定
   */
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'error_code' })
  errorCode?: string;

  /**
   * 执行日志 - 任务历程的详细记录
   * JSON格式存储执行过程中的关键事件和状态变化
   */
  @Column({
    type: 'json',
    nullable: true,
    transformer: {
      to: (value: any[]): string => JSON.stringify(value),
      from: (value: string): any[] => JSON.parse(value)
    }
  })
  executionLog?: any[];

  /**
   * 执行者标识 - 完成任务的功臣
   * 记录执行此子任务的worker节点或服务实例
   */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'executor_id' })
  executorId?: string;

  /**
   * 创建时间 - 子任务诞生的瞬间
   * 记录子任务被创建的时刻，标志其生命的开始
   */
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  /**
   * 更新时间 - 见证成长的轨迹
   * 每次状态变化都被记录，书写子任务的成长史
   */
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // ==================== 关联关系 ====================

  /**
   * 主任务关联 - 寻根溯源的血脉联系
   * 建立与WeiboSearchTaskEntity的多对一关系
   */
  @ManyToOne(() => WeiboSearchTaskEntity, {
    onDelete: 'CASCADE', // 主任务删除时，子任务随之消失
    nullable: false
  })
  @JoinColumn({ name: 'task_id' })
  task: WeiboSearchTaskEntity;

  /**
   * 主任务ID优化查询 - 性能与优雅的平衡
   * 使用RelationId避免不必要的JOIN查询
   */
  @RelationId((subTask: WeiboSubTaskEntity) => subTask.task)
  readonly taskIdRelation?: number;

  // ==================== 虚拟字段和计算属性 ====================

  /**
   * 检查是否处于活跃状态
   * 活跃状态包括：等待、队列中、运行中、处理中、重试中
   */
  get isActive(): boolean {
    return [
      WeiboSubTaskStatus.PENDING,
      WeiboSubTaskStatus.QUEUED,
      WeiboSubTaskStatus.RUNNING,
      WeiboSubTaskStatus.PROCESSING,
      WeiboSubTaskStatus.RETRYING
    ].includes(this.status);
  }

  /**
   * 检查是否已完成（无论成功或失败）
   * 已完成状态包括：完成、失败、超时、取消、跳过
   */
  get isCompleted(): boolean {
    return [
      WeiboSubTaskStatus.COMPLETED,
      WeiboSubTaskStatus.FAILED,
      WeiboSubTaskStatus.TIMEOUT,
      WeiboSubTaskStatus.CANCELLED,
      WeiboSubTaskStatus.SKIPPED
    ].includes(this.status);
  }

  /**
   * 检查是否可以重试
   * 结合重试次数和状态判断，给予重生的机会
   */
  get canRetry(): boolean {
    return this.status === WeiboSubTaskStatus.FAILED &&
           this.retryCount < this.maxRetries;
  }

  /**
   * 检查是否正在执行中
   * 包括运行和处理状态，体现任务正在进行的价值
   */
  get isRunning(): boolean {
    return [
      WeiboSubTaskStatus.RUNNING,
      WeiboSubTaskStatus.PROCESSING
    ].includes(this.status);
  }

  /**
   * 计算执行成功率
   * 成功率 = 成功数量 / (成功数量 + 失败数量)
   */
  get successRate(): number {
    const total = this.successCount + this.failureCount;
    return total === 0 ? 0 : Math.round((this.successCount / total) * 100);
  }

  /**
   * 计算执行效率（条/秒）
   * 效率 = 处理总数 / 执行时长
   */
  get throughput(): number {
    if (!this.durationSeconds || this.durationSeconds === 0) return 0;
    return Math.round((this.processedCount / this.durationSeconds) * 100) / 100;
  }

  /**
   * 获取友好的状态描述
   * 将技术状态码转换为人类可读的诗意描述
   */
  get statusDescription(): string {
    const statusMap = {
      [WeiboSubTaskStatus.PENDING]: '等待唤醒',
      [WeiboSubTaskStatus.QUEUED]: '队列之中',
      [WeiboSubTaskStatus.RUNNING]: '活力执行',
      [WeiboSubTaskStatus.PROCESSING]: '数据加工',
      [WeiboSubTaskStatus.COMPLETED]: '圆满完成',
      [WeiboSubTaskStatus.FAILED]: '遭遇挫折',
      [WeiboSubTaskStatus.TIMEOUT]: '时光流逝',
      [WeiboSubTaskStatus.CANCELLED]: '主动放弃',
      [WeiboSubTaskStatus.SKIPPED]: '跃过执行',
      [WeiboSubTaskStatus.RETRYING]: '重试重生'
    };
    return statusMap[this.status] || '未知状态';
  }

  /**
   * 获取任务类型描述
   * 将技术类型码转换为业务友好的描述
   */
  get typeDescription(): string {
    const typeMap = {
      [WeiboSubTaskType.KEYWORD_SEARCH]: '关键词检索',
      [WeiboSubTaskType.USER_PROFILE_SEARCH]: '用户档案检索',
      [WeiboSubTaskType.TOPIC_DISCOVERY]: '话题发现',
      [WeiboSubTaskType.MEDIA_HARVEST]: '媒体收获',
      [WeiboSubTaskType.COMMENT_ANALYSIS]: '评论分析',
      [WeiboSubTaskType.SOCIAL_NETWORK]: '社交网络',
      [WeiboSubTaskType.TREND_MONITORING]: '趋势监控',
      [WeiboSubTaskType.CONTENT_CRAWL]: '内容爬取'
    };
    return typeMap[this.type] || '未知类型';
  }

  /**
   * 获取执行阶段描述
   * 根据状态和时长判断任务所处的执行阶段
   */
  get phaseDescription(): string {
    if (this.isActive) {
      if (this.isRunning) return '正在发挥价值';
      if (this.status === WeiboSubTaskStatus.PENDING) return '静候召唤';
      if (this.status === WeiboSubTaskStatus.QUEUED) return '等待资源';
      if (this.status === WeiboSubTaskStatus.RETRYING) return '逆境重生';
    }

    if (this.isCompleted) {
      if (this.status === WeiboSubTaskStatus.COMPLETED) return '使命达成';
      if (this.status === WeiboSubTaskStatus.FAILED) return '虽败犹荣';
      if (this.status === WeiboSubTaskStatus.TIMEOUT) return '优雅放弃';
      if (this.status === WeiboSubTaskStatus.SKIPPED) return '智者跃过';
    }

    return '待定阶段';
  }

  /**
   * 检查是否需要人工干预
   * 当重试次数过多或遇到特定错误时，标记为需要人工处理
   */
  get needsManualIntervention(): boolean {
    return this.retryCount >= this.maxRetries &&
           this.status === WeiboSubTaskStatus.FAILED;
  }

  /**
   * 获取健康状态评分
   * 基于成功率、重试次数等多维度综合评估
   * 满分100分，用于任务质量监控
   */
  get healthScore(): number {
    let score = 100;

    // 成功率影响 (权重40%)
    score -= (100 - this.successRate) * 0.4;

    // 重试次数影响 (权重20%)
    score -= Math.min(this.retryCount / this.maxRetries * 20, 20);

    // 状态影响 (权重40%)
    if (this.status === WeiboSubTaskStatus.COMPLETED) {
      score -= 0;
    } else if (this.status === WeiboSubTaskStatus.FAILED) {
      score -= 40;
    } else if (this.status === WeiboSubTaskStatus.TIMEOUT) {
      score -= 30;
    } else if (this.isActive) {
      score -= 10; // 活跃状态轻微扣分
    }

    return Math.max(0, Math.round(score));
  }
}