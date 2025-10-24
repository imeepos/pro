import * as amqp from 'amqplib';
import { randomUUID } from 'crypto';

/**
 * 旧版 RabbitMQ 配置
 * @deprecated 请使用新的 RabbitMQModule
 */
export interface LegacyRabbitMQConfig {
  url: string;
  queue?: string;
  maxRetries?: number;
  enableDLQ?: boolean;
  messageTTL?: number;
}

/**
 * 旧版消费选项
 * @deprecated 请使用新的 ConsumerOptions
 */
export interface LegacyConsumeOptions {
  noAck?: boolean;
  prefetchCount?: number;
}

/**
 * 旧版 RabbitMQ 客户端
 *
 * @deprecated 此类保留用于向后兼容，新项目请使用 RabbitMQModule
 *
 * 迁移指南：
 * ```ts
 * // 旧代码
 * const client = new RabbitMQClient({ url: 'amqp://localhost' });
 * await client.connect();
 * await client.publish('queue', data);
 *
 * // 新代码
 * @Module({
 *   imports: [RabbitMQModule.forRoot({ url: 'amqp://localhost' })]
 * })
 * export class AppModule {}
 *
 * @Injectable()
 * export class MyService {
 *   constructor(@InjectRabbitMQ() private rabbitmq: RabbitMQService) {}
 *
 *   async publish() {
 *     await this.rabbitmq.publish('queue', data);
 *   }
 * }
 * ```
 */
export class RabbitMQClient {
  private connection: any;
  private channel: any;
  private maxRetries: number;
  private enableDLQ: boolean;
  private messageTTL: number;

  constructor(private config: LegacyRabbitMQConfig) {
    this.maxRetries = config.maxRetries ?? 3;
    this.enableDLQ = config.enableDLQ ?? true;
    this.messageTTL = config.messageTTL ?? 30 * 60 * 1000;
  }

  async connect(): Promise<void> {
    this.connection = await amqp.connect(this.config.url);
    this.channel = await this.connection.createChannel();
    if (this.config.queue) {
      await this.setupQueue(this.config.queue);
    }
  }

  isConnected(): boolean {
    return !!(this.channel && this.connection);
  }

  private async setupQueue(queue: string): Promise<void> {
    if (this.enableDLQ) {
      const dlxExchange = `${queue}.dlx`;
      const dlqQueue = `${queue}.dlq`;

      await this.channel.assertExchange(dlxExchange, 'direct', { durable: true });
      await this.channel.assertQueue(dlqQueue, { durable: true });
      await this.channel.bindQueue(dlqQueue, dlxExchange, queue);

      const queueArgs: any = {
        'x-dead-letter-exchange': dlxExchange,
        'x-dead-letter-routing-key': queue
      };

      if (this.messageTTL > 0) {
        queueArgs['x-message-ttl'] = this.messageTTL;
      }

      await this.channel.assertQueue(queue, {
        durable: true,
        arguments: queueArgs
      });
    } else {
      await this.channel.assertQueue(queue, { durable: true });
    }
  }

  async publish(queue: string, message: any, options?: { persistent?: boolean }): Promise<boolean> {
    if (!this.channel) throw new Error('Channel not initialized');
    await this.setupQueue(queue);

    const messageSize = Buffer.byteLength(JSON.stringify(message));
    const startTime = Date.now();
    const messageId =
      typeof message === 'object' &&
      message !== null &&
      typeof (message as Record<string, any>).rawDataId === 'string'
        ? (message as Record<string, any>).rawDataId
        : randomUUID();

    console.log(
      `[RabbitMQ] 正在发布消息到队列 ${queue}, 消息标识: ${messageId}, 消息大小: ${messageSize} bytes, 时间: ${new Date().toISOString()}`
    );

    const result = this.channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: options?.persistent ?? true,
        messageId
      }
    );

    const duration = Date.now() - startTime;

    if (result) {
      console.log(`[RabbitMQ] 消息 ${messageId} 发布成功到队列 ${queue}, 耗时: ${duration}ms`);
    } else {
      console.warn(
        `[RabbitMQ] 消息 ${messageId} 发布失败到队列 ${queue} - sendToQueue返回false, 可能原因: 队列缓冲区满/背压, 耗时: ${duration}ms`
      );
    }

    return result;
  }

  async consume(
    queue: string,
    callback: (msg: any) => Promise<void>,
    options?: LegacyConsumeOptions
  ): Promise<void> {
    if (!this.channel) throw new Error('Channel not initialized');

    await this.setupQueue(queue);

    await this.channel.prefetch(options?.prefetchCount ?? 1);

    this.channel.consume(
      queue,
      async (msg: any) => {
        if (!msg) return;

        const messageId = msg.properties.messageId || 'unknown';
        const receivedAt = new Date().toISOString();

        console.log(`[RabbitMQ] 开始处理消息 ${messageId} from queue ${queue}, 接收时间: ${receivedAt}`);

        try {
          const content = JSON.parse(msg.content.toString());
          const processStart = Date.now();

          await callback(content);

          const processDuration = Date.now() - processStart;
          console.log(`[RabbitMQ] 消息 ${messageId} 处理成功, 耗时: ${processDuration}ms`);

          this.channel?.ack(msg);
        } catch (error) {
          console.error(`[RabbitMQ] 消息 ${messageId} 处理失败:`, error);

          const retryCount = this.getRetryCount(msg);

          if (retryCount >= this.maxRetries) {
            console.error(
              `[RabbitMQ] 消息 ${messageId} 重试次数已达上限 (${this.maxRetries}), 发送到死信队列`,
              { messageId: msg.properties.messageId }
            );

            this.channel?.nack(msg, false, false);
          } else {
            console.warn(
              `[RabbitMQ] 消息 ${messageId} 处理失败，重新入队 (重试次数: ${retryCount + 1}/${this.maxRetries})`,
              { messageId: msg.properties.messageId }
            );

            this.incrementRetryCount(msg);

            this.channel?.nack(msg, false, true);
          }
        }
      },
      {
        noAck: options?.noAck ?? false
      }
    );
  }

  private getRetryCount(msg: any): number {
    const headers = msg.properties.headers || {};
    return headers['x-retry-count'] || 0;
  }

  private incrementRetryCount(msg: any): void {
    const headers = msg.properties.headers || {};
    headers['x-retry-count'] = (headers['x-retry-count'] || 0) + 1;
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}
