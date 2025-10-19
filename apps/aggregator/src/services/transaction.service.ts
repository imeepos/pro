import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { Logger } from '@pro/logger';
import { ConfigurationService } from '@pro/configuration';
import { ErrorHandlerService } from '@pro/error-handling';
import { TransactionMetricsService, TransactionMetric } from './transaction-metrics.service';

export type TransactionContext = EntityManager;

export interface TransactionMetrics {
  operations: number;
  successCount: number;
  failureCount: number;
  totalDuration: number;
  deadlockRetries: number;
}

export interface TransactionOptions {
  retryOnDeadlock?: boolean;
  maxRetries?: number;
  retryDelayBase?: number;
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  description?: string;
  batchSize?: number;
}

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  duration: number;
}

@Injectable()
export class TransactionService {
  private metrics: TransactionMetrics = {
    operations: 0,
    successCount: 0,
    failureCount: 0,
    totalDuration: 0,
    deadlockRetries: 0,
  };

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configuration: ConfigurationService,
    private readonly errorHandler: ErrorHandlerService,
    private readonly logger: Logger,
    @Inject(forwardRef(() => TransactionMetricsService))
    private readonly metricsService?: TransactionMetricsService,
  ) {}

  async executeInTransaction<T>(
    operation: (context: TransactionContext) => Promise<T>,
    options: TransactionOptions = {},
  ): Promise<TransactionResult<T>> {
    const {
      retryOnDeadlock = true,
      maxRetries = 3,
      retryDelayBase = 100,
      isolationLevel = 'READ COMMITTED',
    } = options;

    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error;

    this.metrics.operations++;

    while (attempts <= maxRetries) {
      attempts++;
      const queryRunner = this.dataSource.createQueryRunner();

      try {
        await queryRunner.connect();
        await queryRunner.startTransaction(isolationLevel);

        const context: TransactionContext = queryRunner.manager;
        const result = await operation(context);

        await queryRunner.commitTransaction();

        const duration = Date.now() - startTime;
        this.recordSuccess(duration, attempts);

        this.recordMetric({
          operation: operation.name || 'anonymous',
          duration,
          attempts,
          success: true,
          timestamp: new Date(),
          isolationLevel,
        });

        return {
          success: true,
          data: result,
          attempts,
          duration,
        };
      } catch (error) {
        await this.safeRollback(queryRunner);
        lastError = error;

        if (this.isDeadlockError(error) && retryOnDeadlock && attempts <= maxRetries) {
          this.metrics.deadlockRetries++;
          const delay = this.calculateRetryDelay(attempts, retryDelayBase);

          this.logger.warn('事务死锁，准备重试', {
            attempt: attempts,
            maxRetries,
            delay,
            error: error.message,
          });

          await this.sleep(delay);
          continue;
        }

        const duration = Date.now() - startTime;
        this.recordFailure(duration, attempts, error);

        return {
          success: false,
          error: lastError,
          attempts,
          duration,
        };
      } finally {
        await this.safeRelease(queryRunner);
      }
    }

    const duration = Date.now() - startTime;
    this.recordFailure(duration, attempts, lastError);

    this.recordMetric({
      operation: operation.name || 'anonymous',
      duration,
      attempts,
      success: false,
      timestamp: new Date(),
      isolationLevel,
      error: lastError?.message,
    });

    return {
      success: false,
      error: lastError,
      attempts,
      duration,
    };
  }

  async executeBatch<T>(
    items: T[],
    operation: (item: T, context: TransactionContext) => Promise<void>,
    batchSize: number = 100,
    options: TransactionOptions = {},
  ): Promise<{ processed: number; errors: Array<{ item: T; error: Error }> }> {
    let processed = 0;
    const errors: Array<{ item: T; error: Error }> = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const result = await this.executeInTransaction(
        async (context) => {
          for (const item of batch) {
            await operation(item, context);
          }
        },
        options,
      );

      if (result.success) {
        processed += batch.length;
        this.logger.debug('批量操作成功', {
          batchIndex: Math.floor(i / batchSize),
          itemsProcessed: batch.length,
          totalProcessed: processed,
        });
      } else {
        batch.forEach(item => errors.push({ item, error: result.error }));
        this.logger.warn('批量操作失败', {
          batchIndex: Math.floor(i / batchSize),
          itemsInBatch: batch.length,
          error: result.error?.message,
        });
      }
    }

    this.logger.log('批量事务操作完成', {
      totalItems: items.length,
      processed,
      failed: errors.length,
      batchSize,
    });

    return { processed, errors };
  }

  getMetrics(): TransactionMetrics & {
    successRate: number;
    avgDuration: number;
    deadlockRate: number;
  } {
    const { operations, successCount, totalDuration, deadlockRetries } = this.metrics;

    return {
      ...this.metrics,
      successRate: operations > 0 ? Math.round((successCount / operations) * 100) : 0,
      avgDuration: operations > 0 ? Math.round(totalDuration / operations) : 0,
      deadlockRate: operations > 0 ? Math.round((deadlockRetries / operations) * 100) : 0,
    };
  }

  resetMetrics(): void {
    this.metrics = {
      operations: 0,
      successCount: 0,
      failureCount: 0,
      totalDuration: 0,
      deadlockRetries: 0,
    };
    this.logger.log('事务指标已重置', 'TransactionService');
  }

  private async safeRollback(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.rollbackTransaction();
    } catch (rollbackError) {
      this.logger.error('事务回滚失败', rollbackError, 'TransactionService');
    }
  }

  private async safeRelease(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.release();
    } catch (releaseError) {
      this.logger.error('连接释放失败', releaseError, 'TransactionService');
    }
  }

  private isDeadlockError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('deadlock') ||
           message.includes('lock wait timeout') ||
           message.includes('could not serialize access');
  }

  private calculateRetryDelay(attempt: number, baseDelay: number): number {
    const jitter = Math.random() * 0.1;
    return Math.floor(baseDelay * Math.pow(2, attempt - 1) * (1 + jitter));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordSuccess(duration: number, attempts: number): void {
    this.metrics.successCount++;
    this.metrics.totalDuration += duration;

    this.logger.debug('事务成功完成', {
      attempts,
      duration,
      successRate: this.getMetrics().successRate,
    });
  }

  private recordFailure(duration: number, attempts: number, error: Error): void {
    this.metrics.failureCount++;
    this.metrics.totalDuration += duration;

    this.logger.error('事务执行失败', {
      attempts,
      duration,
      error: error.message,
      successRate: this.getMetrics().successRate,
    });
  }

  private recordMetric(metric: TransactionMetric): void {
    if (this.metricsService) {
      this.metricsService.recordTransaction(metric);
    }
  }
}