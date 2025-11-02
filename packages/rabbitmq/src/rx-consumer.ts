import { Observable } from 'rxjs';
import type { QueueName } from '@pro/types';
import type { ConnectionPool } from './connection-pool.js';
import type { MessageEnvelope, RxConsumerOptions } from './rx-types.js';
import type { MessageMetadata } from './types.js';
import type * as amqp from 'amqplib';
import { ConnectionState } from './types.js';

/**
 * 等待连接建立
 */
async function waitForConnection(
    connectionPool: ConnectionPool,
    timeout: number = 30000,
): Promise<void> {
    const startTime = Date.now();

    while (!connectionPool.isConnected()) {
        const elapsed = Date.now() - startTime;
        if (elapsed > timeout) {
            throw new Error(
                `RabbitMQ 连接超时 (${timeout}ms), 当前状态: ${connectionPool.getState()}`
            );
        }

        const state = connectionPool.getState();
        if (state === ConnectionState.ERROR || state === ConnectionState.CLOSED) {
            throw new Error(
                `RabbitMQ 连接不可用, 当前状态: ${state}`
            );
        }

        // 等待 100ms 后重试
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

/**
 * RxJS 队列消费者 - 将 RabbitMQ 消息流转换为 Observable
 *
 * 存在即合理:
 * - 直接使用 ConnectionPool 和 Channel
 * - 支持自动和手动 ACK 模式
 * - 自动资源清理
 *
 * 优雅即简约:
 * - 标准 Observable 接口
 * - 支持所有 RxJS 操作符
 * - 取消订阅时自动清理
 *
 * 错误处理如为人处世的哲学:
 * - 自动 ACK/NACK 管理
 * - Observable 错误不会终止消费者
 * - 提供手动控制选项
 */
export function createRxConsumer<T>(
    connectionPool: ConnectionPool,
    queueName: QueueName,
    options?: RxConsumerOptions,
): Observable<MessageEnvelope<T>> {
    return new Observable(subscriber => {
        const manualAck = options?.manualAck ?? false;
        let consumerTag: string | undefined;
        let channel: amqp.Channel;

        // 启动消费者
        const startConsuming = async () => {
            try {
                // 等待连接建立
                await waitForConnection(connectionPool);

                channel = connectionPool.getChannel();

                // 确保队列存在
                await channel.assertQueue(queueName, { durable: true });

                // 设置预取数量
                await channel.prefetch(options?.prefetchCount ?? 1);

                // 开始消费
                const consumeResult = await channel.consume(
                    queueName,
                    (msg: amqp.ConsumeMessage | null) => {
                        if (!msg) return;

                        try {
                            // 反序列化消息
                            const message: T = JSON.parse(msg.content.toString());

                            // 提取元数据
                            const metadata: MessageMetadata = {
                                messageId: msg.properties.messageId,
                                correlationId: msg.properties.correlationId,
                                timestamp: msg.properties.timestamp,
                                retryCount: (msg.properties.headers?.['x-retry-count'] as number) ?? 0,
                                properties: msg.properties,
                            };

                            // 创建消息信封
                            const envelope = createMessageEnvelope(
                                message,
                                metadata,
                                msg,
                                channel,
                            );

                            // 发送消息到 Observable 管道
                            subscriber.next(envelope);

                            // 自动 ACK 模式
                            if (!manualAck) {
                                envelope.ack();
                            }
                        } catch (error) {
                            console.error(
                                `[RxConsumer] 消息处理错误: ${queueName}`,
                                error,
                            );

                            // 自动 NACK 模式
                            if (!manualAck) {
                                channel.nack(msg, false, true); // requeue
                            }
                        }
                    },
                    {
                        noAck: false, // 始终手动确认
                        consumerTag: options?.consumerTag,
                    },
                );

                consumerTag = consumeResult.consumerTag;
                console.log(`[RxConsumer] 开始消费队列: ${queueName}, tag: ${consumerTag}`);
            } catch (error) {
                subscriber.error(error);
            }
        };

        // 启动
        startConsuming();

        // 清理函数：取消订阅时调用
        return async () => {
            if (consumerTag && channel) {
                try {
                    await channel.cancel(consumerTag);
                    console.log(`[RxConsumer] 停止消费队列: ${queueName}, tag: ${consumerTag}`);
                } catch (error) {
                    console.error(`[RxConsumer] 取消消费失败: ${queueName}`, error);
                }
            }
        };
    });
}

/**
 * 创建消息信封
 */
function createMessageEnvelope<T>(
    message: T,
    metadata: MessageMetadata,
    rawMsg: amqp.ConsumeMessage,
    channel: amqp.Channel,
): MessageEnvelope<T> {
    let acknowledged = false;

    return {
        message,
        metadata,

        ack() {
            if (acknowledged) {
                console.warn('[MessageEnvelope] 消息已确认，忽略重复 ack');
                return;
            }

            try {
                channel.ack(rawMsg);
                acknowledged = true;
            } catch (error) {
                console.error('[MessageEnvelope] ACK 失败', error);
            }
        },

        nack(requeue = true) {
            if (acknowledged) {
                console.warn('[MessageEnvelope] 消息已确认，忽略重复 nack');
                return;
            }

            try {
                channel.nack(rawMsg, false, requeue);
                acknowledged = true;
            } catch (error) {
                console.error('[MessageEnvelope] NACK 失败', error);
            }
        },
    };
}
