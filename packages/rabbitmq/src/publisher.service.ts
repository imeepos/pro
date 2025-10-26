import type { QueueName } from '@pro/types';
import type { ConnectionPool } from './connection-pool.js';
import type { PublishOptions, BatchPublishResult, RabbitMQConfig, QueueOptions } from './types.js';

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
  constructor(
    private readonly connectionPool: ConnectionPool,
    private readonly config?: RabbitMQConfig,
  ) {}

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
    const queueOptions = this.getQueueOptions(queueName);

    const assertOptions: any = {
      durable: queueOptions.durable ?? true,
    };

    // 构建队列参数
    const args: any = {};

    if (queueOptions.messageTTL !== undefined) {
      args['x-message-ttl'] = queueOptions.messageTTL;
    }

    if (queueOptions.deadLetterExchange) {
      args['x-dead-letter-exchange'] = queueOptions.deadLetterExchange;
    }

    if (queueOptions.deadLetterRoutingKey) {
      args['x-dead-letter-routing-key'] = queueOptions.deadLetterRoutingKey;
    }

    if (queueOptions.maxLength) {
      args['x-max-length'] = queueOptions.maxLength;
    }

    if (queueOptions.queueMode) {
      args['x-queue-mode'] = queueOptions.queueMode;
    }

    if (Object.keys(args).length > 0) {
      assertOptions.arguments = args;
    }

    await channel.assertQueue(queueName, assertOptions);
  }

  private getQueueOptions(queueName: QueueName): QueueOptions {
    // 优先使用队列特定配置
    const specificOptions = this.config?.queueOptions?.[queueName];
    if (specificOptions) {
      return specificOptions;
    }

    // 回退到默认 TTL（兼容旧配置）
    if (this.config?.messageTTL) {
      return { messageTTL: this.config.messageTTL };
    }

    return {};
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
