import * as amqp from 'amqplib';

export interface RabbitMQConfig {
  url: string;
  queue?: string;
  /**
   * 最大重试次数（默认 3 次）
   * 超过此次数后，消息将被发送到死信队列
   */
  maxRetries?: number;
  /**
   * 是否启用死信队列（默认 true）
   */
  enableDLQ?: boolean;
}

export interface ConsumeOptions {
  /**
   * 是否自动 ACK（默认 false）
   */
  noAck?: boolean;
  /**
   * 预取数量，控制并发（默认 1）
   */
  prefetchCount?: number;
}

export class RabbitMQClient {
  private connection: any;
  private channel: any;
  private maxRetries: number;
  private enableDLQ: boolean;

  constructor(private config: RabbitMQConfig) {
    this.maxRetries = config.maxRetries ?? 3;
    this.enableDLQ = config.enableDLQ ?? true;
  }

  async connect(): Promise<void> {
    this.connection = await amqp.connect(this.config.url);
    this.channel = await this.connection.createChannel();
    if (this.config.queue) {
      await this.setupQueue(this.config.queue);
    }
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return !!(this.channel && this.connection);
  }

  /**
   * 设置队列，包括死信队列配置
   */
  private async setupQueue(queue: string): Promise<void> {
    if (this.enableDLQ) {
      // 创建死信交换机
      const dlxExchange = `${queue}.dlx`;
      const dlqQueue = `${queue}.dlq`;

      await this.channel.assertExchange(dlxExchange, 'direct', { durable: true });
      await this.channel.assertQueue(dlqQueue, { durable: true });
      await this.channel.bindQueue(dlqQueue, dlxExchange, queue);

      // 创建主队列，配置死信交换机
      await this.channel.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': dlxExchange,
          'x-dead-letter-routing-key': queue
        }
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

    console.log(`[RabbitMQ] 正在发布消息到队列 ${queue}, 消息大小: ${messageSize} bytes, 时间: ${new Date().toISOString()}`);

    const result = this.channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: options?.persistent ?? true
      }
    );

    const duration = Date.now() - startTime;

    if (result) {
      console.log(`[RabbitMQ] 消息发布成功到队列 ${queue}, 耗时: ${duration}ms`);
    } else {
      console.warn(`[RabbitMQ] 消息发布失败到队列 ${queue} - sendToQueue返回false, 可能原因: 队列缓冲区满/背压, 耗时: ${duration}ms`);
    }

    return result;
  }

  /**
   * 消费消息 - 安全的 ACK 机制
   * @param queue 队列名称
   * @param callback 处理回调（必须是 async 函数）
   * @param options 消费选项
   */
  async consume(
    queue: string,
    callback: (msg: any) => Promise<void>,
    options?: ConsumeOptions
  ): Promise<void> {
    if (!this.channel) throw new Error('Channel not initialized');

    await this.setupQueue(queue);

    // 设置预取数量，控制并发
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

          // 等待回调完成
          await callback(content);

          const processDuration = Date.now() - processStart;
          console.log(`[RabbitMQ] 消息 ${messageId} 处理成功, 耗时: ${processDuration}ms`);

          // 成功后 ACK
          this.channel?.ack(msg);
        } catch (error) {
          console.error(`[RabbitMQ] 消息 ${messageId} 处理失败:`, error);

          const retryCount = this.getRetryCount(msg);

          // 判断是否超过重试次数
          if (retryCount >= this.maxRetries) {
            console.error(
              `[RabbitMQ] 消息 ${messageId} 重试次数已达上限 (${this.maxRetries}), 发送到死信队列`,
              { messageId: msg.properties.messageId }
            );

            // 拒绝消息，不重新入队（进入死信队列）
            this.channel?.nack(msg, false, false);
          } else {
            console.warn(
              `[RabbitMQ] 消息 ${messageId} 处理失败，重新入队 (重试次数: ${retryCount + 1}/${this.maxRetries})`,
              { messageId: msg.properties.messageId }
            );

            // 增加重试计数
            this.incrementRetryCount(msg);

            // 拒绝消息，重新入队
            this.channel?.nack(msg, false, true);
          }
        }
      },
      {
        noAck: options?.noAck ?? false
      }
    );
  }

  /**
   * 获取消息的重试次数
   */
  private getRetryCount(msg: any): number {
    const headers = msg.properties.headers || {};
    return headers['x-retry-count'] || 0;
  }

  /**
   * 增加消息的重试次数
   */
  private incrementRetryCount(msg: any): void {
    const headers = msg.properties.headers || {};
    headers['x-retry-count'] = (headers['x-retry-count'] || 0) + 1;
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}
