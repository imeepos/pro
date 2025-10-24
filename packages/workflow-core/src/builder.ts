/**
 * @pro/workflow-core - 工作流构建器
 *
 * 构建器是创造工作流的艺术家之手
 * 流畅的API设计如诗歌般优雅
 * 每个方法都是构建完美DAG的一笔
 */

import { IEdge } from './types';
import {
    WorkflowGraphAst,
    AstNode,
    createWorkflowGraph,
    HttpRequestNode,
    DataTransformNode,
    ConditionNode,
    LoopNode,
    CustomFunctionNode
} from './ast';

// 工作流构建器 - DAG的优雅创造者
export class WorkflowBuilder {
    private workflow: WorkflowGraphAst;
    private lastNodeId?: string;

    constructor(name?: string) {
        this.workflow = createWorkflowGraph(name);
    }

    // 添加任意节点到工作流
    addNode(node: AstNode): this {
        this.workflow.addNode(node);
        this.lastNodeId = node.id;
        return this;
    }

    // 添加HTTP请求节点
    http(
        url: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        headers?: Record<string, string>
    ): this {
        const node = new HttpRequestNode(url, method, headers);
        return this.addNode(node);
    }

    // 添加数据转换节点
    transform(transformFn: (data: any) => any): this {
        const node = new DataTransformNode(transformFn);
        return this.addNode(node);
    }

    // 添加条件判断节点
    when(conditionFn: (data: any) => boolean): this {
        const node = new ConditionNode(conditionFn);
        return this.addNode(node);
    }

    // 添加循环节点
    loop(
        loopCondition: (data: any) => boolean,
        maxIterations: number = 100
    ): this {
        const node = new LoopNode(loopCondition, maxIterations);
        return this.addNode(node);
    }

    // 添加自定义函数节点
    custom(
        executeFn: (inputs: Record<string, any>, context: any) => Promise<Record<string, any>>
    ): this {
        const node = new CustomFunctionNode(executeFn);
        return this.addNode(node);
    }

    // 连接节点 - 建立数据流动的通道
    connect(
        fromId: string,
        toId: string,
        fromProperty: string = 'output',
        toProperty: string = 'input'
    ): this {
        const edge: IEdge = {
            from: fromId,
            to: toId,
            fromProperty,
            toProperty
        };
        this.workflow.addEdge(edge);
        return this;
    }

    // 连接上一个节点到当前节点
    then(
        toId: string,
        fromProperty: string = 'output',
        toProperty: string = 'input'
    ): this {
        if (!this.lastNodeId) {
            throw new Error('No previous node to connect from');
        }
        return this.connect(this.lastNodeId, toId, fromProperty, toProperty);
    }

    // 创建并行分支
    parallel(...builders: WorkflowBuilder[]): this {
        if (!this.lastNodeId) {
            throw new Error('No previous node to branch from');
        }

        builders.forEach(builder => {
            const branchWorkflow = builder.build();
            // 将分支的所有节点添加到主工作流
            branchWorkflow.nodes.forEach(node => this.workflow.addNode(node));
            // 将分支的所有边添加到主工作流
            branchWorkflow.edges.forEach(edge => this.workflow.addEdge(edge));

            // 连接当前节点到分支的起始节点
            const firstNode = branchWorkflow.nodes[0];
            if (firstNode) {
                this.connect(this.lastNodeId!, firstNode.id);
            }
        });

        return this;
    }

    // 创建条件分支
    branch(
        conditionBuilder: WorkflowBuilder,
        elseBuilder?: WorkflowBuilder
    ): this {
        if (!this.lastNodeId) {
            throw new Error('No previous node to branch from');
        }

        const conditionWorkflow = conditionBuilder.build();

        // 添加条件节点
        conditionWorkflow.nodes.forEach(node => this.workflow.addNode(node));
        conditionWorkflow.edges.forEach(edge => this.workflow.addEdge(edge));

        // 连接条件分支
        const conditionNode = conditionWorkflow.nodes[0];
        if (conditionNode) {
            this.connect(this.lastNodeId, conditionNode.id);
        }

        // 添加else分支（如果存在）
        if (elseBuilder) {
            const elseWorkflow = elseBuilder.build();
            elseWorkflow.nodes.forEach(node => this.workflow.addNode(node));
            elseWorkflow.edges.forEach(edge => this.workflow.addEdge(edge));

            const elseNode = elseWorkflow.nodes[0];
            if (elseNode) {
                this.connect(this.lastNodeId, elseNode.id);
            }
        }

        return this;
    }

    // 设置工作流名称
    setName(name: string): this {
        this.workflow.name = name;
        return this;
    }

    // 构建最终的工作流
    build(): WorkflowGraphAst {
        // 验证工作流的完整性
        this.validateWorkflow();
        return this.workflow;
    }

    // 验证工作流的合理性
    private validateWorkflow(): void {
        if (this.workflow.nodes.length === 0) {
            throw new Error('Workflow must contain at least one node');
        }

        // 检查是否有重复的节点ID
        const nodeIds = this.workflow.nodes.map(node => node.id);
        const uniqueIds = new Set(nodeIds);
        if (nodeIds.length !== uniqueIds.size) {
            throw new Error('Workflow contains duplicate node IDs');
        }

        // 检查边的有效性
        const nodeIdSet = new Set(nodeIds);
        for (const edge of this.workflow.edges) {
            if (!nodeIdSet.has(edge.from) || !nodeIdSet.has(edge.to)) {
                throw new Error(`Invalid edge: node '${edge.from}' or '${edge.to}' does not exist`);
            }
        }

        // 检查是否有循环依赖（简单的DAG验证）
        if (this.hasCycles()) {
            throw new Error('Workflow contains cycles, which is not allowed in a DAG');
        }
    }

    // 检测工作流是否有循环
    private hasCycles(): boolean {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (nodeId: string): boolean => {
            if (recursionStack.has(nodeId)) {
                return true; // 发现循环
            }
            if (visited.has(nodeId)) {
                return false; // 已访问过，无循环
            }

            visited.add(nodeId);
            recursionStack.add(nodeId);

            // 访问所有依赖的节点
            const dependencies = this.workflow.getNodeDependencies(nodeId);
            for (const depId of dependencies) {
                if (hasCycle(depId)) {
                    return true;
                }
            }

            recursionStack.delete(nodeId);
            return false;
        };

        // 从每个节点开始检查
        for (const node of this.workflow.nodes) {
            if (!visited.has(node.id) && hasCycle(node.id)) {
                return true;
            }
        }

        return false;
    }

    // 获取当前工作流的节点数量
    get size(): number {
        return this.workflow.nodes.length;
    }

    // 获取当前工作流的边数量
    get edgeCount(): number {
        return this.workflow.edges.length;
    }

    // 克隆构建器状态
    clone(): WorkflowBuilder {
        const workflowName = this.workflow.name ?? '';
        const cloned = new WorkflowBuilder(workflowName);
        cloned.workflow = createWorkflowGraph(workflowName);

        // 深拷贝节点
        this.workflow.nodes.forEach(node => {
            // 这里需要根据具体的节点类型进行深拷贝
            // 为简化，这里只做浅拷贝
            const nodeCopy = Object.create(Object.getPrototypeOf(node));
            Object.assign(nodeCopy, node);
            cloned.workflow.addNode(nodeCopy);
        });

        // 深拷贝边
        this.workflow.edges.forEach(edge => {
            cloned.workflow.addEdge({ ...edge });
        });

        if (this.lastNodeId) {
            cloned.lastNodeId = this.lastNodeId;
        }
        return cloned;
    }
}

// 流畅的构建器工厂函数
export const createWorkflow = (name?: string): WorkflowBuilder =>
    new WorkflowBuilder(name);

// 便捷的并行构建器
export const parallel = (...builders: WorkflowBuilder[]): WorkflowBuilder => {
    const mainBuilder = createWorkflow('Parallel Workflow');
    return mainBuilder.parallel(...builders);
};

// 便捷的条件分支构建器
export const branch = (
    conditionBuilder: WorkflowBuilder,
    elseBuilder?: WorkflowBuilder
): WorkflowBuilder => {
    const mainBuilder = createWorkflow('Branch Workflow');
    return mainBuilder.branch(conditionBuilder, elseBuilder);
};