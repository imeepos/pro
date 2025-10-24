/**
 * @pro/workflow-core - 基本使用示例
 */

import {
    createWorkflow,
    executeWorkflow,
    IWorkflowConfig
} from './index';

// 创建一个简单的工作流示例
async function basicExample() {
    console.log('开始创建工作流...');

    // 创建工作流
    const workflow = createWorkflow('示例工作流')
        .http('https://jsonplaceholder.typicode.com/posts/1')
        .transform(data => ({ title: data.title, id: data.id }))
        .custom(async (inputs, _context) => {
            console.log('处理数据:', inputs);
            return { processed: true, timestamp: Date.now() };
        })
        .build();

    console.log('工作流创建完成，开始执行...');

    // 执行配置
    const config: IWorkflowConfig = {
        maxConcurrency: 2,
        timeout: 30000,
        retryAttempts: 1
    };

    try {
        // 执行工作流
        const result = await executeWorkflow(workflow, {}, config);
        console.log('工作流执行结果:', result.state);

        // 输出节点的输出数据
        result.nodes.forEach(node => {
            if ((node as any).getAllOutputs) {
                const outputs = (node as any).getAllOutputs();
                if (Object.keys(outputs).length > 0) {
                    console.log(`节点 ${node.type} 输出:`, outputs);
                }
            }
        });
    } catch (error) {
        console.error('工作流执行失败:', error);
    }
}

// 运行示例
if (require.main === module) {
    basicExample().catch(console.error);
}

export { basicExample };