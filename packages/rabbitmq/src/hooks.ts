import { root } from "@pro/core";
import { getMqQueueConfig } from "./tokens.js";
import { RabbitMQService } from "./rabbitmq.service.js";
import { RxQueueProducer } from "./rx-producer.js";
import { createRxConsumer } from "./rx-consumer.js";
import type { QueueManager, RxConsumerOptions } from "./rx-types.js";

/**
 * 使用队列的钩子函数 - RxJS 双 Observable 架构
 *
 * 优雅即简约:
 * - 生产者和消费者完全分离
 * - 支持所有 RxJS 操作符
 * - 类型安全的消息传递
 *
 * @example
 * const queue = useQueue<WeiboTask>('weibo_crawl_queue');
 *
 * // 生产者：推送消息
 * queue.producer.next({ keyword: 'AI', page: 1 });
 *
 * // 批量推送
 * await queue.producer.nextBatch([
 *   { keyword: 'AI', page: 1 },
 *   { keyword: 'ML', page: 1 },
 * ]);
 *
 * // 消费者：RxJS 管道处理消息
 * queue.consumer$.pipe(
 *   filter(env => env.message.page === 1),
 *   map(env => env.message.keyword),
 *   mergeMap(keyword => processKeyword(keyword), 5),
 *   retry(3),
 *   bufferTime(5000),
 *   tap(batch => console.log(`处理批次: ${batch.length} 条`))
 * ).subscribe({
 *   next: result => console.log('成功:', result),
 *   error: err => console.error('失败:', err)
 * });
 *
 * // 手动 ACK 模式
 * queue.consumer$.pipe(
 *   tap(envelope => {
 *     try {
 *       processMessage(envelope.message);
 *       envelope.ack();
 *     } catch (error) {
 *       envelope.nack(false); // 不重新入队
 *     }
 *   })
 * ).subscribe();
 */
export function useQueue<T = any>(
    name: string,
    options?: RxConsumerOptions
): QueueManager<T> {
    const config = getMqQueueConfig(name);
    const mqService = root.get(RabbitMQService);
    const connectionPool = mqService.connectionPool;

    // 创建生产者
    const producer = new RxQueueProducer<T>(mqService, config.queue as any);

    // 创建消费者 Observable，传递队列选项
    const consumer$ = createRxConsumer<T>(
        connectionPool,
        config.queue as any,
        options,
        config.queueOptions
    );

    return {
        producer,
        consumer$,

        get queueName(): string {
            return config.queue;
        },

        get dlqName(): string {
            return config.dlq;
        }
    };
}