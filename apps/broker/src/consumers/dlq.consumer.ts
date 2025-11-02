import { root } from '@pro/core';
import { RabbitMQService } from '@pro/rabbitmq';
import { FailedTaskEntity, useEntityManager } from '@pro/entities';
import { createContextLogger } from '../core/logger';

/**
 * 死信队列消费者 - 失败消息的守护者
 *
 * 使命：
 * - 监听死信队列中的失败消息
 * - 记录失败详情到数据库
 * - 为后续人工介入提供数据基础
 */
export class DlqConsumer {
  private readonly logger = createContextLogger('DlqConsumer');
  private readonly rabbitMQ: RabbitMQService;

  constructor() {
    this.rabbitMQ = root.get(RabbitMQService);
  }

  /**
   * 启动消费者 - 开始监听死信队列
   */
  start(): void {
    this.logger.info('DLQ Consumer 初始化');
  }

  /**
   * 处理失败消息 - 记录与存档
   */
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

      this.logger.warn({
        message: '已记录失败消息',
        originalQueue,
        failureCount,
        error: errorMessage,
      });
    } catch (error) {
      this.logger.error({
        message: '处理失败消息时出错',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
