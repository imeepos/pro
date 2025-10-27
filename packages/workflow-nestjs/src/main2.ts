import "reflect-metadata"
import "dotenv/config"

import { executeAst, fromJson, PlaywrightAst, useHandlers, WeiboSearchUrlBuilderAst, WorkflowGraphAst } from "@pro/workflow-core";
import { UserProfileVisitor } from "./visitors/user-profile.visitor";
import { WeiboSearchUrlBuilderAstVisitor } from "./WeiboSearchUrlBuilderAstVisitor";
import { root } from "@pro/core";
import { RedisClient } from '@pro/redis';
import { PlaywrightAstVisitor } from "./PlaywrightAstVisitor";

export async function runWorkflow() {
    useHandlers([
        UserProfileVisitor,
        WeiboSearchUrlBuilderAstVisitor,
        PlaywrightAstVisitor
    ])
    const redis = root.get(RedisClient)
    const item = await redis.get(`workflow`)
    if (!item) {
        await createWorkflow()
        return;
    }
    console.log(item)
    const w = fromJson(item)
    const node = await executeAst(w)
    await redis.set(`workflow`, JSON.stringify(node))
    console.log({ node: JSON.stringify(node, null, 2) })
}


export async function createWorkflow() {
    // 链接生成器
    const urlBuilder = new WeiboSearchUrlBuilderAst()
    urlBuilder.keyword = `国庆`
    urlBuilder.start = new Date(`2025-10-01 00:00:00`)
    urlBuilder.end = new Date();
    // 网页抓取器
    const playwright = new PlaywrightAst()
    const w = new WorkflowGraphAst()
        .addNode(urlBuilder)
        .addNode(playwright)
        .addEdge({ from: urlBuilder.id, fromProperty: 'url', to: playwright.id, toProperty: 'url' })

    const redis = root.get(RedisClient)
    await redis.set(`workflow`, JSON.stringify(w))
    return w;
}
runWorkflow();