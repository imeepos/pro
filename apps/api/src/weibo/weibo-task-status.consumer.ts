import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
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
import { WeiboSearchTaskStatus } from '@pro/entities';

/**
 * 微博任务状态消费者服务
 * 负责消费来自Crawler服务的任务状态更新消息
 */
@Injectable()
export class WeiboTaskStatusConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WeiboTaskStatusConsumer.name);
  private consumerTag: string | null = null;

  constructor(
    private readonly rabbitMQConfig: WeiboRabbitMQConfigService,
    private readonly taskService: WeiboSearchTaskService,
    private readonly statsService: WeiboStatsRedisService,
    private readonly hourlyStatsService: WeiboHourlyStatsService,
  ) {
    this.logger.log('微博任务状态消费者初始化');
  }

  /**
   * 模块初始化时启动消费者
   */
  async onModuleInit(): Promise<void> {
    try {
      const config = this.rabbitMQConfig.getConsumerConfig();
      this.consumerTag = config.consumerTag;

      // 确保RabbitMQ客户端已连接
      const rabbitMQClient = this.rabbitMQConfig.getRabbitMQClient();

      // 检查连接状态，如果未连接则等待并重试
      if (!rabbitMQClient.isConnected()) {
        this.logger.log('RabbitMQ连接未建立，等待连接...');
        await this.waitForConnection(rabbitMQClient);
      }

      await rabbitMQClient.consume(
        config.queueName,
        this.handleStatusUpdate.bind(this),
        {
          noAck: false, // 手动确认消息
          prefetchCount: config.prefetchCount,
        }
      );

      this.logger.log(`微博任务状态消费者启动成功`, {
        consumerTag: config.consumerTag,
        queueName: config.queueName,
        prefetchCount: config.prefetchCount,
      });
    } catch (error) {
      this.logger.error('启动微博任务状态消费者失败', error);
      throw error;
    }
  }

  /**
   * 等待RabbitMQ连接建立
   */
  private async waitForConnection(rabbitMQClient: any): Promise<void> {
    const maxAttempts = 10;
    const retryDelay = 1000; // 1秒

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (rabbitMQClient.isConnected()) {
        this.logger.log(`RabbitMQ连接在第${attempt}次检查时已建立`);
        return;
      }

      this.logger.log(`等待RabbitMQ连接建立... (${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    throw new Error(`RabbitMQ连接在${maxAttempts}次尝试后仍未建立`);
  }

  /**
   * 模块销毁时停止消费者
   */
  async onModuleDestroy(): Promise<void> {
    try {
      // RabbitMQ客户端会在配置服务中关闭
      this.logger.log(`微博任务状态消费者已停止`, { consumerTag: this.consumerTag });
    } catch (error) {
      this.logger.error('停止微博任务状态消费者失败', error);
    }
  }

  /**
   * 处理任务状态更新消息
   */
  private async handleStatusUpdate(message: any): Promise<void> {
    const startTime = Date.now();

    try {
      // 解析消息
      const statusMessage = this.rabbitMQConfig.parseStatusMessage(message);
      if (!statusMessage) {
        this.logger.warn('收到无效的状态消息', { message });
        await this.updateStats(startTime, MessageProcessResult.FAILED);
        return;
      }

      this.logger.debug(`处理任务状态更新`, {
        taskId: statusMessage.taskId,
        status: statusMessage.status,
        progress: statusMessage.progress,
      });

      // 处理状态更新
      const result = await this.processStatusUpdate(statusMessage);

      if (result === MessageProcessResult.SUCCESS) {
        await this.updateStats(startTime, MessageProcessResult.SUCCESS);
        this.logger.log(`任务状态更新成功`, {
          taskId: statusMessage.taskId,
          status: statusMessage.status,
          processingTime: Date.now() - startTime,
        });
      } else if (result === MessageProcessResult.RETRY) {
        // 对于需要重试的情况，抛出异常让RabbitMQ客户端处理重试
        throw new Error(`任务状态更新失败，将重试: taskId=${statusMessage.taskId}`);
      } else {
        await this.updateStats(startTime, MessageProcessResult.FAILED);
        this.logger.error(`任务状态更新失败，不再重试`, {
          taskId: statusMessage.taskId,
          status: statusMessage.status,
        });
      }
    } catch (error) {
      this.logger.error('处理状态消息时发生异常', {
        message,
        error: error.message,
        stack: error.stack,
      });

      await this.updateStats(startTime, MessageProcessResult.FAILED);
      throw error; // 重新抛出异常让RabbitMQ客户端处理重试逻辑
    }
  }

  /**
   * 处理状态更新逻辑
   */
  private async processStatusUpdate(
    statusMessage: WeiboTaskStatusMessage
  ): Promise<MessageProcessResult> {
    try {
      const { taskId, status, errorMessage, ...updateData } = statusMessage;

      // 映射状态值
      const mappedStatus = this.mapStatus(status);
      if (!mappedStatus) {
        this.logger.warn(`未知的状态值: ${status}`, { taskId });
        return MessageProcessResult.FAILED;
      }

      // 更新任务状态
      await this.taskService.updateTaskStatus(taskId, mappedStatus, errorMessage);

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
        status: mappedStatus,
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
  private mapStatus(messageStatus: string): WeiboSearchTaskStatus | null {
    const statusMap: Record<string, WeiboSearchTaskStatus> = {
      'running': WeiboSearchTaskStatus.RUNNING,
      'completed': WeiboSearchTaskStatus.RUNNING, // 完成状态仍为running，由监控服务判断
      'failed': WeiboSearchTaskStatus.FAILED,
      'timeout': WeiboSearchTaskStatus.TIMEOUT,
    };

    return statusMap[messageStatus] || null;
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