类名清单及用途

@pro/cleaner

```ts
// 负责监听MQ消息并根据消息类型 进行任务处理
export class RawDataConsumer{}

// 微博关键字检索列表页面
export class WeiboKeywordSearchListPageProcesser {
    url: string;
    crawlDate: Date;//爬取时间
    async process(html: string) {
        // 负责从html中提取有效信息
        // 根据：crawlDate 计算时间相对时间 如：xx秒前
        // 提取帖子mid 发送抓取帖子详情任务到mq
    }
}

```