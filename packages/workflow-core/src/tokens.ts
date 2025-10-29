import { root } from "@pro/core";
import { MQ_QUEUE_CONFIG } from "@pro/rabbitmq";

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
