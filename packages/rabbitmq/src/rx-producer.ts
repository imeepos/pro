import type { QueueName } from '@pro/types';
import type { RabbitMQService } from './rabbitmq.service.js';
import type { PublishOptions, BatchPublishResult } from './types.js';
import type { QueueProducer } from './rx-types.js';

/**
 * RxJS 队列生产者 - 实现 Observer 接口
 *
 * 存在即合理:
 * - 将 RxJS Observer 桥接到 RabbitMQ Publisher
 * - 支持单条和批量推送
 *
 * 优雅即简约:
 * - 实现标准 Observer 接口（next, error, complete）
 * - 扩展批量推送方法提升性能
 */
export class RxQueueProducer<T> implements QueueProducer<T> {
    private closed = false;

    constructor(
        private readonly mqService: RabbitMQService,
        private readonly queueName: QueueName,
    ) {}

    next(message: T, options?: PublishOptions): void {
        if (this.closed) {
            console.warn(`[RxQueueProducer] Producer已关闭，消息被忽略: ${this.queueName}`);
            return;
        }

        this.mqService
            .publish(this.queueName, message, options)
            .catch(err => {
                console.error(`[RxQueueProducer] 发布消息失败: ${this.queueName}`, err);
            });
    }

    async nextBatch(messages: T[], options?: PublishOptions): Promise<BatchPublishResult> {
        if (this.closed) {
            throw new Error(`Producer已关闭: ${this.queueName}`);
        }

        return this.mqService.publishBatch(this.queueName, messages, options);
    }

    error(err: Error): void {
        console.error(`[RxQueueProducer] Producer错误: ${this.queueName}`, err);
        this.closed = true;
    }

    complete(): void {
        console.log(`[RxQueueProducer] Producer完成: ${this.queueName}`);
        this.closed = true;
    }
}
