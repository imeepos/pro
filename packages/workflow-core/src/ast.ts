import { Input, Node, Output } from "./decorator";
import { IAstStates, IEdge, INode } from "./types";
import { generateId } from "./utils";
export interface Visitor {
    visit(ast: Ast, ctx: any): Promise<any>;
}
// 抽象语法树的核心表达 - 状态与数据的统一
export abstract class Ast implements INode {
    id: string = generateId();
    state: IAstStates = 'pending';
    error: Error | undefined;
    type!: string;
}

@Node()
export class WorkflowGraphAst extends Ast {
    @Input()
    name: string | undefined;
    @Input()
    nodes: INode[] = [];
    @Input()
    edges: IEdge[] = [];
    type: `WorkflowGraphAst` = `WorkflowGraphAst`
    addNode(node: INode) {
        this.nodes.push(node)
        return this;
    }
    addEdge(edge: IEdge) {
        this.edges.push(edge)
        return this;
    }
    addConditionalEdge(edge: IEdge) {
        this.edges.push(edge)
        return this;
    }
    setName(name: string) {
        this.name = name;
        return this;
    }
}
export function createWorkflowGraphAst({ nodes, edges, id, state, name }: { name: string, nodes: INode[], edges: IEdge[], id?: string, state?: IAstStates }) {
    const ast = new WorkflowGraphAst()
    ast.name = name
    ast.nodes = nodes;
    ast.edges = edges;
    if (id) ast.id = id;
    if (state) ast.state = state;
    return ast;
}

export function isWorkflowGraphAst(ast: any): ast is WorkflowGraphAst {
    return ast?.type === `WorkflowGraphAst`;
}

@Node()
export class ArrayIteratorAst extends Ast {
    @Input() array: any[] = [];
    @Input() currentIndex: number = 0;

    @Output() currentItem: any;
    @Output() hasNext: boolean = false;
    @Output() isDone: boolean = true;

    type: `ArrayIteratorAst` = 'ArrayIteratorAst' as const;
}