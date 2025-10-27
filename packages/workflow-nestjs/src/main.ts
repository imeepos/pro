import "reflect-metadata"
import "dotenv/config"

console.log('[main] Starting imports...');

import { HtmlParserAst, PlaywrightAst, useHandlers, WeiboAccountAst, WeiboSearchUrlBuilderAst, WorkflowGraphAst } from "@pro/workflow-core";
console.log('[main] Imported workflow-core');

import { UserProfileVisitor } from "./visitors/user-profile.visitor";
console.log('[main] Imported UserProfileVisitor');

import { WeiboSearchUrlBuilderAstVisitor } from "./WeiboSearchUrlBuilderAstVisitor";
console.log('[main] Imported WeiboSearchUrlBuilderAstVisitor');

import { root } from "@pro/core";
console.log('[main] Imported root from core');

import { PlaywrightAstVisitor } from "./PlaywrightAstVisitor";
console.log('[main] Imported PlaywrightAstVisitor');

import { WorkflowService, WorkflowWithMetadata } from "./workflow.service";
console.log('[main] Imported WorkflowService');

import { WeiboAccountAstVisitor } from "./WeiboAccountAstVisitor";
console.log('[main] Imported WeiboAccountAstVisitor');

import { HtmlParserAstVisitor } from "./HtmlParserAstVisitor";
console.log('[main] Imported HtmlParserAstVisitor');
console.log('[main] All imports completed');

/**
 * 运行 workflow 示例 - 使用单一版本架构 + 运行时状态追踪
 */
export async function runWorkflow() {
    console.log('[runWorkflow] Function started');

    console.log('[runWorkflow] Registering handlers...');
    useHandlers([
        UserProfileVisitor,
        WeiboSearchUrlBuilderAstVisitor,
        PlaywrightAstVisitor,
        WeiboAccountAstVisitor,
        HtmlParserAstVisitor
    ]);
    console.log('[runWorkflow] Handlers registered');

    console.log('[runWorkflow] Getting WorkflowService from root container...');
    const workflowService = root.get(WorkflowService);
    console.log('[runWorkflow] WorkflowService obtained');

    try {
        // 尝试从数据库获取已存在的 workflow
        console.log('[runWorkflow] Calling getWorkflowBySlug...');
        let workflowMetadata = await workflowService.getWorkflowBySlug('weibo-1761572800189');
        console.log('[runWorkflow] getWorkflowBySlug returned:', workflowMetadata ? 'found' : 'not found');

        if (!workflowMetadata) {
            console.log('Workflow not found, creating new one...');
            workflowMetadata = await createWorkflow();
        }

        // 执行 workflow 并记录执行历史和运行时状态
        console.log('Executing workflow...');
        const { execution, state, result } = await workflowService.executeWorkflow(
            workflowMetadata.id,
            'system',
            { keyword: '国庆', startDate: '2025-10-01' }
        );

        console.log(`Workflow executed successfully in ${execution.durationMs}ms`);
        console.log('Execution ID:', execution.id);
        console.log('State ID:', state.id);
        console.log('Final Status:', state.status);
        console.log('Result:', JSON.stringify(result, null, 2));

        // 获取执行历史
        const history = await workflowService.getExecutionHistory(workflowMetadata.id);
        console.log(`Total executions: ${history.length}`);

        // 查询当前执行的运行时状态
        const currentState = await workflowService.getExecutionState(execution.id);
        console.log('Current State:', currentState?.status);

        process.exit(0)

    } catch (error) {
        console.error('Workflow execution failed:', error);
        throw error;
    }
}

/**
 * 创建并持久化 workflow - 使用单一版本架构
 */
export async function createWorkflow(): Promise<WorkflowWithMetadata> {
    // 链接生成器
    const urlBuilder = new WeiboSearchUrlBuilderAst();
    urlBuilder.keyword = `国庆`;
    urlBuilder.start = new Date(`2025-10-01 00:00:00`);
    urlBuilder.end = new Date();

    // 网页抓取器
    const playwright = new PlaywrightAst();
    const account = new WeiboAccountAst();
    const htmlParserAst = new HtmlParserAst()

    // 构建 workflow 图
    const workflow = new WorkflowGraphAst()
        .addNode(urlBuilder)
        .addNode(playwright)
        .addNode(account)
        .addNode(htmlParserAst)
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
            'Weibo搜索-国庆节',
            workflow,
            {
                description: '搜索微博上关于国庆节的内容',
                tags: ['weibo', 'search', 'national-day'],
                createdBy: 'system',
            }
        );

        console.log(`Workflow created with ID: ${savedWorkflow.id}`);
        console.log(`Slug: ${savedWorkflow.slug}`);

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
        console.error('Failed to create workflow:', error);
        throw error;
    }
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
    runWorkflow().catch(console.error);
}