import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQClient, RabbitMQConfig } from '@pro/rabbitmq';
import { QUEUE_NAMES, CleanedDataEvent } from '@pro/types';
import { narrate } from '../utils/logging';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private client: RabbitMQClient;
  private readonly clientReady: Promise<void>;
  private resolveClientReady?: () => void;
  private rejectClientReady?: (error: Error) => void;

  private readonly logger = new Logger(RabbitMQService.name);

  constructor(private readonly configService: ConfigService) {
    this.clientReady = new Promise<void>((resolve, reject) => {
      this.resolveClientReady = resolve;
      this.rejectClientReady = reject;
    });
  }

  async onModuleInit(): Promise<void> {
    const config: RabbitMQConfig = {
      url:
        this.configService.get<string>('RABBITMQ_URL') ||
        'amqp://localhost:5672',
      queue: QUEUE_NAMES.RAW_DATA_READY,
    };

    this.logger.debug(
      narrate('初始化 RabbitMQ 连接', {
        url: config.url.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'),
        queue: config.queue,
      }),
    );

    const startTime = Date.now();
    this.client = new RabbitMQClient(config);

    try {
      await this.client.connect();
      const duration = Date.now() - startTime;

      this.resolveClientReady?.();
      this.resolveClientReady = undefined;
      this.rejectClientReady = undefined;

      this.logger.log(
        narrate('RabbitMQ 连接已建立', {
          queue: config.queue,
          connectionTimeMs: duration,
        }),
      );
    } catch (error) {
      this.rejectClientReady?.(error);
      this.resolveClientReady = undefined;
      this.rejectClientReady = undefined;

      this.logger.error(
        narrate('RabbitMQ 连接失败', {
          error: error.message,
          queue: config.queue,
        }),
      );
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.debug(narrate('关闭 RabbitMQ 连接'));

    try {
      await this.client.close();
      this.logger.log(narrate('RabbitMQ 连接已关闭'));
    } catch (error) {
      this.logger.error(
        narrate('关闭 RabbitMQ 连接失败', {
          error: error.message,
        }),
      );
    }
  }

  async publishCleanedData(event: CleanedDataEvent): Promise<boolean> {
    await this.waitForConnection();

    const startTime = Date.now();

    try {
      const success = await this.client.publish(
        QUEUE_NAMES.CLEANED_DATA,
        event,
      );
      const duration = Date.now() - startTime;

      const summary = {
        rawDataId: event.rawDataId,
        sourceType: event.sourceType,
        totalPosts: event.extractedEntities.postIds.length,
        totalComments: event.extractedEntities.commentIds.length,
        totalUsers: event.extractedEntities.userIds.length,
        publishTimeMs: duration,
      };

      if (success) {
        this.logger.log(narrate('已发布清洗完成事件', summary));
      } else {
        this.logger.warn(
          narrate('发布清洗完成事件失败', {
            rawDataId: event.rawDataId,
          }),
        );
      }

      return success;
    } catch (error) {
      this.logger.error(
        narrate('发布清洗完成事件异常', {
          rawDataId: event.rawDataId,
          error: error.message,
        }),
      );
      throw error;
    }
  }

  getClient(): RabbitMQClient {
    if (!this.client || !this.client.isConnected()) {
      throw new Error('RabbitMQ 客户端尚未就绪');
    }

    return this.client;
  }

  getQueueName(): string {
    return QUEUE_NAMES.RAW_DATA_READY;
  }

  async waitForConnection(): Promise<void> {
    if (this.client?.isConnected()) {
      return;
    }

    await this.clientReady;
  }
}
