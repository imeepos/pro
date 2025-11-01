import { WorkflowGraphAst } from '../ast';
import { INode, IEdge, IAstStates, isControlEdge } from '../types';
import { DependencyAnalyzer } from './dependency-analyzer';
import { DataFlowManager } from './data-flow-manager';
import { StateMerger } from './state-merger';
import { executeAst } from '../executor';

export class WorkflowScheduler {
    private dependencyAnalyzer = new DependencyAnalyzer();
    private dataFlowManager = new DataFlowManager();
    private stateMerger = new StateMerger();

    async schedule(ast: WorkflowGraphAst, ctx: any): Promise<INode> {
        const { state } = ast;

        if (state === 'success' || state === 'fail') {
            return ast;
        }

        if (state === 'pending' && ctx) {
            this.dataFlowManager.initializeInputNodes(ast.nodes, ast.edges, ctx);
        }

        ast.state = 'running';

        const executableNodes = this.dependencyAnalyzer.findExecutableNodes(ast.nodes, ast.edges);
        const { nodes: newlyExecutedNodes } = await this.executeCurrentBatch(executableNodes, ctx, ast.edges, ast.nodes);
        const updatedNodes = this.stateMerger.mergeNodeStates(ast.nodes, newlyExecutedNodes);

        const allReachableCompleted = this.dependencyAnalyzer.areAllReachableNodesCompleted(updatedNodes, ast.edges);
        const hasFailures = updatedNodes.some(node => node.state === 'fail');

        const finalState: IAstStates = allReachableCompleted
            ? (hasFailures ? 'fail' : 'success')
            : 'running';

        ast.nodes = updatedNodes;
        ast.state = finalState;
        return ast;
    }

    private async executeCurrentBatch(nodes: INode[], ctx: any, edges: IEdge[], workflowNodes: INode[]) {
        const allOutputs = new Map<string, any>();
        const completedNodes = workflowNodes.filter(n => n.state === 'success');

        completedNodes.forEach(node => {
            const outputs = this.dataFlowManager.extractNodeOutputs(node);
            if (outputs) {
                allOutputs.set(node.id, outputs);
            }
        });

        const promises = nodes.map(async (node) => {
            this.dataFlowManager.assignInputsToNode(node, allOutputs, edges, workflowNodes);

            const resultNode = await executeAst(node, ctx);
            const outputs = this.dataFlowManager.extractNodeOutputs(resultNode);

            const outgoingEdges = edges.filter(e => e.from === node.id);

            outgoingEdges.forEach(edge => {
                if (isControlEdge(edge) && edge.condition) {
                    const actualValue = (resultNode as any)[edge.condition.property];
                    if (actualValue !== edge.condition.value) {
                        return;
                    }
                }

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
}
