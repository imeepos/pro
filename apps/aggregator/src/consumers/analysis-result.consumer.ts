import { Injectable, OnModuleInit } from '@nestjs/common';
import { Logger } from '@pro/logger';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { HourlyAggregatorService } from '../services/hourly-aggregator.service';

export interface AnalysisResultEvent {
  id: string;
  keyword: string;
  postId: string;
  content: string;
  sentiment: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
  };
  keywords: string[];
  timestamp: Date;
  commentCount?: number;
}

@Injectable()
export class AnalysisResultConsumer implements OnModuleInit {
  private readonly processedIds = new Set<string>();

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly hourlyAggregator: HourlyAggregatorService,
    private readonly logger: Logger,
  ) {}

  async onModuleInit() {
    const client = this.rabbitMQService.getClient();
    const queue = 'analysis_result_queue';

    await client.consume(queue, async (message: AnalysisResultEvent) => {
      await this.handleAnalysisResult(message);
    });

    this.logger.log('分析结果消费者已启动', 'AnalysisResultConsumer');
  }

  private async handleAnalysisResult(event: AnalysisResultEvent): Promise<void> {
    if (this.processedIds.has(event.id)) {
      this.logger.warn('跳过重复消息', { id: event.id });
      return;
    }

    try {
      await this.hourlyAggregator.updateHourlyStats({
        keyword: event.keyword,
        timestamp: new Date(event.timestamp),
        postCount: 1,
        commentCount: event.commentCount || 0,
        sentiment: event.sentiment,
        keywords: event.keywords,
      });

      this.processedIds.add(event.id);

      if (this.processedIds.size > 10000) {
        const toRemove = Array.from(this.processedIds).slice(0, 5000);
        toRemove.forEach((id) => this.processedIds.delete(id));
      }

      this.logger.debug('分析结果已聚合', {
        id: event.id,
        keyword: event.keyword,
        sentiment: event.sentiment.label,
      });
    } catch (error) {
      this.logger.error('处理分析结果失败', { id: event.id, error });
      throw error;
    }
  }
}
