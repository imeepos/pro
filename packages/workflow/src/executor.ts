import { Ast, EmptyVisitor, PlaywrightAst, Visitor, WorkflowGraphAst } from "./ast";
import { getOutputs } from "./decorator";
import { generateAst } from "./generater";
import { PlaywrightExecutor } from "./PlaywrightExecutor";
import { Context, IAstStates, IEdge, INode, Playwright, WorkflowGraph } from "./types";

export class ExecutorVisitor extends EmptyVisitor {
    visit(ast: Ast, ctx: Context): Promise<any> {
        console.log(`执行 ${ast.type}`)
        return ast.visit(this, ctx)
    }

    async visitPlaywrightAst(ast: PlaywrightAst, _ctx: Context): Promise<Playwright> {
        const html = await new PlaywrightExecutor().execute(ast)
        ast.html = html;
        ast.state = 'success';
        return ast;
    }

    async visitWeiboSearchUrlBuilderAst(ast: any, ctx: Context): Promise<any> {
        const { keyword, start, end, page = 1, searchType = 'DEFAULT' } = ast;
        const weiboConfig = ctx.weiboConfig;

        if (!keyword || !start || !end) {
            ast.state = 'fail';
            throw new Error('缺少必要参数: keyword, start, end');
        }

        const endpointKey: Record<string, string> = {
            DEFAULT: 'default',
            REAL_TIME: 'realTime',
            POPULAR: 'popular',
            VIDEO: 'video',
            USER: 'user',
            TOPIC: 'topic',
        };

        const base = weiboConfig?.searchEndpoints?.[endpointKey[searchType] || 'default'] || 'https://s.weibo.com/weibo';
        const params = new URLSearchParams({ q: keyword, page: String(page) });

        if (searchType === 'REAL_TIME') {
            params.set('type', 'realtime');
            params.set('nodup', '1');
        } else if (searchType === 'POPULAR') {
            params.set('sort', 'hot');
            params.set('xsort', 'hot');
        } else {
            const formatDate = (date: Date) => [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, '0'),
                String(date.getDate()).padStart(2, '0'),
                String(date.getHours()).padStart(2, '0'),
            ].join('-');
            params.set('timescope', `custom:${formatDate(start)}:${formatDate(end)}`);
        }

        ast.url = `${base}?${params.toString()}`;
        ast.state = 'success';
        return ast;
    }

    async visitAccountInjectorAst(ast: any, ctx: Context): Promise<any> {
        const weiboAccountService = ctx.weiboAccountService;

        if (!weiboAccountService) {
            ast.state = 'fail';
            throw new Error('weiboAccountService 未在 context 中提供');
        }

        const request: { headers: Record<string, string> } = { headers: {} };
        const injectionContext = {
            taskId: ast.taskId,
            taskName: ast.taskName,
        };

        const selection = await weiboAccountService.injectCookies(request, injectionContext);

        ast.cookies = request.headers?.Cookie || '';
        ast.headers = request.headers;
        ast.selectedAccountId = selection?.id;
        ast.state = 'success';
        return ast;
    }

    async visitStorageAst(ast: any, ctx: Context): Promise<any> {
        const storage = ctx.storage;

        if (!storage) {
            ast.state = 'fail';
            throw new Error('storage 未在 context 中提供');
        }

        const { storageType, platform, url, raw, metadata } = ast;

        if (!storageType || !platform || !url || !raw) {
            ast.state = 'fail';
            throw new Error('缺少必要存储参数: storageType, platform, url, raw');
        }

        const stored = await storage.store({ type: storageType, platform, url, raw, metadata });
        ast.stored = stored;
        ast.state = 'success';
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
    private async executeCurrentBatch(nodes: INode[], ctx: Context, edges: IEdge[], workflowNodes: INode[]) {
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
        const ast = generateAst(node);
        const outputs = getOutputs(ast);
        const outputData: any = {};
        outputs.forEach(outputProp => {
            if ((node as any)[outputProp] !== undefined) {
                outputData[outputProp] = (node as any)[outputProp];
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
    /**
     * 单次执行WorkflowGraph
     */
    async visitWorkflowGraphAst(ast: WorkflowGraphAst, ctx: Context): Promise<WorkflowGraph> {
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
        // const results = findTerminalNodes(updatedNodes, ast.edges)
        if (allCompleted) {
            finalState = hasFailures ? 'fail' : 'success';
        } else {
            finalState = 'running'; // 还有节点未完成，继续运行
        }
        ast.nodes = updatedNodes;
        ast.state = finalState;
        return ast;
    }
    // 每次执行都会更新状态
    private async executeNode(node: INode, ctx: Context) {
        const ast = generateAst(node);
        return this.visit(ast, ctx)
    }
}


// 访问模式的执行引擎 - 连接状态与访问者的桥梁
export async function executeAst<S extends INode>(state: S, visitor: Visitor, ctx: Context) {
    const ast = generateAst(state);
    return await visitor.visit(ast, ctx);
}

export async function execute<S extends INode>(state: S, visitor: Visitor, ctx: Context) {
    let currentState = state;
    while (currentState.state === 'pending' || currentState.state === 'running') {
        currentState = await executeAst(currentState, visitor, ctx);
    }
    return currentState; // success 或 fail
}
