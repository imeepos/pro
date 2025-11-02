import type { Observer, Observable } from 'rxjs';
import type { MessageMetadata, PublishOptions, ConsumerOptions, BatchPublishResult } from './types.js';

/**
 * 消息信封 - 包装 RabbitMQ 消息及其控制接口
 *
 * 存在即合理:
 * - message: 消息内容
 * - metadata: 消息元数据（ID、重试次数等）
 * - ack/nack: 手动确认控制
 *
 * 优雅即简约:
 * - 在 RxJS 管道中保持对 RabbitMQ 消息的完全控制
 * - 类型安全的泛型封装
 */
export interface MessageEnvelope<T> {
    /**
     * 消息内容
     */
    readonly message: T;

    /**
     * 消息元数据
     */
    readonly metadata: MessageMetadata;

    /**
     * 手动确认消息（成功处理）
     * 仅在 manualAck: true 时有效
     */
    ack(): void;

    /**
     * 手动拒绝消息
     * @param requeue - 是否重新入队，默认 true
     */
    nack(requeue?: boolean): void;
}

/**
 * RxJS 队列管理器 - 双 Observable 架构
 *
 * 存在即合理:
 * - producer: 生产者 Observer，用于推送消息
 * - consumer$: 消费者 Observable，用于订阅消息流
 * - queueName/dlqName: 队列信息
 *
 * 优雅即简约:
 * - 生产和消费完全分离
 * - 支持所有 RxJS 操作符
 * - 类型安全的消息传递
 */
export interface QueueManager<T> {
    /**
     * 生产者 - 推送消息到队列
     *
     * @example
     * queue.producer.next({ keyword: 'AI', page: 1 });
     */
    readonly producer: QueueProducer<T>;

    /**
     * 消费者 - 订阅队列消息流
     *
     * @example
     * queue.consumer$.pipe(
     *   filter(env => env.message.page === 1),
     *   map(env => env.message.keyword),
     *   mergeMap(keyword => processKeyword(keyword), 5)
     * ).subscribe(result => console.log(result));
     */
    readonly consumer$: Observable<MessageEnvelope<T>>;

    /**
     * 队列名称
     */
    readonly queueName: string;

    /**
     * 死信队列名称
     */
    readonly dlqName: string;
}

/**
 * 队列生产者 - 扩展 RxJS Observer
 *
 * 性能即艺术:
 * - next: 单条推送
 * - nextBatch: 批量推送优化
 */
export interface QueueProducer<T> extends Observer<T> {
    /**
     * 推送单条消息
     */
    next(message: T, options?: PublishOptions): void;

    /**
     * 批量推送消息（性能优化）
     */
    nextBatch(messages: T[], options?: PublishOptions): Promise<BatchPublishResult>;
}

/**
 * RxJS 消费者选项
 */
export interface RxConsumerOptions extends ConsumerOptions {
    /**
     * 手动 ACK 模式
     * - false (默认): Observable 订阅成功自动 ACK，错误自动 NACK
     * - true: 必须手动调用 envelope.ack() 或 envelope.nack()
     */
    manualAck?: boolean;
}
