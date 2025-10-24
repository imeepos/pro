import { INode } from "./types";

// 添加ID生成功能
export function generateId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function isINode(val: any): val is INode {
    return val && val.type;
}
