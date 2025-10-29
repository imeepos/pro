import { InjectionToken, root } from "@pro/core";
import { NoRetryError } from "@pro/workflow-core";

/**
 * 消息队列配置(包含主队列和死信队列)
 */
export interface MqQueueConfig {
    queue: string;
    dlq: string; // Dead Letter Queue
}

export const MQ_QUEUE_CONFIG = new InjectionToken<MqQueueConfig[]>(`MQ_QUEUE_CONFIG`)

/**
 * 获取所有mq队列配置
 */
export function getMqQueueConfigs(): MqQueueConfig[] {
    return root.get(MQ_QUEUE_CONFIG)
}
/**
 * 获取mq队列配置
 */
export function getMqQueueConfig(name: string): MqQueueConfig {
    const config = getMqQueueConfigs().find(it => it.queue === name)
    if (!config) throw new NoRetryError(`queue not found ${name}`)
    return config;
}
