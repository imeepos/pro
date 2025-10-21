import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, And } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';
import { RabbitMQConfigService } from '../rabbitmq/rabbitmq-config.service';
import { PinoLogger } from '@pro/logger';

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
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
    private readonly rabbitMQService: RabbitMQConfigService,
  ) {}

  /**
   * 每5分钟执行一次任务监控
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorTasks(): Promise<void> {
    const monitorStart = Date.now();
    this.logger.debug('开始执行任务监控');

    try {
      const now = new Date();

      // 检查超时任务
      this.logger.debug('开始检查超时任务');
      const timeoutStart = Date.now();
      await this.checkTimeoutTasks(now);
      const timeoutDuration = Date.now() - timeoutStart;
      this.logger.debug(`超时任务检查完成，耗时 ${timeoutDuration}ms`);

      // 重试失败任务
      this.logger.debug('开始重试失败任务');
      const retryStart = Date.now();
      await this.retryFailedTasks();
      const retryDuration = Date.now() - retryStart;
      this.logger.debug(`失败任务重试检查完成，耗时 ${retryDuration}ms`);

      // 检查无数据任务
      this.logger.debug('开始检查无数据任务');
      const noDataStart = Date.now();
      await this.checkNoDataTasks();
      const noDataDuration = Date.now() - noDataStart;
      this.logger.debug(`无数据任务检查完成，耗时 ${noDataDuration}ms`);

      const totalMonitorDuration = Date.now() - monitorStart;
      this.logger.debug(`任务监控完成，总耗时 ${totalMonitorDuration}ms`, {
        timeoutCheckMs: timeoutDuration,
        retryCheckMs: retryDuration,
        noDataCheckMs: noDataDuration,
        totalMs: totalMonitorDuration
      });
    } catch (error) {
      const totalMonitorDuration = Date.now() - monitorStart;
      this.logger.error('任务监控失败', {
        error: error.message,
        stack: error.stack,
        monitorTimeMs: totalMonitorDuration,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 检查超时任务
   * 超时判定: 状态为RUNNING且updated_at超过30分钟未更新
   */
  private async checkTimeoutTasks(now: Date): Promise<void> {
    const timeoutThreshold = new Date(now.getTime() - TASK_TIMEOUT);

    this.logger.debug('查询超时任务', {
      timeoutThreshold: timeoutThreshold.toISOString(),
      timeoutMinutes: TASK_TIMEOUT / 1000 / 60,
      currentTime: now.toISOString()
    });

    const queryStart = Date.now();
    const timeoutTasks = await this.taskRepository.find({
      where: {
        status: WeiboSearchTaskStatus.RUNNING,
        updatedAt: LessThan(timeoutThreshold),
      },
    });
    const queryDuration = Date.now() - queryStart;

    this.logger.debug(`超时任务查询完成，耗时 ${queryDuration}ms`, {
      foundCount: timeoutTasks.length,
      timeoutThreshold: timeoutThreshold.toISOString()
    });

    if (timeoutTasks.length === 0) {
      this.logger.debug('未发现超时任务');
      return;
    }

    this.logger.warn(`发现 ${timeoutTasks.length} 个超时任务`, {
      timeoutTaskIds: timeoutTasks.map(t => t.id),
      timeoutKeywords: timeoutTasks.map(t => t.keyword)
    });

    for (const task of timeoutTasks) {
      try {
        const runningTime = Math.round((now.getTime() - new Date(task.updatedAt).getTime()) / 1000 / 60);
        this.logger.warn(`任务 ${task.id} (${task.keyword}) 执行超时`, {
          taskId: task.id,
          keyword: task.keyword,
          runningTimeMinutes: runningTime,
          lastUpdate: task.updatedAt.toISOString(),
          retryCount: task.retryCount,
          maxRetries: task.maxRetries,
          canRetry: task.canRetry
        });

        if (task.canRetry) {
          // 可以重试，重新调度
          const retryDelay = this.calculateRetryInterval(task.retryCount);
          const nextRetryAt = new Date(now.getTime() + retryDelay);

          this.logger.debug(`安排超时任务重试`, {
            taskId: task.id,
            currentRetryCount: task.retryCount,
            newRetryCount: task.retryCount + 1,
            retryDelayMinutes: retryDelay / 1000 / 60,
            nextRetryAt: nextRetryAt.toISOString()
          });

          await this.taskRepository.update(task.id, {
            status: WeiboSearchTaskStatus.PENDING,
            nextRunAt: nextRetryAt,
            errorMessage: `任务执行超时，已重试 (${task.retryCount + 1}/${task.maxRetries})`,
            retryCount: task.retryCount + 1,
          });

          this.logger.info(`超时任务 ${task.id} 已安排重试，延迟 ${retryDelay / 1000 / 60} 分钟, 状态: RUNNING -> PENDING`);
        } else {
          // 超过最大重试次数，重新调度为PENDING状态
          this.logger.debug(`超时任务达到最大重试次数，重新调度`, {
            taskId: task.id,
            retryCount: task.retryCount,
            maxRetries: task.maxRetries,
            enabled: task.enabled
          });

          // 计算下次执行时间（1小时后）
          const nextRunAt = new Date(now.getTime() + 60 * 60 * 1000);

          await this.taskRepository.update(task.id, {
            status: WeiboSearchTaskStatus.PENDING,
            errorMessage: `任务执行超时，已达到最大重试次数 (${task.maxRetries})，1小时后重新调度`,
            nextRunAt: nextRunAt, // 设置下次执行时间
          });

          this.logger.info(`超时任务 ${task.id} 已重新调度, 状态: RUNNING -> PENDING, 将于 ${nextRunAt.toISOString()} 执行`);
        }
      } catch (error) {
        this.logger.error(`处理超时任务 ${task.id} 失败`, {
          taskId: task.id,
          error: error.message,
          stack: error.stack
        });
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

    this.logger.info(`发现 ${retryableTasks.length} 个可重试的失败任务`);

    for (const task of retryableTasks) {
      try {
        // 检查距离上次失败是否已超过重试间隔
        const retryInterval = this.calculateRetryInterval(task.retryCount);
        const nextRetryTime = new Date(task.updatedAt.getTime() + retryInterval);

        if (new Date() >= nextRetryTime) {
          // 立即安排重试，但给予适当延迟避免重复调度
          const immediateRetryDelay = 30 * 1000; // 30秒延迟
          await this.taskRepository.update(task.id, {
            status: WeiboSearchTaskStatus.PENDING,
            nextRunAt: new Date(Date.now() + immediateRetryDelay),
            errorMessage: null,
            retryCount: task.retryCount + 1,
          });

          this.logger.info(`失败任务 ${task.id} 已安排重试 (${task.retryCount + 1}/${task.maxRetries}), 30秒后执行`);
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
          nextRunAt: null, // 清除下次执行时间
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
    this.logger.info('手动触发任务监控');
    await this.monitorTasks();
  }

  /**
   * 获取监控统计信息
   */
  async getMonitorStats(): Promise<{
    running: number;
    failed: number;
    paused: number;
    pending: number;
    canRetry: number;
    shouldPause: number;
  }> {
    const [running, failed, paused, pending] = await Promise.all([
      this.taskRepository.count({ where: { status: WeiboSearchTaskStatus.RUNNING } }),
      this.taskRepository.count({ where: { status: WeiboSearchTaskStatus.FAILED } }),
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
        this.logger.error(`重置失败: 任务 ${taskId} 不存在`);
        return false;
      }

      this.logger.info(`开始重置任务 ${taskId} - 当前状态: ${task.status}, 启用状态: ${task.enabled}, 错误信息: ${task.errorMessage || '无'}`);

      if (task.status !== WeiboSearchTaskStatus.FAILED) {
        this.logger.warn(`重置失败: 任务 ${taskId} 状态不是失败 (当前: ${task.status})，无需重置`);
        return false;
      }

      await this.taskRepository.update(taskId, {
        status: WeiboSearchTaskStatus.PENDING,
        enabled: true,
        nextRunAt: new Date(Date.now() + 30 * 1000), // 30秒后执行，避免立即重复调度
        errorMessage: null,
        retryCount: 0,
        noDataCount: 0,
      });

      this.logger.info(`任务 ${taskId} 重置成功: ${task.status} -> PENDING, enabled: ${task.enabled} -> true, 30秒后执行`);
      return true;
    } catch (error) {
      this.logger.error(`重置任务 ${taskId} 失败:`, error);
      return false;
    }
  }
}