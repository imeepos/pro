import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';
import { PinoLogger } from '@pro/logger';

/**
 * 简化的任务监控器 - 只做最基本的监控
 *
 * 核心职责：
 * - 监控长时间运行的任务
 * - 基本的状态清理
 * - 大部分异常处理交给RabbitMQ的死信队列
 */
@Injectable()
export class SimpleTaskMonitor {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
  ) {
    this.logger.setContext(SimpleTaskMonitor.name);
  }

  /**
   * 每30分钟检查一次任务状态 - 简化的监控频率
   */
  @Cron('*/30 * * * *') // 每30分钟执行一次
  async monitorTasks(): Promise<void> {
    const monitorStart = Date.now();
    this.logger.debug('[简化监控器] 开始检查任务状态');

    try {
      // 只检查长时间运行的任务，其他异常交给队列处理
      await this.checkLongRunningTasks();

      const duration = Date.now() - monitorStart;
      this.logger.debug(`[简化监控器] 检查完成，耗时 ${duration}ms`);
    } catch (error) {
      this.logger.error({
        message: '[简化监控器] 检查失败',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 检查长时间运行的任务（超过2小时）
   */
  private async checkLongRunningTasks(): Promise<void> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const longRunningTasks = await this.taskRepository.find({
      where: {
        status: WeiboSearchTaskStatus.RUNNING,
        updatedAt: LessThan(twoHoursAgo)
      }
    });

    if (longRunningTasks.length > 0) {
      this.logger.warn(`[简化监控器] 发现 ${longRunningTasks.length} 个长时间运行的任务`);

      for (const task of longRunningTasks) {
        this.logger.warn(`[简化监控器] 任务 ${task.id} [${task.keyword}] 已运行超过2小时`);

        // 记录警告，但不主动干预，让队列的TTL机制处理
        // 这样可以避免复杂的重试逻辑
      }
    }
  }
}