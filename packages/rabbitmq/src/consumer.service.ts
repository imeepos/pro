import type * as amqp from 'amqplib';
import type { QueueName } from '@pro/types';
import type { ConnectionPool } from './connection-pool.js';
import type {
  ConsumerOptions,
  MessageMetadata,
  RetryStrategy,
} from './types.js';
import { NoRetryError } from '@pro/workflow-core';

/**
 * 消息处理函数类型
 */
export type MessageHandler<T> = (
  message: T,
  metadata: MessageMetadata,
) => Promise<void>;

/**
 * 订阅信息
 */
interface Subscription<T = any> {
  handler: MessageHandler<T>;
  options?: ConsumerOptions;
}

/**
 * RabbitMQ 消费者服务
 *
 * 错误处理如为人处世的哲学:
 * - 优雅的重试机制
 * - 自动 ACK/NACK 管理
 * - 死信队列支持
 * - 详细的错误上下文
 * - 连接恢复时自动重新订阅
 */
export class RabbitMQConsumer {
  private defaultRetryStrategy: RetryStrategy = {
    maxRetries: 3,
    backoffMs: 1000,
    maxBackoffMs: 30000,
  };

  private subscriptions = new Map<QueueName, Subscription>();

  constructor(private readonly connectionPool: ConnectionPool) {
    this.setupConnectionRecovery();
  }

  async consume<T>(
    queueName: QueueName,
    handler: MessageHandler<T>,
    options?: ConsumerOptions,
  ): Promise<void> {
    this.subscriptions.set(queueName, { handler, options });

    await this.subscribeToQueue(queueName, handler, options);
  }

  private async subscribeToQueue<T>(
    queueName: QueueName,
    handler: MessageHandler<T>,
    options?: ConsumerOptions,
  ): Promise<void> {
    const channel = this.connectionPool.getChannel();
    const retryStrategy = options?.retryStrategy ?? this.defaultRetryStrategy;

    await this.setupQueue(queueName, options);

    await channel.prefetch(options?.prefetchCount ?? 1);

    await channel.consume(
      queueName,
      async (msg: amqp.ConsumeMessage | null) => {
        if (!msg) return;

        await this.handleMessage(
          msg,
          handler,
          queueName,
          retryStrategy,
          options?.noAck ?? false,
        );
      },
      {
        noAck: options?.noAck ?? false,
        consumerTag: options?.consumerTag,
      },
    );
  }

  private async handleMessage<T>(
    msg: amqp.ConsumeMessage,
    handler: MessageHandler<T>,
    queueName: QueueName,
    retryStrategy: RetryStrategy,
    noAck: boolean,
  ): Promise<void> {
    const channel = this.connectionPool.getChannel();

    try {
      const content = this.deserializeMessage<T>(msg);
      const metadata = this.extractMetadata(msg);

      await handler(content, metadata);

      if (!noAck) {
        if (!this.connectionPool.isConnected()) {
          console.warn(
            `[RabbitMQ] Connection lost during message processing for queue ${queueName}, message will be redelivered after reconnection`,
          );
          return;
        }
        channel.ack(msg);
      }
    } catch (error) {
      await this.handleError(
        msg,
        error as Error,
        queueName,
        retryStrategy,
        noAck,
      );
    }
  }

  private async handleError(
    msg: amqp.ConsumeMessage,
    error: Error,
    queueName: QueueName,
    retryStrategy: RetryStrategy,
    noAck: boolean,
  ): Promise<void> {
    if (noAck) {
      return;
    }

    if (!this.connectionPool.isConnected()) {
      console.warn(
        `[RabbitMQ] Connection lost during error handling for queue ${queueName}, message will be redelivered after reconnection`,
      );
      return;
    }

    const channel = this.connectionPool.getChannel();

    // 如果是 NoRetryError，直接 nack 发送到死信队列，不重试
    if (error instanceof NoRetryError) {
      channel.nack(msg, false, false);
      return;
    }

    const retryCount = this.getRetryCount(msg);

    if (retryCount >= retryStrategy.maxRetries) {
      channel.nack(msg, false, false);
      return;
    }

    this.incrementRetryCount(msg);
    channel.nack(msg, false, true);
  }

  private deserializeMessage<T>(msg: amqp.ConsumeMessage): T {
    try {
      return JSON.parse(msg.content.toString());
    } catch (error) {
      throw new Error(
        `Failed to deserialize message: ${(error as Error).message}`,
      );
    }
  }

  private extractMetadata(msg: amqp.ConsumeMessage): MessageMetadata {
    return {
      messageId: msg.properties.messageId,
      correlationId: msg.properties.correlationId,
      timestamp: msg.properties.timestamp,
      retryCount: this.getRetryCount(msg),
      properties: msg.properties,
    };
  }

  private getRetryCount(msg: amqp.ConsumeMessage): number {
    const headers = msg.properties.headers ?? {};
    return headers['x-retry-count'] ?? 0;
  }

  private incrementRetryCount(msg: amqp.ConsumeMessage): void {
    const headers = msg.properties.headers ?? {};
    headers['x-retry-count'] = (headers['x-retry-count'] ?? 0) + 1;
  }

  private async setupQueue(
    queueName: QueueName,
    options?: ConsumerOptions,
  ): Promise<void> {
    const channel = this.connectionPool.getChannel();

    // 构建队列参数
    const queueArgs: Record<string, any> = {};

    // 只在显式指定 DLX 时才配置死信队列
    if (options?.deadLetterExchange) {
      const dlxExchange = options.deadLetterExchange;
      const dlqQueue = `${queueName}.dlq`;

      await channel.assertExchange(dlxExchange, 'direct', { durable: true });
      await channel.assertQueue(dlqQueue, { durable: true });
      await channel.bindQueue(dlqQueue, dlxExchange, queueName);

      queueArgs['x-dead-letter-exchange'] = dlxExchange;
      queueArgs['x-dead-letter-routing-key'] = queueName;
    }

    if (options?.messageTTL) {
      queueArgs['x-message-ttl'] = options.messageTTL;
    }

    await channel.assertQueue(queueName, {
      durable: true,
      arguments: Object.keys(queueArgs).length > 0 ? queueArgs : undefined,
    });
  }

  private setupConnectionRecovery(): void {
    this.connectionPool.on('connected', async () => {
      if (this.subscriptions.size === 0) {
        return;
      }

      console.log(
        `[RabbitMQ] Connection recovered, resubscribing to ${this.subscriptions.size} queue(s)`,
      );

      for (const [queueName, subscription] of this.subscriptions.entries()) {
        try {
          await this.subscribeToQueue(
            queueName,
            subscription.handler,
            subscription.options,
          );
          console.log(`[RabbitMQ] Queue ${queueName} resubscribed successfully`);
        } catch (error) {
          console.error(
            `[RabbitMQ] Failed to resubscribe to queue ${queueName} after reconnection:`,
            error,
          );
        }
      }
    });
  }
}
