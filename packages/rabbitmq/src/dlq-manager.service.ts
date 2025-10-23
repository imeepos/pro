import type { Message } from 'amqplib';
import type { DlqMessage, DlqQueueInfo } from '@pro/types';
import { QUEUE_NAMES } from '@pro/types';
import { ConnectionPool } from './connection-pool.js';
import type { DlqConnectionStatus, RabbitMQConfig } from './types.js';

interface DlqQueueDefinition {
  name: string;
  originalQueue: string;
}

interface DlqManagerOptions {
  queues?: DlqQueueDefinition[];
  fetchLimit?: number;
  logger?: Pick<Console, 'debug' | 'warn' | 'error'>;
  /** 是否启用动态 DLQ 发现，默认为 true */
  enableAutoDiscovery?: boolean;
}

/**
 * 系统已知的所有业务队列名称
 * 用于动态发现对应的 DLQ 队列
 */
const BUSINESS_QUEUES = Object.values(QUEUE_NAMES);

/**
 * 向后兼容的默认 DLQ 队列定义
 * 仅在禁用自动发现时使用
 */
const LEGACY_DEFAULT_QUEUES: DlqQueueDefinition[] = [
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
  private readonly logger: Pick<Console, 'debug' | 'warn' | 'error'>;
  private readonly enableAutoDiscovery: boolean;
  private readonly connectionDescriptor: string;
  private connectionError: Error | null = null;
  private lastConnectionErrorAt: number | null = null;
  private lastConnectionErrorMessage: string | null = null;
  private lastSuccessfulConnectionAt: number | null = null;
  private initialized = false;

  constructor(
    config: RabbitMQConfig,
    options?: DlqManagerOptions,
  ) {
    this.connectionPool = new ConnectionPool(config);
    this.connectionDescriptor = this.describeConnectionTarget(config.url);
    this.enableAutoDiscovery = options?.enableAutoDiscovery ?? true;

    // 根据配置决定队列定义的来源
    if (options?.queues) {
      // 用户显式提供了队列定义，优先使用
      this.queues = options.queues;
    } else if (this.enableAutoDiscovery) {
      // 启用自动发现时，不预定义队列，而是在运行时动态发现
      this.queues = [];
    } else {
      // 禁用自动发现时，使用传统的硬编码队列
      this.queues = LEGACY_DEFAULT_QUEUES;
    }

    this.fetchLimit = Math.max(1, Math.min(options?.fetchLimit ?? 100, 500));
    this.logger = options?.logger ?? console;
    this.logger.debug(`[DLQ] 初始化死信连接上下文: ${this.connectionDescriptor}`);

    // 监听连接池事件，优雅处理连接状态变化
    this.setupConnectionEventHandlers();
  }

  async getDlqQueues(): Promise<DlqQueueInfo[]> {
    // 如果连接不可用，返回空队列列表而不是抛出异常
    if (this.connectionError) {
      this.logger.warn('[DLQ] 连接不可用，返回空队列列表', this.connectionError);
      return [];
    }

    try {
      const channel = await this.getChannel();
      const result: DlqQueueInfo[] = [];

      const queuesToCheck = await this.resolveDlqQueues();

      for (const queue of queuesToCheck) {
        const probe = await this.inspectQueue(channel, queue.name, queue.originalQueue);
        result.push({
          name: queue.name,
          originalQueue: queue.originalQueue,
          messageCount: probe?.messageCount ?? 0,
        });
      }

      return result;
    } catch (error) {
      this.logger.error('[DLQ] 获取队列列表失败', error as Error);
      // 连接失败时记录错误并返回空列表，避免 GraphQL 查询失败
      return [];
    }
  }

  async getDlqMessages(queueName: string): Promise<DlqMessage[]> {
    if (this.connectionError) {
      this.logger.warn('[DLQ] 连接不可用，无法获取消息', this.connectionError);
      return [];
    }

    try {
      const channel = await this.getChannel();
      const probe = await this.inspectQueue(channel, queueName);
      if (!probe) {
        this.logger.warn(`[DLQ] 队列不可访问，放弃读取: ${queueName}`);
        return [];
      }

      const messages: DlqMessage[] = [];
      const sampled: string[] = [];

      for (let inspected = 0; inspected < this.fetchLimit; inspected++) {
        const message = await this.receiveMessageWithRetry(
          channel,
          queueName,
          inspected + 1,
        );
        if (!message) {
          break;
        }

        const dlqMessage = this.toDlqMessage(queueName, message);
        messages.push(dlqMessage);
        if (dlqMessage.id && sampled.length < 5) {
          sampled.push(dlqMessage.id);
        }
        channel.nack(message, false, true);
      }

      const declaredCount =
        typeof probe.messageCount === 'number' ? probe.messageCount : '未知';
      this.logger.debug(
        `[DLQ] 队列 ${queueName} 读取完成: 捕获 ${messages.length} 条/声明 ${declaredCount} 条，采样ID=${sampled.join(', ') || '无'}`,
      );

      return messages;
    } catch (error) {
      this.logger.error(`[DLQ] 获取消息失败: ${queueName}`, error as Error);
      return [];
    }
  }

  async retryMessages(queueName: string, messageIds: string[]): Promise<number> {
    if (messageIds.length === 0) {
      return 0;
    }

    if (this.connectionError) {
      this.logger.warn('[DLQ] 连接不可用，无法重试消息', this.connectionError);
      return 0;
    }

    try {
      const channel = await this.getChannel();
      const targetIds = new Set(messageIds);
      const totalMessages = await this.safeMessageCount(queueName);
      let retried = 0;
      let inspected = 0;

      while (targetIds.size > 0 && inspected < totalMessages) {
        const message = await this.receiveMessageWithRetry(
          channel,
          queueName,
          inspected + 1,
        );
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
    } catch (error) {
      this.logger.error(`[DLQ] 重试消息失败: ${queueName}`, error as Error);
      return 0;
    }
  }

  async deleteMessages(queueName: string, messageIds: string[]): Promise<number> {
    if (messageIds.length === 0) {
      return 0;
    }

    if (this.connectionError) {
      this.logger.warn('[DLQ] 连接不可用，无法删除消息', this.connectionError);
      return 0;
    }

    try {
      const channel = await this.getChannel();
      const targetIds = new Set(messageIds);
      const totalMessages = await this.safeMessageCount(queueName);
      let deleted = 0;
      let inspected = 0;

      while (targetIds.size > 0 && inspected < totalMessages) {
        const message = await this.receiveMessageWithRetry(
          channel,
          queueName,
          inspected + 1,
        );
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
    } catch (error) {
      this.logger.error(`[DLQ] 删除消息失败: ${queueName}`, error as Error);
      return 0;
    }
  }

  async getMessageCount(queueName: string): Promise<number> {
    if (this.connectionError) {
      this.logger.warn('[DLQ] 连接不可用，无法获取消息数量', this.connectionError);
      return 0;
    }

    try {
      const channel = await this.getChannel();
      const probe = await this.inspectQueue(channel, queueName);
      return probe?.messageCount ?? 0;
    } catch (error) {
      this.logger.error(`[DLQ] 获取消息数量失败: ${queueName}`, error as Error);
      return 0;
    }
  }

  async close(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    await this.connectionPool.close();
    this.initialized = false;
  }

  getConnectionStatus(): DlqConnectionStatus {
    return {
      target: this.connectionDescriptor,
      state: this.connectionPool.getState(),
      connected: this.connectionPool.isConnected() && !this.connectionError,
      lastConnectedAt: this.lastSuccessfulConnectionAt ?? undefined,
      lastError:
        this.lastConnectionErrorMessage && this.lastConnectionErrorAt
          ? {
            message: this.lastConnectionErrorMessage,
            at: this.lastConnectionErrorAt,
          }
          : undefined,
    };
  }

  private async getChannel(): Promise<any> {
    // 如果已知连接有问题，直接抛出异常
    if (this.connectionError) {
      throw this.connectionError;
    }

    if (!this.initialized) {
      try {
        this.logger.debug(`[DLQ] 正在建立与 ${this.connectionDescriptor} 的连接`);
        await this.connectionPool.connect();
        this.initialized = true;
        // 连接成功后清除错误状态
        this.connectionError = null;
        this.lastSuccessfulConnectionAt = Date.now();
        this.logger.debug(`[DLQ] 与 ${this.connectionDescriptor} 的连接建立完成`);
      } catch (error) {
        this.recordConnectionError(error as Error);
        this.logger.error(
          `[DLQ] 建立与 ${this.connectionDescriptor} 的连接失败`,
          error as Error,
        );
        throw error;
      }
    }

    try {
      return this.connectionPool.getChannel();
    } catch (error) {
      this.recordConnectionError(error as Error);
      this.logger.error(
        `[DLQ] 获取与 ${this.connectionDescriptor} 的通道失败`,
        error as Error,
      );
      throw error;
    }
  }

  /**
   * 设置连接池事件处理器，优雅处理连接状态变化
   */
  private setupConnectionEventHandlers(): void {
    // 监听连接成功事件，清除错误状态
    this.connectionPool.on('connected', (event) => {
      this.connectionError = null;
      this.initialized = true;
      this.lastSuccessfulConnectionAt = event.timestamp;
      this.logger.debug(
        `[DLQ] 连接已建立: ${this.connectionDescriptor}`,
      );
    });

    // 监听连接断开事件，重置初始化状态
    this.connectionPool.on('disconnected', () => {
      this.initialized = false;
      this.logger.warn(
        `[DLQ] 连接已断开: ${this.connectionDescriptor}`,
      );
    });

    // 监听连接错误事件，记录错误并重置状态
    this.connectionPool.on('error', (event) => {
      if (event.error) {
        this.recordConnectionError(event.error);
      } else {
        this.recordConnectionError(new Error('未知连接错误'));
      }
      this.initialized = false;
      this.logger.error(
        `[DLQ] 连接发生错误: ${this.connectionDescriptor}`,
        event.error,
      );
    });
  }

  private async inspectQueue(
    channel: any,
    queueName: string,
    originalQueue?: string,
  ): Promise<{ messageCount: number; consumerCount: number } | null> {
    try {
      const details = await channel.checkQueue(queueName);
      const messageCount = details?.messageCount ?? 0;
      const consumerCount = details?.consumerCount ?? 0;
      this.logger.debug(
        `[DLQ] 队列巡检成功: ${queueName} (来自 ${originalQueue ?? '未知'}) - messageCount=${messageCount}, consumerCount=${consumerCount}`,
      );
      return {
        messageCount,
        consumerCount,
      };
    } catch (error) {
      const hint = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[DLQ] 队列巡检失败: ${queueName}${originalQueue ? ` (来自 ${originalQueue})` : ''} - ${hint}`,
      );
      return null;
    }
  }

  private async receiveMessageWithRetry(
    channel: any,
    queueName: string,
    order: number,
  ): Promise<Message | null> {
    const attempts = 3;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const message = await channel.get(queueName, { noAck: false });
      if (message) {
        if (attempt > 1) {
          this.logger.debug(
            `[DLQ] 队列 ${queueName} 第 ${order} 条消息经过 ${attempt} 次尝试成功获取`,
          );
        }
        return message;
      }

      if (attempt < attempts) {
        await this.sleep(50 * attempt);
      }
    }

    this.logger.debug(
      `[DLQ] 队列 ${queueName} 第 ${order} 条消息在多次尝试后仍为空`,
    );
    return null;
  }

  private sleep(duration: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, duration);
    });
  }

  /**
   * 解析需要检查的 DLQ 队列定义
   *
   * @returns DLQ 队列定义数组
   */
  private async resolveDlqQueues(): Promise<DlqQueueDefinition[]> {
    // 如果用户显式提供了队列定义，直接使用
    if (!this.enableAutoDiscovery && this.queues.length > 0) {
      return this.queues;
    }

    // 动态发现所有可能的 DLQ 队列
    const discoveredQueues: DlqQueueDefinition[] = [];

    // 基于已知的业务队列生成对应的 DLQ 队列定义
    for (const originalQueue of BUSINESS_QUEUES) {
      discoveredQueues.push({
        name: `${originalQueue}.dlq`,
        originalQueue,
      });
    }

    this.logger.debug(
      `[DLQ] 动态发现 ${discoveredQueues.length} 个潜在 DLQ 队列: ${discoveredQueues.map(q => q.name).join(', ')}`
    );

    return discoveredQueues;
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
    if (deathInfo && typeof deathInfo.time === 'undefined') {
      this.logger.warn(
        `[DLQ] x-death 缺少 time 字段: ${this.safeStringify(deathInfo)}`,
      );
    }

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

  private resolveFailureTime(deathInfo: any | undefined): Date {
    this.logger.debug(
      `[DLQ] 解析失败时间: deathInfo=${this.safeStringify(deathInfo)}`,
    );

    const candidate = deathInfo?.time;
    if (candidate === undefined || candidate === null) {
      this.logger.warn('[DLQ] x-death 缺少 time 值，使用当前时间');
      return new Date();
    }

    const resolved = this.parseFailureTimestamp(candidate);
    if (resolved) {
      return resolved;
    }

    this.logger.error(
      `[DLQ] 无法解析死信消息时间: candidate=${this.safeStringify(candidate)}`,
    );
    return new Date();
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

  private parseFailureTimestamp(candidate: unknown): Date | null {
    if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) {
      this.logger.debug('[DLQ] 时间戳为有效 Date 实例');
      return candidate;
    }

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      const milliseconds = candidate >= 1e12 ? candidate : candidate * 1000;
      this.logger.debug(
        `[DLQ] 数值时间戳解析: 原始=${candidate}, 毫秒=${milliseconds}`,
      );
      return this.instantOrNull(milliseconds);
    }

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        const numeric = Number(trimmed);
        if (!Number.isNaN(numeric)) {
          const milliseconds = Math.abs(numeric) >= 1e12 ? numeric : numeric * 1000;
          this.logger.debug(
            `[DLQ] 字符串数字时间戳解析: 原始=${trimmed}, 毫秒=${milliseconds}`,
          );
          return this.instantOrNull(milliseconds);
        }

        const parsed = new Date(trimmed);
        this.logger.debug(`[DLQ] ISO 字符串解析: 原始=${trimmed}`);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    this.logger.warn(
      `[DLQ] 未知时间戳类型: ${typeof candidate}=${this.safeStringify(candidate)}`,
    );
    return null;
  }

  private instantOrNull(milliseconds: number): Date | null {
    const result = new Date(milliseconds);
    return Number.isNaN(result.getTime()) ? null : result;
  }

  private describeConnectionTarget(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      const protocol = parsed.protocol ? `${parsed.protocol}//` : '';
      const username = parsed.username
        ? `${decodeURIComponent(parsed.username)}@`
        : '';
      const host = parsed.hostname || 'localhost';
      const port = parsed.port ? `:${parsed.port}` : '';
      const rawPath = parsed.pathname.startsWith('/')
        ? parsed.pathname.slice(1)
        : parsed.pathname;
      const decodedPath = rawPath ? decodeURIComponent(rawPath) : '';
      const sanitizedPath =
        !decodedPath || decodedPath === '/' ? '/' : `/${decodedPath.replace(/^\/+/, '')}`;
      return `${protocol}${username}${host}${port}${sanitizedPath}`;
    } catch {
      return rawUrl;
    }
  }

  private recordConnectionError(error: Error): void {
    this.connectionError = error;
    this.lastConnectionErrorAt = Date.now();
    this.lastConnectionErrorMessage = error.message;
  }

  private safeStringify(input: unknown): string {
    try {
      const serialized = JSON.stringify(input);
      if (serialized) {
        return serialized;
      }
    } catch {
    }
    return String(input);
  }
}
