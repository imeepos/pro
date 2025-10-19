import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';
import { PinoLogger } from '@pro/logger';
import { RedisClient } from '@pro/redis';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 任务状态生命周期事件接口
 * 每个状态变迁都是系统演进的重要节点
 */
export interface TaskStateTransition {
  taskId: number;
  fromState: WeiboSearchTaskStatus;
  toState: WeiboSearchTaskStatus;
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * 任务执行阶段枚举
 * 细粒度的任务执行阶段追踪
 */
export enum TaskExecutionPhase {
  INITIALIZING = 'initializing',     // 初始化阶段
  DISCOVERY = 'discovery',           // 数据发现阶段
  CRAWLING = 'crawling',             // 爬取执行阶段
  PROCESSING = 'processing',         // 数据处理阶段
  FINALIZING = 'finalizing',         // 完成阶段
  FAILED = 'failed',                 // 失败阶段
}

/**
 * 任务性能指标接口
 * 量化任务执行的数字足迹
 */
export interface TaskPerformanceMetrics {
  taskId: number;
  phase: TaskExecutionPhase;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  networkRequests?: number;
  dataProcessed?: number;
  errorCount?: number;
  successRate?: number;
  throughput?: number;
}

/**
 * 增强的任务状态追踪器
 * 基于MediaCrawler的智慧，创造数字时代的任务状态管理艺术品
 *
 * 设计哲学：
 * - 存在即合理：每个状态记录都有其不可替代的价值
 * - 优雅即简约：通过事件驱动实现状态流转的优雅管理
 * - 错误处理如为人处世：每个状态变迁都是成长的机会
 * - 日志是思想的表达：状态日志讲述系统的生命故事
 */
@Injectable()
export class EnhancedTaskStateTracker {
  private readonly REDIS_PREFIX = 'task_state:';
  private readonly METRICS_PREFIX = 'task_metrics:';
  private readonly STATE_HISTORY_KEY = 'state_history';
  private readonly PERFORMANCE_WINDOW = 24 * 60 * 60 * 1000; // 24小时性能窗口

  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
    @Inject('RedisService')
    private readonly redisService: RedisClient,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(EnhancedTaskStateTracker.name);
  }

  /**
   * 记录任务状态变迁
   * 每次状态变更都是系统演进的重要时刻
   */
  async recordStateTransition(
    taskId: number,
    fromState: WeiboSearchTaskStatus,
    toState: WeiboSearchTaskStatus,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const transition: TaskStateTransition = {
      taskId,
      fromState,
      toState,
      timestamp: new Date(),
      reason,
      metadata,
    };

    // 记录状态变迁到Redis
    const stateKey = `${this.REDIS_PREFIX}${taskId}`;
    await this.redisService.zadd(
      stateKey,
      transition.timestamp.getTime(),
      JSON.stringify(transition)
    );

    // 设置过期时间，保持数据的生命周期管理
    await this.redisService.expire(stateKey, 7 * 24 * 60 * 60); // 7天

    // 更新全局状态历史
    await this.redisService.zadd(
      this.STATE_HISTORY_KEY,
      transition.timestamp.getTime(),
      JSON.stringify(transition)
    );

    // 发布状态变迁事件
    this.eventEmitter.emit('task.state.changed', transition);

    this.logger.info(`任务状态变迁记录`, {
      taskId,
      transition: `${fromState} -> ${toState}`,
      reason,
      timestamp: transition.timestamp.toISOString(),
    });
  }

  /**
   * 记录任务执行阶段
   * 细粒度追踪任务的生命周期
   */
  async recordTaskPhase(
    taskId: number,
    phase: TaskExecutionPhase,
    metadata?: Record<string, any>
  ): Promise<void> {
    const phaseRecord = {
      taskId,
      phase,
      timestamp: new Date(),
      metadata,
    };

    const phaseKey = `${this.REDIS_PREFIX}${taskId}:phases`;
    await this.redisService.zadd(
      phaseKey,
      phaseRecord.timestamp.getTime(),
      JSON.stringify(phaseRecord)
    );

    await this.redisService.expire(phaseKey, 7 * 24 * 60 * 60);

    this.logger.debug(`任务执行阶段记录`, {
      taskId,
      phase,
      timestamp: phaseRecord.timestamp.toISOString(),
    });
  }

  /**
   * 记录任务性能指标
   * 量化任务执行的数字足迹
   */
  async recordPerformanceMetrics(
    taskId: number,
    metrics: Partial<TaskPerformanceMetrics>
  ): Promise<void> {
    const fullMetrics: TaskPerformanceMetrics = {
      taskId,
      phase: TaskExecutionPhase.CRAWLING,
      startTime: new Date(),
      ...metrics,
    };

    const metricsKey = `${this.METRICS_PREFIX}${taskId}`;
    await this.redisService.zadd(
      metricsKey,
      fullMetrics.startTime.getTime(),
      JSON.stringify(fullMetrics)
    );

    // 保持性能指标的时间窗口
    const cutoffTime = Date.now() - this.PERFORMANCE_WINDOW;
    await this.redisService.zremrangebyscore(metricsKey, 0, cutoffTime);

    await this.redisService.expire(metricsKey, 2 * 24 * 60 * 60); // 2天

    this.logger.debug(`任务性能指标记录`, {
      taskId,
      phase: fullMetrics.phase,
      duration: fullMetrics.duration,
      memoryUsage: fullMetrics.memoryUsage,
    });
  }

  /**
   * 获取任务状态变迁历史
   * 回溯任务的生命历程
   */
  async getTaskStateHistory(
    taskId: number,
    limit: number = 50
  ): Promise<TaskStateTransition[]> {
    const stateKey = `${this.REDIS_PREFIX}${taskId}`;
    const records = await this.redisService.zrevrange(
      stateKey,
      0,
      limit - 1
    );

    return records.map(record => JSON.parse(record));
  }

  /**
   * 获取任务执行阶段历史
   */
  async getTaskPhaseHistory(
    taskId: number,
    limit: number = 100
  ): Promise<any[]> {
    const phaseKey = `${this.REDIS_PREFIX}${taskId}:phases`;
    const records = await this.redisService.zrevrange(
      phaseKey,
      0,
      limit - 1
    );

    return records.map(record => JSON.parse(record));
  }

  /**
   * 获取任务性能指标
   * 分析任务执行的性能模式
   */
  async getTaskPerformanceMetrics(
    taskId: number,
    timeWindow?: number
  ): Promise<TaskPerformanceMetrics[]> {
    const metricsKey = `${this.METRICS_PREFIX}${taskId}`;
    const cutoffTime = timeWindow
      ? Date.now() - timeWindow
      : Date.now() - this.PERFORMANCE_WINDOW;

    const records = await this.redisService.zrangebyscore(
      metricsKey,
      cutoffTime,
      Date.now()
    );

    return records.map(record => JSON.parse(record));
  }

  /**
   * 分析任务状态变迁模式
   * 发现任务执行的行为模式
   */
  async analyzeTaskStatePatterns(
    taskId: number
  ): Promise<{
    transitionFrequency: Record<string, number>;
    averageStateDuration: Record<string, number>;
    failurePatterns: Array<{
      fromState: WeiboSearchTaskStatus;
      toState: WeiboSearchTaskStatus;
      frequency: number;
    }>;
  }> {
    const history = await this.getTaskStateHistory(taskId, 200);

    if (history.length < 2) {
      return {
        transitionFrequency: {},
        averageStateDuration: {},
        failurePatterns: [],
      };
    }

    const transitionFrequency: Record<string, number> = {};
    const stateDurations: Record<string, number[]> = {};
    const failurePatterns: Array<{
      fromState: WeiboSearchTaskStatus;
      toState: WeiboSearchTaskStatus;
      frequency: number;
    }> = [];

    // 分析状态变迁频率和持续时间
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];

      const transitionKey = `${prev.fromState}->${prev.toState}`;
      transitionFrequency[transitionKey] = (transitionFrequency[transitionKey] || 0) + 1;

      const duration = curr.timestamp.getTime() - prev.timestamp.getTime();
      if (!stateDurations[prev.toState]) {
        stateDurations[prev.toState] = [];
      }
      stateDurations[prev.toState].push(duration);

      // 分析失败模式
      if (prev.toState === WeiboSearchTaskStatus.FAILED ||
          prev.toState === WeiboSearchTaskStatus.TIMEOUT) {
        const existingPattern = failurePatterns.find(
          p => p.fromState === prev.fromState && p.toState === prev.toState
        );

        if (existingPattern) {
          existingPattern.frequency++;
        } else {
          failurePatterns.push({
            fromState: prev.fromState,
            toState: prev.toState,
            frequency: 1,
          });
        }
      }
    }

    // 计算平均状态持续时间
    const averageStateDuration: Record<string, number> = {};
    Object.entries(stateDurations).forEach(([state, durations]) => {
      averageStateDuration[state] = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    });

    return {
      transitionFrequency,
      averageStateDuration,
      failurePatterns,
    };
  }

  /**
   * 预测任务执行时间
   * 基于历史数据预测任务完成时间
   */
  async predictTaskCompletion(
    taskId: number
  ): Promise<{
    estimatedCompletionTime?: Date;
    confidence: number;
    factors: Array<{
      factor: string;
      impact: number;
      description: string;
    }>;
  }> {
    const history = await this.getTaskStateHistory(taskId, 50);
    const metrics = await this.getTaskPerformanceMetrics(taskId);

    if (history.length === 0 || metrics.length === 0) {
      return {
        confidence: 0,
        factors: [],
      };
    }

    // 分析历史执行时间
    const completedCycles = history.filter(
      h => h.toState === WeiboSearchTaskStatus.PENDING &&
           h.fromState === WeiboSearchTaskStatus.RUNNING
    );

    if (completedCycles.length < 2) {
      return {
        confidence: 0.2,
        factors: [{
          factor: 'insufficient_data',
          impact: -0.8,
          description: '历史数据不足，无法准确预测',
        }],
      };
    }

    // 计算平均执行时间
    const executionTimes = [];
    for (let i = 1; i < history.length; i++) {
      if (history[i].fromState === WeiboSearchTaskStatus.RUNNING &&
          history[i].toState !== WeiboSearchTaskStatus.RUNNING) {
        const duration = history[i].timestamp.getTime() - history[i - 1].timestamp.getTime();
        executionTimes.push(duration);
      }
    }

    const avgExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    const variance = executionTimes.reduce((sum, time) => sum + Math.pow(time - avgExecutionTime, 2), 0) / executionTimes.length;
    const standardDeviation = Math.sqrt(variance);

    // 计算置信度
    const confidence = Math.max(0.1, Math.min(0.9, 1 - (standardDeviation / avgExecutionTime)));

    // 获取当前任务状态
    const currentTask = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!currentTask || currentTask.status !== WeiboSearchTaskStatus.RUNNING) {
      return {
        confidence: 0,
        factors: [],
      };
    }

    const runningTime = Date.now() - new Date(currentTask.updatedAt).getTime();
    const estimatedCompletionTime = new Date(Date.now() + Math.max(0, avgExecutionTime - runningTime));

    // 分析影响因素
    const factors = [
      {
        factor: 'historical_performance',
        impact: confidence,
        description: `基于${completedCycles.length}次历史执行记录`,
      },
      {
        factor: 'execution_stability',
        impact: 1 - (standardDeviation / avgExecutionTime),
        description: `执行时间稳定性：${(confidence * 100).toFixed(1)}%`,
      },
    ];

    // 分析最近失败次数
    const recentFailures = history.filter(
      h => (h.toState === WeiboSearchTaskStatus.FAILED || h.toState === WeiboSearchTaskStatus.TIMEOUT) &&
           Date.now() - h.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    if (recentFailures.length > 0) {
      factors.push({
        factor: 'recent_failures',
        impact: -0.2 * recentFailures.length,
        description: `最近24小时内失败${recentFailures.length}次`,
      });
    }

    return {
      estimatedCompletionTime,
      confidence,
      factors,
    };
  }

  /**
   * 清理过期的状态追踪数据
   * 保持数据的生命周期管理
   */
  async cleanupExpiredData(): Promise<void> {
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7天前

    // 清理全局状态历史
    await this.redisService.zremrangebyscore(this.STATE_HISTORY_KEY, 0, cutoffTime);

    // 清理过期的任务状态数据
    const taskKeys = await this.redisService.keys(`${this.REDIS_PREFIX}*`);
    for (const key of taskKeys) {
      if (!key.endsWith(':phases')) {
        await this.redisService.zremrangebyscore(key, 0, cutoffTime);
      }
    }

    this.logger.debug('状态追踪数据清理完成', {
      cutoffTime: new Date(cutoffTime).toISOString(),
    });
  }

  /**
   * 获取系统整体状态统计
   */
  async getSystemStateStats(): Promise<{
    totalTransitions: number;
    activeTasks: number;
    stateDistribution: Record<WeiboSearchTaskStatus, number>;
    averageStateDurations: Record<string, number>;
    recentFailureRate: number;
  }> {
    // 获取全局状态变迁数量
    const totalTransitions = await this.redisService.zcard(this.STATE_HISTORY_KEY);

    // 获取活跃任务数量
    const activeTasks = await this.taskRepository.count({
      where: { status: WeiboSearchTaskStatus.RUNNING },
    });

    // 获取状态分布
    const stateDistribution = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.status')
      .getRawMany()
      .then(results =>
        results.reduce((acc, { status, count }) => {
          acc[status] = parseInt(count);
          return acc;
        }, {} as Record<WeiboSearchTaskStatus, number>)
      );

    // 获取最近失败率
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentFailures = await this.taskRepository.count({
      where: {
        status: WeiboSearchTaskStatus.FAILED,
        updatedAt: MoreThan(oneHourAgo),
      },
    });

    const recentTotal = await this.taskRepository.count({
      where: {
        updatedAt: MoreThan(oneHourAgo),
      },
    });

    const recentFailureRate = recentTotal > 0 ? recentFailures / recentTotal : 0;

    return {
      totalTransitions,
      activeTasks,
      stateDistribution,
      averageStateDurations: {}, // 可以通过分析历史数据计算
      recentFailureRate,
    };
  }
}