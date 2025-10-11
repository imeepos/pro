import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, And } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';
import { RabbitMQConfigService } from '../rabbitmq/rabbitmq-config.service';

/**
 * 任务超时时间配置（毫秒）
 */
const TASK_TIMEOUT = 30 * 60 * 1000; // 30分钟

/**
 * 微博搜索任务监控器
 * 负责监控主任务状态，处理超时和失败重试
 */
@Injectable()
export class TaskMonitor {
  private readonly logger = new Logger(TaskMonitor.name);

  constructor(
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
    private readonly rabbitMQService: RabbitMQConfigService,
  ) {}

  /**
   * 每5分钟执行一次任务监控
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorTasks(): Promise<void> {
    this.logger.debug('开始执行任务监控');

    try {
      const now = new Date();

      // 检查超时任务
      await this.checkTimeoutTasks(now);

      // 重试失败任务
      await this.retryFailedTasks();

      // 检查无数据任务
      await this.checkNoDataTasks();

      this.logger.debug('任务监控完成');
    } catch (error) {
      this.logger.error('任务监控失败:', error);
    }
  }

  /**
   * 检查超时任务
   * 超时判定: 状态为RUNNING且updated_at超过30分钟未更新
   */
  private async checkTimeoutTasks(now: Date): Promise<void> {
    const timeoutThreshold = new Date(now.getTime() - TASK_TIMEOUT);

    const timeoutTasks = await this.taskRepository.find({
      where: {
        status: WeiboSearchTaskStatus.RUNNING,
        updatedAt: LessThan(timeoutThreshold),
      },
    });

    if (timeoutTasks.length === 0) {
      return;
    }

    this.logger.warn(`发现 ${timeoutTasks.length} 个超时任务`);

    for (const task of timeoutTasks) {
      try {
        this.logger.warn(`任务 ${task.id} (${task.keyword}) 执行超时`);

        if (task.canRetry) {
          // 可以重试，重新调度
          await this.taskRepository.update(task.id, {
            status: WeiboSearchTaskStatus.PENDING,
            nextRunAt: new Date(now.getTime() + 5 * 60 * 1000), // 5分钟后重试
            errorMessage: `任务执行超时，已重试 (${task.retryCount + 1}/${task.maxRetries})`,
            retryCount: task.retryCount + 1,
          });

          this.logger.log(`超时任务 ${task.id} 已安排重试`);
        } else {
          // 超过最大重试次数，标记为失败
          await this.taskRepository.update(task.id, {
            status: WeiboSearchTaskStatus.TIMEOUT,
            errorMessage: `任务执行超时，已达到最大重试次数 (${task.maxRetries})`,
            enabled: false, // 禁用任务
          });

          this.logger.error(`超时任务 ${task.id} 已标记为失败并禁用`);
        }
      } catch (error) {
        this.logger.error(`处理超时任务 ${task.id} 失败:`, error);
      }
    }
  }

  /**
   * 重试失败任务
   * 检查状态为FAILED且可以重试的任务
   */
  private async retryFailedTasks(): Promise<void> {
    const failedTasks = await this.taskRepository.find({
      where: {
        status: WeiboSearchTaskStatus.FAILED,
        enabled: true,
      },
    });

    const retryableTasks = failedTasks.filter(task => task.canRetry);

    if (retryableTasks.length === 0) {
      return;
    }

    this.logger.log(`发现 ${retryableTasks.length} 个可重试的失败任务`);

    for (const task of retryableTasks) {
      try {
        // 检查距离上次失败是否已超过重试间隔
        const retryInterval = this.calculateRetryInterval(task.retryCount);
        const nextRetryTime = new Date(task.updatedAt.getTime() + retryInterval);

        if (new Date() >= nextRetryTime) {
          await this.taskRepository.update(task.id, {
            status: WeiboSearchTaskStatus.PENDING,
            nextRunAt: new Date(),
            errorMessage: null,
            retryCount: task.retryCount + 1,
          });

          this.logger.log(`失败任务 ${task.id} 已安排重试 (${task.retryCount + 1}/${task.maxRetries})`);
        }
      } catch (error) {
        this.logger.error(`重试失败任务 ${task.id} 失败:`, error);
      }
    }
  }

  /**
   * 检查无数据任务
   * 连续多次无数据的任务自动暂停
   */
  private async checkNoDataTasks(): Promise<void> {
    const noDataTasks = await this.taskRepository.find({
      where: {
        enabled: true,
        noDataCount: 0, // 我们需要查找有数据的任务来检查
      },
    });

    // 检查是否需要增加 noDataCount（这个逻辑通常由 crawler 更新）
    // 这里主要是检查是否需要暂停任务
    const tasksToPause = noDataTasks.filter(task => task.shouldPauseForNoData);

    if (tasksToPause.length === 0) {
      return;
    }

    this.logger.warn(`发现 ${tasksToPause.length} 个因无数据需要暂停的任务`);

    for (const task of tasksToPause) {
      try {
        await this.taskRepository.update(task.id, {
          status: WeiboSearchTaskStatus.PAUSED,
          enabled: false,
          errorMessage: `连续 ${task.noDataCount} 次无数据，已自动暂停`,
        });

        this.logger.warn(`任务 ${task.id} 因无数据已自动暂停`);
      } catch (error) {
        this.logger.error(`暂停无数据任务 ${task.id} 失败:`, error);
      }
    }
  }

  /**
   * 计算重试间隔
   * 使用指数退避策略: 5分钟, 10分钟, 20分钟...
   */
  private calculateRetryInterval(retryCount: number): number {
    const baseInterval = 5 * 60 * 1000; // 5分钟
    return baseInterval * Math.pow(2, retryCount);
  }

  /**
   * 手动触发监控（用于测试和紧急处理）
   */
  async triggerMonitor(): Promise<void> {
    this.logger.log('手动触发任务监控');
    await this.monitorTasks();
  }

  /**
   * 获取监控统计信息
   */
  async getMonitorStats(): Promise<{
    running: number;
    failed: number;
    timeout: number;
    paused: number;
    pending: number;
    canRetry: number;
    shouldPause: number;
  }> {
    const [running, failed, timeout, paused, pending] = await Promise.all([
      this.taskRepository.count({ where: { status: WeiboSearchTaskStatus.RUNNING } }),
      this.taskRepository.count({ where: { status: WeiboSearchTaskStatus.FAILED } }),
      this.taskRepository.count({ where: { status: WeiboSearchTaskStatus.TIMEOUT } }),
      this.taskRepository.count({ where: { status: WeiboSearchTaskStatus.PAUSED } }),
      this.taskRepository.count({ where: { status: WeiboSearchTaskStatus.PENDING } }),
    ]);

    // 查找可重试的失败任务数
    const failedTasks = await this.taskRepository.find({
      where: { status: WeiboSearchTaskStatus.FAILED, enabled: true },
    });
    const canRetry = failedTasks.filter(task => task.canRetry).length;

    // 查找应该暂停的任务数
    const noDataTasks = await this.taskRepository.find({
      where: { enabled: true },
    });
    const shouldPause = noDataTasks.filter(task => task.shouldPauseForNoData).length;

    return {
      running,
      failed,
      timeout,
      paused,
      pending,
      canRetry,
      shouldPause,
    };
  }

  /**
   * 重置失败任务
   * 管理员手动重置任务状态
   */
  async resetFailedTask(taskId: number): Promise<boolean> {
    try {
      const task = await this.taskRepository.findOne({ where: { id: taskId } });

      if (!task) {
        this.logger.error(`任务 ${taskId} 不存在`);
        return false;
      }

      if (task.status !== WeiboSearchTaskStatus.FAILED && task.status !== WeiboSearchTaskStatus.TIMEOUT) {
        this.logger.warn(`任务 ${taskId} 状态不是失败或超时，无需重置`);
        return false;
      }

      await this.taskRepository.update(taskId, {
        status: WeiboSearchTaskStatus.PENDING,
        enabled: true,
        nextRunAt: new Date(),
        errorMessage: null,
        retryCount: 0,
        noDataCount: 0,
      });

      this.logger.log(`任务 ${taskId} 已重置为待执行状态`);
      return true;
    } catch (error) {
      this.logger.error(`重置任务 ${taskId} 失败:`, error);
      return false;
    }
  }
}