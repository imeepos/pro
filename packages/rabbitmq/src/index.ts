import * as amqp from 'amqplib';

export interface RabbitMQConfig {
  url: string;
  queue?: string;
}

export class RabbitMQClient {
  private connection?: amqp.Connection;
  private channel?: amqp.Channel;

  constructor(private config: RabbitMQConfig) {}

  async connect(): Promise<void> {
    this.connection = await amqp.connect(this.config.url);
    this.channel = await this.connection.createChannel();
    if (this.config.queue) {
      await this.channel.assertQueue(this.config.queue);
    }
  }

  async publish(queue: string, message: any): Promise<boolean> {
    if (!this.channel) throw new Error('Channel not initialized');
    await this.channel.assertQueue(queue);
    return this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
  }

  async consume(queue: string, callback: (msg: any) => void): Promise<void> {
    if (!this.channel) throw new Error('Channel not initialized');
    await this.channel.assertQueue(queue);
    this.channel.consume(queue, (msg) => {
      if (msg) {
        callback(JSON.parse(msg.content.toString()));
        this.channel?.ack(msg);
      }
    });
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
