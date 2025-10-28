import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@pro/rabbitmq';
import { FailedTaskEntity, useEntityManager } from '@pro/entities';

@Injectable()
export class DlqConsumer implements OnModuleInit {
  private readonly logger = new Logger(DlqConsumer.name);

  constructor(private readonly rabbitMQ: RabbitMQService) {}

  async onModuleInit() {
    this.logger.log('DLQ Consumer 初始化');
  }

  async handleFailedMessage(message: any): Promise<void> {
    try {
      const originalQueue =
        message.properties?.headers?.['x-original-queue'] || 'unknown';
      const failureCount =
        message.properties?.headers?.['x-failure-count'] || 1;
      const errorMessage =
        message.properties?.headers?.['x-error-message'] || '未知错误';

      const messageBody = message.content?.toString() || JSON.stringify(message);

      await useEntityManager(async manager => {
        await manager.save(FailedTaskEntity, {
          originalQueue,
          messageBody,
          failureCount,
          errorMessage,
          status: 'pending_review',
        });
      });

      this.logger.warn('已记录失败消息', {
        originalQueue,
        failureCount,
        error: errorMessage,
      });
    } catch (error) {
      this.logger.error('处理失败消息时出错', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
