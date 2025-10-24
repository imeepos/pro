import { Input, Output } from "./decorator";
import { Context, HtmlParser, IAstStates, IEdge, INode, Playwright, WorkflowGraph } from "./types";
import { generateId } from "./utils";

// 抽象语法树的核心表达 - 状态与数据的统一
export abstract class Ast implements INode {
    id: string = generateId();
    state: IAstStates = 'pending';
    type!: string;
    abstract visit(visitor: Visitor, ctx: Context): Promise<any>;
}
export class WorkflowGraphAst extends Ast implements WorkflowGraph {
    name: string | undefined;
    nodes: INode[] = [];
    edges: IEdge[] = [];
    type: `WorkflowGraphAst` = `WorkflowGraphAst`
    visit(visitor: Visitor, ctx: Context): Promise<WorkflowGraph> {
        return visitor.visitWorkflowGraphAst(this, ctx)
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
export class PlaywrightAst extends Ast implements Playwright {
    @Input() @Output() url: string | undefined;
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
    if (options.id) ast.id = options.id;
    if (options.state) ast.state = options.state;
    return ast;
}

export class HtmlParserAst extends Ast implements HtmlParser {
    @Input() html: string | undefined;
    @Input() url: string | undefined;

    @Output() result: any;
    type: `HtmlParserAst` = `HtmlParserAst`;
    visit(visitor: Visitor, ctx: Context): Promise<HtmlParser> {
        return visitor.visitHtmlParserAst(this, ctx)
    }
}


export class MqConsumerAst extends Ast {
    @Input() queue: string | undefined;
    type: `MqConsumerAst` = `MqConsumerAst`
    visit(visitor: Visitor, ctx: Context): Promise<any> {
        return visitor.visitMqConsumerAst(this, ctx)
    }
}

export function createMqConsumerAst({ queue, id, state }: { queue: string, start: Date, id?: string, state?: IAstStates }) {
    const ast = new MqConsumerAst();
    ast.queue = queue
    if (id) ast.id = id;
    if (state) ast.state = state;
    return ast;
}

export class MqPublisherAst extends Ast {
    @Input() queue: string | undefined;
    @Input() event: any;
    type: `MqPublisherAst` = `MqPublisherAst`
    visit(visitor: Visitor, ctx: Context): Promise<any> {
        return visitor.visiMqPublisherAst(this, ctx)
    }
}

export function createMqPublisherAst({ queue, event, id, state }: { queue: string, event: any, start: Date, id?: string, state?: IAstStates }) {
    const ast = new MqPublisherAst();
    ast.queue = queue
    ast.event = event;
    if (id) ast.id = id;
    if (state) ast.state = state;
    return ast;
}

export class WeiboKeywordSearchAst extends Ast {
    @Input() keyword: string | undefined;
    @Input() @Output() start: Date | undefined;
    @Input() end: Date = new Date();

    @Output() url: string | undefined;
    type: `WeiboKeywordSearchAst` = `WeiboKeywordSearchAst`
    visit(visitor: Visitor, ctx: Context): Promise<any> {
        return visitor.visitWeiboKeywordSearchAst(this, ctx)
    }
}


export function createWeiboKeywordSearchAst({ keyword, start, end, id, state }: { keyword: string, start: Date, end: Date, id?: string, state?: IAstStates }) {
    const ast = new WeiboKeywordSearchAst();
    ast.keyword = keyword;
    ast.start = start;
    ast.end = end
    if (id) ast.id = id;
    if (state) ast.state = state;
    return ast;
}

export class WeiboDetailAst extends Ast {
    @Input() mid: string | undefined;
    @Output() detail: any;
    type: `WeiboDetailAst` = `WeiboDetailAst`
    visit(visitor: Visitor, ctx: Context): Promise<any> {
        return visitor.visitWeiboDetailAst(this, ctx)
    }
}
export class WeiboUserAst extends Ast {
    @Input() uid: string | undefined;
    @Output() user: any;
    type: `WeiboUserAst` = `WeiboUserAst`
    visit(visitor: Visitor, ctx: Context): Promise<any> {
        return visitor.visitWeiboUserAst(this, ctx)
    }
}
export class WeiboLikesAst extends Ast {
    @Input() mid: string | undefined;
    @Output() likes: any;
    type: `WeiboLikesAst` = `WeiboLikesAst`
    visit(visitor: Visitor, ctx: Context): Promise<any> {
        return visitor.visitWeiboLikesAst(this, ctx)
    }
}
export class WeiboCommentsAst extends Ast {
    @Input() mid: string | undefined;
    @Output() comments: any;

    type: `WeiboCommentsAst` = `WeiboCommentsAst`
    visit(visitor: Visitor, ctx: Context): Promise<any> {
        return visitor.visitWeiboCommentsAst(this, ctx)
    }
}
export class WeiboSharesAst extends Ast {
    @Input() mid: string | undefined;
    @Output() shares: any;
    type: `WeiboSharesAst` = `WeiboSharesAst`
    visit(visitor: Visitor, ctx: Context): Promise<any> {
        return visitor.visitWeiboSharesAst(this, ctx)
    }
}
export function createHtmlParserAst({ url, html, id, state }: { url?: string, html?: string, id?: string, state?: IAstStates } = {}) {
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
    visitWeiboDetailAst(ast: WeiboDetailAst, ctx: Context): Promise<any>;
    visitWeiboUserAst(ast: WeiboUserAst, ctx: Context): Promise<any>;
    visitWeiboLikesAst(ast: WeiboLikesAst, ctx: Context): Promise<any>;
    visitWeiboCommentsAst(ast: WeiboCommentsAst, ctx: Context): Promise<any>;
    visitWeiboSharesAst(ast: WeiboSharesAst, ctx: Context): Promise<any>;
    visitMqConsumerAst(ast: MqConsumerAst, ctx: Context): Promise<any>;
    visiMqPublisherAst(ast: MqPublisherAst, ctx: Context): Promise<any>;
    visitWeiboKeywordSearchAst(ast: WeiboKeywordSearchAst, ctx: Context): Promise<any>;
}
export class EmptyVisitor implements Visitor {
    visit(ast: Ast, ctx: Context): Promise<any> {
        return ast.visit(this, ctx)
    }
    async visitWeiboKeywordSearchAst(ast: WeiboKeywordSearchAst, _ctx: Context): Promise<any> {
        return ast;
    }
    async visiMqPublisherAst(ast: MqPublisherAst, _ctx: Context): Promise<any> {
        return ast;
    }
    async visitMqConsumerAst(ast: MqConsumerAst, _ctx: Context): Promise<any> {
        return ast;
    }
    async visitWorkflowGraphAst(ast: WorkflowGraphAst, _ctx: Context): Promise<any> {
        return ast;
    }
    async visitPlaywrightAst(ast: PlaywrightAst, _ctx: Context): Promise<any> {
        return ast;
    }
    async visitHtmlParserAst(ast: HtmlParserAst, _ctx: Context): Promise<any> {
        return ast;
    }
    async visitWeiboDetailAst(ast: WeiboDetailAst, _ctx: Context): Promise<any> {
        return ast;
    }
    async visitWeiboUserAst(ast: WeiboUserAst, _ctx: Context): Promise<any> {
        return ast;
    }
    async visitWeiboCommentsAst(ast: WeiboCommentsAst, _ctx: Context): Promise<any> {
        return ast;
    }
    async visitWeiboLikesAst(ast: WeiboLikesAst, _ctx: Context): Promise<any> {
        return ast;
    }
    async visitWeiboSharesAst(ast: WeiboSharesAst, _ctx: Context): Promise<any> {
        return ast;
    }
}