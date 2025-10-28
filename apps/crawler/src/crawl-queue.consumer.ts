import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { RabbitMQClient, RabbitMQService } from '@pro/rabbitmq';
import { SubTaskMessage } from './types';
import { runWeiBoKeywordSearchWorkflow } from '@pro/workflow-nestjs';
import { root } from '@pro/core';

@Injectable()
export class CrawlQueueConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CrawlQueueConsumer.name);
  private client: RabbitMQClient | null = null;

  constructor() { }

  async onModuleInit(): Promise<void> {
    const rs = root.get(RabbitMQService)
    await rs.onModuleInit()
    console.log(`consume weibo_crawl_queue`)
    rs.consume(`weibo_crawl_queue`, (message: SubTaskMessage, metadata) => {
      return this.process(message)
    }, {
      messageTTL: 30 * 60 * 1000, // 30分钟TTL，匹配broker配置
    })
  }

  async onModuleDestroy(): Promise<void> {
    const rs = root.get(RabbitMQService)
    await rs.ngOnDestroy()
  }

  private async process(message: SubTaskMessage): Promise<void> {
    this.logger.log(`收到消息`, message)
    if (!message?.keyword || !message?.start) {
      this.logger.warn('忽略缺少必需字段的消息', { keyword: message?.keyword, start: message?.start });
      return;
    }

    const startedAt = Date.now();
    const keyword = message.keyword;
    const startDate = typeof message.start === 'string' ? new Date(message.start) : message.start;

    try {
      const state = await runWeiBoKeywordSearchWorkflow(keyword, startDate);

      if (state.status === 'fail') {
        throw new Error(state.errorMessage || 'Workflow 执行失败');
      }

      this.logger.log(`Workflow 执行完成: ${keyword}`, {
        durationMs: Date.now() - startedAt,
        executionId: state.executionId,
        status: state.status,
        progress: state.progress,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`Workflow 执行失败: ${keyword}`, { error: detail });
      throw error;
    }
  }
}
