import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@pro/logger';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull } from 'typeorm';
import { WeiboSearchTaskEntity } from '@pro/entities';
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
 * 微博搜索任务调度器 - 配置与执行分离的艺术
 *
 * 使命：将静态的任务配置转化为动态的子任务执行指令
 * 原则：简约而不简单，每个操作都有其存在的意义
 *
 * 核心职责：
 * - 发现需要执行的任务配置并生成子任务
 * - 将宏大的监控任务分解为可执行的子任务片段
 * - 通过消息队列传递执行的火种
 * - 维护任务调度的时间韵律
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
    this.logger.info(`[定时任务] 开始巡视待执行的任务 - ${new Date().toISOString()}`);
    this.logger.debug('开始巡视待执行的任务');

    try {
      const now = new Date();
      const tasks = await this.findPendingTasks(now);

      if (tasks.length === 0) {
        this.logger.info('[定时任务] 此时无任务等待执行');
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
   * 查找需要执行的任务
   * 基于 enabled 和 nextRunAt 判断，不依赖执行状态
   */
  private async findPendingTasks(now: Date): Promise<WeiboSearchTaskEntity[]> {
    return this.taskRepository.find({
      where: [
        // 情况1：nextRunAt 为 null，视为立即执行
        {
          enabled: true,
          nextRunAt: IsNull(),
        },
        // 情况2：nextRunAt 小于等于当前时间
        {
          enabled: true,
          nextRunAt: LessThanOrEqual(now),
        },
      ],
      order: { nextRunAt: 'ASC' },
    });
  }

  /**
   * 验证任务数量是否异常
   */
  private validateTaskCount(tasks: WeiboSearchTaskEntity[]): void {
    if (tasks.length > 10) {
      const sampleTasks = tasks.slice(0, 5).map(task =>
        `任务 ${task.id} [${task.keyword}]: ${task.taskPhaseDescription}, ${task.nextRunAt?.toISOString()}`
      ).join('\n  ');

      this.logger.warn(
        `待执行任务异常 (${tasks.length}个)，可能存在调度问题:\n  ${sampleTasks}`
      );
    }
  }

  /**
   * 批量处理任务 - 串行处理避免竞争
   */
  private async processTasksInBatches(tasks: WeiboSearchTaskEntity[]): Promise<void> {
    const batchSize = 5;
    const totalBatches = Math.ceil(tasks.length / batchSize);

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batchIndex = Math.floor(i / batchSize) + 1;
      const batch = tasks.slice(i, i + batchSize);

      this.logger.debug(`处理第 ${batchIndex}/${totalBatches} 批次 (${batch.length} 个任务)`);

      const batchStart = Date.now();

      // 串行处理任务，避免并发竞争
      for (const task of batch) {
        await this.dispatchTask(task);
      }

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
   * 获取任务执行锁 - 通过更新下次执行时间避免重复调度
   */
  private async acquireTaskLock(task: WeiboSearchTaskEntity): Promise<boolean> {
    // 计算下次执行时间，避免重复调度
    const intervalMs = parseInterval(task.crawlInterval);
    const nextRunAt = new Date(Date.now() + intervalMs);

    const lockResult = await this.taskRepository.update(
      {
        id: task.id,
        // 确保 nextRunAt 没有被其他实例修改
        nextRunAt: task.nextRunAt
      },
      {
        nextRunAt,
        // 如果是首次执行，设置 latestCrawlTime
        latestCrawlTime: task.latestCrawlTime || new Date()
      }
    );

    if (lockResult.affected === 0) {
      // nextRunAt 已被修改，可能已被其他实例处理
      this.logger.debug(`任务 ${task.id} 锁获取失败，调度时间可能已变更`);
      return false;
    }

    this.logger.debug(`任务 ${task.id} 获得执行权，下次执行: ${nextRunAt.toISOString()}`);
    return true;
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

    const isHistoricalCrawlCompleted = task.latestCrawlTime ? task.latestCrawlTime <= task.startDate : false;

    this.logger.info({
      message: '开始创建子任务',
      taskId: task.id,
      keyword: task.keyword,
      needsInitialCrawl: task.needsInitialCrawl,
      isHistoricalCrawlCompleted
    });

    if (task.needsInitialCrawl) {
      subTask = this.createInitialSubTask(task);
      nextRunTime = new Date(Date.now() + parseInterval(task.crawlInterval));
      this.logger.info(`任务 ${task.id} 开始首次抓取`);
    } else if (isHistoricalCrawlCompleted) {
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
    this.logger.warn(`任务 ${task.id} 状态异常，延迟5分钟后重试`);
    await this.taskRepository.update(task.id, {
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
        nextRunAt: new Date(Date.now() + retryDelay)
      });

      this.logger.error(`消息发布失败，${Math.round(retryDelay/60000)}分钟后重试: ${error.message}`);

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

    const retryDelay = this.calculateRetryDelay(0);
    await this.taskRepository.update(task.id, {
      nextRunAt: new Date(Date.now() + retryDelay)
    });

    this.logger.error(`任务调度失败，${Math.round(retryDelay/60000)}分钟后重试: ${error.message}`);
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
      enableAccountRotation: false, // 默认不启用账号轮换
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
      enableAccountRotation: false, // 默认不启用账号轮换
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
   * 获取待执行任务数量 - 包括 nextRunAt 为 null 的任务
   */
  async getPendingTasksCount(): Promise<number> {
    const now = new Date();
    return this.taskRepository.count({
      where: [
        // nextRunAt 为 null 的任务
        {
          enabled: true,
          nextRunAt: IsNull(),
        },
        // nextRunAt 小于等于当前时间的任务
        {
          enabled: true,
          nextRunAt: LessThanOrEqual(now),
        },
      ],
    });
  }

  /**
   * 获取任务统计信息 - 基于配置的任务生态全景
   */
  async getTaskStats(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    pending: number;      // 需要立即执行的任务
    scheduled: number;    // 已调度的任务
    overdue: number;      // 逾期未执行的任务
    neverRun: number;     // 从未执行过的任务
    averageInterval: number; // 平均抓取间隔（分钟）
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [total, enabled, disabled] = await Promise.all([
      this.taskRepository.count(),
      this.taskRepository.count({ where: { enabled: true } }),
      this.taskRepository.count({ where: { enabled: false } }),
    ]);

    const overdueThreshold = new Date(now.getTime() - 5 * 60 * 1000);
    const [pending, scheduled, overdue, neverRun] = await Promise.all([
      // 需要立即执行的任务
      this.taskRepository.count({
        where: {
          enabled: true,
          nextRunAt: LessThanOrEqual(now),
        },
      }),
      // 已调度（nextRunAt在未来）的任务
      this.taskRepository.count({
        where: {
          enabled: true,
          nextRunAt: MoreThanOrEqual(now),
        },
      }),
      // 逾期未执行的任务
      this.taskRepository.count({
        where: {
          enabled: true,
          nextRunAt: LessThanOrEqual(overdueThreshold),
        },
      }),
      // 从未执行过的任务
      this.taskRepository.count({
        where: {
          enabled: true,
          latestCrawlTime: IsNull(),
        },
      }),
    ]);

    // 获取所有启用的任务来计算平均抓取间隔
    const enabledTasks = await this.taskRepository.find({
      where: { enabled: true },
      select: ['crawlInterval'],
    });

    let averageInterval = 0;
    if (enabledTasks.length > 0) {
      const totalIntervalMinutes = enabledTasks.reduce((sum, task) => {
        return sum + this.parseIntervalToMinutes(task.crawlInterval);
      }, 0);
      averageInterval = Math.round(totalIntervalMinutes / enabledTasks.length);
    }

    return {
      total,
      enabled,
      disabled,
      pending,      // 需要立即执行的任务
      scheduled,    // 已调度的任务
      overdue,      // 逾期未执行的任务
      neverRun,     // 从未执行过的任务
      averageInterval, // 平均抓取间隔（分钟）
    };
  }

  /**
   * 解析抓取间隔为分钟数（私有辅助方法）
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
   * 获取详细的任务配置报告 - 任务的深度洞察
   */
  async getTaskExecutionReport(): Promise<{
    summary: any;
    overdueTasks: Array<{
      id: number;
      keyword: string;
      nextRunAt: string;
      overdueMinutes: number;
      phaseDescription: string;
    }>;
    neverRunTasks: Array<{
      id: number;
      keyword: string;
      startDate: string;
      crawlInterval: string;
    }>;
    tasksByInterval: Record<string, number>;
  }> {
    const now = new Date();
    const summary = await this.getTaskStats();

    // 获取逾期任务（超过5分钟未执行）
    const overdueThreshold = new Date(now.getTime() - 5 * 60 * 1000);
    const overdueTasksData = await this.taskRepository.find({
      where: {
        enabled: true,
        nextRunAt: LessThanOrEqual(overdueThreshold),
      },
      select: ['id', 'keyword', 'nextRunAt'],
      order: { nextRunAt: 'ASC' },
    });

    const overdueTasks = overdueTasksData.map(task => ({
      id: task.id,
      keyword: task.keyword,
      nextRunAt: task.nextRunAt?.toISOString() || '未设置',
      overdueMinutes: Math.round((now.getTime() - new Date(task.nextRunAt).getTime()) / 1000 / 60),
      phaseDescription: '执行逾期',
    }));

    // 获取从未执行过的任务
    const neverRunTasksData = await this.taskRepository.find({
      where: {
        enabled: true,
        latestCrawlTime: IsNull(),
      },
      select: ['id', 'keyword', 'startDate', 'crawlInterval'],
      order: { createdAt: 'ASC' },
    });

    const neverRunTasks = neverRunTasksData.map(task => ({
      id: task.id,
      keyword: task.keyword,
      startDate: task.startDate.toISOString(),
      crawlInterval: task.crawlInterval,
    }));

    // 统计任务按抓取间隔的分布
    const tasksByInterval: Record<string, number> = {};
    const allTasks = await this.taskRepository.find({
      where: { enabled: true },
      select: ['crawlInterval'],
    });

    allTasks.forEach(task => {
      const interval = task.crawlInterval || 'unknown';
      tasksByInterval[interval] = (tasksByInterval[interval] || 0) + 1;
    });

    return {
      summary,
      overdueTasks,
      neverRunTasks,
      tasksByInterval,
    };
  }
}