import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { tap, retry, catchError } from 'rxjs/operators';
import { WeiboRabbitMQConfigService } from './weibo-rabbitmq-config.service';
import { WeiboSearchTaskService } from './weibo-search-task.service';
import { WeiboStatsRedisService } from './weibo-stats-redis.service';
import { WeiboHourlyStatsService } from './weibo-hourly-stats.service';
import {
  WeiboTaskStatusMessage,
  MessageProcessResult,
  ConsumerStats,
} from './interfaces/weibo-task-status.interface';
import { HourlyStatsType } from './interfaces/hourly-stats.interface';

/**
 * 微博任务状态消费者服务
 *
 * 存在即合理：
 * - 消费 Crawler 服务发送的任务状态更新
 * - 更新数据库中的任务状态和进度
 * - 记录统计信息和小时级数据
 *
 * 优雅即简约：
 * - 使用 RxJS 管道优雅处理消息流
 * - 自动重试和错误处理
 * - 声明式的消息处理逻辑
 */
@Injectable()
export class WeiboTaskStatusConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WeiboTaskStatusConsumer.name);
  private subscription?: Subscription;

  constructor(
    private readonly rabbitMQConfig: WeiboRabbitMQConfigService,
    private readonly taskService: WeiboSearchTaskService,
    private readonly statsService: WeiboStatsRedisService,
    private readonly hourlyStatsService: WeiboHourlyStatsService,
  ) {}

  /**
   * 模块初始化时启动消费者
   */
  async onModuleInit(): Promise<void> {
    const queueManager = this.rabbitMQConfig.getQueueManager();

    this.subscription = queueManager.consumer$
      .pipe(
        tap(envelope => {
          this.logger.debug('收到任务状态消息', {
            taskId: envelope.message.taskId,
            status: envelope.message.status,
          });
        }),
        tap(async envelope => {
          const startTime = Date.now();
          try {
            // 解析和验证消息
            const message = this.rabbitMQConfig.parseStatusMessage(envelope.message);
            if (!message) {
              this.logger.warn('无效的状态消息', { message: envelope.message });
              envelope.nack(false); // 不重新入队
              await this.updateStats(startTime, MessageProcessResult.FAILED);
              return;
            }

            // 处理状态更新
            const result = await this.processStatusUpdate(message);

            if (result === MessageProcessResult.SUCCESS) {
              envelope.ack();
              await this.updateStats(startTime, MessageProcessResult.SUCCESS);
              this.logger.log('任务状态更新成功', {
                taskId: message.taskId,
                status: message.status,
                processingTime: Date.now() - startTime,
              });
            } else if (result === MessageProcessResult.RETRY) {
              envelope.nack(true); // 重新入队
              await this.updateStats(startTime, MessageProcessResult.RETRY);
            } else {
              envelope.nack(false); // 不重新入队
              await this.updateStats(startTime, MessageProcessResult.FAILED);
            }
          } catch (error) {
            this.logger.error('处理状态消息异常', { error });
            envelope.nack(true); // 异常时重试
            await this.updateStats(startTime, MessageProcessResult.FAILED);
          }
        }),
        retry({ count: 3, delay: 5000 }),
        catchError((error, caught) => {
          this.logger.error('消费者管道错误', { error });
          return caught; // 重新订阅
        }),
      )
      .subscribe({
        error: error => this.logger.error('消费者订阅错误', { error }),
      });

    this.logger.log('微博任务状态消费者启动成功', {
      queueName: queueManager.queueName,
    });
  }

  /**
   * 模块销毁时停止消费者
   */
  async onModuleDestroy(): Promise<void> {
    this.subscription?.unsubscribe();
    this.logger.log('微博任务状态消费者已停止');
  }

  /**
   * 处理状态更新逻辑
   */
  private async processStatusUpdate(
    statusMessage: WeiboTaskStatusMessage
  ): Promise<MessageProcessResult> {
    try {
      const { taskId, status, errorMessage } = statusMessage;

      const normalizedStatus = this.mapStatus(status);
      if (!normalizedStatus) {
        this.logger.warn(`未知的状态值: ${status}`, { taskId });
        return MessageProcessResult.FAILED;
      }

      await this.taskService.updateTaskStatus(taskId, normalizedStatus, errorMessage);

      // 更新任务进度（如果有进度数据）
      if (statusMessage.currentCrawlTime || statusMessage.latestCrawlTime ||
          statusMessage.nextRunAt || statusMessage.progress !== undefined) {
        await this.taskService.updateTaskProgress(taskId, {
          currentCrawlTime: statusMessage.currentCrawlTime,
          latestCrawlTime: statusMessage.latestCrawlTime,
          nextRunAt: statusMessage.nextRunAt,
          progress: statusMessage.progress,
        });
      }

      this.logger.debug(`任务状态更新成功`, {
        taskId,
        status: normalizedStatus,
        progress: statusMessage.progress,
      });

      return MessageProcessResult.SUCCESS;
    } catch (error) {
      this.logger.error('更新任务状态失败', {
        taskId: statusMessage.taskId,
        status: statusMessage.status,
        error: error.message,
      });

      // 判断是否可重试
      if (this.isRetryableError(error)) {
        return MessageProcessResult.RETRY;
      }

      return MessageProcessResult.FAILED;
    }
  }

  /**
   * 映射消息状态到实体状态
   */
  private mapStatus(messageStatus: string): string | null {
    const allowed = new Set(['running', 'completed', 'failed', 'timeout']);
    return allowed.has(messageStatus) ? messageStatus : null;
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: any): boolean {
    // 数据库连接错误、超时等可重试
    const retryablePatterns = [
      /connection/,
      /timeout/,
      /network/,
      /ECONNRESET/,
      /ETIMEDOUT/,
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return retryablePatterns.some(pattern => pattern.test(errorMessage));
  }

  
  /**
   * 更新统计信息（使用 Redis 持久化）
   */
  private async updateStats(startTime: number, result: MessageProcessResult): Promise<void> {
    try {
      const processingTime = Date.now() - startTime;
      const now = new Date();

      // 将 MessageProcessResult 枚举值映射为字符串
      const resultStr = result === MessageProcessResult.SUCCESS ? 'success' :
                       result === MessageProcessResult.RETRY ? 'retry' : 'failure';

      // 使用 Redis 批量更新统计信息
      await this.statsService.updateStats(resultStr, processingTime);

      // 记录小时统计数据 - 异步执行，不阻塞主流程
      this.recordHourlyStatsAsync(now, resultStr, processingTime).catch(error => {
        this.logger.warn('记录小时统计数据失败', { error });
      });

      this.logger.debug(`统计信息已更新到 Redis`, {
        result: resultStr,
        processingTime,
      });
    } catch (error) {
      this.logger.error('更新统计信息失败', { error });
      // 统计更新失败不应该影响主要业务逻辑，只记录错误
    }
  }

  /**
   * 异步记录小时统计数据
   */
  private async recordHourlyStatsAsync(
    timestamp: Date,
    result: string,
    processingTime: number
  ): Promise<void> {
    try {
      // 记录消息处理统计
      await this.hourlyStatsService.recordHourlyStat(
        HourlyStatsType.MESSAGE_PROCESSING,
        timestamp,
        1,
        { result, processingTime }
      );

      // 记录性能统计
      await this.hourlyStatsService.recordHourlyStat(
        HourlyStatsType.PERFORMANCE,
        timestamp,
        processingTime,
        { result }
      );

      // 记录任务执行统计
      await this.hourlyStatsService.recordHourlyStat(
        HourlyStatsType.TASK_EXECUTION,
        timestamp,
        1,
        { result, processingTime }
      );
    } catch (error) {
      this.logger.error('记录小时统计数据失败', { timestamp, result, processingTime, error });
      throw error;
    }
  }

  /**
   * 获取消费者统计信息（从 Redis）
   */
  async getStats(): Promise<ConsumerStats> {
    try {
      return await this.statsService.getStats();
    } catch (error) {
      this.logger.error('获取统计信息失败', error);
      // 返回默认统计信息
      return {
        totalMessages: 0,
        successCount: 0,
        failureCount: 0,
        retryCount: 0,
        avgProcessingTime: 0,
      };
    }
  }

  /**
   * 重置统计信息（从 Redis）
   */
  async resetStats(): Promise<void> {
    try {
      await this.statsService.resetStats();
      this.logger.log('消费者统计信息已重置');
    } catch (error) {
      this.logger.error('重置统计信息失败', error);
      throw error;
    }
  }
}
