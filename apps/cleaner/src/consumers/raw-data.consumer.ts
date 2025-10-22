import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLogger } from '@pro/logger';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { RawDataService } from '../services/raw-data.service';
import { WeiboCleanerService } from '../services/weibo-cleaner.service';
import {
  RawDataReadyEvent,
  CleanedDataEvent,
  SourceType,
} from '@pro/types';

@Injectable()
export class RawDataConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly rawDataService: RawDataService,
    private readonly weiboCleanerService: WeiboCleanerService,
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.info('启动原始数据消费者');

    try {
      this.logger.debug('等待 RabbitMQ 渠道就绪');
      await this.rabbitMQService.waitForConnection();
    } catch (error) {
      this.logger.error('原始数据消费者初始化失败, RabbitMQ 渠道未就绪', {
        error: error.message,
      });
      throw error;
    }

    const client = this.rabbitMQService.getClient();
    const queue = this.rabbitMQService.getQueueName();

    try {
      await client.consume(
        queue,
        async (event: RawDataReadyEvent) => {
          await this.processRawData(event);
        },
        { noAck: false, prefetchCount: 5 },
      );
    } catch (error) {
      this.logger.error('原始数据消费者启动失败', {
        queue,
        error: error.message,
      });
      throw error;
    }

    this.logger.info('原始数据消费者已启动');
  }

  private async processRawData(event: RawDataReadyEvent): Promise<void> {
    const startTime = Date.now();

    this.logger.info('开始处理原始数据', {
      rawDataId: event.rawDataId,
      sourceType: event.sourceType,
      sourcePlatform: event.sourcePlatform,
    });

    try {
      const rawData = await this.rawDataService.getRawDataById(
        event.rawDataId,
      );

      if (!rawData) {
        this.logger.error('原始数据不存在', {
          rawDataId: event.rawDataId,
        });
        return;
      }

      if (rawData.status === 'processed') {
        this.logger.warn('原始数据已处理过,跳过', {
          rawDataId: event.rawDataId,
        });
        return;
      }

      let cleanedData;

      if (event.sourceType === SourceType.WEIBO_KEYWORD_SEARCH) {
        cleanedData = await this.weiboCleanerService.cleanWeiboData(rawData);
      } else {
        this.logger.warn('不支持的数据源类型', {
          rawDataId: event.rawDataId,
          sourceType: event.sourceType,
        });
        await this.rawDataService.updateStatus(
          event.rawDataId,
          'failed',
          'Unsupported source type',
        );
        return;
      }

      await this.rawDataService.updateStatus(event.rawDataId, 'processed');

      const processingTime = Date.now() - startTime;

      const cleanedEvent: CleanedDataEvent = {
        rawDataId: event.rawDataId,
        sourceType: event.sourceType,
        extractedEntities: {
          postIds: cleanedData.posts.map((p) => String(p.id)),
          commentIds: cleanedData.comments.map((c) => String(c.id)),
          userIds: cleanedData.users.map((u) => String(u.id)),
        },
        stats: {
          totalRecords:
            cleanedData.posts.length +
            cleanedData.comments.length +
            cleanedData.users.length,
          successCount:
            cleanedData.posts.length +
            cleanedData.comments.length +
            cleanedData.users.length,
          skippedCount: 0,
          processingTimeMs: processingTime,
        },
        createdAt: new Date().toISOString(),
      };

      await this.rabbitMQService.publishCleanedData(cleanedEvent);

      this.logger.info('原始数据处理完成', {
        rawDataId: event.rawDataId,
        posts: cleanedData.posts.length,
        comments: cleanedData.comments.length,
        users: cleanedData.users.length,
        processingTimeMs: processingTime,
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error('处理原始数据失败', {
        rawDataId: event.rawDataId,
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime,
      });

      await this.rawDataService.updateStatus(
        event.rawDataId,
        'failed',
        error.message,
      );
    }
  }
}
