import "reflect-metadata"
import "dotenv/config"

import { PlaywrightAst, useHandlers, WeiboSearchUrlBuilderAst, WorkflowGraphAst } from "@pro/workflow-core";
import { UserProfileVisitor } from "./visitors/user-profile.visitor";
import { WeiboSearchUrlBuilderAstVisitor } from "./WeiboSearchUrlBuilderAstVisitor";
import { root } from "@pro/core";
import { PlaywrightAstVisitor } from "./PlaywrightAstVisitor";
import { WorkflowService, WorkflowWithMetadata } from "./workflow.service";

/**
 * 运行 workflow 示例 - 使用单一版本架构 + 运行时状态追踪
 */
export async function runWorkflow() {
    useHandlers([
        UserProfileVisitor,
        WeiboSearchUrlBuilderAstVisitor,
        PlaywrightAstVisitor
    ]);

    const workflowService = root.get(WorkflowService);

    try {
        // 尝试从数据库获取已存在的 workflow
        let workflowMetadata = await workflowService.getWorkflowBySlug('weibo-1761572800189');

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

    // 构建 workflow 图
    const workflow = new WorkflowGraphAst()
        .addNode(urlBuilder)
        .addNode(playwright)
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

/**
 * 演示如何更新 workflow（单一版本模式）
 */
export async function updateWorkflowExample(workflowId: string): Promise<void> {
    const workflowService = root.get(WorkflowService);

    // 获取现有 workflow
    const existingWorkflow = await workflowService.getWorkflow(workflowId);
    if (!existingWorkflow) {
        throw new Error(`Workflow ${workflowId} not found`);
    }

    // 修改 workflow（例如：更新搜索关键词）
    const urlBuilder = new WeiboSearchUrlBuilderAst();
    urlBuilder.keyword = `国庆75周年`;
    urlBuilder.start = new Date(`2025-10-01 00:00:00`);
    urlBuilder.end = new Date();

    const playwright = new PlaywrightAst();

    const updatedWorkflow = new WorkflowGraphAst()
        .addNode(urlBuilder)
        .addNode(playwright)
        .addEdge({
            from: urlBuilder.id,
            fromProperty: 'url',
            to: playwright.id,
            toProperty: 'url'
        });

    // 更新 workflow（直接覆盖）
    await workflowService.updateWorkflow(
        workflowId,
        updatedWorkflow,
        {
            description: '更新搜索关键词为"国庆75周年"',
            updatedBy: 'system'
        }
    );

    console.log(`Workflow ${workflowId} updated successfully`);
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
    runWorkflow().catch(console.error);
}