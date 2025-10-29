import "reflect-metadata"
import "dotenv/config"

import { HtmlParserAst, PlaywrightAst, useHandlers, WeiboAccountAst, WeiboSearchUrlBuilderAst, WorkflowGraphAst, MqPublisherAst } from "@pro/workflow-core";
import { UserProfileVisitor } from "./visitors/user-profile.visitor";
import { WeiboSearchUrlBuilderAstVisitor } from "./WeiboSearchUrlBuilderAstVisitor";
import { root } from "@pro/core";
import { PlaywrightAstVisitor } from "./PlaywrightAstVisitor";
import { WorkflowService, WorkflowWithMetadata } from "./workflow.service";
import { WeiboAccountAstVisitor } from "./WeiboAccountAstVisitor";
import { HtmlParserAstVisitor } from "./HtmlParserAstVisitor";
import { MqPublisherAstVisitor } from "./MqPublisherAstVisitor";
import { QUEUE_NAMES } from "@pro/types";

/**
 * 运行 workflow 示例 - 使用单一版本架构 + 运行时状态追踪
 */
export async function runWeiBoKeywordSearchWorkflow(keyword: string, startDate: Date) {
    useHandlers([
        UserProfileVisitor,
        WeiboSearchUrlBuilderAstVisitor,
        PlaywrightAstVisitor,
        WeiboAccountAstVisitor,
        HtmlParserAstVisitor,
        MqPublisherAstVisitor
    ]);
    
    const workflowService = root.get(WorkflowService);
    try {
        // 尝试从数据库获取已存在的 workflow
        let workflowMetadata = await workflowService.getWorkflowBySlug('weibo-keyworkd-search');
        if (!workflowMetadata) {
            workflowMetadata = await creatWeiBoKeywordSearcheWorkflow();
        }
        // 执行 workflow 并记录执行历史和运行时状态
        const { state } = await workflowService.executeWorkflow(
            workflowMetadata.id,
            'system',
            { keyword: keyword, startDate: startDate }
        )
        return state
    } catch (error) {
        throw error;
    }
}

/**
 * 创建并持久化 workflow - 使用单一版本架构
 */
export async function creatWeiBoKeywordSearcheWorkflow(): Promise<WorkflowWithMetadata> {
    // 链接生成器
    const urlBuilder = new WeiboSearchUrlBuilderAst();
    urlBuilder.keyword = `国庆`;
    urlBuilder.start = new Date(`2025-10-01 00:00:00`);
    urlBuilder.end = new Date();

    // 网页抓取器
    const playwright = new PlaywrightAst();
    const account = new WeiboAccountAst();
    const htmlParserAst = new HtmlParserAst()
    const mqPublisher = new MqPublisherAst()
    mqPublisher.queue = QUEUE_NAMES.WEIBO_LIST_CRAWL;

    // 构建 workflow 图
    const workflow = new WorkflowGraphAst()
        .addNode(urlBuilder)
        .addNode(playwright)
        .addNode(account)
        .addNode(htmlParserAst)
        .addNode(mqPublisher)
        .addEdge({
            from: urlBuilder.id,
            to: htmlParserAst.id,
            fromProperty: `start`,
            toProperty: `startDate`
        })
        .addEdge({
            from: htmlParserAst.id,
            to: mqPublisher.id,
            fromProperty: 'result',
            toProperty: 'event'
        })
        // 分支1: 有下一页 → 继续爬取下一页（直接使用 nextPageLink，不触发 urlBuilder）
        .addEdge({
            from: htmlParserAst.id,
            to: playwright.id,
            fromProperty: "nextPageLink",
            toProperty: 'url',
            condition: {
                property: "hasNextPage",
                value: true
            }
        })
        // 分支2: 50页封顶 OR 当前范围爬完但还有更早数据 → 缩小日期范围重新搜索
        .addEdge({
            from: htmlParserAst.id,
            to: urlBuilder.id,
            fromProperty: `nextEndDate`,
            toProperty: `end`,
            condition: {
                property: `hasNextSearch`,
                value: true
            }
        })
        .addEdge({
            from: playwright.id,
            to: htmlParserAst.id,
            fromProperty: 'html',
            toProperty: 'html'
        })
        .addEdge({
            from: account.id,
            fromProperty: `cookies`,
            to: playwright.id,
            toProperty: `cookies`
        })
        .addEdge({
            from: account.id,
            to: playwright.id,
            fromProperty: 'userAgent',
            toProperty: `ua`
        })
        .addEdge({
            from: urlBuilder.id,
            fromProperty: 'url',
            to: playwright.id,
            toProperty: 'url'
        });

    // 使用 WorkflowService 持久化
    const workflowService = root.get(WorkflowService);

    try {
        const savedWorkflow = await workflowService.createWorkflow(
            '微博关键字搜索',
            workflow,
            "weibo-keyworkd-search",
            {
                description: '搜索微博上关于国庆节的内容',
                tags: ['weibo', 'search', 'national-day'],
                createdBy: 'system',
            }
        );

        // 返回包含元数据的对象
        return {
            workflow,
            id: savedWorkflow.id,
            name: savedWorkflow.name,
            slug: savedWorkflow.slug,
            description: savedWorkflow.description,
            tags: savedWorkflow.tags
        };
    } catch (error) {
        throw error;
    }
}
