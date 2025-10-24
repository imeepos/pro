// 抽象语法树的核心表达 - 万物皆为状态
export type IAstStates = `pending` | `running` | `success` | `fail`;
// 状态数据的基础约束
export interface INode {
    state: IAstStates;
    id: string;
    type: string;
}
// 访问者的运行环境 - 简洁的上下文
export type Context = any;
export interface IEdge {
    from: string;
    fromProperty: string;
    to: string;
    toProperty: string;
}

// workflow
export interface WorkflowGraph extends INode {
    type: `WorkflowGraphAst`;
    nodes: INode[];
    edges: IEdge[];
}
export interface Playwright extends INode {
    type: `PlaywrightAst`
    url: string | undefined;
    ua: string | undefined;
    cookies: string | undefined;
}

export interface HtmlParser extends INode {
    type: `HtmlParserAst`;
    html: string | undefined;
    url: string | undefined;
    result?: any;
}
// 状态转换的简单定义
export interface StateTransition {
    from: IAstStates;
    to: IAstStates;
};