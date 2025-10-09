import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '../entities/weibo-search-task.entity';
import { RabbitMQConfigService } from '../rabbitmq/rabbitmq-config.service';
import { SubTaskMessage } from './interfaces/sub-task-message.interface';

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
 * 每分钟扫描主任务，判断是否需要生成子任务
 */
@Injectable()
export class TaskScannerScheduler {
  private readonly logger = new Logger(TaskScannerScheduler.name);

  constructor(
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
    private readonly rabbitMQService: RabbitMQConfigService,
  ) {}

  /**
   * 每分钟扫描待执行的主任务
   * 查找条件: enabled=true && nextRunAt <= NOW
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scanTasks(): Promise<void> {
    this.logger.debug('开始扫描待执行的主任务');

    try {
      const now = new Date();

      // 查找待执行的主任务
      const tasks = await this.taskRepository.find({
        where: {
          enabled: true,
          nextRunAt: LessThanOrEqual(now),
        },
        order: {
          nextRunAt: 'ASC',
        },
      });

      if (tasks.length === 0) {
        this.logger.debug('没有待执行的主任务');
        return;
      }

      this.logger.log(`发现 ${tasks.length} 个待执行的主任务`);

      // 并行处理主任务（限制并发数）
      const batchSize = 5;
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        await Promise.all(batch.map(task => this.dispatchTask(task)));
      }

      this.logger.log(`已完成扫描，处理了 ${tasks.length} 个主任务`);
    } catch (error) {
      this.logger.error('扫描主任务失败:', error);
    }
  }

  /**
   * 调度单个主任务
   * 根据任务状态生成相应的子任务
   */
  private async dispatchTask(task: WeiboSearchTaskEntity): Promise<void> {
    this.logger.debug(`处理主任务 ${task.id}: ${task.keyword}`);

    try {
      // 检查任务状态，避免重复调度
      if (task.status === WeiboSearchTaskStatus.RUNNING) {
        this.logger.debug(`任务 ${task.id} 正在执行中，跳过调度`);
        return;
      }

      // 更新任务状态为运行中
      await this.taskRepository.update(task.id, {
        status: WeiboSearchTaskStatus.RUNNING,
        errorMessage: null,
      });

      let subTask: SubTaskMessage;

      // 判断是首次抓取还是增量更新
      if (task.needsInitialCrawl) {
        // 首次抓取: startDate ~ NOW
        subTask = this.createInitialSubTask(task);
        this.logger.log(`任务 ${task.id} 开始首次抓取: ${task.keyword}`);
      } else if (task.isHistoricalCrawlCompleted) {
        // 历史回溯已完成，进入增量模式
        subTask = this.createIncrementalSubTask(task);
        this.logger.log(`任务 ${task.id} 开始增量更新: ${task.keyword}`);
      } else {
        // 历史数据回溯中（这种情况通常由 crawler 自动触发，不应该出现在这里）
        this.logger.warn(`任务 ${task.id} 处于异常状态: 历史回溯中但被调度器扫描到`);
        await this.taskRepository.update(task.id, {
          status: WeiboSearchTaskStatus.FAILED,
          errorMessage: '任务状态异常: 历史回溯中但被调度器扫描到',
        });
        return;
      }

      // 推送子任务到 RabbitMQ
      await this.rabbitMQService.publishSubTask(subTask);

      // 更新任务的下次执行时间（仅增量更新时）
      if (task.isHistoricalCrawlCompleted) {
        await this.taskRepository.update(task.id, {
          nextRunAt: new Date(Date.now() + parseInterval(task.crawlInterval)),
        });
        this.logger.debug(`任务 ${task.id} 下次执行时间已更新: ${new Date(Date.now() + parseInterval(task.crawlInterval)).toISOString()}`);
      }

      this.logger.log(`已成功调度主任务 ${task.id}: ${task.keyword}`);
    } catch (error) {
      this.logger.error(`调度主任务 ${task.id} 失败:`, error);

      // 更新任务状态为失败
      await this.taskRepository.update(task.id, {
        status: WeiboSearchTaskStatus.FAILED,
        errorMessage: error.message,
        retryCount: task.retryCount + 1,
      });
    }
  }

  /**
   * 创建首次抓取子任务
   * 时间范围: startDate ~ NOW
   */
  private createInitialSubTask(task: WeiboSearchTaskEntity): SubTaskMessage {
    return {
      taskId: task.id,
      keyword: task.keyword,
      start: task.startDate,
      end: new Date(),
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

    return {
      taskId: task.id,
      keyword: task.keyword,
      start: startTime,
      end: new Date(),
      isInitialCrawl: false,
      weiboAccountId: task.weiboAccountId,
      enableAccountRotation: task.enableAccountRotation,
    };
  }

  /**
   * 手动触发扫描（用于测试和紧急处理）
   */
  async triggerScan(): Promise<void> {
    this.logger.log('手动触发任务扫描');
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
  }> {
    const [total, enabled, disabled, running, failed, pending] = await Promise.all([
      this.taskRepository.count(),
      this.taskRepository.count({ where: { enabled: true } }),
      this.taskRepository.count({ where: { enabled: false } }),
      this.taskRepository.count({ where: { status: WeiboSearchTaskStatus.RUNNING } }),
      this.taskRepository.count({ where: { status: WeiboSearchTaskStatus.FAILED } }),
      this.taskRepository.count({ where: { status: WeiboSearchTaskStatus.PENDING } }),
    ]);

    return { total, enabled, disabled, running, failed, pending };
  }
}