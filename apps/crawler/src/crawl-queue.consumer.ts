import { Injectable, OnModuleInit, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import { RabbitMQClient } from '@pro/rabbitmq';
import { CrawlerServiceV2 } from './services/crawler-v2.service';
import { RabbitConfig } from './config/crawler.config';
import { SubTaskMessage } from './types';

@Injectable()
export class CrawlQueueConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CrawlQueueConsumer.name);
  private client: RabbitMQClient | null = null;

  constructor(
    private readonly crawlerService: CrawlerServiceV2,
    @Inject('RABBIT_CONFIG') private readonly config: RabbitConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    const queue = this.config.queues.crawl;
    this.client = new RabbitMQClient({ url: this.config.url, queue });
    await this.client.connect();
    await this.client.consume(queue, (message: SubTaskMessage) => this.process(message));
    this.logger.log(`Crawler queue ready: ${queue}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isConnected()) {
      await this.client.close();
    }
  }

  private async process(message: SubTaskMessage): Promise<void> {
    if (typeof message?.taskId !== 'number') {
      this.logger.warn('忽略缺少 taskId 的消息');
      return;
    }

    const startedAt = Date.now();

    try {
      const result = await this.crawlerService.execute(message);

      if (!result.success) {
        throw new Error(result.error ?? '任务执行失败');
      }

      this.logger.log(`任务完成: ${message.taskId}`, {
        durationMs: Date.now() - startedAt,
        pageCount: result.pageCount,
        notes: result.notes,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`任务失败: ${message.taskId}`, { error: detail });
      throw error;
    }
  }
}
