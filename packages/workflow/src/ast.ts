import { IAstStates } from "./types";
import { generateId } from "./utils";

// 状态数据的基础约束
export interface StateData {
    state: IAstStates;
    id?: string;
    type: string;
}
export function isStateData(val: any): val is StateData {
    return val && val.type;
}
// 抽象语法树的核心表达 - 状态与数据的统一
export abstract class Ast<S extends StateData = any> {
    abstract get data(): S;
    abstract visit(visitor: Visitor, ctx: Context): Promise<S>;
}

export interface IEdge {
    from: string;
    to: string;
}
export interface WorkflowGraph extends StateData {
    type: `WorkflowGraphAst`;
    nodes: Ast[];
    edges: IEdge[];
}
export class WorkflowGraphAst extends Ast<WorkflowGraph> {
    constructor(public data: WorkflowGraph) {
        super();
    }
    visit(visitor: Visitor, ctx: Context): Promise<WorkflowGraph> {
        return visitor.visitWorkflowGraphAst(this, ctx)
    }
}

export function isWorkflowGraphAst(ast: any): ast is WorkflowGraphAst {
    return ast?.type === `WorkflowGraphAst`;
}
// 状态转换的简单定义
export type StateTransition = {
    from: IAstStates;
    to: IAstStates;
};

// 访问者的运行环境 - 简洁的上下文
export type Context = any;
// 访问者的契约 - 改变树结构的唯一方式
export interface Visitor {
    visit(ast: Ast, ctx: Context): Promise<any>;
    visitWorkflowGraphAst(ast: WorkflowGraphAst, ctx: Context): Promise<any>;
}

export class GeneraterVisitor implements Visitor {
    async visitWorkflowGraphAst(ast: WorkflowGraphAst, ctx: WorkflowGraph): Promise<WorkflowGraphAst> {
        return new WorkflowGraphAst({ ...ast.data, ...ctx, id: generateId() })
    }
    visit(ast: Ast, ctx: any) {
        return ast.visit(this, ctx)
    }
}

export class ExecuteVisitor implements Visitor {
    visit(ast: Ast, ctx: Context): Promise<any> {
        return ast.visit(this, ctx)
    }
    visitWorkflowGraphAst(ast: WorkflowGraphAst, ctx: Context): Promise<any> {
        throw new Error("Method not implemented.");
    }
}

export class WorkflowError extends Error {
    constructor(
        message: string,
        public readonly state: IAstStates,
        public readonly workflowId?: string
    ) {
        super(message);
        this.name = 'WorkflowError';
    }
}

export function createAst(state: any) {
    if (!state) throw new Error(`state is null`)
    switch (state.type) {
        case "WorkflowGraphAst":
            return new WorkflowGraphAst(state)
        default:
            throw new Error(`${state.type} not support`)
    }
}
// 访问模式的执行引擎 - 连接状态与访问者的桥梁
export async function executeAst<S extends StateData>(state: S, visitor: Visitor, ctx: Context) {
    if (!canTransition(state.state, 'running')) {
        throw new WorkflowError(
            `Cannot transition from ${state.state} to running`,
            state.state
        );
    }
    const ast = createAst(state);
    const newState = await visitor.visit(ast, ctx);
    if (!canTransition(state.state, newState.state)) {
        throw new WorkflowError(
            `Invalid transition from ${state.state} to ${newState.state}`,
            state.state
        );
    }
    return newState;
}
export function canTransition(from: IAstStates, to: IAstStates): boolean {
    const transitions: Record<IAstStates, IAstStates[]> = {
        pending: ['running'],
        running: ['success', 'fail'],
        success: [],
        fail: []
    };
    return transitions[from].includes(to);
}
export async function execute<S extends StateData>(state: S, visitor: Visitor, ctx: Context) {
    let currentState = state;
    while (currentState.state === 'pending' || currentState.state === 'running') {
        currentState = await executeAst(currentState, visitor, ctx);
    }
    return currentState; // success 或 fail
}