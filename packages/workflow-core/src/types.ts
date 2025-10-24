/**
 * @pro/workflow-core - DAG工作流执行引擎核心类型定义
 *
 * 状态即存在 - 每个节点都是独立的生命体
 * 数据即流动 - 节点间的连接构成信息的河流
 */

// 抽象语法树的核心表达 - 万物皆为状态
export type AstState = 'pending' | 'running' | 'success' | 'fail';

// 状态数据的基础约束
export interface INode {
    readonly id: string;
    readonly type: string;
    state: AstState;
}

// 访问者的运行环境 - 简洁的上下文
export type Context = any;

// 节点间的连接定义 - 数据流动的通道
export interface IEdge {
    readonly from: string;
    readonly fromProperty: string;
    readonly to: string;
    readonly toProperty: string;
}

// 工作流图的完整定义 - 节点与边的和谐统一
export interface IWorkflowGraph extends INode {
    readonly type: 'WorkflowGraph';
    readonly nodes: INode[];
    readonly edges: IEdge[];
    name?: string;
}

// 状态转换的简单定义 - 生命状态的流转
export interface IStateTransition {
    readonly from: AstState;
    readonly to: AstState;
}

// 访问者接口 - 改变树结构的唯一契约
export interface IVisitor {
    visit(node: INode, context: Context): Promise<INode>;
}

// 节点执行结果
export interface IExecutionResult {
    readonly node: INode;
    readonly outputs?: Record<string, any>;
}

// 工作流执行配置
export interface IWorkflowConfig {
    readonly maxConcurrency?: number;
    readonly timeout?: number;
    readonly retryAttempts?: number;
}

// 类型守卫工具
export const isNode = (value: any): value is INode =>
    value && typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    ['pending', 'running', 'success', 'fail'].includes(value.state);

export const isWorkflowGraph = (value: any): value is IWorkflowGraph =>
    isNode(value) && value.type === 'WorkflowGraph' &&
    Array.isArray((value as IWorkflowGraph).nodes) && Array.isArray((value as IWorkflowGraph).edges);

export const isEdge = (value: any): value is IEdge =>
    value && typeof value === 'object' &&
    typeof value.from === 'string' &&
    typeof value.to === 'string';