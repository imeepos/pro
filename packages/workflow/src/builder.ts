import { Ast, createWorkflowGraphAst, WorkflowGraphAst } from "./ast";
import { IEdge, INode } from "./types";

// 使用泛型约束确保类型安全
export class WorkflowBuilder {
    nodes: INode[] = [];
    edges: IEdge[] = [];

    addAst(ast: Ast): this {
        this.nodes.push(ast)
        return this;
    }

    addNode(node: INode): this {
        // 类型安全的节点添加
        this.nodes.push(node)
        return this;
    }

    addEdge(edge: IEdge): this {
        // 添加边
        this.edges.push(edge)
        return this;
    }

    build(name: string): WorkflowGraphAst {
        // 返回特定类型的工作流
        return createWorkflowGraphAst({ nodes: this.nodes, edges: this.edges, name })
    }
}