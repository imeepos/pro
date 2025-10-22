import type { Message } from 'amqplib';
import type { DlqMessage, DlqQueueInfo } from '@pro/types';
import { QUEUE_NAMES } from '@pro/types';
import { ConnectionPool } from './connection-pool.js';
import type { RabbitMQConfig } from './types.js';

interface DlqQueueDefinition {
  name: string;
  originalQueue: string;
}

const DEFAULT_DLQ_QUEUES: DlqQueueDefinition[] = [
  {
    name: `${QUEUE_NAMES.CRAWL_TASK}.dlq`,
    originalQueue: QUEUE_NAMES.CRAWL_TASK,
  },
  {
    name: `${QUEUE_NAMES.WEIBO_DETAIL_CRAWL}.dlq`,
    originalQueue: QUEUE_NAMES.WEIBO_DETAIL_CRAWL,
  },
];

/**
 * 死信队列管理服务
 *
 * 设计哲学：
 * - 单一职责：专注于死信队列的巡检与调度
 * - 优雅实现：只暴露业务真正需要的五个方法
 * - 温柔修复：重试与删除都以消息为中心
 */
export class DlqManagerService {
  private readonly connectionPool: ConnectionPool;
  private readonly queues: DlqQueueDefinition[];
  private readonly fetchLimit: number;
  private initialized = false;

  constructor(
    config: RabbitMQConfig,
    options?: {
      queues?: DlqQueueDefinition[];
      fetchLimit?: number;
    },
  ) {
    this.connectionPool = new ConnectionPool(config);
    this.queues = options?.queues ?? DEFAULT_DLQ_QUEUES;
    this.fetchLimit = Math.max(1, Math.min(options?.fetchLimit ?? 100, 500));
  }

  async getDlqQueues(): Promise<DlqQueueInfo[]> {
    const channel = await this.getChannel();
    const result: DlqQueueInfo[] = [];

    for (const queue of this.queues) {
      try {
        const { messageCount } = await channel.checkQueue(queue.name);
        result.push({
          name: queue.name,
          originalQueue: queue.originalQueue,
          messageCount: messageCount ?? 0,
        });
      } catch {
        result.push({
          name: queue.name,
          originalQueue: queue.originalQueue,
          messageCount: 0,
        });
      }
    }

    return result;
  }

  async getDlqMessages(queueName: string): Promise<DlqMessage[]> {
    const channel = await this.getChannel();
    const messages: DlqMessage[] = [];

    for (let inspected = 0; inspected < this.fetchLimit; inspected++) {
      const message = await channel.get(queueName, { noAck: false });
      if (!message) {
        break;
      }

      messages.push(this.toDlqMessage(queueName, message));
      channel.nack(message, false, true);
    }

    return messages;
  }

  async retryMessages(queueName: string, messageIds: string[]): Promise<number> {
    if (messageIds.length === 0) {
      return 0;
    }

    const channel = await this.getChannel();
    const targetIds = new Set(messageIds);
    const totalMessages = await this.safeMessageCount(queueName);
    let retried = 0;
    let inspected = 0;

    while (targetIds.size > 0 && inspected < totalMessages) {
      const message = await channel.get(queueName, { noAck: false });
      if (!message) {
        break;
      }

      inspected += 1;
      const messageId = this.extractMessageId(message);

      if (messageId && targetIds.has(messageId)) {
        const destination = this.resolveOriginalQueue(queueName, message);
        channel.sendToQueue(destination, message.content, message.properties);
        channel.ack(message);
        targetIds.delete(messageId);
        retried += 1;
      } else {
        channel.nack(message, false, true);
      }
    }

    return retried;
  }

  async deleteMessages(queueName: string, messageIds: string[]): Promise<number> {
    if (messageIds.length === 0) {
      return 0;
    }

    const channel = await this.getChannel();
    const targetIds = new Set(messageIds);
    const totalMessages = await this.safeMessageCount(queueName);
    let deleted = 0;
    let inspected = 0;

    while (targetIds.size > 0 && inspected < totalMessages) {
      const message = await channel.get(queueName, { noAck: false });
      if (!message) {
        break;
      }

      inspected += 1;
      const messageId = this.extractMessageId(message);

      if (messageId && targetIds.has(messageId)) {
        channel.ack(message);
        targetIds.delete(messageId);
        deleted += 1;
      } else {
        channel.nack(message, false, true);
      }
    }

    return deleted;
  }

  async getMessageCount(queueName: string): Promise<number> {
    const channel = await this.getChannel();
    const { messageCount } = await channel.checkQueue(queueName);
    return messageCount ?? 0;
  }

  async close(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    await this.connectionPool.close();
    this.initialized = false;
  }

  private async getChannel(): Promise<any> {
    if (!this.initialized) {
      await this.connectionPool.connect();
      this.initialized = true;
    }
    return this.connectionPool.getChannel();
  }

  private async safeMessageCount(queueName: string): Promise<number> {
    try {
      return await this.getMessageCount(queueName);
    } catch {
      return 0;
    }
  }

  private toDlqMessage(queueName: string, message: Message): DlqMessage {
    const headers = message.properties.headers ?? {};
    const deathInfo = this.extractDeathInfo(headers);

    return {
      id: this.extractMessageId(message),
      queueName,
      content: this.deserialize(message.content),
      failedAt: this.resolveFailureTime(deathInfo),
      retryCount: this.resolveRetryCount(headers, deathInfo),
      errorMessage: this.resolveErrorMessage(headers, deathInfo),
    };
  }

  private extractMessageId(message: Message): string {
    if (message.properties.messageId) {
      return message.properties.messageId;
    }

    const headers = message.properties.headers ?? {};
    const deathInfo = this.extractDeathInfo(headers);
    if (deathInfo?.originalExpiration) {
      return String(deathInfo.originalExpiration);
    }

    return String(message.fields.deliveryTag);
  }

  private extractDeathInfo(headers: Record<string, any>): any | undefined {
    const deathHeader = headers['x-death'];
    if (Array.isArray(deathHeader) && deathHeader.length > 0) {
      return deathHeader[0];
    }
    return undefined;
  }

  private deserialize(payload: Buffer): unknown {
    const text = payload.toString('utf8').trim();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private resolveFailureTime(deathInfo: any | undefined): string {
    const time = deathInfo?.time;
    if (!time) {
      return new Date().toISOString();
    }

    if (time instanceof Date) {
      return time.toISOString();
    }

    const date = new Date(time);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }

  private resolveRetryCount(
    headers: Record<string, any>,
    deathInfo: any | undefined,
  ): number {
    if (typeof headers['x-retry-count'] === 'number') {
      return headers['x-retry-count'];
    }

    if (typeof deathInfo?.count === 'number') {
      return deathInfo.count;
    }

    return 0;
  }

  private resolveErrorMessage(
    headers: Record<string, any>,
    deathInfo: any | undefined,
  ): string | undefined {
    if (typeof headers['x-exception-message'] === 'string') {
      return headers['x-exception-message'];
    }

    if (typeof headers['x-error'] === 'string') {
      return headers['x-error'];
    }

    if (typeof deathInfo?.reason === 'string') {
      return deathInfo.reason;
    }

    return undefined;
  }

  private resolveOriginalQueue(queueName: string, message?: Message): string {
    const definition = this.queues.find((item) => item.name === queueName);
    if (definition) {
      return definition.originalQueue;
    }

    const headers = message?.properties.headers ?? {};
    const deathInfo = this.extractDeathInfo(headers);

    if (typeof headers['x-first-death-queue'] === 'string') {
      return headers['x-first-death-queue'];
    }

    if (typeof deathInfo?.queue === 'string') {
      return deathInfo.queue;
    }

    return queueName.replace(/\.dlq$/i, '');
  }
}
