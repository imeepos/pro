import { root } from "@pro/core";
import { RabbitMQService } from "@pro/rabbitmq";
import {
    QUEUE_NAMES,
    WeiboDetailCrawlEvent,
    UserProfileCrawlEvent
} from "@pro/types";

interface WeiboListMessage {
    posts: Array<{ uid: string; mid: string; postAt: string | Date }>;
    hasNextPage: boolean;
    lastPostTime: string | Date | null;
    totalCount: number;
    nextPageLink?: string;
    currentPage: number;
    totalPage: number;
}

async function main() {
    await root.init()

    const rabbitMQService = root.get(RabbitMQService)

    rabbitMQService.consume(QUEUE_NAMES.WEIBO_LIST_CRAWL, async (message: WeiboListMessage) => {
        const startTime = Date.now()

        if (!message.posts || !Array.isArray(message.posts)) {
            console.warn('[WeiboListHandler] 消息格式错误：缺少 posts 数组')
            return
        }

        console.log(`[WeiboListHandler] 收到帖子列表，共 ${message.posts.length} 条`)

        // 提取唯一的 uid（去重）
        const uniqueUids = new Set<string>()
        const mids: string[] = []

        for (const post of message.posts) {
            if (post.uid) uniqueUids.add(post.uid)
            if (post.mid) mids.push(post.mid)
        }

        // 批量发送帖子详情爬取任务
        let detailSuccessCount = 0
        for (const mid of mids) {
            const event: WeiboDetailCrawlEvent = {
                statusId: mid,
            }

            try {
                await rabbitMQService.publish(QUEUE_NAMES.WEIBO_DETAIL_CRAWL, event)
                detailSuccessCount++
            } catch (error) {
                console.error(`[WeiboListHandler] 发送帖子详情任务失败 mid=${mid}:`, error)
            }
        }

        // 批量发送用户信息爬取任务
        let userSuccessCount = 0
        for (const uid of uniqueUids) {
            const event: UserProfileCrawlEvent = {
                userId: uid
            }

            try {
                await rabbitMQService.publish(QUEUE_NAMES.USER_PROFILE_CRAWL, event)
                userSuccessCount++
            } catch (error) {
                console.error(`[WeiboListHandler] 发送用户信息任务失败 uid=${uid}:`, error)
            }
        }

        const duration = Date.now() - startTime
        console.log(
            `[WeiboListHandler] 任务分发完成: ` +
            `帖子详情 ${detailSuccessCount}/${mids.length}, ` +
            `用户信息 ${userSuccessCount}/${uniqueUids.size}, ` +
            `耗时 ${duration}ms`
        )
    })

    console.log('[WeiboListHandler] 消费者已启动，等待消息...')
}

main();