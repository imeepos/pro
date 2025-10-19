import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQClient, RabbitMQConfig } from '@pro/rabbitmq';
import { PinoLogger } from '@pro/logger';
import { QUEUE_NAMES, CleanedDataEvent } from '@pro/types';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private client: RabbitMQClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    const config: RabbitMQConfig = {
      url:
        this.configService.get<string>('RABBITMQ_URL') ||
        'amqp://localhost:5672',
      queue: QUEUE_NAMES.RAW_DATA_READY,
    };

    this.logger.debug('初始化 RabbitMQ 连接', {
      url: config.url.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'),
      queue: config.queue,
    });

    const startTime = Date.now();
    this.client = new RabbitMQClient(config);

    try {
      await this.client.connect();
      const duration = Date.now() - startTime;

      this.logger.info(`RabbitMQ 连接已建立,耗时 ${duration}ms`, {
        queue: config.queue,
        connectionTimeMs: duration,
      });
    } catch (error) {
      this.logger.error('RabbitMQ 连接失败', {
        error: error.message,
        queue: config.queue,
      });
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.debug('关闭 RabbitMQ 连接');

    try {
      await this.client.close();
      this.logger.info('RabbitMQ 连接已关闭');
    } catch (error) {
      this.logger.error('关闭 RabbitMQ 连接失败', {
        error: error.message,
      });
    }
  }

  async publishCleanedData(event: CleanedDataEvent): Promise<boolean> {
    const startTime = Date.now();

    try {
      const success = await this.client.publish(
        QUEUE_NAMES.CLEANED_DATA,
        event,
      );
      const duration = Date.now() - startTime;

      if (success) {
        this.logger.info('已发布清洗完成事件', {
          rawDataId: event.rawDataId,
          sourceType: event.sourceType,
          totalPosts: event.extractedEntities.postIds.length,
          totalComments: event.extractedEntities.commentIds.length,
          totalUsers: event.extractedEntities.userIds.length,
          publishTimeMs: duration,
        });
      } else {
        this.logger.warn('发布清洗完成事件失败', {
          rawDataId: event.rawDataId,
        });
      }

      return success;
    } catch (error) {
      this.logger.error('发布清洗完成事件异常', {
        rawDataId: event.rawDataId,
        error: error.message,
      });
      throw error;
    }
  }

  getClient(): RabbitMQClient {
    return this.client;
  }

  getQueueName(): string {
    return QUEUE_NAMES.RAW_DATA_READY;
  }
}
