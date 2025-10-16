import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { WeiboRabbitMQConfigService } from './weibo-rabbitmq-config.service';
import { WeiboSearchTaskService } from './weibo-search-task.service';
import {
  WeiboTaskStatusMessage,
  MessageProcessResult,
  ConsumerStats,
} from './interfaces/weibo-task-status.interface';
import { WeiboSearchTaskStatus } from '@pro/entities';

/**
 * 微博任务状态消费者服务
 * 负责消费来自Crawler服务的任务状态更新消息
 */
@Injectable()
export class WeiboTaskStatusConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WeiboTaskStatusConsumer.name);
  private readonly stats: ConsumerStats = {
    totalMessages: 0,
    successCount: 0,
    failureCount: 0,
    retryCount: 0,
    avgProcessingTime: 0,
  };
  private consumerTag: string | null = null;
  private processingTimes: number[] = [];
  private readonly maxProcessingTimeSamples = 100;

  constructor(
    private readonly rabbitMQConfig: WeiboRabbitMQConfigService,
    private readonly taskService: WeiboSearchTaskService,
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

      await this.rabbitMQConfig.getRabbitMQClient().consume(
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
    this.stats.totalMessages++;

    try {
      // 解析消息
      const statusMessage = this.rabbitMQConfig.parseStatusMessage(message);
      if (!statusMessage) {
        this.logger.warn('收到无效的状态消息', { message });
        this.updateStats(startTime, MessageProcessResult.FAILED);
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
        this.updateStats(startTime, MessageProcessResult.SUCCESS);
        this.logger.log(`任务状态更新成功`, {
          taskId: statusMessage.taskId,
          status: statusMessage.status,
          processingTime: Date.now() - startTime,
        });
      } else if (result === MessageProcessResult.RETRY) {
        // 对于需要重试的情况，抛出异常让RabbitMQ客户端处理重试
        throw new Error(`任务状态更新失败，将重试: taskId=${statusMessage.taskId}`);
      } else {
        this.updateStats(startTime, MessageProcessResult.FAILED);
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

      this.updateStats(startTime, MessageProcessResult.FAILED);
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
   * 更新统计信息
   */
  private updateStats(startTime: number, result: MessageProcessResult): void {
    const processingTime = Date.now() - startTime;
    this.processingTimes.push(processingTime);

    // 保持样本数量在限制内
    if (this.processingTimes.length > this.maxProcessingTimeSamples) {
      this.processingTimes.shift();
    }

    // 计算平均处理时间
    this.stats.avgProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;

    // 更新计数
    switch (result) {
      case MessageProcessResult.SUCCESS:
        this.stats.successCount++;
        break;
      case MessageProcessResult.RETRY:
        this.stats.retryCount++;
        break;
      case MessageProcessResult.FAILED:
        this.stats.failureCount++;
        break;
    }

    this.stats.lastProcessedAt = new Date();
  }

  /**
   * 获取消费者统计信息
   */
  getStats(): ConsumerStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats.totalMessages = 0;
    this.stats.successCount = 0;
    this.stats.failureCount = 0;
    this.stats.retryCount = 0;
    this.stats.avgProcessingTime = 0;
    this.stats.lastProcessedAt = undefined;
    this.processingTimes = [];

    this.logger.log('消费者统计信息已重置');
  }
}