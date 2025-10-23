import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { RawDataService } from '../services/raw-data.service';
import {
  RawDataReadyEvent,
  CleanedDataEvent,
} from '@pro/types';
import { CleanerService } from '../services/cleaner.service';
import { fromRawDataEvent } from '../tasks/clean-task-message';
import { serializeError } from '../utils/serialize-error';
import { narrate } from '../utils/logging';

@Injectable()
export class RawDataConsumer implements OnModuleInit {
  private readonly logger = new Logger(RawDataConsumer.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly rawDataService: RawDataService,
    private readonly cleanerService: CleanerService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log(narrate('启动原始数据消费者'));

    try {
      this.logger.debug(narrate('等待 RabbitMQ 渠道就绪'));
      await this.rabbitMQService.waitForConnection();
    } catch (error) {
      this.logger.error(
        narrate('原始数据消费者初始化失败, RabbitMQ 渠道未就绪', {
          error: serializeError(error),
        }),
      );
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
      this.logger.error(
        narrate('原始数据消费者启动失败', {
          queue,
          error: serializeError(error),
        }),
      );
      throw error;
    }

    this.logger.log(narrate('原始数据消费者已启动'));
  }

  private async processRawData(event: RawDataReadyEvent): Promise<void> {
    const startTime = Date.now();
    const messageContext = this.buildMessageContext(event);

    this.logger.log(
      narrate('开始处理原始数据', {
        ...messageContext,
        createdAt: event.createdAt,
        metadata: event.metadata ?? {},
      }),
    );

    try {
      const rawData = await this.rawDataService.getRawDataById(
        event.rawDataId,
      );

      if (!rawData) {
        this.logger.error(
          narrate('原始数据不存在', {
            ...messageContext,
          }),
        );
        return;
      }

      if (rawData.status === 'processed') {
        this.logger.warn(
          narrate('原始数据已处理过,跳过', {
            ...messageContext,
            currentStatus: rawData.status,
          }),
        );
        return;
      }

      this.logger.debug(
        narrate('转换原始事件为清洗任务消息', {
          ...messageContext,
          stage: 'fromRawDataEvent',
        }),
      );
      const message = fromRawDataEvent(event);

      this.logger.debug(
        narrate('触发清洗任务执行', {
          ...messageContext,
          stage: 'execute',
        }),
      );
      const cleanedData = await this.cleanerService.execute(message);

      this.logger.debug(
        narrate('更新原始数据状态', {
          ...messageContext,
          stage: 'updateStatus',
          nextStatus: 'processed',
        }),
      );
      await this.rawDataService.updateStatus(event.rawDataId, 'processed');

      const processingTime = Date.now() - startTime;

      const cleanedEvent: CleanedDataEvent = {
        rawDataId: event.rawDataId,
        sourceType: event.sourceType,
        extractedEntities: {
          postIds: cleanedData.postIds,
          commentIds: cleanedData.commentIds,
          userIds: cleanedData.userIds,
        },
        stats: {
          totalRecords:
            cleanedData.postIds.length +
            cleanedData.commentIds.length +
            cleanedData.userIds.length,
          successCount:
            cleanedData.postIds.length +
            cleanedData.commentIds.length +
            cleanedData.userIds.length,
          skippedCount: 0,
          processingTimeMs: processingTime,
        },
        createdAt: new Date().toISOString(),
      };

      this.logger.debug(
        narrate('发布清洗完成事件', {
          ...messageContext,
          stage: 'publishCleanedData',
          processingTimeMs: processingTime,
        }),
      );
      await this.rabbitMQService.publishCleanedData(cleanedEvent);

      this.logger.log(
        narrate('原始数据处理完成', {
          ...messageContext,
          posts: cleanedData.postIds.length,
          comments: cleanedData.commentIds.length,
          users: cleanedData.userIds.length,
          processingTimeMs: processingTime,
        }),
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(
        narrate('处理原始数据失败', {
          ...messageContext,
          error: serializeError(error),
          processingTimeMs: processingTime,
        }),
      );

      this.logger.debug(
        narrate('更新原始数据状态', {
          ...messageContext,
          stage: 'updateStatus',
          nextStatus: 'failed',
        }),
      );
      await this.rawDataService.updateStatus(
        event.rawDataId,
        'failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private buildMessageContext(event: RawDataReadyEvent): Record<string, unknown> {
    const metadata = (event.metadata ?? {}) as RawDataReadyEvent['metadata'] &
      Record<string, unknown>;

    const retryCount =
      typeof metadata.retryCount === 'number'
        ? metadata.retryCount
        : typeof metadata.attempt === 'number'
        ? metadata.attempt
        : 0;

    const context: Record<string, unknown> = {
      rawDataId: event.rawDataId,
      sourceType: event.sourceType,
      sourcePlatform: event.sourcePlatform,
      sourceUrl: event.sourceUrl,
      contentHash: event.contentHash,
      messageId:
        typeof metadata.messageId === 'string' &&
        metadata.messageId.trim().length > 0
          ? metadata.messageId
          : event.rawDataId,
      retryCount,
    };

    const correlationCandidate =
      typeof metadata.correlationId === 'string'
        ? metadata.correlationId
        : metadata.taskId !== undefined
        ? String(metadata.taskId)
        : undefined;

    if (correlationCandidate) {
      context.correlationId = correlationCandidate;
    }

    return context;
  }
}
