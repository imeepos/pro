import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQClient } from '@pro/rabbitmq';
import { Logger } from '@pro/logger-nestjs';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private client: RabbitMQClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    const url = this.configService.get('RABBITMQ_URL', 'amqp://localhost:5672');
    const queue = this.configService.get(
      'ANALYSIS_RESULT_QUEUE',
      'analysis_result_queue',
    );

    this.client = new RabbitMQClient({
      url,
      queue,
      maxRetries: 3,
      enableDLQ: true,
    });
  }

  async onModuleInit() {
    await this.client.connect();
    this.logger.log('RabbitMQ 连接成功', 'RabbitMQService');
  }

  async onModuleDestroy() {
    await this.client.close();
    this.logger.log('RabbitMQ 连接已关闭', 'RabbitMQService');
  }

  getClient(): RabbitMQClient {
    return this.client;
  }
}
