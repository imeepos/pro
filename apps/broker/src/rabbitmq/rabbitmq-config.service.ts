import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RabbitMQClient, RabbitMQConfig } from '@pro/rabbitmq';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from '@pro/logger';
import { SubTaskMessage, TaskResultMessage, WEIBO_CRAWL_QUEUE } from '../weibo/interfaces/sub-task-message.interface';

/**
 * RabbitMQ 配置和服务
 * 负责微博搜索任务的队列管理和消息发布
 */
@Injectable()
export class RabbitMQConfigService implements OnModuleInit, OnModuleDestroy {
  private client: RabbitMQClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger
  ) {}

  async onModuleInit(): Promise<void> {
    const rabbitmqConfig: RabbitMQConfig = {
      url: this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672',
    };

    this.client = new RabbitMQClient(rabbitmqConfig);
    await this.client.connect();

    // 初始化微博抓取队列
    await this.client.publish(WEIBO_CRAWL_QUEUE, null);

    this.logger.info('RabbitMQ 连接已建立，队列已初始化', 'RabbitMQConfigService');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
    this.logger.info('RabbitMQ 连接已关闭', 'RabbitMQConfigService');
  }

  /**
   * 发布微博搜索子任务
   */
  async publishSubTask(message: SubTaskMessage): Promise<boolean> {
    try {
      const success = await this.client.publish(WEIBO_CRAWL_QUEUE, message);
      this.logger.info(`已发布子任务: 任务ID=${message.taskId}, 关键词=${message.keyword}, 时间范围=${message.start.toISOString()} ~ ${message.end.toISOString()}`, 'RabbitMQConfigService');
      return success;
    } catch (error) {
      this.logger.error('发布子任务失败:', error, 'RabbitMQConfigService');
      throw error;
    }
  }

  /**
   * 发布任务结果（可选功能）
   */
  async publishTaskResult(message: TaskResultMessage): Promise<boolean> {
    try {
      const resultQueue = 'weibo_task_results';
      const success = await this.client.publish(resultQueue, message);
      this.logger.info(`已发布任务结果: 任务ID=${message.taskId}, 状态=${message.status}`, 'RabbitMQConfigService');
      return success;
    } catch (error) {
      this.logger.error('发布任务结果失败:', error, 'RabbitMQConfigService');
      throw error;
    }
  }

  /**
   * 获取 RabbitMQ 客户端实例（用于高级操作）
   */
  getClient(): RabbitMQClient {
    return this.client;
  }
}