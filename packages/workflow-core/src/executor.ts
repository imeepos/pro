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
        let updatedNodes = this.mergeNodeStates(ast.nodes, newlyExecutedNodes);

        // 检查是否所有节点都已完成
        const allReachableCompleted = this.areAllReachableNodesCompleted(updatedNodes, ast.edges);
        const hasFailures = updatedNodes.some(node => node.state === 'fail');
        // 6. 状态转移：running → success/fail 或继续 running
        let finalState: IAstStates;
        if (allReachableCompleted) {
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
        return nodes.filter(node => {
            if (node.state !== 'pending') return false;

            const incomingEdges = edges.filter(edge => edge.to === node.id);

            // 如果没有任何边指向此节点，说明是起始节点
            if (incomingEdges.length === 0) return true;

            // 分离无条件边和条件边
            const unconditionalEdges = incomingEdges.filter(e => !e.condition);
            const conditionalEdges = incomingEdges.filter(e => e.condition);

            // 1. 所有无条件边的源节点必须完成（AND 逻辑）
            const allUnconditionalReady = unconditionalEdges.every(edge => {
                const sourceNode = nodes.find(n => n.id === edge.from);
                return sourceNode?.state === 'success';
            });

            if (!allUnconditionalReady) return false;

            // 2. 条件边的处理（OR 逻辑）
            if (conditionalEdges.length === 0) return true;

            // 检查是否所有条件边的源节点都还未执行（说明是初始状态或循环反馈）
            const allConditionalSourcesPending = conditionalEdges.every(edge => {
                const sourceNode = nodes.find(n => n.id === edge.from);
                return !sourceNode || sourceNode.state === 'pending';
            });

            // 如果所有条件边源节点都是 pending，允许作为起始节点执行
            if (allConditionalSourcesPending) return true;

            // 否则，至少一条条件边必须满足
            return conditionalEdges.some(edge => {
                const sourceNode = nodes.find(n => n.id === edge.from);
                if (!sourceNode || sourceNode.state !== 'success') return false;

                const actualValue = (sourceNode as any)[edge.condition!.property];
                return actualValue === edge.condition!.value;
            });
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
            this.assignInputsToNode(node, allOutputs, edges, workflowNodes);

            const resultNode = await this.executeNode(node, ctx);
            const outputs = this.extractNodeOutputs(resultNode);

            // 🔑 节点执行完成后，将满足条件的下游节点重置为 pending
            const outgoingEdges = edges.filter(e => e.from === node.id);

            outgoingEdges.forEach(edge => {
                // 如果边有条件，检查条件是否满足
                if (edge.condition) {
                    const actualValue = (resultNode as any)[edge.condition.property];
                    if (actualValue !== edge.condition.value) {
                        return; // 条件不满足，跳过失效
                    }
                }

                // 无条件边或条件满足的边，失效目标节点
                const downstream = workflowNodes.find(n => n.id === edge.to);
                if (downstream) {
                    downstream.state = 'pending';
                }
            });

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
    private assignInputsToNode(targetNode: INode, allOutputs: Map<string, any>, edges: IEdge[], allNodes: INode[]): void {
        // 找到所有指向目标节点的边
        const incomingEdges = edges.filter(edge => edge.to === targetNode.id);

        // 关键优化：条件边优先级高于无条件边
        // 先执行无条件边，再执行条件边，让条件边的赋值覆盖无条件边
        const sortedEdges = [...incomingEdges].sort((a, b) => {
            const aPriority = a.condition ? 1 : 0;  // 条件边优先级 = 1
            const bPriority = b.condition ? 1 : 0;  // 无条件边优先级 = 0
            return aPriority - bPriority;  // 升序：无条件边先执行，条件边后执行
        });

        sortedEdges.forEach(edge => {
            // 直接从输出数据Map中获取源节点的输出
            const sourceOutputs = allOutputs.get(edge.from);
            if (!sourceOutputs) return;

            const sourceNode = allNodes.find(n => n.id === edge.from);

            // 🔑 关键：如果是条件边，检查条件是否满足
            if (edge.condition) {
                if (!sourceNode || sourceNode.state !== 'success') return;
                const actualValue = (sourceNode as any)[edge.condition.property];
                if (actualValue !== edge.condition.value) {
                    return; // 条件不满足，跳过此边的数据赋值
                }
            }

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
    // 检查是否所有可达节点都已完成
    private areAllReachableNodesCompleted(nodes: INode[], edges: IEdge[]): boolean {
        // 找出所有可达节点
        const reachableNodes = this.findReachableNodes(nodes, edges);

        // 检查所有可达节点是否都已完成
        return reachableNodes.every(node =>
            node.state === 'success' || node.state === 'fail'
        );
    }

    // 找出从起始节点出发可以到达的所有节点
    private findReachableNodes(nodes: INode[], edges: IEdge[]): INode[] {
        // 找出所有起始节点（没有入边的节点）
        const startNodes = nodes.filter(node =>
            !edges.some(edge => edge.to === node.id)
        );

        const reachable = new Set<string>();
        const queue = [...startNodes.map(n => n.id)];

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (reachable.has(currentId)) continue;

            reachable.add(currentId);
            const currentNode = nodes.find(n => n.id === currentId);

            // 找出从当前节点出发的所有边
            const outgoingEdges = edges.filter(edge => edge.from === currentId);

            for (const edge of outgoingEdges) {
                // 如果边有条件且当前节点已完成，检查条件
                if (edge.condition && currentNode?.state === 'success') {
                    const actualValue = (currentNode as any)[edge.condition.property];
                    // 只有条件满足时才将目标节点加入队列
                    if (actualValue === edge.condition.value) {
                        queue.push(edge.to);
                    }
                } else if (!edge.condition) {
                    // 无条件边，直接加入队列
                    queue.push(edge.to);
                }
            }
        }

        return nodes.filter(node => reachable.has(node.id));
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
        const result = await ctx.visit(ast, ctx);
        return result;
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
