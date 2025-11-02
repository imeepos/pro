import { ArrayIteratorAst, Ast, Visitor, WorkflowGraphAst } from "./ast";
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

@Handler(ArrayIteratorAst)
export class ArrayIteratorVisitor {
    async visit(ast: ArrayIteratorAst, _ctx: any): Promise<ArrayIteratorAst> {
        const { array, currentIndex } = ast;

        if (!Array.isArray(array) || array.length === 0) {
            ast.state = 'success';
            ast.isDone = true;
            ast.hasNext = false;
            ast.currentItem = undefined;
            return ast;
        }

        if (currentIndex >= array.length) {
            ast.state = 'success';
            ast.isDone = true;
            ast.hasNext = false;
            ast.currentItem = undefined;
            return ast;
        }

        ast.currentItem = array[currentIndex];
        ast.hasNext = currentIndex + 1 < array.length;
        ast.isDone = currentIndex + 1 >= array.length;
        ast.currentIndex = currentIndex + 1;
        ast.state = 'success';

        return ast;
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
