/**
 * @pro/workflow-core - 抽象语法树定义
 *
 * 抽象语法树是工作流的灵魂表达
 * 每个节点都有自己的生命轨迹
 * 访问者模式是改变它的唯一方式
 */

import { Context, IEdge, INode, IVisitor, AstState } from './types';
import { generateId } from './utils';

// 抽象语法树的根节点 - 状态与数据的统一
export abstract class AstNode implements INode {
    readonly id: string;
    state: AstState = 'pending';
    abstract readonly type: string;

    constructor(id?: string) {
        this.id = id || generateId();
    }

    // 访问者入口 - 节点生命的转折点
    abstract accept(visitor: IVisitor, context: Context): Promise<INode>;
}

// 工作流图节点 - 节点与边的和谐统一
export class WorkflowGraphAst extends AstNode {
    readonly type = 'WorkflowGraph' as const;
    name?: string;
    nodes: AstNode[] = [];
    edges: IEdge[] = [];

    constructor(name?: string, id?: string) {
        super(id);
        if (name !== undefined) {
            this.name = name;
        }
    }

    async accept(visitor: IVisitor, context: Context): Promise<INode> {
        return visitor.visit(this, context);
    }

    // 添加节点 - 扩展工作流的能力边界
    addNode(node: AstNode): this {
        this.nodes.push(node);
        return this;
    }

    // 添加边 - 建立节点间的数据流动
    addEdge(edge: IEdge): this {
        this.edges.push(edge);
        return this;
    }

    // 查找节点 - 定位工作流中的具体生命体
    findNode(id: string): AstNode | undefined {
        return this.nodes.find(node => node.id === id);
    }

    // 获取节点的所有依赖
    getNodeDependencies(nodeId: string): string[] {
        return this.edges
            .filter(edge => edge.to === nodeId)
            .map(edge => edge.from);
    }

    // 获取节点的所有下游节点
    getNodeDependents(nodeId: string): string[] {
        return this.edges
            .filter(edge => edge.from === nodeId)
            .map(edge => edge.to);
    }
}

// 基础工作流节点 - 所有具体节点的抽象基类
export abstract class BaseWorkflowNode extends AstNode {
    protected inputs: Record<string, any> = {};
    protected outputs: Record<string, any> = {};

    constructor(id?: string) {
        super(id);
    }

    // 设置输入数据
    setInput(key: string, value: any): this {
        this.inputs[key] = value;
        return this;
    }

    // 获取输入数据
    getInput(key: string): any {
        return this.inputs[key];
    }

    // 获取所有输入
    getAllInputs(): Record<string, any> {
        return { ...this.inputs };
    }

    // 设置输出数据
    setOutput(key: string, value: any): this {
        this.outputs[key] = value;
        return this;
    }

    // 获取输出数据
    getOutput(key: string): any {
        return this.outputs[key];
    }

    // 获取所有输出
    getAllOutputs(): Record<string, any> {
        return { ...this.outputs };
    }

    // 清空输入输出 - 重置节点状态
    reset(): this {
        this.inputs = {};
        this.outputs = {};
        this.state = 'pending';
        return this;
    }
}

// HTTP请求节点 - 连接外部世界的桥梁
export class HttpRequestNode extends BaseWorkflowNode {
    readonly type = 'HttpRequest' as const;

    constructor(
        public url: string = '',
        public method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        public headers: Record<string, string> = {},
        id?: string
    ) {
        super(id);
    }

    async accept(visitor: IVisitor, context: Context): Promise<INode> {
        return visitor.visit(this, context);
    }
}

// 数据转换节点 - 塑造数据的艺术家
export class DataTransformNode extends BaseWorkflowNode {
    readonly type = 'DataTransform' as const;

    constructor(
        public transformFn: (data: any) => any = data => data,
        id?: string
    ) {
        super(id);
    }

    async accept(visitor: IVisitor, context: Context): Promise<INode> {
        return visitor.visit(this, context);
    }
}

// 条件判断节点 - 工作流的决策中心
export class ConditionNode extends BaseWorkflowNode {
    readonly type = 'Condition' as const;

    constructor(
        public conditionFn: (data: any) => boolean = () => true,
        id?: string
    ) {
        super(id);
    }

    async accept(visitor: IVisitor, context: Context): Promise<INode> {
        return visitor.visit(this, context);
    }
}

// 循环节点 - 重复执行的力量
export class LoopNode extends BaseWorkflowNode {
    readonly type = 'Loop' as const;

    constructor(
        public loopCondition: (data: any) => boolean = () => true,
        public maxIterations: number = 100,
        id?: string
    ) {
        super(id);
    }

    async accept(visitor: IVisitor, context: Context): Promise<INode> {
        return visitor.visit(this, context);
    }
}

// 自定义函数节点 - 无限可能的容器
export class CustomFunctionNode extends BaseWorkflowNode {
    readonly type = 'CustomFunction' as const;

    constructor(
        public executeFn: (inputs: Record<string, any>, context: Context) => Promise<Record<string, any>>,
        id?: string
    ) {
        super(id);
    }

    async accept(visitor: IVisitor, context: Context): Promise<INode> {
        return visitor.visit(this, context);
    }
}

// 工厂函数 - 创建AST节点的优雅方式
export const createWorkflowGraph = (name?: string, id?: string): WorkflowGraphAst =>
    new WorkflowGraphAst(name, id);

export const createHttpRequestNode = (
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    headers: Record<string, string> = {},
    id?: string
): HttpRequestNode => new HttpRequestNode(url, method, headers, id);

export const createDataTransformNode = (
    transformFn: (data: any) => any,
    id?: string
): DataTransformNode => new DataTransformNode(transformFn, id);

export const createConditionNode = (
    conditionFn: (data: any) => boolean,
    id?: string
): ConditionNode => new ConditionNode(conditionFn, id);

export const createLoopNode = (
    loopCondition: (data: any) => boolean,
    maxIterations: number = 100,
    id?: string
): LoopNode => new LoopNode(loopCondition, maxIterations, id);

export const createCustomFunctionNode = (
    executeFn: (inputs: Record<string, any>, context: Context) => Promise<Record<string, any>>,
    id?: string
): CustomFunctionNode => new CustomFunctionNode(executeFn, id);

// 类型守卫 - 确保类型安全
export const isWorkflowGraphAst = (node: any): node is WorkflowGraphAst =>
    node instanceof WorkflowGraphAst;

export const isBaseWorkflowNode = (node: any): node is BaseWorkflowNode =>
    node instanceof BaseWorkflowNode;

export const isHttpRequestNode = (node: any): node is HttpRequestNode =>
    node instanceof HttpRequestNode;

export const isDataTransformNode = (node: any): node is DataTransformNode =>
    node instanceof DataTransformNode;

export const isConditionNode = (node: any): node is ConditionNode =>
    node instanceof ConditionNode;

export const isLoopNode = (node: any): node is LoopNode =>
    node instanceof LoopNode;

export const isCustomFunctionNode = (node: any): node is CustomFunctionNode =>
    node instanceof CustomFunctionNode;