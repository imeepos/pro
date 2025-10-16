import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQClient, RabbitMQConfig } from '@pro/rabbitmq';
import {
  TaskStatusConsumerConfig,
  WeiboTaskStatusMessage
} from './interfaces/weibo-task-status.interface';

/**
 * 微博任务状态队列配置服务
 * 负责管理微博任务状态更新的RabbitMQ连接和配置
 */
@Injectable()
export class WeiboRabbitMQConfigService implements OnModuleInit, OnModuleDestroy {
  private readonly rabbitMQClient: RabbitMQClient;
  private readonly logger = new Logger(WeiboRabbitMQConfigService.name);

  constructor(private readonly configService: ConfigService) {
    // 初始化RabbitMQ客户端
    const rabbitMQConfig: RabbitMQConfig = {
      url: this.configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672'),
      queue: 'weibo_task_status_queue',
      maxRetries: 3,
      enableDLQ: true,
    };

    this.rabbitMQClient = new RabbitMQClient(rabbitMQConfig);
    this.logger.log('RabbitMQ配置服务初始化完成');
  }

  /**
   * 模块初始化时建立RabbitMQ连接
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.rabbitMQClient.connect();
      this.logger.log('RabbitMQ连接建立成功');
    } catch (error) {
      this.logger.error('RabbitMQ连接失败', error);
      throw error;
    }
  }

  /**
   * 模块销毁时关闭RabbitMQ连接
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.rabbitMQClient.close();
      this.logger.log('RabbitMQ连接已关闭');
    } catch (error) {
      this.logger.error('关闭RabbitMQ连接失败', error);
    }
  }

  /**
   * 获取消费者配置
   */
  getConsumerConfig(): TaskStatusConsumerConfig {
    return {
      queueName: 'weibo_task_status_queue',
      consumerTag: `weibo-task-status-consumer-${Date.now()}`,
      prefetchCount: 5, // 并发处理5条消息
      retryConfig: {
        maxRetries: 3,
        retryDelayBase: 5000,
      },
    };
  }

  /**
   * 获取RabbitMQ客户端实例
   */
  getRabbitMQClient(): RabbitMQClient {
    return this.rabbitMQClient;
  }

  /**
   * 验证消息格式
   */
  validateStatusMessage(message: any): message is WeiboTaskStatusMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    const requiredFields = ['taskId', 'status', 'updatedAt'];
    const validStatuses = ['running', 'completed', 'failed', 'timeout'];

    // 检查必需字段
    for (const field of requiredFields) {
      if (!(field in message)) {
        this.logger.warn(`消息缺少必需字段: ${field}`, { message });
        return false;
      }
    }

    // 验证任务ID
    if (typeof message.taskId !== 'number' || message.taskId <= 0) {
      this.logger.warn('无效的任务ID', { taskId: message.taskId });
      return false;
    }

    // 验证状态值
    if (!validStatuses.includes(message.status)) {
      this.logger.warn('无效的任务状态', { status: message.status });
      return false;
    }

    // 验证更新时间
    const updatedAt = new Date(message.updatedAt);
    if (isNaN(updatedAt.getTime())) {
      this.logger.warn('无效的更新时间', { updatedAt: message.updatedAt });
      return false;
    }

    return true;
  }

  /**
   * 将RabbitMQ消息转换为标准格式
   */
  parseStatusMessage(rawMessage: any): WeiboTaskStatusMessage | null {
    try {
      // 处理消息中的日期字段
      const message = { ...rawMessage };

      // 转换日期字段
      const dateFields = ['currentCrawlTime', 'latestCrawlTime', 'nextRunAt', 'updatedAt'];
      for (const field of dateFields) {
        if (message[field]) {
          message[field] = new Date(message[field]);
        }
      }

      // 验证消息格式
      if (!this.validateStatusMessage(message)) {
        return null;
      }

      this.logger.debug(`解析状态消息成功`, {
        taskId: message.taskId,
        status: message.status,
        progress: message.progress,
      });

      return message;
    } catch (error) {
      this.logger.error('解析状态消息失败', { rawMessage, error });
      return null;
    }
  }
}