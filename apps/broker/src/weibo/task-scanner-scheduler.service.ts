import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@pro/logger';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';
import { RabbitMQConfigService } from '../rabbitmq/rabbitmq-config.service';
import { SubTaskMessage } from './interfaces/sub-task-message.interface';

// 导入增强组件
import { EnhancedTaskStateTracker, TaskExecutionPhase } from './enhanced-task-state-tracker.service.js';
import { IntelligentRetryManager } from './intelligent-retry-manager.service.js';
import { TaskPerformanceCollector } from './task-performance-collector.service.js';
import { TaskPriorityDependencyManager } from './task-priority-dependency-manager.service.js';

/**
 * 时间间隔解析工具
 * 将字符串格式的时间间隔转换为毫秒数
 */
function parseInterval(interval: string): number {
  const match = interval.match(/^(\d+)([hmd])$/);
  if (!match) {
    throw new Error(`无效的时间间隔格式: ${interval}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'h': return value * 60 * 60 * 1000; // 小时
    case 'm': return value * 60 * 1000; // 分钟
    case 'd': return value * 24 * 60 * 60 * 1000; // 天
    default: throw new Error(`不支持的时间单位: ${unit}`);
  }
}

/**
 * 微博搜索任务扫描调度器
 * 增强版调度器，集成了智能任务管理的数字艺术品
 *
 * 增强特性：
 * - 智能状态追踪：记录任务生命周期的每个重要时刻
 * - 自适应重试：基于失败类型的智能重试策略
 * - 性能监控：实时收集和分析任务执行性能
 * - 优先级管理：动态调整任务执行优先级
 * - 依赖解析：智能处理任务间的依赖关系
 */
@Injectable()
export class TaskScannerScheduler {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
    private readonly rabbitMQService: RabbitMQConfigService,
    // 注入增强组件
    private readonly stateTracker: EnhancedTaskStateTracker,
    private readonly retryManager: IntelligentRetryManager,
    private readonly performanceCollector: TaskPerformanceCollector,
    private readonly priorityManager: TaskPriorityDependencyManager,
  ) {
    this.logger.setContext(TaskScannerScheduler.name);
  }

  /**
   * 每分钟扫描待执行的主任务
   * 查找条件: enabled=true && nextRunAt <= NOW
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scanTasks(): Promise<void> {
    const scanStart = Date.now();
    this.logger.debug('开始扫描待执行的主任务');

    try {
      const now = new Date();

      // 查找待执行的主任务（严格限制为PENDING状态）
      const queryConditions = {
        enabled: true,
        status: WeiboSearchTaskStatus.PENDING,
        nextRunAt: LessThanOrEqual(now),
      };

      this.logger.debug('查询待执行任务条件', {
        timestamp: now.toISOString(),
        conditions: queryConditions
      });

      const tasks = await this.taskRepository.find({
        where: queryConditions,
        order: {
          nextRunAt: 'ASC',
        },
      });

      const scanDuration = Date.now() - scanStart;
      this.logger.debug(`数据库查询完成，耗时 ${scanDuration}ms，找到 ${tasks.length} 个任务`);

      if (tasks.length === 0) {
        this.logger.debug('没有待执行的主任务');
        return;
      }

      this.logger.info(`发现 ${tasks.length} 个待执行的主任务`);

      // 检查是否有异常多的任务等待执行（可能表示重复调度问题）
      if (tasks.length > 10) {
        this.logger.warn(
          `待执行任务数量异常多 (${tasks.length})，可能存在重复调度问题，请检查：\n` +
          tasks.slice(0, 5).map(t =>
            `  - 任务 ${t.id} [${t.keyword}]: status=${t.status}, nextRunAt=${t.nextRunAt?.toISOString()}, updatedAt=${t.updatedAt.toISOString()}`
          ).join('\n') +
          (tasks.length > 5 ? `\n  ... 以及其他 ${tasks.length - 5} 个任务` : '')
        );
      }

      // 并行处理主任务（限制并发数）
      const batchSize = 5;
      const totalBatches = Math.ceil(tasks.length / batchSize);

      this.logger.debug(`开始并行处理任务，批次大小: ${batchSize}, 总批次数: ${totalBatches}`);

      for (let i = 0; i < tasks.length; i += batchSize) {
        const batchIndex = Math.floor(i / batchSize) + 1;
        const batch = tasks.slice(i, i + batchSize);

        this.logger.debug(`处理第 ${batchIndex}/${totalBatches} 批次，包含 ${batch.length} 个任务`, {
          batchIndex,
          totalBatches,
          taskIds: batch.map(t => t.id),
          keywords: batch.map(t => t.keyword)
        });

        const batchStart = Date.now();
        await Promise.all(batch.map(task => this.dispatchTask(task)));
        const batchDuration = Date.now() - batchStart;

        this.logger.debug(`第 ${batchIndex} 批次处理完成，耗时 ${batchDuration}ms`);
      }

      const totalScanDuration = Date.now() - scanStart;
      this.logger.info(`已完成扫描，处理了 ${tasks.length} 个主任务，总耗时 ${totalScanDuration}ms`);
    } catch (error) {
      this.logger.error({
        message: '扫描主任务失败',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 调度单个主任务（增强版）
   * 集成智能任务管理的艺术性调度逻辑
   */
  private async dispatchTask(task: WeiboSearchTaskEntity): Promise<void> {
    const dispatchStart = Date.now();
    this.logger.debug(`开始处理主任务 ${task.id}: ${task.keyword}`, {
      taskId: task.id,
      keyword: task.keyword,
      currentStatus: task.status,
      enabled: task.enabled,
      nextRunAt: task.nextRunAt?.toISOString(),
      crawlInterval: task.crawlInterval
    });

    try {
      // 使用智能调度决策检查是否可以调度
      const schedulingDecision = await this.priorityManager.canScheduleTask(task.id);

      if (!schedulingDecision.shouldSchedule) {
        this.logger.debug(`任务 ${task.id} 智能调度检查未通过`, {
          taskId: task.id,
          reason: schedulingDecision.reason,
          blockingFactors: schedulingDecision.blockingFactors,
          estimatedWaitTime: schedulingDecision.estimatedWaitTime,
        });
        return;
      }

      // 记录任务开始执行的状态变迁
      await this.stateTracker.recordStateTransition(
        task.id,
        task.status,
        WeiboSearchTaskStatus.RUNNING,
        '调度器开始执行任务',
        {
          schedulingDecision,
          dispatchStartTime: new Date(dispatchStart),
        }
      );

      // 记录任务执行阶段
      await this.stateTracker.recordTaskPhase(task.id, TaskExecutionPhase.INITIALIZING, {
        schedulingPriority: schedulingDecision.priority,
        resourceAllocation: schedulingDecision.resourceAllocation,
      });

      // 收集初始性能指标
      await this.performanceCollector.collectMetrics(task.id, {
        startTime: new Date(dispatchStart),
        queueTime: schedulingDecision.estimatedWaitTime || 0,
        memoryUsage: 0, // 初始内存使用
        cpuUsage: 0,    // 初始CPU使用
      });

      // 使用乐观锁防止并发调度同一任务
      const lockConditions = {
        id: task.id,
        status: task.status,
        updatedAt: task.updatedAt, // 乐观锁条件
      };

      this.logger.debug(`尝试获取任务执行锁`, {
        taskId: task.id,
        lockConditions: {
          ...lockConditions,
          updatedAt: lockConditions.updatedAt.toISOString()
        }
      });

      const lockStart = Date.now();
      const lockResult = await this.taskRepository.update(
        lockConditions,
        {
          status: WeiboSearchTaskStatus.RUNNING,
          errorMessage: null,
        }
      );
      const lockDuration = Date.now() - lockStart;

      // 记录锁操作性能
      await this.performanceCollector.collectMetrics(task.id, {
        lockAcquisitionTime: lockDuration,
      });

      this.logger.debug(`数据库锁操作完成，耗时 ${lockDuration}ms`, {
        taskId: task.id,
        affectedRows: lockResult.affected
      });

      // 检查是否成功获取锁（是否有记录被更新）
      if (lockResult.affected === 0) {
        // 重新查询任务当前状态
        const currentTask = await this.taskRepository.findOne({ where: { id: task.id } });

        if (!currentTask) {
          this.logger.warn(`任务 ${task.id} 已被删除`);
          await this.stateTracker.recordStateTransition(
            task.id,
            WeiboSearchTaskStatus.RUNNING,
            WeiboSearchTaskStatus.FAILED,
            '任务在调度过程中被删除'
          );
          return;
        }

        this.logger.debug(`任务 ${task.id} 锁冲突`, {
          taskId: task.id,
          expectedStatus: task.status,
          currentStatus: currentTask.status,
          expectedUpdatedAt: task.updatedAt.toISOString(),
          currentUpdatedAt: currentTask.updatedAt.toISOString()
        });

        // 记录锁冲突事件
        await this.performanceCollector.collectMetrics(task.id, {
          lockConflict: true,
          currentTaskState: currentTask.status,
        });

        // 如果当前状态是 RUNNING，说明其他实例正在处理，无需操作
        if (currentTask.status === WeiboSearchTaskStatus.RUNNING) {
          this.logger.debug(`任务 ${task.id} 正在被其他实例处理`);
          return;
        }

        // 如果当前状态仍是 PENDING，但锁失败，说明 updatedAt 不匹配
        // 重新调度，避免停滞
        if (currentTask.status === WeiboSearchTaskStatus.PENDING) {
          const retryDelay = 60 * 1000; // 1分钟后重试
          await this.taskRepository.update(task.id, {
            nextRunAt: new Date(Date.now() + retryDelay),
          });

          await this.stateTracker.recordStateTransition(
            task.id,
            task.status,
            WeiboSearchTaskStatus.PENDING,
            '锁冲突，重新调度',
            { retryDelay, nextRetryAt: new Date(Date.now() + retryDelay) }
          );

          this.logger.debug(`任务 ${task.id} 已重新调度，1分钟后重试`);
        }

        return;
      }

      this.logger.debug(`任务 ${task.id} 已获取执行锁`, {
        taskId: task.id,
        statusTransition: `${task.status} -> RUNNING`
      });

      // 记录成功获取锁的事件
      await this.stateTracker.recordTaskPhase(task.id, TaskExecutionPhase.DISCOVERY);

      let subTask: SubTaskMessage;
      let nextRunTime: Date | null = null;

      // 详细记录任务执行信息，便于排查时间重叠问题
      this.logger.info({
        message: '开始执行任务调度',
        taskId: task.id,
        keyword: task.keyword,
        taskStatus: task.status,
        needsInitialCrawl: task.needsInitialCrawl,
        isHistoricalCrawlCompleted: task.isHistoricalCrawlCompleted,
        currentCrawlTime: task.currentCrawlTime?.toISOString(),
        latestCrawlTime: task.latestCrawlTime?.toISOString(),
        nextRunAt: task.nextRunAt?.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        crawlInterval: task.crawlInterval,
      });

      // 判断是首次抓取还是增量更新
      if (task.needsInitialCrawl) {
        // 首次抓取: startDate ~ NOW
        subTask = this.createInitialSubTask(task);
        // 首次抓取完成后等待一个抓取间隔再进行下次扫描
        nextRunTime = new Date(Date.now() + parseInterval(task.crawlInterval));
        this.logger.info(`任务 ${task.id} 开始首次抓取: ${task.keyword}`);
      } else if (task.isHistoricalCrawlCompleted) {
        // 历史回溯已完成，进入增量模式
        subTask = this.createIncrementalSubTask(task);
        nextRunTime = new Date(Date.now() + parseInterval(task.crawlInterval));
        this.logger.info(`任务 ${task.id} 开始增量更新: ${task.keyword}`);
      } else {
        // 历史数据回溯中（这种情况通常由 crawler 自动触发，不应该出现在这里）
        this.logger.warn(`任务 ${task.id} 处于异常状态: 历史回溯中但被调度器扫描到`);
        await this.taskRepository.update(task.id, {
          status: WeiboSearchTaskStatus.FAILED,
          errorMessage: '任务状态异常: 历史回溯中但被调度器扫描到',
          nextRunAt: new Date(Date.now() + 5 * 60 * 1000), // 5分钟后重试
        });
        return;
      }

      // 推送子任务到 RabbitMQ，增加失败处理
      let publishSuccess = false;
      try {
        this.logger.debug(`准备发布子任务到消息队列`, {
          taskId: task.id,
          subTaskDetails: {
            keyword: subTask.keyword,
            start: subTask.start.toISOString(),
            end: subTask.end.toISOString(),
            isInitialCrawl: subTask.isInitialCrawl,
            weiboAccountId: subTask.weiboAccountId
          }
        });

        const publishStart = Date.now();
        publishSuccess = await this.rabbitMQService.publishSubTask(subTask);
        const publishDuration = Date.now() - publishStart;

        this.logger.debug(`消息发布操作完成，耗时 ${publishDuration}ms`, {
          taskId: task.id,
          publishSuccess
        });

        if (!publishSuccess) {
          throw new Error('消息发布返回false，可能由于队列问题');
        }

        this.logger.info(`子任务消息已成功发布到队列: taskId=${task.id}`);
      } catch (publishError) {
        // 消息发布失败，回滚任务状态
        this.logger.error({
          message: '发布子任务消息失败，回滚任务状态',
          taskId: task.id,
          keyword: task.keyword,
          error: publishError.message,
        });

        const retryDelay = this.calculateRetryDelay(0); // 使用最小重试延迟
        await this.taskRepository.update(task.id, {
          status: WeiboSearchTaskStatus.PENDING,
          errorMessage: `消息发布失败: ${publishError.message}`,
          nextRunAt: new Date(Date.now() + retryDelay),
        });

        this.logger.debug(`任务状态已回滚为 PENDING，${retryDelay/1000}秒后重试`, {
          taskId: task.id,
          retryDelaySeconds: retryDelay / 1000
        });

        return; // 提前退出，不更新nextRunAt
      }

      // 更新任务的下次执行时间（所有任务类型都需要设置）
      if (nextRunTime) {
        this.logger.debug(`更新任务下次执行时间`, {
          taskId: task.id,
          nextRunAt: nextRunTime.toISOString(),
          intervalMinutes: (nextRunTime.getTime() - Date.now()) / 1000 / 60
        });

        await this.taskRepository.update(task.id, {
          nextRunAt: nextRunTime,
        });
        this.logger.info(`任务 ${task.id} 下次执行时间已更新: ${nextRunTime.toISOString()}`);
      }

      const totalDispatchDuration = Date.now() - dispatchStart;
      // 记录任务调度完成的状态变迁
      await this.stateTracker.recordStateTransition(
        task.id,
        WeiboSearchTaskStatus.RUNNING,
        WeiboSearchTaskStatus.PENDING,
        '任务调度完成，子任务已发送',
        {
          subTaskDetails: {
            start: subTask.start.toISOString(),
            end: subTask.end.toISOString(),
            isInitialCrawl: subTask.isInitialCrawl,
          },
          nextRunAt: nextRunTime?.toISOString(),
        }
      );

      // 记录最终性能指标
      await this.performanceCollector.collectMetrics(task.id, {
        endTime: new Date(),
        executionTime: Date.now() - dispatchStart,
        phase: TaskExecutionPhase.FINALIZING,
        subTaskGenerated: true,
      });

      // 记录任务执行阶段完成
      await this.stateTracker.recordTaskPhase(task.id, TaskExecutionPhase.FINALIZING, {
        totalDispatchTime: totalDispatchDuration,
        subTaskGenerated: true,
        nextRunAt: nextRunTime?.toISOString(),
      });

      // 记录子任务详细信息，便于追踪时间重叠
      this.logger.info({
        message: '任务调度完成，子任务已发送',
        taskId: task.id,
        keyword: task.keyword,
        totalDispatchTimeMs: totalDispatchDuration,
        subTask: {
          start: subTask.start.toISOString(),
          end: subTask.end.toISOString(),
          isInitialCrawl: subTask.isInitialCrawl,
        },
        nextRunAt: nextRunTime?.toISOString(),
      });
    } catch (error) {
      const totalDispatchDuration = Date.now() - dispatchStart;

      // 记录调度失败的状态变迁
      await this.stateTracker.recordStateTransition(
        task.id,
        task.status,
        WeiboSearchTaskStatus.FAILED,
        `调度失败: ${error.message}`,
        {
          error: error.message,
          stack: error.stack,
          totalDispatchTime: totalDispatchDuration,
        }
      );

      // 记录失败的性能指标
      await this.performanceCollector.collectMetrics(task.id, {
        endTime: new Date(),
        executionTime: totalDispatchDuration,
        errorCount: 1,
        errorMessage: error.message,
        phase: TaskExecutionPhase.FAILED,
      });

      // 记录失败阶段
      await this.stateTracker.recordTaskPhase(task.id, TaskExecutionPhase.FAILED, {
        error: error.message,
        dispatchDuration: totalDispatchDuration,
      });

      this.logger.error({
        message: `调度主任务失败`,
        taskId: task.id,
        keyword: task.keyword,
        totalDispatchTimeMs: totalDispatchDuration,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      // 使用智能重试管理器处理失败
      const retrySuccess = await this.retryManager.executeRetry(task, error.message);

      if (!retrySuccess) {
        // 重试失败，保持原有的重试逻辑作为后备
        this.logger.debug(`智能重试失败，使用传统重试逻辑`, {
          taskId: task.id,
        });

        const retryDelay = this.calculateRetryDelay(task.retryCount);
        this.logger.debug(`设置任务重试`, {
          taskId: task.id,
          currentRetryCount: task.retryCount,
          newRetryCount: task.retryCount + 1,
          retryDelayMinutes: retryDelay / 1000 / 60,
          nextRetryAt: new Date(Date.now() + retryDelay).toISOString()
        });

        await this.taskRepository.update(task.id, {
          status: WeiboSearchTaskStatus.FAILED,
          errorMessage: error.message,
          retryCount: task.retryCount + 1,
          nextRunAt: new Date(Date.now() + retryDelay),
        });
      } else {
        this.logger.info(`智能重试管理器已处理任务 ${task.id} 的重试`);
      }
    }
  }

  /**
   * 创建首次抓取子任务
   * 时间范围: startDate ~ NOW
   * 对于大时间跨度，自动分片处理
   */
  private createInitialSubTask(task: WeiboSearchTaskEntity): SubTaskMessage {
    // 使用固定的时间基准点，避免多次调用产生微小差异
    const endTime = this.getTaskExecutionBaseTime();
    const { start, end } = this.calculateOptimalTimeRange(task.startDate, endTime, true);

    return {
      taskId: task.id,
      keyword: task.keyword,
      start,
      end,
      isInitialCrawl: true,
      weiboAccountId: task.weiboAccountId,
      enableAccountRotation: task.enableAccountRotation,
    };
  }

  /**
   * 创建增量子任务
   * 时间范围: latestCrawlTime ~ NOW
   */
  private createIncrementalSubTask(task: WeiboSearchTaskEntity): SubTaskMessage {
    // 如果没有 latestCrawlTime，使用 startDate 作为兜底
    const startTime = task.latestCrawlTime || task.startDate;
    // 使用固定的时间基准点，避免多次调用产生微小差异
    const endTime = this.getTaskExecutionBaseTime();
    const { start, end } = this.calculateOptimalTimeRange(startTime, endTime, false);

    return {
      taskId: task.id,
      keyword: task.keyword,
      start,
      end,
      isInitialCrawl: false,
      weiboAccountId: task.weiboAccountId,
      enableAccountRotation: task.enableAccountRotation,
    };
  }

  /**
   * 计算最优时间范围
   * 对大时间跨度进行分片，避免单次任务执行时间过长
   */
  private calculateOptimalTimeRange(
    requestedStart: Date,
    requestedEnd: Date,
    isInitialCrawl: boolean
  ): { start: Date; end: Date } {
    const MAX_DAYS_PER_TASK = isInitialCrawl ? 7 : 30; // 首次抓取7天，增量30天
    const timeSpanMs = requestedEnd.getTime() - requestedStart.getTime();
    const maxTimeSpanMs = MAX_DAYS_PER_TASK * 24 * 60 * 60 * 1000;

    if (timeSpanMs <= maxTimeSpanMs) {
      // 时间跨度在合理范围内，直接使用
      return { start: requestedStart, end: requestedEnd };
    }

    // 时间跨度太大，需要分片
    const segmentEnd = new Date(requestedStart.getTime() + maxTimeSpanMs);

    this.logger.warn({
      message: '任务时间跨度过大，自动分片处理',
      requestedStart: requestedStart.toISOString(),
      requestedEnd: requestedEnd.toISOString(),
      segmentEnd: segmentEnd.toISOString(),
      maxDays: MAX_DAYS_PER_TASK,
      isInitialCrawl,
    });

    return { start: requestedStart, end: segmentEnd };
  }

  /**
   * 获取任务执行时间基准点
   * 使用分钟精度，避免秒级和毫秒级的时间重叠
   */
  private getTaskExecutionBaseTime(): Date {
    const now = new Date();
    // 归整到分钟精度：清零秒和毫秒
    now.setSeconds(0, 0);
    return now;
  }

  /**
   * 计算重试延迟时间
   * 使用指数退避策略：5分钟, 10分钟, 20分钟, 40分钟
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 5 * 60 * 1000; // 5分钟基础延迟
    const maxDelay = 60 * 60 * 1000; // 最大1小时延迟
    const delay = baseDelay * Math.pow(2, retryCount);
    return Math.min(delay, maxDelay);
  }

  /**
   * 判断任务是否为僵尸任务
   * 僵尸任务：状态标记为RUNNING，但已超过健康检查超时时间未更新
   *
   * @param task 待检查的任务
   * @returns true表示任务已失活（僵尸状态），false表示任务正常运行
   *
   * 设计说明：
   * - 使用updatedAt字段判断任务活性，无需额外添加lastHeartbeatAt字段
   * - 正常运行的任务会定期更新进度，从而自动更新updatedAt
   * - 僵尸任务因crawler重启等原因，updatedAt将停止更新
   * - 超时阈值设为5分钟，足够容忍正常的网络延迟和处理时间
   */
  private isTaskStale(task: WeiboSearchTaskEntity): boolean {
    const HEALTH_CHECK_TIMEOUT_MS = 5 * 60 * 1000; // 5分钟
    const now = Date.now();
    const lastUpdateTime = new Date(task.updatedAt).getTime();
    const timeSinceLastUpdate = now - lastUpdateTime;

    return timeSinceLastUpdate > HEALTH_CHECK_TIMEOUT_MS;
  }

  /**
   * 手动触发扫描（用于测试和紧急处理）
   */
  async triggerScan(): Promise<void> {
    this.logger.info('手动触发任务扫描');
    await this.scanTasks();
  }

  /**
   * 获取待执行任务数量统计
   */
  async getPendingTasksCount(): Promise<number> {
    const now = new Date();
    return this.taskRepository.count({
      where: {
        enabled: true,
        status: WeiboSearchTaskStatus.PENDING,
        nextRunAt: LessThanOrEqual(now),
      },
    });
  }

  /**
   * 获取任务执行统计信息
   */
  async getTaskStats(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    running: number;
    failed: number;
    pending: number;
    overdue: number;
    recentlyCompleted: number;
    averageExecutionTime: number;
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [total, enabled, disabled, running, failed, pending] = await Promise.all([
      this.taskRepository.count(),
      this.taskRepository.count({ where: { enabled: true } }),
      this.taskRepository.count({ where: { enabled: false } }),
      this.taskRepository.count({ where: { status: WeiboSearchTaskStatus.RUNNING } }),
      this.taskRepository.count({ where: { status: WeiboSearchTaskStatus.FAILED } }),
      this.taskRepository.count({ where: { status: WeiboSearchTaskStatus.PENDING } }),
    ]);

    // 计算过期任务数量（enabled=true, status=PENDING, nextRunAt < now - 5分钟）
    const overdueThreshold = new Date(now.getTime() - 5 * 60 * 1000);
    const overdue = await this.taskRepository.count({
      where: {
        enabled: true,
        status: WeiboSearchTaskStatus.PENDING,
        nextRunAt: LessThanOrEqual(overdueThreshold),
      },
    });

    // 计算最近完成的任务数量（过去1小时内状态变更为非RUNNING）
    const recentlyCompleted = await this.taskRepository.count({
      where: {
        updatedAt: MoreThanOrEqual(oneHourAgo),
        status: Not(WeiboSearchTaskStatus.RUNNING),
      },
    });

    // 计算平均执行时间（简化版本，基于RUNNING状态的任务的updatedAt）
    const runningTasks = await this.taskRepository.find({
      where: { status: WeiboSearchTaskStatus.RUNNING },
      select: ['updatedAt'],
    });

    let averageExecutionTime = 0;
    if (runningTasks.length > 0) {
      const totalExecutionTime = runningTasks.reduce((sum, task) => {
        return sum + (now.getTime() - new Date(task.updatedAt).getTime());
      }, 0);
      averageExecutionTime = Math.round(totalExecutionTime / runningTasks.length / 1000 / 60); // 分钟
    }

    return {
      total,
      enabled,
      disabled,
      running,
      failed,
      pending,
      overdue,
      recentlyCompleted,
      averageExecutionTime,
    };
  }

  /**
   * 获取详细的任务执行报告
   */
  async getTaskExecutionReport(): Promise<{
    summary: any;
    longRunningTasks: Array<{
      id: number;
      keyword: string;
      status: string;
      runningTimeMinutes: number;
      lastUpdate: string;
    }>;
    overdueTasksByInterval: Record<string, number>;
  }> {
    const now = new Date();
    const summary = await this.getTaskStats();

    // 查找长时间运行的任务（超过30分钟）
    const longRunningThreshold = new Date(now.getTime() - 30 * 60 * 1000);
    const longRunningTasksData = await this.taskRepository.find({
      where: {
        status: WeiboSearchTaskStatus.RUNNING,
        updatedAt: LessThanOrEqual(longRunningThreshold),
      },
      select: ['id', 'keyword', 'status', 'updatedAt'],
      order: { updatedAt: 'ASC' },
    });

    const longRunningTasks = longRunningTasksData.map(task => ({
      id: task.id,
      keyword: task.keyword,
      status: task.status,
      runningTimeMinutes: Math.round((now.getTime() - new Date(task.updatedAt).getTime()) / 1000 / 60),
      lastUpdate: task.updatedAt.toISOString(),
    }));

    // 按抓取间隔统计过期任务
    const overdueTasksByInterval: Record<string, number> = {};
    const overdueThreshold = new Date(now.getTime() - 5 * 60 * 1000);
    const overdueTasks = await this.taskRepository.find({
      where: {
        enabled: true,
        status: WeiboSearchTaskStatus.PENDING,
        nextRunAt: LessThanOrEqual(overdueThreshold),
      },
      select: ['crawlInterval'],
    });

    overdueTasks.forEach(task => {
      const interval = task.crawlInterval || 'unknown';
      overdueTasksByInterval[interval] = (overdueTasksByInterval[interval] || 0) + 1;
    });

    return {
      summary,
      longRunningTasks,
      overdueTasksByInterval,
    };
  }
}