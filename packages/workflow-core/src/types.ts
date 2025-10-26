// 抽象语法树的核心表达 - 万物皆为状态
export type IAstStates = `pending` | `running` | `success` | `fail`;
// 状态数据的基础约束
export interface INode extends Object {
    state: IAstStates;
    id: string;
    type: string;
}
// 访问者的运行环境 - 简洁的上下文
export interface IEdge {
    from: string;
    fromProperty?: string;
    to: string;
    toProperty?: string;
}