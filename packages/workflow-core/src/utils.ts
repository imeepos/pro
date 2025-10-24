/**
 * @pro/workflow-core - 工具函数集合
 *
 * 工具函数是工作流的瑞士军刀
 * 它们小巧、精悍、不可或缺
 * 每个函数都为特定使命而生
 */

import { AstState } from './types';
import { WorkflowGraphAst, AstNode } from './ast';

// ID生成器 - 创建唯一标识符
export function generateId(prefix: string = 'node'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
}

// 深度克隆对象 - 保持数据的纯净性
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as any;
    }

    if (obj instanceof Array) {
        return obj.map(item => deepClone(item)) as any;
    }

    if (typeof obj === 'object') {
        const cloned = {} as any;
        Object.keys(obj).forEach(key => {
            cloned[key] = deepClone((obj as any)[key]);
        });
        return cloned;
    }

    return obj;
}

// 查找工作流的起始节点 - 流程的源头
export function findStartNodes(workflow: WorkflowGraphAst): AstNode[] {
    if (!workflow.nodes.length) return [];
    const targetNodeIds = new Set(workflow.edges.map(edge => edge.to));
    return workflow.nodes.filter(node => !targetNodeIds.has(node.id));
}

// 查找工作流的结束节点 - 流程的终点
export function findEndNodes(workflow: WorkflowGraphAst): AstNode[] {
    if (!workflow.nodes.length) return [];
    const sourceNodeIds = new Set(workflow.edges.map(edge => edge.from));
    return workflow.nodes.filter(node => !sourceNodeIds.has(node.id));
}

// 拓扑排序 - DAG的线性化表示
export function topologicalSort(workflow: WorkflowGraphAst): AstNode[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: AstNode[] = [];

    const visit = (nodeId: string): void => {
        if (visiting.has(nodeId)) {
            throw new Error(`Cycle detected involving node: ${nodeId}`);
        }
        if (visited.has(nodeId)) {
            return;
        }

        visiting.add(nodeId);

        const dependencies = workflow.getNodeDependencies(nodeId);
        dependencies.forEach(depId => visit(depId));

        visiting.delete(nodeId);
        visited.add(nodeId);

        const node = workflow.findNode(nodeId);
        if (node) {
            result.push(node);
        }
    };

    workflow.nodes.forEach(node => {
        if (!visited.has(node.id)) {
            visit(node.id);
        }
    });

    return result;
}

// 计算工作流的关键路径 - 最重要的执行路径
export function findCriticalPath(workflow: WorkflowGraphAst): AstNode[] {
    const sortedNodes = topologicalSort(workflow);
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string>();

    // 初始化距离
    workflow.nodes.forEach(node => {
        distances.set(node.id, 0);
    });

    // 动态规划计算最长路径
    for (const node of sortedNodes) {
        const dependencies = workflow.getNodeDependencies(node.id);
        let maxDistance = 0;

        for (const depId of dependencies) {
            const depDistance = distances.get(depId) || 0;
            if (depDistance > maxDistance) {
                maxDistance = depDistance;
                predecessors.set(node.id, depId);
            }
        }

        distances.set(node.id, maxDistance + 1);
    }

    // 找到最长路径的终点
    let endNodeId = '';
    let maxDistance = 0;

    distances.forEach((distance, nodeId) => {
        if (distance > maxDistance) {
            maxDistance = distance;
            endNodeId = nodeId;
        }
    });

    // 回溯构建关键路径
    const criticalPath: AstNode[] = [];
    let currentId = endNodeId;

    while (currentId) {
        const node = workflow.findNode(currentId);
        if (node) {
            criticalPath.unshift(node);
        }
        currentId = predecessors.get(currentId) || '';
    }

    return criticalPath;
}

// 计算工作流的统计信息
export function calculateWorkflowStats(workflow: WorkflowGraphAst): {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<string, number>;
    nodesByState: Record<AstState, number>;
    maxDepth: number;
    avgBranchingFactor: number;
} {
    const stats = {
        totalNodes: workflow.nodes.length,
        totalEdges: workflow.edges.length,
        nodesByType: {} as Record<string, number>,
        nodesByState: {
            pending: 0,
            running: 0,
            success: 0,
            fail: 0
        },
        maxDepth: 0,
        avgBranchingFactor: 0
    };

    // 统计节点类型和状态
    workflow.nodes.forEach(node => {
        stats.nodesByType[node.type] = (stats.nodesByType[node.type] || 0) + 1;
        stats.nodesByState[node.state]++;
    });

    // 计算最大深度
    const criticalPath = findCriticalPath(workflow);
    stats.maxDepth = criticalPath.length;

    // 计算平均分支因子
    const branchCounts = workflow.nodes.map(node =>
        workflow.getNodeDependents(node.id).length
    );
    stats.avgBranchingFactor = branchCounts.length > 0
        ? branchCounts.reduce((sum, count) => sum + count, 0) / branchCounts.length
        : 0;

    return stats;
}

// 验证工作流的完整性
export function validateWorkflow(workflow: WorkflowGraphAst): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查基本结构
    if (workflow.nodes.length === 0) {
        errors.push('Workflow must contain at least one node');
    }

    // 检查节点ID唯一性
    const nodeIds = workflow.nodes.map(node => node.id);
    const uniqueIds = new Set(nodeIds);
    if (nodeIds.length !== uniqueIds.size) {
        errors.push('Workflow contains duplicate node IDs');
    }

    // 检查边的有效性
    const nodeIdSet = new Set(nodeIds);
    workflow.edges.forEach(edge => {
        if (!nodeIdSet.has(edge.from)) {
            errors.push(`Invalid edge: source node '${edge.from}' does not exist`);
        }
        if (!nodeIdSet.has(edge.to)) {
            errors.push(`Invalid edge: target node '${edge.to}' does not exist`);
        }
    });

    // 检查是否有循环
    try {
        topologicalSort(workflow);
    } catch (error) {
        errors.push('Workflow contains cycles');
    }

    // 检查孤立节点
    const connectedNodes = new Set<string>();
    workflow.edges.forEach(edge => {
        connectedNodes.add(edge.from);
        connectedNodes.add(edge.to);
    });

    const isolatedNodes = workflow.nodes.filter(node => !connectedNodes.has(node.id));
    if (isolatedNodes.length > 0) {
        warnings.push(`Found ${isolatedNodes.length} isolated nodes`);
    }

    // 检查不可达节点
    const startNodes = findStartNodes(workflow);
    const reachableNodes = new Set<string>();

    const bfsTraversal = (nodeIds: string[]): void => {
        for (const nodeId of nodeIds) {
            if (reachableNodes.has(nodeId)) continue;

            reachableNodes.add(nodeId);
            const dependents = workflow.getNodeDependents(nodeId);
            bfsTraversal(dependents);
        }
    };

    bfsTraversal(startNodes.map(node => node.id));

    const unreachableNodes = workflow.nodes.filter(node => !reachableNodes.has(node.id));
    if (unreachableNodes.length > 0) {
        warnings.push(`Found ${unreachableNodes.length} unreachable nodes`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

// 格式化工作流为DOT语言 - 可视化支持
export function toDotFormat(workflow: WorkflowGraphAst): string {
    const lines: string[] = [];

    lines.push('digraph Workflow {');
    lines.push('  rankdir=LR;');
    lines.push('  node [shape=box];');

    // 添加节点
    workflow.nodes.forEach(node => {
        const label = node.type === 'WorkflowGraph'
            ? `${(node as any).name || 'Workflow'}\\n(${node.state})`
            : `${node.type}\\n(${node.state})`;

        const color = node.state === 'success' ? 'green' :
                     node.state === 'fail' ? 'red' :
                     node.state === 'running' ? 'yellow' : 'gray';

        lines.push(`  "${node.id}" [label="${label}", fillcolor="${color}", style=filled];`);
    });

    // 添加边
    workflow.edges.forEach(edge => {
        lines.push(`  "${edge.from}" -> "${edge.to}" [label="${edge.fromProperty} → ${edge.toProperty}"];`);
    });

    lines.push('}');
    return lines.join('\n');
}

// 序列化工作流为JSON
export function serializeWorkflow(workflow: WorkflowGraphAst): string {
    return JSON.stringify(workflow, null, 2);
}

// 从JSON反序列化工作流
export function deserializeWorkflow(json: string): WorkflowGraphAst {
    const data = JSON.parse(json);

    // 这里需要更复杂的逻辑来重建对象关系
    // 简化实现，实际使用时需要完整的重建逻辑
    if (!data) {
        throw new Error('Invalid workflow data');
    }
    return data as WorkflowGraphAst;
}

// 合并多个工作流
export function mergeWorkflows(...workflows: WorkflowGraphAst[]): WorkflowGraphAst {
    if (workflows.length === 0) {
        throw new Error('At least one workflow is required');
    }

    if (workflows.length === 1) {
        return workflows[0]!;
    }

    const merged = new WorkflowGraphAst(
        `Merged: ${workflows.map(w => w.name || 'Unnamed').join(', ')}`
    );

    const nodeIdMap = new Map<string, string>();

    // 合并所有节点，避免ID冲突
    workflows.forEach((workflow, workflowIndex) => {
        workflow.nodes.forEach(node => {
            const newId = `${node.id}_w${workflowIndex}`;
            nodeIdMap.set(node.id, newId);

            // 克隆节点并设置新ID
            const clonedNode = deepClone(node);
            (clonedNode as any).id = newId;
            merged.addNode(clonedNode);
        });
    });

    // 合并所有边，更新节点ID引用
    workflows.forEach(workflow => {
        workflow.edges.forEach(edge => {
            const newEdge = {
                from: nodeIdMap.get(edge.from) || edge.from,
                to: nodeIdMap.get(edge.to) || edge.to,
                fromProperty: edge.fromProperty,
                toProperty: edge.toProperty
            };
            merged.addEdge(newEdge);
        });
    });

    return merged;
}

// 性能测量工具
export class PerformanceMonitor {
    private measurements: Map<string, number[]> = new Map();

    startMeasurement(name: string): () => void {
        const startTime = performance.now();

        return () => {
            const endTime = performance.now();
            const duration = endTime - startTime;

            if (!this.measurements.has(name)) {
                this.measurements.set(name, []);
            }

            this.measurements.get(name)!.push(duration);
        };
    }

    getStatistics(name: string): {
        count: number;
        total: number;
        average: number;
        min: number;
        max: number;
    } | null {
        const measurements = this.measurements.get(name);
        if (!measurements || measurements.length === 0) {
            return null;
        }

        return {
            count: measurements.length,
            total: measurements.reduce((sum, val) => sum + val, 0),
            average: measurements.reduce((sum, val) => sum + val, 0) / measurements.length,
            min: Math.min(...measurements),
            max: Math.max(...measurements)
        };
    }

    clear(): void {
        this.measurements.clear();
    }
}

// 延迟执行工具
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 重试工具
export async function retry<T>(
    fn: () => Promise<T>,
    attempts: number = 3,
    delayMs: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (i < attempts - 1) {
                await delay(delayMs * Math.pow(2, i)); // 指数退避
            }
        }
    }

    throw lastError!;
}