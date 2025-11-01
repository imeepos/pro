import { InjectionToken, root, NoRetryError } from "@pro/core";

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

/**
 * 注册预定义的消息队列配置
 */
export function registerMqQueues() {
    root.set([
        {
            provide: MQ_QUEUE_CONFIG,
            useValue: { queue: 'weibo_keyword_search', dlq: 'weibo_keyword_search_dlq' },
            multi: true,
        },
        {
            provide: MQ_QUEUE_CONFIG,
            useValue: { queue: 'post_detail_crawl', dlq: 'post_detail_crawl_dlq' },
            multi: true,
        },
        {
            provide: MQ_QUEUE_CONFIG,
            useValue: { queue: 'user_info_crawl', dlq: 'user_info_crawl_dlq' },
            multi: true,
        },
    ]);
}
