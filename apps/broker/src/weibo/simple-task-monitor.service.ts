import { LessThan } from 'typeorm';
import { useEntityManager, WeiboSearchTaskEntity } from '@pro/entities';
import { CronScheduler } from '../core/cron-scheduler';
import { createContextLogger } from '../core/logger';

/**
 * 简化的任务监控器 - 最基本的监控
 *
 * 核心职责：
 * - 监控长时间运行的任务
 * - 基本的状态清理
 * - 大部分异常处理交给RabbitMQ的死信队列
 */
export class SimpleTaskMonitor extends CronScheduler {
  private readonly logger = createContextLogger('SimpleTaskMonitor');

  constructor() {
    super('*/30 * * * *', 'SimpleTaskMonitor'); // 每30分钟执行一次
  }

  protected async execute(): Promise<void> {
    const monitorStart = Date.now();
    this.logger.debug('[简化监控器] 开始检查任务状态');

    try {
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

  private async checkLongRunningTasks(): Promise<void> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const longRunningTasks = await useEntityManager(async m => {
      return m.find(WeiboSearchTaskEntity, {
        where: {
          enabled: true,
          updatedAt: LessThan(twoHoursAgo),
        },
      })
    })

    if (longRunningTasks.length > 0) {
      this.logger.warn(`[简化监控器] 发现 ${longRunningTasks.length} 个长时间运行的任务`);

      for (const task of longRunningTasks) {
        this.logger.warn(`[简化监控器] 任务 ${task.id} [${task.keyword}] 已运行超过2小时`);
      }
    }
  }
}
