import { Injectable, OnModuleInit, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import { RabbitMQClient } from '@pro/rabbitmq';
import { QUEUE_NAMES, type WeiboDetailCrawlEvent } from '@pro/types';
import {
  WeiboStatusService,
  WeiboRequestError,
  type SaveStatusDetailContext
} from '@pro/weibo';
import { RabbitMQConfig } from '../config/crawler.interface';

@Injectable()
export class WeiboDetailCrawlerConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WeiboDetailCrawlerConsumer.name);
  private rabbitMQClient: RabbitMQClient | null = null;

  constructor(
    private readonly weiboStatusService: WeiboStatusService,
    @Inject('RABBITMQ_CONFIG') private readonly rabbitmqConfig: RabbitMQConfig
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeConsumer();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.rabbitMQClient?.isConnected()) {
      await this.rabbitMQClient.close();
    }
  }

  private async initializeConsumer(): Promise<void> {
    const queueName = this.rabbitmqConfig.queues.detailQueue;
    const startTime = Date.now();

    try {
      this.logger.debug('初始化微博详情队列消费者', {
        queue: queueName,
        url: this.rabbitmqConfig.url.replace(/\/\/.*@/, '//***:***@')
      });

      this.rabbitMQClient = new RabbitMQClient({
        url: this.rabbitmqConfig.url,
        queue: queueName,
        maxRetries: this.rabbitmqConfig.options.maxRetries
      });

      await this.rabbitMQClient.connect();

      await this.rabbitMQClient.consume(queueName, async (event: WeiboDetailCrawlEvent) => {
        await this.handleMessage(event);
      });

      this.logger.log('微博详情队列消费者就绪', {
        queue: queueName,
        initTimeMs: Date.now() - startTime
      });
    } catch (error) {
      this.logger.error('初始化微博详情队列消费者失败', {
        queue: queueName,
        initTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : '未知错误'
      });
      throw error;
    }
  }

  private async handleMessage(event: WeiboDetailCrawlEvent): Promise<void> {
    if (!this.isValidEvent(event)) {
      this.logger.warn('接收到无效的微博详情爬取事件, 将忽略处理', {
        event,
        receivedAt: new Date().toISOString()
      });
      return;
    }

    const statusId = event.statusId.trim();
    const context = this.buildSaveContext(event);

    this.logger.log('开始处理微博详情爬取任务', {
      statusId,
      traceId: context.traceId,
      keyword: context.keyword,
      taskId: context.taskId,
      priority: event.priority,
      discoveredAt: event.discoveredAt
    });

    try {
      const detail = await this.weiboStatusService.fetchStatusDetail(statusId);
      const record = await this.weiboStatusService.saveStatusDetailToMongoDB(statusId, detail, context);

      if (record) {
        this.logger.log('微博详情已成功入库', {
          statusId,
          traceId: context.traceId,
          recordId: record.id,
          processedAt: record.processedAt ?? new Date(),
          keyword: context.keyword
        });
      } else {
        this.logger.debug('微博详情已存在于存储中, 跳过重复保存', {
          statusId,
          traceId: context.traceId,
          keyword: context.keyword
        });
      }
    } catch (error) {
      const requestError = error instanceof WeiboRequestError
        ? error
        : new WeiboRequestError(
            error instanceof Error ? error.message : '未知错误',
            undefined,
            error
          );

      if (this.shouldSkipRetry(requestError)) {
        this.logger.warn('终止微博详情爬取重试', {
          statusId,
          traceId: context.traceId,
          status: requestError.status,
          reason: requestError.message
        });
        return;
      }

      this.logger.error('微博详情爬取任务处理失败, 将交由重试机制处理', {
        statusId,
        traceId: context.traceId,
        status: requestError.status,
        error: requestError.message
      });

      throw requestError;
    }
  }

  private isValidEvent(event: WeiboDetailCrawlEvent): boolean {
    return typeof event.statusId === 'string' && /^\d{8,}$/.test(event.statusId.trim());
  }

  private buildSaveContext(event: WeiboDetailCrawlEvent): SaveStatusDetailContext {
    return {
      discoveredAt: event.discoveredAt,
      traceId: event.sourceContext?.traceId,
      keyword: event.sourceContext?.keyword,
      taskId: event.sourceContext?.taskId,
      sourceUrl: event.sourceContext?.discoveredAtUrl
    };
  }

  private shouldSkipRetry(error: WeiboRequestError): boolean {
    if (typeof error.status !== 'number') {
      return false;
    }

    return [400, 401, 403, 404, 410, 422].includes(error.status);
  }
}
