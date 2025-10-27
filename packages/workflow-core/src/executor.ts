import { root } from "@pro/core";
import { Ast, Visitor, WorkflowGraphAst } from "./ast";
import { HANDLER, Handler, HANDLER_METHOD, OUTPUT, resolveConstructor } from "./decorator";
import { fromJson } from "./generate";
import { IAstStates, IEdge, INode } from "./types";

export type NodeHandler = (ast: Ast, ctx: Visitor) => Promise<any>;
export type DispatchTable = Map<string, NodeHandler>;

@Handler(WorkflowGraphAst)
export class WorkflowExecutorVisitor {
    /**
     * 单次执行WorkflowGraph
     */
    async visit(ast: WorkflowGraphAst, ctx: Visitor): Promise<INode> {
        const { state } = ast;
        // 1. 状态验证：只有pending状态才能执行
        if (state === 'success' || state === 'fail') {
            return ast; // 不是pending状态，直接返回
        }
        ast.state = 'running'
        // 3. 找到当前可以执行的节点（无依赖或依赖已完成）
        const executableNodes = this.findExecutableNodes(ast.nodes, ast.edges);
        // 执行当前批次的节点
        const { nodes: newlyExecutedNodes } = await this.executeCurrentBatch(executableNodes, ctx, ast.edges, ast.nodes);
        // 🔑 关键：合并所有节点的状态
        const updatedNodes = this.mergeNodeStates(ast.nodes, newlyExecutedNodes);
        // 5. 检查是否所有节点都已完成
        const allCompleted = this.areAllNodesCompleted(updatedNodes);
        const hasFailures = updatedNodes.some(node => node.state === 'fail');
        // 6. 状态转移：running → success/fail 或继续 running
        let finalState: IAstStates;
        if (allCompleted) {
            finalState = hasFailures ? 'fail' : 'success';
        } else {
            finalState = 'running'; // 还有节点未完成，继续运行
        }
        ast.nodes = updatedNodes;
        ast.state = finalState;
        return ast;
    }

    // 找到当前可以执行的节点
    private findExecutableNodes(nodes: INode[], edges: IEdge[]): INode[] {
        const completedNodes = new Set(
            nodes.filter(n => n.state === 'success').map(n => n.id)
        );
        return nodes.filter(node => {
            if (node.state !== 'pending') return false;
            // 检查所有前置依赖是否已完成
            const dependencies = edges
                .filter(edge => edge.to === node.id)
                .map(edge => edge.from);
            return dependencies.every(dep => completedNodes.has(dep));
        });
    }
    // 执行当前批次的节点
    private async executeCurrentBatch(nodes: INode[], ctx: Visitor, edges: IEdge[], workflowNodes: INode[]) {
        // 首先收集所有已完成节点的输出数据
        const allOutputs = new Map<string, any>();
        const completedNodes = workflowNodes.filter(n => n.state === 'success');
        completedNodes.forEach(node => {
            const outputs = this.extractNodeOutputs(node);
            if (outputs) {
                allOutputs.set(node.id, outputs);
            }
        });

        // 对每个可执行节点进行输入赋值并执行
        const promises = nodes.map(async (node) => {
            // 🎯 关键：在执行节点前，根据边关系进行输入赋值
            this.assignInputsToNode(node, allOutputs, edges);

            const resultNode = await this.executeNode(node, ctx);
            const outputs = this.extractNodeOutputs(resultNode);

            return {
                node: resultNode,
                outputs: outputs
            };
        });

        const results = await Promise.all(promises);

        // 更新所有输出数据集合
        results.forEach(({ node, outputs }) => {
            if (outputs) {
                allOutputs.set(node.id, outputs);
            }
        });

        return {
            nodes: results.map(r => r.node),
            outputs: allOutputs
        };
    }
    // 提取节点输出数据
    private extractNodeOutputs(node: INode): any {
        // 根据节点类型和装饰器提取输出
        const ast = fromJson(node);
        const ctor = resolveConstructor(ast)
        const outputs = root.get(OUTPUT)
        const outputData: any = {};
        outputs.filter(it=>it.target === ctor).map(it => {
            if ((node as any)[it.propertyKey] !== undefined) {
                outputData[it.propertyKey] = (node as any)[it.propertyKey];
            }
        });
        return outputData;
    }
    // 根据边关系将前驱节点输出映射到当前节点输入
    private assignInputsToNode(targetNode: INode, allOutputs: Map<string, any>, edges: IEdge[]): void {
        // 找到所有指向目标节点的边
        const incomingEdges = edges.filter(edge => edge.to === targetNode.id);

        incomingEdges.forEach(edge => {
            // 直接从输出数据Map中获取源节点的输出
            const sourceOutputs = allOutputs.get(edge.from);
            if (!sourceOutputs) return;

            // 如果指定了属性映射，则进行精确映射
            if (edge.fromProperty && edge.toProperty) {
                const sourceValue = sourceOutputs[edge.fromProperty];
                if (sourceValue !== undefined) {
                    (targetNode as any)[edge.toProperty] = sourceValue;
                }
            } else {
                // 如果没有指定属性映射，将整个输出对象传递到节点的输入属性
                Object.entries(sourceOutputs).forEach(([key, value]) => {
                    (targetNode as any)[key] = value;
                });
            }
        });
    }
    // 检查是否所有节点都已完成
    private areAllNodesCompleted(nodes: INode[]): boolean {
        return nodes.every(node =>
            node.state === 'success' || node.state === 'fail'
        );
    }
    // 🔑 关键方法：合并节点状态
    private mergeNodeStates(
        originalNodes: INode[],
        newlyExecutedNodes: INode[]
    ): INode[] {
        const executedNodeMap = new Map(
            newlyExecutedNodes.map(node => [node.id, node])
        );
        return originalNodes.map(originalNode => {
            const executedNode = executedNodeMap.get(originalNode.id);
            // 如果节点被重新执行，使用新状态；否则保持原状态
            return executedNode || originalNode;
        });
    }

    // 每次执行都会更新状态
    private async executeNode(node: INode, ctx: Visitor) {
        const ast = fromJson(node);
        return ctx.visit(ast, ctx)
    }
}

export class ExecutorVisitor implements Visitor {
    visit(ast: Ast, ctx: Visitor): Promise<any> {
        const type = resolveConstructor(ast)
        // 找到 methods
        const methods = root.get(HANDLER_METHOD, []);
        if (methods && methods.length > 0) {
            // 要最后一个 其他的自动忽略 后面的覆盖前面的
            const method = methods.find(it => it.ast === type);
            if (method) {
                const instance = root.get(method.target)
                if (method.property && typeof (instance as any)[method.property] === 'function') {
                    return (instance as any)[method.property](ast, ctx);
                }
            }
        }
        // 找到 class
        const nodes = root.get(HANDLER, [])
        const handler = nodes.find(it => it.ast === type);
        if (handler) {
            const instance = root.get(handler.target)
            if (typeof (instance as any).visit === 'function') {
                return instance.visit(ast, ctx);
            }
            throw new Error(`Handler ${handler.target.name} has no visit method or @Handler decorated method`)
        }
        throw new Error(`not found handler for ${ast.type}`)
    }
}

// 访问模式的执行引擎 - 连接状态与访问者的桥梁
export function executeAst<S extends INode>(state: S, visitor: Visitor = new ExecutorVisitor()) {
    const ast = fromJson(state);
    return visitor.visit(ast, visitor);
}

export async function execute<S extends INode>(state: S, visitor: Visitor = new ExecutorVisitor()) {
    let currentState = state;
    while (currentState.state === 'pending' || currentState.state === 'running') {
        currentState = await executeAst(currentState, visitor);
    }
    return currentState; // success 或 fail
}
