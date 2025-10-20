import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@pro/logger';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';
import { RabbitMQConfigService } from '../rabbitmq/rabbitmq-config.service';
import { SubTaskMessage } from './interfaces/sub-task-message.interface';

/**
 * 时间间隔解析器 - 优雅的时间单位转换
 * 支持格式: 数字 + 单位 (h=小时, m=分钟, d=天)
 */
const parseInterval = (interval: string): number => {
  const match = interval.match(/^(\d+)([hmd])$/);
  if (!match) throw new Error(`无效的时间间隔格式: ${interval}`);

  const [, value, unit] = match;
  const multipliers = { h: 3600000, m: 60000, d: 86400000 };
  const multiplier = multipliers[unit];

  if (!multiplier) throw new Error(`不支持的时间单位: ${unit}`);
  return parseInt(value, 10) * multiplier;
};

/**
 * 微博搜索任务调度器 - 任务扫描与分发的艺术
 *
 * 使命：将静态的任务配置转化为动态的执行指令
 * 原则：简约而不简单，每个操作都有其存在的意义
 *
 * 核心职责：
 * - 发现待执行的任务并赋予其生命
 * - 将宏大的任务分解为可执行的子任务
 * - 通过消息队列传递执行的火种
 * - 以优雅的方式处理失败与重试
 */
@Injectable()
export class TaskScannerScheduler {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
    private readonly rabbitMQService: RabbitMQConfigService,
  ) {
    this.logger.setContext(TaskScannerScheduler.name);
  }

  /**
   * 每分钟巡视待执行的任务 - 时间的守护者
   * 寻找那些时机已到的任务，赋予它们执行的机会
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scanTasks(): Promise<void> {
    const scanStart = Date.now();
    this.logger.debug('开始巡视待执行的任务');

    try {
      const now = new Date();
      const tasks = await this.findPendingTasks(now);

      if (tasks.length === 0) {
        this.logger.debug('此时无任务等待执行');
        return;
      }

      this.logger.info(`发现 ${tasks.length} 个等待执行的任务`);
      this.validateTaskCount(tasks);

      await this.processTasksInBatches(tasks);

      const totalDuration = Date.now() - scanStart;
      this.logger.info(`任务巡视完成，处理 ${tasks.length} 个任务，耗时 ${totalDuration}ms`);
    } catch (error) {
      this.logger.error({
        message: '任务巡视失败',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 查找待执行的任务
   */
  private async findPendingTasks(now: Date): Promise<WeiboSearchTaskEntity[]> {
    const conditions = {
      enabled: true,
      status: WeiboSearchTaskStatus.PENDING,
      nextRunAt: LessThanOrEqual(now),
    };

    return this.taskRepository.find({
      where: conditions,
      order: { nextRunAt: 'ASC' },
    });
  }

  /**
   * 验证任务数量是否异常
   */
  private validateTaskCount(tasks: WeiboSearchTaskEntity[]): void {
    if (tasks.length > 10) {
      const sampleTasks = tasks.slice(0, 5).map(task =>
        `任务 ${task.id} [${task.keyword}]: ${task.status}, ${task.nextRunAt?.toISOString()}`
      ).join('\n  ');

      this.logger.warn(
        `待执行任务异常 (${tasks.length}个)，可能存在调度问题:\n  ${sampleTasks}`
      );
    }
  }

  /**
   * 批量处理任务
   */
  private async processTasksInBatches(tasks: WeiboSearchTaskEntity[]): Promise<void> {
    const batchSize = 5;
    const totalBatches = Math.ceil(tasks.length / batchSize);

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batchIndex = Math.floor(i / batchSize) + 1;
      const batch = tasks.slice(i, i + batchSize);

      this.logger.debug(`处理第 ${batchIndex}/${totalBatches} 批次 (${batch.length} 个任务)`);

      const batchStart = Date.now();
      await Promise.all(batch.map(task => this.dispatchTask(task)));
      const batchDuration = Date.now() - batchStart;

      this.logger.debug(`批次 ${batchIndex} 完成，耗时 ${batchDuration}ms`);
    }
  }

  /**
   * 调度单个任务 - 赋予任务执行的生命
   * 每个任务都值得被认真对待，每次调度都是一次艺术创作
   */
  async dispatchTask(task: WeiboSearchTaskEntity): Promise<void> {
    const dispatchStart = Date.now();
    this.logger.debug(`开始调度任务 ${task.id}: ${task.keyword}`);

    try {
      const isLocked = await this.acquireTaskLock(task);
      if (!isLocked) return;

      const { subTask, nextRunTime } = await this.createSubTask(task);
      const publishSuccess = await this.publishSubTask(subTask, task.id);

      if (!publishSuccess) return;

      await this.updateTaskNextRunTime(task.id, nextRunTime);

      const totalDuration = Date.now() - dispatchStart;
      this.logger.info({
        message: '任务调度完成',
        taskId: task.id,
        keyword: task.keyword,
        duration: totalDuration,
        nextRunAt: nextRunTime?.toISOString()
      });
    } catch (error) {
      await this.handleDispatchError(task, error, dispatchStart);
    }
  }

  /**
   * 获取任务执行锁 - 乐观锁的艺术
   */
  private async acquireTaskLock(task: WeiboSearchTaskEntity): Promise<boolean> {
    const lockResult = await this.taskRepository.update(
      { id: task.id, status: task.status, updatedAt: task.updatedAt },
      { status: WeiboSearchTaskStatus.RUNNING, errorMessage: null }
    );

    if (lockResult.affected === 0) {
      return this.handleLockFailure(task);
    }

    this.logger.debug(`任务 ${task.id} 获得执行权`);
    return true;
  }

  /**
   * 处理锁冲突
   */
  private async handleLockFailure(task: WeiboSearchTaskEntity): Promise<boolean> {
    const currentTask = await this.taskRepository.findOne({ where: { id: task.id } });

    if (!currentTask) {
      this.logger.warn(`任务 ${task.id} 已不存在`);
      return false;
    }

    if (currentTask.status === WeiboSearchTaskStatus.RUNNING) {
      this.logger.debug(`任务 ${task.id} 正在执行中`);
      return false;
    }

    if (currentTask.status === WeiboSearchTaskStatus.PENDING) {
      const retryDelay = 60000; // 1分钟
      await this.taskRepository.update(task.id, {
        nextRunAt: new Date(Date.now() + retryDelay)
      });
      this.logger.debug(`任务 ${task.id} 重新调度，1分钟后重试`);
    }

    return false;
  }

  /**
   * 创建子任务
   */
  private async createSubTask(task: WeiboSearchTaskEntity): Promise<{
    subTask: SubTaskMessage;
    nextRunTime: Date | null;
  }> {
    let subTask: SubTaskMessage;
    let nextRunTime: Date | null = null;

    this.logger.info({
      message: '开始创建子任务',
      taskId: task.id,
      keyword: task.keyword,
      needsInitialCrawl: task.needsInitialCrawl,
      isHistoricalCrawlCompleted: task.isHistoricalCrawlCompleted
    });

    if (task.needsInitialCrawl) {
      subTask = this.createInitialSubTask(task);
      nextRunTime = new Date(Date.now() + parseInterval(task.crawlInterval));
      this.logger.info(`任务 ${task.id} 开始首次抓取`);
    } else if (task.isHistoricalCrawlCompleted) {
      subTask = this.createIncrementalSubTask(task);
      nextRunTime = new Date(Date.now() + parseInterval(task.crawlInterval));
      this.logger.info(`任务 ${task.id} 开始增量更新`);
    } else {
      await this.handleAbnormalTaskState(task);
      throw new Error('任务状态异常：历史回溯中但被调度器扫描到');
    }

    return { subTask, nextRunTime };
  }

  /**
   * 处理异常任务状态
   */
  private async handleAbnormalTaskState(task: WeiboSearchTaskEntity): Promise<void> {
    await this.taskRepository.update(task.id, {
      status: WeiboSearchTaskStatus.FAILED,
      errorMessage: '任务状态异常：历史回溯中但被调度器扫描到',
      nextRunAt: new Date(Date.now() + 5 * 60000) // 5分钟后重试
    });
  }

  /**
   * 发布子任务到消息队列
   */
  private async publishSubTask(subTask: SubTaskMessage, taskId: number): Promise<boolean> {
    try {
      this.logger.debug(`发布子任务到消息队列`, {
        taskId,
        keyword: subTask.keyword,
        timeRange: `${subTask.start.toISOString()} ~ ${subTask.end.toISOString()}`
      });

      const success = await this.rabbitMQService.publishSubTask(subTask);

      if (!success) {
        throw new Error('消息发布失败');
      }

      this.logger.info(`子任务已发布: taskId=${taskId}`);
      return true;
    } catch (error) {
      this.logger.error({
        message: '子任务发布失败',
        taskId,
        error: error.message
      });

      const retryDelay = this.calculateRetryDelay(0);
      await this.taskRepository.update(taskId, {
        status: WeiboSearchTaskStatus.PENDING,
        errorMessage: `消息发布失败: ${error.message}`,
        nextRunAt: new Date(Date.now() + retryDelay)
      });

      return false;
    }
  }

  /**
   * 更新任务的下次执行时间
   */
  private async updateTaskNextRunTime(taskId: number, nextRunTime: Date | null): Promise<void> {
    if (nextRunTime) {
      await this.taskRepository.update(taskId, { nextRunAt: nextRunTime });
      this.logger.info(`任务 ${taskId} 下次执行时间: ${nextRunTime.toISOString()}`);
    }
  }

  /**
   * 处理调度错误
   */
  private async handleDispatchError(
    task: WeiboSearchTaskEntity,
    error: any,
    dispatchStart: number
  ): Promise<void> {
    const duration = Date.now() - dispatchStart;

    this.logger.error({
      message: '任务调度失败',
      taskId: task.id,
      keyword: task.keyword,
      duration,
      error: error.message
    });

    const retryDelay = this.calculateRetryDelay(task.retryCount);
    await this.taskRepository.update(task.id, {
      status: WeiboSearchTaskStatus.FAILED,
      errorMessage: error.message,
      retryCount: task.retryCount + 1,
      nextRunAt: new Date(Date.now() + retryDelay)
    });
  }

  /**
   * 创建首次抓取子任务 - 历史数据的回溯之旅
   */
  private createInitialSubTask(task: WeiboSearchTaskEntity): SubTaskMessage {
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
   * 创建增量子任务 - 捕捉时间的流动
   */
  private createIncrementalSubTask(task: WeiboSearchTaskEntity): SubTaskMessage {
    const startTime = task.latestCrawlTime || task.startDate;
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
   * 计算最优时间范围 - 艺术的分片策略
   * 将过大的时间跨度优雅地分解为可管理的片段
   */
  private calculateOptimalTimeRange(
    requestedStart: Date,
    requestedEnd: Date,
    isInitialCrawl: boolean
  ): { start: Date; end: Date } {
    const MAX_DAYS_PER_TASK = isInitialCrawl ? 7 : 30;
    const timeSpanMs = requestedEnd.getTime() - requestedStart.getTime();
    const maxTimeSpanMs = MAX_DAYS_PER_TASK * 24 * 60 * 60 * 1000;

    if (timeSpanMs <= maxTimeSpanMs) {
      return { start: requestedStart, end: requestedEnd };
    }

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
   * 获取任务执行时间基准点 - 精确到分钟的艺术
   * 避免秒级和毫秒级的时间重叠，让每个任务都有其独特的时间印记
   */
  private getTaskExecutionBaseTime(): Date {
    const now = new Date();
    now.setSeconds(0, 0); // 归整到分钟精度
    return now;
  }

  /**
   * 计算重试延迟时间 - 指数退避的优雅
   * 简约的策略：5分钟, 10分钟, 20分钟, 40分钟
   * 艺术原则：用最简单的方式解决最常见的问题
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 5 * 60 * 1000; // 5分钟基础延迟
    const maxDelay = 60 * 60 * 1000; // 最大1小时延迟
    const delay = baseDelay * Math.pow(2, retryCount);
    return Math.min(delay, maxDelay);
  }

  /**
   * 手动触发扫描 - 即时的召唤
   */
  async triggerScan(): Promise<void> {
    this.logger.info('手动触发任务扫描');
    await this.scanTasks();
  }

  /**
   * 获取待执行任务数量 - 静待的任务统计
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
   * 获取任务统计信息 - 任务的生态全景
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

    const overdueThreshold = new Date(now.getTime() - 5 * 60 * 1000);
    const [overdue, recentlyCompleted] = await Promise.all([
      this.taskRepository.count({
        where: {
          enabled: true,
          status: WeiboSearchTaskStatus.PENDING,
          nextRunAt: LessThanOrEqual(overdueThreshold),
        },
      }),
      this.taskRepository.count({
        where: {
          updatedAt: MoreThanOrEqual(oneHourAgo),
          status: Not(WeiboSearchTaskStatus.RUNNING),
        },
      }),
    ]);

    const runningTasks = await this.taskRepository.find({
      where: { status: WeiboSearchTaskStatus.RUNNING },
      select: ['updatedAt'],
    });

    let averageExecutionTime = 0;
    if (runningTasks.length > 0) {
      const totalExecutionTime = runningTasks.reduce((sum, task) => {
        return sum + (now.getTime() - new Date(task.updatedAt).getTime());
      }, 0);
      averageExecutionTime = Math.round(totalExecutionTime / runningTasks.length / 1000 / 60);
    }

    return {
      total, enabled, disabled, running, failed, pending, overdue, recentlyCompleted, averageExecutionTime,
    };
  }

  /**
   * 获取详细的任务执行报告 - 任务的深度洞察
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