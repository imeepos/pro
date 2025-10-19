import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Logger } from '@pro/logger';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { HourlyAggregatorService } from '../services/hourly-aggregator.service';
import { MessageIdempotencyService } from '../services/message-idempotency.service';

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

export interface ProcessingStatistics {
  totalReceived: number;
  successfullyProcessed: number;
  duplicatesSkipped: number;
  errorsEncountered: number;
  lastProcessedAt: Date;
  processingTimeStats: {
    min: number;
    max: number;
    avg: number;
  };
}

@Injectable()
export class AnalysisResultConsumer implements OnModuleInit, OnModuleDestroy {
  private isShuttingDown = false;
  private statistics: ProcessingStatistics = {
    totalReceived: 0,
    successfullyProcessed: 0,
    duplicatesSkipped: 0,
    errorsEncountered: 0,
    lastProcessedAt: new Date(),
    processingTimeStats: { min: Infinity, max: 0, avg: 0 },
  };
  private processingTimes: number[] = [];

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly hourlyAggregator: HourlyAggregatorService,
    private readonly messageIdempotency: MessageIdempotencyService,
    private readonly logger: Logger,
  ) {}

  async onModuleInit() {
    const client = this.rabbitMQService.getClient();
    const queue = 'analysis_result_queue';

    await client.consume(queue, async (message: AnalysisResultEvent) => {
      if (this.isShuttingDown) {
        this.logger.warn('服务关闭中，拒绝新消息', { messageId: message.id });
        return;
      }
      await this.processAnalysisResult(message);
    });

    this.logger.log('分析结果消费者已优雅启动', 'AnalysisResultConsumer');
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    this.logFinalStatistics();
    this.logger.log('分析结果消费者已优雅关闭', 'AnalysisResultConsumer');
  }

  private async processAnalysisResult(event: AnalysisResultEvent): Promise<void> {
    const startTime = Date.now();
    this.statistics.totalReceived++;

    const { result, wasProcessed, error } = await this.messageIdempotency.processWithIdempotency(
      event.id,
      () => this.aggregateAnalysisData(event),
      'AnalysisResultConsumer',
    );

    const processingTime = Date.now() - startTime;
    this.updateProcessingStatistics(processingTime, wasProcessed, error);

    if (error) {
      this.statistics.errorsEncountered++;
      this.logger.error('分析结果处理遭遇困难', {
        messageId: event.id,
        keyword: event.keyword,
        error: error.message,
        processingTimeMs: processingTime,
      });
      return;
    }

    if (!wasProcessed) {
      this.statistics.duplicatesSkipped++;
      this.logger.debug('优雅跳过重复消息', {
        messageId: event.id,
        keyword: event.keyword,
      });
      return;
    }

    this.statistics.successfullyProcessed++;
    this.statistics.lastProcessedAt = new Date();

    this.logger.debug('分析结果已优雅聚合', {
      messageId: event.id,
      keyword: event.keyword,
      sentiment: event.sentiment.label,
      processingTimeMs: processingTime,
    });
  }

  private async aggregateAnalysisData(event: AnalysisResultEvent): Promise<void> {
    await this.hourlyAggregator.updateHourlyStats({
      keyword: event.keyword,
      timestamp: new Date(event.timestamp),
      postCount: 1,
      commentCount: event.commentCount || 0,
      sentiment: event.sentiment,
      keywords: event.keywords,
    });
  }

  private updateProcessingStatistics(processingTime: number, wasProcessed: boolean, error?: Error): void {
    if (wasProcessed && !error) {
      this.processingTimes.push(processingTime);

      if (this.processingTimes.length > 1000) {
        this.processingTimes = this.processingTimes.slice(-500);
      }

      const stats = this.statistics.processingTimeStats;
      stats.min = Math.min(stats.min, processingTime);
      stats.max = Math.max(stats.max, processingTime);
      stats.avg = this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
    }
  }

  getStatistics(): ProcessingStatistics & {
    successRate: number;
    duplicateRate: number;
    errorRate: number;
    averageProcessingTime: number;
  } {
    const total = this.statistics.totalReceived;

    return {
      ...this.statistics,
      successRate: total > 0 ? Math.round((this.statistics.successfullyProcessed / total) * 100) : 0,
      duplicateRate: total > 0 ? Math.round((this.statistics.duplicatesSkipped / total) * 100) : 0,
      errorRate: total > 0 ? Math.round((this.statistics.errorsEncountered / total) * 100) : 0,
      averageProcessingTime: this.statistics.processingTimeStats.avg || 0,
    };
  }

  private logFinalStatistics(): void {
    const stats = this.getStatistics();

    this.logger.log('消费者生命周期统计', {
      totalReceived: stats.totalReceived,
      successfullyProcessed: stats.successfullyProcessed,
      duplicatesSkipped: stats.duplicatesSkipped,
      errorsEncountered: stats.errorsEncountered,
      successRate: `${stats.successRate}%`,
      duplicateRate: `${stats.duplicateRate}%`,
      errorRate: `${stats.errorRate}%`,
      avgProcessingTime: `${Math.round(stats.averageProcessingTime)}ms`,
      minProcessingTime: `${Math.round(stats.processingTimeStats.min)}ms`,
      maxProcessingTime: `${Math.round(stats.processingTimeStats.max)}ms`,
    });
  }
}
