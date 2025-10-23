import { Input, Output } from "./decorator";
import { Context, HtmlParser, IAstStates, IEdge, INode, Playwright, WorkflowGraph } from "./types";
import { generateId } from "./utils";

// 抽象语法树的核心表达 - 状态与数据的统一
export abstract class Ast implements INode {
    id!: string;
    state!: IAstStates;
    type!: string;
    abstract visit(visitor: Visitor, ctx: Context): Promise<any>;
}
export class WorkflowGraphAst extends Ast implements WorkflowGraph {
    nodes: INode[] = [];
    edges: IEdge[] = [];
    @Output() results: any[] = [];
    type: `WorkflowGraphAst` = `WorkflowGraphAst`
    visit(visitor: Visitor, ctx: Context): Promise<WorkflowGraph> {
        return visitor.visitWorkflowGraphAst(this, ctx)
    }
}
export function createWorkflowGraphAst({ nodes, edges, id, state }: { nodes: INode[], edges: IEdge[], id?: string, state?: IAstStates }) {
    const ast = new WorkflowGraphAst()
    ast.nodes = nodes;
    ast.edges = edges;
    ast.id = id || generateId()
    ast.state = state || 'pending'
    return ast;
}
export class PlaywrightAst extends Ast implements Playwright {
    @Input() url: string | undefined;
    @Input() cookies: string | undefined;
    @Input() ua: string | undefined;

    @Output() html: string | undefined;

    type: `PlaywrightAst` = `PlaywrightAst`
    visit(visitor: Visitor, ctx: Context): Promise<Playwright> {
        return visitor.visitPlaywrightAst(this, ctx)
    }
}
export function createPlaywrightAst(options: { url: string, ua: string, cookies: string, id?: string, state?: IAstStates }) {
    const ast = new PlaywrightAst()
    ast.url = options.url;
    ast.ua = options.ua;
    ast.cookies = options.cookies;
    ast.id = options.id || generateId()
    ast.state = options.state || 'pending'
    return ast;
}
export class HtmlParserAst extends Ast implements HtmlParser {
    @Input() html: string | undefined;
    @Input() url: string | undefined;
    type: `HtmlParserAst` = `HtmlParserAst`
    visit(visitor: Visitor, ctx: Context): Promise<HtmlParser> {
        return visitor.visitHtmlParserAst(this, ctx)
    }
}
export function createHtmlParserAst({ url, html, id, state }: { url: string, html: string, id?: string, state?: IAstStates }) {
    const ast = new HtmlParserAst()
    ast.url = url;
    ast.html = html;
    ast.id = id || generateId();
    ast.state = state || 'pending';
    return ast;
}
// 类型守卫
export function isPlaywrightAst(ast: any): ast is PlaywrightAst {
    return ast?.type === 'PlaywrightAst';
}
export function isWorkflowGraphAst(ast: any): ast is WorkflowGraphAst {
    return ast?.type === `WorkflowGraphAst`;
}
// 访问者的契约 - 改变树结构的唯一方式
export interface Visitor {
    visit(ast: Ast, ctx: Context): Promise<any>;
    visitWorkflowGraphAst(ast: WorkflowGraphAst, ctx: Context): Promise<any>;
    visitPlaywrightAst(ast: PlaywrightAst, ctx: Context): Promise<any>;
    visitHtmlParserAst(ast: HtmlParserAst, ctx: Context): Promise<any>;
}
