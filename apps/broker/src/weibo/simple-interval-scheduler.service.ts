import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@pro/logger';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';
import { RabbitMQConfigService } from '../rabbitmq/rabbitmq-config.service';
import { SubTaskMessage, TaskResultMessage } from './interfaces/sub-task-message.interface';

/**
 * 时间间隔解析器 - 简约的时间单位转换
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
 * 简化的时间间隔调度器 - 极简的任务调度
 *
 * 核心职责：
 * - 每分钟检查所有启用的任务
 * - 根据时间间隔严格调度任务
 * - 利用队列机制处理失败和超时
 */
@Injectable()
export class SimpleIntervalScheduler {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
    private readonly rabbitMQService: RabbitMQConfigService,
  ) {
    this.logger.setContext(SimpleIntervalScheduler.name);
  }

  /**
   * 每分钟检查待执行的任务 - 严格按时间间隔调度
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduleTasks(): Promise<void> {
    const scanStart = Date.now();
    this.logger.info(`[简化调度器] 开始检查任务 - ${new Date().toISOString()}`);

    try {
      const now = new Date();
      const tasks = await this.findTasksToSchedule(now);

      if (tasks.length === 0) {
        this.logger.debug('[简化调度器] 无任务需要调度');
        return;
      }

      this.logger.info(`[简化调度器] 发现 ${tasks.length} 个待调度任务`);

      // 串行处理任务，避免并发问题
      for (const task of tasks) {
        await this.scheduleSingleTask(task, now);
      }

      const totalDuration = Date.now() - scanStart;
      this.logger.info(`[简化调度器] 调度完成，处理 ${tasks.length} 个任务，耗时 ${totalDuration}ms`);
    } catch (error) {
      this.logger.error({
        message: '任务调度失败',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 查找需要调度的任务
   */
  private async findTasksToSchedule(now: Date): Promise<WeiboSearchTaskEntity[]> {
    return this.taskRepository.find({
      where: [
        // 首次执行的任务
        {
          enabled: true,
          status: WeiboSearchTaskStatus.PENDING,
          nextRunAt: IsNull(),
        },
        // 到达执行时间的任务
        {
          enabled: true,
          status: WeiboSearchTaskStatus.PENDING,
          nextRunAt: LessThanOrEqual(now),
        },
      ],
      order: { nextRunAt: 'ASC' },
    });
  }

  /**
   * 调度单个任务
   */
  private async scheduleSingleTask(task: WeiboSearchTaskEntity, now: Date): Promise<void> {
    try {
      // 计算时间范围
      const timeRange = this.calculateTimeRange(task, now);

      // 获取任务锁
      const lockSuccess = await this.acquireTaskLock(task);
      if (!lockSuccess) {
        this.logger.debug(`[简化调度器] 任务 ${task.id} [${task.keyword}] 获取锁失败，跳过`);
        return;
      }

      // 创建子任务消息
      const subTask: SubTaskMessage = {
        taskId: task.id,
        keyword: task.keyword,
        start: timeRange.startTime,
        end: timeRange.endTime,
        isInitialCrawl: timeRange.isFirstTime,
        weiboAccountId: task.weiboAccountId,
        enableAccountRotation: task.enableAccountRotation,
      };

      // 发送到队列
      await this.publishSubTask(subTask);

      // 更新下次执行时间
      await this.updateNextRunTime(task, now);

      this.logger.info(
        `[简化调度器] 任务 ${task.id} [${task.keyword}] 已调度，` +
        `时间范围: ${timeRange.startTime.toISOString()} 到 ${timeRange.endTime.toISOString()}`
      );

    } catch (error) {
      this.logger.error({
        message: `调度任务 ${task.id} [${task.keyword}] 失败`,
        error: error.message,
        taskId: task.id,
        keyword: task.keyword
      });
    }
  }

  /**
   * 计算任务的时间范围 - 严格按照间隔划分
   */
  private calculateTimeRange(task: WeiboSearchTaskEntity, now: Date): {
    startTime: Date;
    endTime: Date;
    isFirstTime: boolean;
  } {
    const intervalMs = parseInterval(task.crawlInterval);

    // 如果是首次执行，从 start_date 开始
    if (!task.currentCrawlTime) {
      return {
        startTime: task.startDate,
        endTime: task.startDate,
        isFirstTime: true
      };
    }

    // 计算上次执行时间到当前时间的间隔数
    const lastRunTime = new Date(task.currentCrawlTime);
    const intervalCount = Math.floor((now.getTime() - lastRunTime.getTime()) / intervalMs);

    if (intervalCount <= 0) {
      // 还未到下一个执行间隔
      return {
        startTime: lastRunTime,
        endTime: lastRunTime,
        isFirstTime: false
      };
    }

    // 计算本次执行的时间范围：从上次执行时间开始，经过一个间隔
    const startTime = lastRunTime;
    const endTime = new Date(lastRunTime.getTime() + intervalMs);

    return {
      startTime,
      endTime,
      isFirstTime: false
    };
  }

  /**
   * 获取任务锁 - 简化的锁机制
   */
  private async acquireTaskLock(task: WeiboSearchTaskEntity): Promise<boolean> {
    try {
      const result = await this.taskRepository.update(
        {
          id: task.id,
          status: WeiboSearchTaskStatus.PENDING
        },
        {
          status: WeiboSearchTaskStatus.RUNNING,
          updatedAt: new Date()
        }
      );

      return result.affected === 1;
    } catch (error) {
      this.logger.error({
        message: `获取任务锁失败`,
        error: error.message,
        taskId: task.id
      });
      return false;
    }
  }

  /**
   * 更新下次执行时间
   */
  private async updateNextRunTime(task: WeiboSearchTaskEntity, now: Date): Promise<void> {
    const intervalMs = parseInterval(task.crawlInterval);
    const nextRunTime = new Date(now.getTime() + intervalMs);

    await this.taskRepository.update(task.id, {
      currentCrawlTime: now,
      nextRunAt: nextRunTime,
      updatedAt: new Date()
    });
  }

  /**
   * 发布子任务到队列
   */
  private async publishSubTask(message: SubTaskMessage): Promise<boolean> {
    const publishStart = Date.now();

    this.logger.debug('发布子任务到消息队列', {
      taskId: message.taskId,
      keyword: message.keyword,
      start: message.start,
      end: message.end,
    });

    try {
      const success = await this.rabbitMQService.getClient().publish('weibo_crawl_queue', message, {
        persistent: true
      });

      const duration = Date.now() - publishStart;

      if (success) {
        this.logger.info(`子任务已发送: ID=${message.taskId}, 关键词=${message.keyword}, 耗时=${duration}ms`);
      } else {
        this.logger.warn(`消息发布失败: ID=${message.taskId}`);
      }

      return success;
    } catch (error) {
      const duration = Date.now() - publishStart;
      this.logger.error('子任务发布异常', {
        taskId: message.taskId,
        keyword: message.keyword,
        error: error.message,
        publishTime: `${duration}ms`,
      });
      throw error;
    }
  }
}