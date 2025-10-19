import type { QueueName } from '@pro/types';
import type { ConnectionPool } from './connection-pool.js';
import type { PublishOptions, BatchPublishResult } from './types.js';

/**
 * RabbitMQ 发布服务
 *
 * 优雅即简约:
 * - 类型安全的消息发布
 * - 自动序列化
 * - 批量发布优化
 * - 统一错误处理
 *
 * 性能即艺术:
 * - 连接复用
 * - 批量发布减少网络往返
 * - 消息确认机制
 */
export class RabbitMQPublisher {
  constructor(private readonly connectionPool: ConnectionPool) {}

  async publish<T>(
    queueName: QueueName,
    event: T,
    options?: PublishOptions,
  ): Promise<boolean> {
    const channel = this.connectionPool.getChannel();

    await this.ensureQueue(queueName);

    const messageBuffer = Buffer.from(JSON.stringify(event));
    const messageOptions = this.buildMessageOptions(options);

    try {
      const result = channel.sendToQueue(
        queueName,
        messageBuffer,
        messageOptions,
      );

      return result;
    } catch (error) {
      throw this.createPublishError(queueName, error as Error);
    }
  }

  async publishBatch<T>(
    queueName: QueueName,
    events: T[],
    options?: PublishOptions,
  ): Promise<BatchPublishResult> {
    const startTime = Date.now();
    const channel = this.connectionPool.getChannel();

    await this.ensureQueue(queueName);

    const messageOptions = this.buildMessageOptions(options);
    let successCount = 0;
    let failureCount = 0;
    const failedIndices: number[] = [];

    for (let i = 0; i < events.length; i++) {
      try {
        const messageBuffer = Buffer.from(JSON.stringify(events[i]));
        const result = channel.sendToQueue(
          queueName,
          messageBuffer,
          messageOptions,
        );

        if (result) {
          successCount++;
        } else {
          failureCount++;
          failedIndices.push(i);
        }
      } catch (error) {
        failureCount++;
        failedIndices.push(i);
      }
    }

    return {
      successCount,
      failureCount,
      failedIndices,
      totalTimeMs: Date.now() - startTime,
    };
  }

  private async ensureQueue(queueName: QueueName): Promise<void> {
    const channel = this.connectionPool.getChannel();

    await channel.assertQueue(queueName, {
      durable: true,
    });
  }

  private buildMessageOptions(
    options?: PublishOptions,
  ): Record<string, any> {
    return {
      persistent: options?.persistent ?? true,
      priority: options?.priority,
      expiration: options?.expiration?.toString(),
      messageId: options?.messageId,
      correlationId: options?.correlationId,
      timestamp: Date.now(),
    };
  }

  private createPublishError(queueName: QueueName, error: Error): Error {
    const publishError = new Error(
      `Failed to publish message to queue ${queueName}: ${error.message}`,
    );
    publishError.cause = error;
    return publishError;
  }
}
