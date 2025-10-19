import { Injectable, OnModuleInit } from '@nestjs/common';
import { Logger } from '@pro/logger';
import { CacheService } from './cache.service';

export interface ProcessingMetrics {
  processed: number;
  duplicates: number;
  errors: number;
  lastProcessed: Date;
}

interface MessageRecord {
  id: string;
  processedAt: number;
  retryCount?: number;
  processingTimeMs?: number;
}

const DEDUPLICATION_WINDOW_HOURS = 24;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

@Injectable()
export class MessageIdempotencyService implements OnModuleInit {
  private readonly keyPrefix = 'msg:processed';
  private readonly batchKeyPrefix = 'msg:batch';
  private readonly metricsKey = 'msg:metrics';

  private metrics: ProcessingMetrics = {
    processed: 0,
    duplicates: 0,
    errors: 0,
    lastProcessed: new Date(),
  };

  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: Logger,
  ) {}

  async onModuleInit() {
    await this.initializeMetrics();
    this.logger.log('消息幂等性服务已启动', 'MessageIdempotencyService');
  }

  private createProcessedKey(messageId: string): string {
    return `${this.keyPrefix}:${messageId}`;
  }

  private createBatchKey(batchId: string): string {
    return `${this.batchKeyPrefix}:${batchId}`;
  }

  private async initializeMetrics(): Promise<void> {
    const existingMetrics = await this.cacheService.get<ProcessingMetrics>(this.metricsKey);
    if (existingMetrics) {
      this.metrics = existingMetrics;
    }
  }

  private async updateMetrics(type: keyof Omit<ProcessingMetrics, 'lastProcessed'>): Promise<void> {
    this.metrics[type]++;
    this.metrics.lastProcessed = new Date();

    await this.cacheService.set(this.metricsKey, this.metrics, 'daily');
  }

  async isDuplicate(messageId: string): Promise<boolean> {
    const key = this.createProcessedKey(messageId);
    const exists = await this.cacheService.exists(key);

    if (exists) {
      await this.updateMetrics('duplicates');
      this.logger.debug('检测到重复消息', { messageId });
      return true;
    }

    return false;
  }

  async markAsProcessed(messageId: string, processingTimeMs?: number): Promise<void> {
    const key = this.createProcessedKey(messageId);
    const record: MessageRecord = {
      id: messageId,
      processedAt: Date.now(),
      processingTimeMs,
    };

    const ttlSeconds = DEDUPLICATION_WINDOW_HOURS * 3600;
    await this.cacheService.set(key, record, 'daily');

    await this.updateMetrics('processed');

    this.logger.debug('消息已标记为已处理', {
      messageId,
      processingTimeMs,
      ttl: `${DEDUPLICATION_WINDOW_HOURS}h`
    });
  }

  async processWithIdempotency<T>(
    messageId: string,
    processor: () => Promise<T>,
    context?: string,
  ): Promise<{ result: T | null; wasProcessed: boolean; error?: Error }> {
    const startTime = Date.now();

    try {
      if (await this.isDuplicate(messageId)) {
        return { result: null, wasProcessed: false };
      }

      const result = await this.retryableProcess(processor, messageId);
      const processingTime = Date.now() - startTime;

      await this.markAsProcessed(messageId, processingTime);

      this.logger.debug('消息处理成功', {
        messageId,
        context,
        processingTimeMs: processingTime,
      });

      return { result, wasProcessed: true };
    } catch (error) {
      await this.updateMetrics('errors');

      this.logger.error('消息处理失败', {
        messageId,
        context,
        error: error.message,
        processingTimeMs: Date.now() - startTime,
      });

      return { result: null, wasProcessed: false, error };
    }
  }

  private async retryableProcess<T>(
    processor: () => Promise<T>,
    messageId: string,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        return await processor();
      } catch (error) {
        lastError = error;

        this.logger.warn(`消息处理尝试 ${attempt} 失败`, {
          messageId,
          attempt,
          maxAttempts: MAX_RETRY_ATTEMPTS,
          error: error.message,
        });

        if (attempt < MAX_RETRY_ATTEMPTS) {
          await this.delay(RETRY_DELAY_MS * attempt);
        }
      }
    }

    throw lastError;
  }

  async processBatch<T>(
    messages: Array<{ id: string; data: T }>,
    processor: (data: T) => Promise<any>,
    batchId?: string,
  ): Promise<{
    processed: number;
    duplicates: number;
    errors: number;
    results: Array<{ id: string; success: boolean; error?: string }>;
  }> {
    const actualBatchId = batchId || `batch_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const batchKey = this.createBatchKey(actualBatchId);

    this.logger.log('开始批量处理消息', {
      batchId: actualBatchId,
      messageCount: messages.length,
    });

    const results = await Promise.allSettled(
      messages.map(async ({ id, data }) => {
        const { wasProcessed, error } = await this.processWithIdempotency(
          id,
          () => processor(data),
          `batch:${actualBatchId}`,
        );

        return { id, success: wasProcessed, error: error?.message };
      }),
    );

    const summary = results.reduce(
      (acc, result, index) => {
        const value = result.status === 'fulfilled' ? result.value : { id: messages[index].id, success: false, error: 'Promise rejected' };

        acc.results.push(value);

        if (value.success) {
          acc.processed++;
        } else if (value.error) {
          acc.errors++;
        } else {
          acc.duplicates++;
        }

        return acc;
      },
      { processed: 0, duplicates: 0, errors: 0, results: [] as Array<{ id: string; success: boolean; error?: string }> },
    );

    await this.cacheService.set(batchKey, {
      batchId: actualBatchId,
      summary,
      processedAt: Date.now(),
    }, 'hourly');

    this.logger.log('批量处理完成', {
      batchId: actualBatchId,
      ...summary,
    });

    return summary;
  }

  async getBatchStatus(batchId: string): Promise<any> {
    const key = this.createBatchKey(batchId);
    return await this.cacheService.get(key);
  }

  async cleanupExpiredRecords(): Promise<number> {
    const pattern = `${this.keyPrefix}:*`;
    const cleaned = await this.cacheService.invalidate(pattern);

    if (cleaned > 0) {
      this.logger.log('清理过期的消息记录', { cleaned });
    }

    return cleaned;
  }

  getMetrics(): ProcessingMetrics & {
    successRate: number;
    duplicateRate: number;
    errorRate: number;
  } {
    const total = this.metrics.processed + this.metrics.duplicates + this.metrics.errors;

    return {
      ...this.metrics,
      successRate: total > 0 ? Math.round((this.metrics.processed / total) * 100) : 0,
      duplicateRate: total > 0 ? Math.round((this.metrics.duplicates / total) * 100) : 0,
      errorRate: total > 0 ? Math.round((this.metrics.errors / total) * 100) : 0,
    };
  }

  resetMetrics(): void {
    this.metrics = {
      processed: 0,
      duplicates: 0,
      errors: 0,
      lastProcessed: new Date(),
    };

    this.cacheService.invalidateKey(this.metricsKey);
    this.logger.log('消息处理指标已重置', 'MessageIdempotencyService');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}