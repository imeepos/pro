/**
 * @pro/workflow-core - 工作流执行器
 *
 * 执行器是工作流生命力的源泉
 * 它调度节点，管理状态，处理并行
 * 每一次执行都是一场精心编排的舞蹈
 */

import { Context, IEdge, IExecutionResult, IWorkflowConfig } from './types';
import { WorkflowGraphAst, AstNode, BaseWorkflowNode } from './ast';
import { IVisitor } from './types';

// 工作流执行器 - DAG的指挥家
export class WorkflowExecutor implements IVisitor {
    private config: Required<IWorkflowConfig>;
    private executionHistory: Map<string, IExecutionResult[]> = new Map();

    constructor(config: IWorkflowConfig = {}) {
        this.config = {
            maxConcurrency: config.maxConcurrency ?? 10,
            timeout: config.timeout ?? 300000, // 5分钟默认超时
            retryAttempts: config.retryAttempts ?? 3
        };
    }

    // 访问者入口 - 执行的起点
    async visit(node: AstNode, context: Context): Promise<AstNode> {
        try {
            if (node instanceof WorkflowGraphAst) {
                return await this.executeWorkflowGraph(node, context);
            } else if (node instanceof BaseWorkflowNode) {
                return await this.executeSingleNode(node, context);
            } else {
                throw new Error(`Unsupported node type: ${(node as any).type}`);
            }
        } catch (error) {
            node.state = 'fail';
            throw new Error(
                `Failed to execute node ${node.id}: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    // 执行工作流图 - DAG的核心执行逻辑
    private async executeWorkflowGraph(
        workflow: WorkflowGraphAst,
        context: Context
    ): Promise<WorkflowGraphAst> {
        // 状态检查：只有pending状态的才能执行
        if (workflow.state === 'success' || workflow.state === 'fail') {
            return workflow;
        }

        workflow.state = 'running';
        const executionId = `${workflow.id}_${Date.now()}`;

        try {
            // 持续执行直到所有节点完成
            while (workflow.state === 'running') {
                const executableNodes = this.findExecutableNodes(workflow);

                if (executableNodes.length === 0) {
                    // 没有可执行节点，检查是否全部完成
                    if (this.areAllNodesCompleted(workflow.nodes)) {
                        workflow.state = this.hasFailures(workflow.nodes) ? 'fail' : 'success';
                        break;
                    } else {
                        // 存在死锁或循环依赖
                        throw new Error(
                            'Workflow deadlock detected: no executable nodes found'
                        );
                    }
                }

                // 并行执行当前批次的节点
                const results = await this.executeNodeBatch(
                    executableNodes,
                    workflow.edges,
                    context
                );

                // 合并执行结果
                this.mergeExecutionResults(workflow, results);
            }

            // 记录执行历史
            this.recordExecutionHistory(executionId, workflow);

            return workflow;
        } catch (error) {
            workflow.state = 'fail';
            throw error;
        }
    }

    // 查找当前可执行的节点（依赖已满足）
    private findExecutableNodes(workflow: WorkflowGraphAst): AstNode[] {
        const completedNodes = new Set(
            workflow.nodes
                .filter(node => node.state === 'success')
                .map(node => node.id)
        );

        return workflow.nodes.filter(node => {
            if (node.state !== 'pending') return false;

            // 检查所有前置依赖是否已完成
            const dependencies = workflow.getNodeDependencies(node.id);
            return dependencies.every(depId => completedNodes.has(depId));
        });
    }

    // 并行执行节点批次
    private async executeNodeBatch(
        nodes: AstNode[],
        edges: IEdge[],
        context: Context
    ): Promise<IExecutionResult[]> {
        // 限制并发数量
        const batches = this.createBatches(nodes, this.config.maxConcurrency);
        const allResults: IExecutionResult[] = [];

        for (const batch of batches) {
            // 准备输入数据
            this.prepareNodeInputs(batch, edges, allResults);

            // 并行执行当前批次
            const batchPromises = batch.map(async (node) => {
                const startTime = Date.now();

                try {
                    const result = await this.executeWithTimeout(
                        () => this.executeSingleNode(node, context),
                        this.config.timeout
                    );

                    return {
                        node: result,
                        outputs: this.extractOutputs(result)
                    };
                } catch (error) {
                    // 重试逻辑
                    let lastError = error;
                    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
                        try {
                            const result = await this.executeWithTimeout(
                                () => this.executeSingleNode(node, context),
                                this.config.timeout
                            );

                            return {
                                node: result,
                                outputs: this.extractOutputs(result)
                            };
                        } catch (retryError) {
                            lastError = retryError;
                            // 等待一段时间后重试
                            await this.delay(Math.pow(2, attempt) * 1000); // 指数退避
                        }
                    }

                    // 所有重试都失败
                    (node as any).state = 'fail';
                    throw lastError;
                } finally {
                    // 记录执行时间
                    const executionTime = Date.now() - startTime;
                    console.debug(`Node ${node.id} executed in ${executionTime}ms`);
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);

            // 处理批次结果
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    allResults.push(result.value);
                } else {
                    console.error('Node execution failed:', result.reason);
                    // 可以选择是否继续执行其他节点
                }
            }
        }

        return allResults;
    }

    // 执行单个节点
    private async executeSingleNode(
        node: AstNode,
        context: Context
    ): Promise<AstNode> {
        if (node.state !== 'pending') {
            return node;
        }

        node.state = 'running';

        try {
            // 根据节点类型执行不同的逻辑
            if (node instanceof BaseWorkflowNode) {
                await this.executeBaseNode(node, context);
            } else {
                // 对于其他类型的节点，直接调用accept方法
                await node.accept(this, context);
                node.state = 'success';
            }

            return node;
        } catch (error) {
            node.state = 'fail';
            throw error;
        }
    }

    // 执行基础工作流节点
    private async executeBaseNode(
        node: BaseWorkflowNode,
        _context: Context
    ): Promise<void> {
        const nodeType = node.type;

        switch (nodeType) {
            case 'HttpRequest':
                await this.executeHttpRequest(node as any, node.getAllInputs(), _context);
                break;
            case 'DataTransform':
                await this.executeDataTransform(node as any, node.getAllInputs(), _context);
                break;
            case 'Condition':
                await this.executeCondition(node as any, node.getAllInputs(), _context);
                break;
            case 'Loop':
                await this.executeLoop(node as any, node.getAllInputs(), _context);
                break;
            case 'CustomFunction':
                await this.executeCustomFunction(node as any, node.getAllInputs(), _context);
                break;
            default:
                throw new Error(`Unknown node type: ${nodeType}`);
        }

        node.state = 'success';
    }

    // 执行HTTP请求节点
    private async executeHttpRequest(
        node: any,
        _inputs: Record<string, any>,
        _context: Context
    ): Promise<void> {
        // 这里是示例实现，实际使用时可能需要更复杂的HTTP客户端
        const { url, method = 'GET', headers = {} } = node;

        try {
            // 模拟HTTP请求
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            });

            const data = await response.json();
            node.setOutput('response', data);
            node.setOutput('status', response.status);
        } catch (error) {
            node.setOutput('error', error);
            throw error;
        }
    }

    // 执行数据转换节点
    private async executeDataTransform(
        node: any,
        inputs: Record<string, any>,
        _context: Context
    ): Promise<void> {
        const { transformFn } = node;
        const inputData = inputs['data'] || Object.values(inputs)[0];

        try {
            const result = await transformFn(inputData);
            node.setOutput('result', result);
        } catch (error) {
            node.setOutput('error', error);
            throw error;
        }
    }

    // 执行条件判断节点
    private async executeCondition(
        node: any,
        inputs: Record<string, any>,
        _context: Context
    ): Promise<void> {
        const { conditionFn } = node;
        const inputData = inputs['data'] || Object.values(inputs)[0];

        try {
            const result = await conditionFn(inputData);
            node.setOutput('result', result);
        } catch (error) {
            node.setOutput('error', error);
            throw error;
        }
    }

    // 执行循环节点
    private async executeLoop(
        node: any,
        inputs: Record<string, any>,
        _context: Context
    ): Promise<void> {
        const { loopCondition, maxIterations } = node;
        const inputData = inputs['data'] || Object.values(inputs)[0];

        try {
            let iteration = 0;
            let currentData = inputData;

            while (iteration < maxIterations && await loopCondition(currentData)) {
                iteration++;
                // 这里可以执行循环体，但需要额外的配置
                currentData = { ...currentData, iteration };
            }

            node.setOutput('result', currentData);
            node.setOutput('iterations', iteration);
        } catch (error) {
            node.setOutput('error', error);
            throw error;
        }
    }

    // 执行自定义函数节点
    private async executeCustomFunction(
        node: any,
        inputs: Record<string, any>,
        context: Context
    ): Promise<void> {
        const { executeFn } = node;

        try {
            const result = await executeFn(inputs, context);

            // 将结果的所有属性设置为输出
            Object.entries(result).forEach(([key, value]) => {
                node.setOutput(key, value);
            });
        } catch (error) {
            node.setOutput('error', error);
            throw error;
        }
    }

    // 准备节点输入数据
    private prepareNodeInputs(
        nodes: AstNode[],
        edges: IEdge[],
        previousResults: IExecutionResult[]
    ): void {
        const outputsMap = new Map<string, Record<string, any>>();

        // 收集所有已完成的输出
        previousResults.forEach(result => {
            outputsMap.set(result.node.id, result.outputs || {});
        });

        // 为每个节点分配输入
        nodes.forEach(node => {
            if (node instanceof BaseWorkflowNode) {
                const incomingEdges = edges.filter(edge => edge.to === node.id);

                incomingEdges.forEach(edge => {
                    const sourceOutputs = outputsMap.get(edge.from);
                    if (!sourceOutputs) return;

                    if (edge.fromProperty && edge.toProperty) {
                        const sourceValue = sourceOutputs[edge.fromProperty];
                        if (sourceValue !== undefined) {
                            node.setInput(edge.toProperty, sourceValue);
                        }
                    }
                });
            }
        });
    }

    // 提取节点输出
    private extractOutputs(node: AstNode): Record<string, any> {
        if (node instanceof BaseWorkflowNode) {
            return node.getAllOutputs();
        }
        return {};
    }

    // 合并执行结果
    private mergeExecutionResults(
        workflow: WorkflowGraphAst,
        results: IExecutionResult[]
    ): void {
        results.forEach(({ node }) => {
            const existingNode = workflow.findNode(node.id);
            if (existingNode) {
                // 更新节点状态
                existingNode.state = node.state;

                // 如果是基础节点，更新输出
                if (existingNode instanceof BaseWorkflowNode && node instanceof BaseWorkflowNode) {
                    Object.keys(node.getAllOutputs()).forEach(key => {
                        existingNode.setOutput(key, node.getOutput(key));
                    });
                }
            }
        });
    }

    // 检查是否所有节点都已完成
    private areAllNodesCompleted(nodes: AstNode[]): boolean {
        return nodes.every(node => node.state === 'success' || node.state === 'fail');
    }

    // 检查是否有失败的节点
    private hasFailures(nodes: AstNode[]): boolean {
        return nodes.some(node => node.state === 'fail');
    }

    // 创建批次（限制并发数量）
    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    // 带超时的执行
    private async executeWithTimeout<T>(
        fn: () => Promise<T>,
        timeout: number
    ): Promise<T> {
        return Promise.race([
            fn(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Execution timeout')), timeout)
            )
        ]);
    }

    // 延迟函数
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 记录执行历史
    private recordExecutionHistory(executionId: string, workflow: WorkflowGraphAst): void {
        const results: IExecutionResult[] = workflow.nodes.map(node => ({
            node,
            outputs: this.extractOutputs(node)
        }));

        this.executionHistory.set(executionId, results);
    }

    // 获取执行历史
    getExecutionHistory(executionId?: string): Map<string, IExecutionResult[]> | IExecutionResult[] {
        if (executionId) {
            return this.executionHistory.get(executionId) || [];
        }
        return this.executionHistory;
    }

    // 清除执行历史
    clearExecutionHistory(): void {
        this.executionHistory.clear();
    }
}

// 便捷的执行函数
export const executeWorkflow = async (
    workflow: WorkflowGraphAst,
    context: Context = {},
    config?: IWorkflowConfig
): Promise<WorkflowGraphAst> => {
    const executor = new WorkflowExecutor(config);
    const result = await executor.visit(workflow, context);
    return result as WorkflowGraphAst;
};