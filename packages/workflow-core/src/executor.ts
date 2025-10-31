import { Ast, Visitor, WorkflowGraphAst } from "./ast";
import { Handler } from "./decorator";
import { fromJson } from "./generate";
import { INode } from "./types";
import { WorkflowScheduler } from './execution/scheduler';
import { defaultVisitorExecutor } from './execution/visitor-executor';

export type NodeHandler = (ast: Ast, ctx: Visitor) => Promise<any>;
export type DispatchTable = Map<string, NodeHandler>;

@Handler(WorkflowGraphAst)
export class WorkflowExecutorVisitor {
    private scheduler = new WorkflowScheduler();

    async visit(ast: WorkflowGraphAst, ctx: any): Promise<INode> {
        return this.scheduler.schedule(ast, ctx);
    }
}

export function executeAst<S extends INode>(state: S, context: any, visitor: Visitor = defaultVisitorExecutor) {
    const ast = fromJson(state);
    return visitor.visit(ast, context);
}

export async function execute<S extends INode>(state: S, context: any, visitor: Visitor = defaultVisitorExecutor) {
    let currentState = state;
    while (currentState.state === 'pending' || currentState.state === 'running') {
        currentState = await executeAst(currentState, context, visitor);
    }
    return currentState;
}
