import "reflect-metadata";
import "dotenv/config";
import { root } from "@pro/core";
import { registerMqQueues } from "@pro/workflow-core";
import { createWeiboKeywordSearchQueue } from "./utils";

async function main() {
    registerMqQueues()
    await root.init()
    const mq = createWeiboKeywordSearchQueue()
    mq.producer.next({ keyword: `国庆`, start: new Date(`2025-10-28 00:00:00`), end: new Date() })
    console.log('[WeiboListHandler] 消费者已启动，等待消息...')
}

main();