import { IEdge, INode } from "./types";

// 添加ID生成功能
export function generateId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function isINode(val: any): val is INode {
    return val && val.type;
}

export function findTerminalNodes(nodes: INode[], edges: IEdge[]): INode[] {
    // 获取所有有出边的节点ID
    const sourceNodeIds = new Set(edges.map(e => e.from).filter(Boolean));
    // 终点节点 = 在所有节点中但不在源节点集合中的节点
    const terminalNodes = nodes.filter(node => !sourceNodeIds.has(node.id));
    return terminalNodes;
}
