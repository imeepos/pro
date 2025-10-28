import type { QueueName } from '@pro/types';
import { ConnectionPool } from './connection-pool.js';
import { RabbitMQPublisher } from './publisher.service.js';
import { RabbitMQConsumer, type MessageHandler } from './consumer.service.js';
import type {
  RabbitMQConfig,
  PublishOptions,
  ConsumerOptions,
  BatchPublishResult,
  ConnectionState,
  ConnectionEvent,
} from './types.js';
import { Injectable, OnDestroy, OnInit } from '@pro/core';

/**
 * RabbitMQ 统一服务
 *
 * 存在即合理:
 * - 封装连接、发布、消费的完整生命周期
 * - 提供类型安全的 API
 * - 统一的错误处理和日志
 *
 * 优雅即简约:
 * - 单一入口,简化使用
 * - 自动管理资源生命周期
 * - 清晰的职责划分
 */
@Injectable({
  useFactory: () => {
    return new RabbitMQService({ url: process.env.RABBITMQ_URL } as RabbitMQConfig)
  },
  deps: []
})
@OnInit()
export class RabbitMQService implements OnDestroy {
  private connectionPool: ConnectionPool;
  private publisher: RabbitMQPublisher;
  private consumer: RabbitMQConsumer;
  private isInitialized = false;

  constructor(config: RabbitMQConfig) {
    this.connectionPool = new ConnectionPool(config);
    this.publisher = new RabbitMQPublisher(this.connectionPool);
    this.consumer = new RabbitMQConsumer(this.connectionPool);
  }

  async onInit(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.connectionPool.connect();
    this.isInitialized = true;
  }

  async onDestroy(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    await this.connectionPool.close();
    this.isInitialized = false;
  }

  async publish<T>(
    queueName: QueueName,
    event: T,
    options?: PublishOptions,
  ): Promise<boolean> {
    this.ensureInitialized();
    return this.publisher.publish(queueName, event, options);
  }

  async publishBatch<T>(
    queueName: QueueName,
    events: T[],
    options?: PublishOptions,
  ): Promise<BatchPublishResult> {
    this.ensureInitialized();
    return this.publisher.publishBatch(queueName, events, options);
  }

  async consume<T>(
    queueName: QueueName,
    handler: MessageHandler<T>,
    options?: ConsumerOptions,
  ): Promise<void> {
    this.ensureInitialized();
    return this.consumer.consume(queueName, handler, options);
  }

  onConnectionEvent(
    eventType: ConnectionEvent['type'],
    listener: (event: ConnectionEvent) => void,
  ): void {
    this.connectionPool.on(eventType, listener);
  }

  offConnectionEvent(
    eventType: ConnectionEvent['type'],
    listener: (event: ConnectionEvent) => void,
  ): void {
    this.connectionPool.off(eventType, listener);
  }

  getConnectionState(): ConnectionState {
    return this.connectionPool.getState();
  }

  isConnected(): boolean {
    return this.connectionPool.isConnected();
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        'RabbitMQService not initialized. Module initialization in progress.',
      );
    }
  }
}
