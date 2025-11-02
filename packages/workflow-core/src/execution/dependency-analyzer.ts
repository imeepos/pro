import { INode, IEdge, isControlEdge } from '../types';

export class DependencyAnalyzer {
    findExecutableNodes(nodes: INode[], edges: IEdge[]): INode[] {
        return nodes.filter(node => {
            if (node.state !== 'pending') return false;

            const incomingEdges = edges.filter(edge => edge.to === node.id);

            if (incomingEdges.length === 0) return true;

            const unconditionalEdges = incomingEdges.filter(e => !isControlEdge(e) || !e.condition);
            const conditionalEdges = incomingEdges.filter(isControlEdge).filter(e => e.condition);

            // Multi-input convergence guarantee: For nodes with multiple data sources (e.g., A|B|C → D),
            // ALL unconditional sources must reach success state before execution is allowed.
            // Uses .every() to ensure no source is skipped - even one source in pending/fail state blocks execution.
            const allUnconditionalReady = unconditionalEdges.every(edge => {
                const sourceNode = nodes.find(n => n.id === edge.from);
                return sourceNode?.state === 'success';
            });

            if (!allUnconditionalReady) return false;

            if (conditionalEdges.length === 0) return true;

            // For conditional edges: allow execution if all sources are still pending
            // (source hasn't been reached yet), otherwise check if any satisfied condition exists
            const allConditionalSourcesPending = conditionalEdges.every(edge => {
                const sourceNode = nodes.find(n => n.id === edge.from);
                return !sourceNode || sourceNode.state === 'pending';
            });

            if (allConditionalSourcesPending) return true;

            // At least one conditional edge must be satisfied for execution
            return conditionalEdges.some(edge => {
                const sourceNode = nodes.find(n => n.id === edge.from);
                if (!sourceNode || sourceNode.state !== 'success') return false;

                const actualValue = (sourceNode as any)[edge.condition!.property];
                return actualValue === edge.condition!.value;
            });
        });
    }

    findReachableNodes(nodes: INode[], edges: IEdge[]): INode[] {
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

            const outgoingEdges = edges.filter(edge => edge.from === currentId);

            for (const edge of outgoingEdges) {
                if (isControlEdge(edge) && edge.condition && currentNode?.state === 'success') {
                    const actualValue = (currentNode as any)[edge.condition.property];
                    if (actualValue === edge.condition.value) {
                        queue.push(edge.to);
                    }
                } else if (!isControlEdge(edge) || !edge.condition) {
                    queue.push(edge.to);
                }
            }
        }

        return nodes.filter(node => reachable.has(node.id));
    }

    areAllReachableNodesCompleted(nodes: INode[], edges: IEdge[]): boolean {
        const reachableNodes = this.findReachableNodes(nodes, edges);

        return reachableNodes.every(node =>
            node.state === 'success' || node.state === 'fail'
        );
    }
}
