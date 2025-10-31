import { describe, it, expect } from 'vitest';
import { DependencyAnalyzer } from '../execution/dependency-analyzer';
import { INode, IEdge } from '../types';

describe('DependencyAnalyzer', () => {
    const analyzer = new DependencyAnalyzer();

    describe('findExecutableNodes', () => {
        it('identifies start nodes without incoming edges', () => {
            const nodes: INode[] = [
                { id: 'node1', state: 'pending', type: 'start' },
                { id: 'node2', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                { from: 'node1', to: 'node2' },
            ];

            const executable = analyzer.findExecutableNodes(nodes, edges);

            expect(executable).toHaveLength(1);
            expect(executable[0].id).toBe('node1');
        });

        it('excludes nodes that are not in pending state', () => {
            const nodes: INode[] = [
                { id: 'node1', state: 'success', type: 'task' },
                { id: 'node2', state: 'running', type: 'task' },
                { id: 'node3', state: 'fail', type: 'task' },
                { id: 'node4', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [];

            const executable = analyzer.findExecutableNodes(nodes, edges);

            expect(executable).toHaveLength(1);
            expect(executable[0].id).toBe('node4');
        });

        it('finds nodes whose dependencies are completed', () => {
            const nodes: INode[] = [
                { id: 'node1', state: 'success', type: 'task' },
                { id: 'node2', state: 'success', type: 'task' },
                { id: 'node3', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                { from: 'node1', to: 'node3' },
                { from: 'node2', to: 'node3' },
            ];

            const executable = analyzer.findExecutableNodes(nodes, edges);

            expect(executable).toHaveLength(1);
            expect(executable[0].id).toBe('node3');
        });

        it('blocks nodes with incomplete dependencies', () => {
            const nodes: INode[] = [
                { id: 'node1', state: 'success', type: 'task' },
                { id: 'node2', state: 'pending', type: 'task' },
                { id: 'node3', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                { from: 'node1', to: 'node3' },
                { from: 'node2', to: 'node3' },
            ];

            const executable = analyzer.findExecutableNodes(nodes, edges);

            expect(executable).toHaveLength(1);
            expect(executable[0].id).toBe('node2');
        });

        it('executes when conditional edge is satisfied', () => {
            interface TaskNode extends INode {
                shouldProceed?: boolean;
            }

            const nodes: TaskNode[] = [
                { id: 'node1', state: 'success', type: 'task', shouldProceed: true },
                { id: 'node2', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                {
                    from: 'node1',
                    to: 'node2',
                    condition: { property: 'shouldProceed', value: true },
                },
            ];

            const executable = analyzer.findExecutableNodes(nodes, edges);

            expect(executable).toHaveLength(1);
            expect(executable[0].id).toBe('node2');
        });

        it('blocks when conditional edge is not satisfied', () => {
            interface TaskNode extends INode {
                shouldProceed?: boolean;
            }

            const nodes: TaskNode[] = [
                { id: 'node1', state: 'success', type: 'task', shouldProceed: false },
                { id: 'node2', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                {
                    from: 'node1',
                    to: 'node2',
                    condition: { property: 'shouldProceed', value: true },
                },
            ];

            const executable = analyzer.findExecutableNodes(nodes, edges);

            expect(executable).toHaveLength(0);
        });

        it('allows execution when all conditional sources are pending', () => {
            interface TaskNode extends INode {
                shouldProceed?: boolean;
            }

            const nodes: TaskNode[] = [
                { id: 'node1', state: 'pending', type: 'task' },
                { id: 'node2', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                {
                    from: 'node1',
                    to: 'node2',
                    condition: { property: 'shouldProceed', value: true },
                },
            ];

            const executable = analyzer.findExecutableNodes(nodes, edges);

            expect(executable).toHaveLength(2);
        });

        it('handles mixed unconditional and conditional edges', () => {
            interface TaskNode extends INode {
                approved?: boolean;
            }

            const nodes: TaskNode[] = [
                { id: 'node1', state: 'success', type: 'task' },
                { id: 'node2', state: 'success', type: 'task', approved: true },
                { id: 'node3', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                { from: 'node1', to: 'node3' },
                {
                    from: 'node2',
                    to: 'node3',
                    condition: { property: 'approved', value: true },
                },
            ];

            const executable = analyzer.findExecutableNodes(nodes, edges);

            expect(executable).toHaveLength(1);
            expect(executable[0].id).toBe('node3');
        });

        it('blocks when unconditional dependencies are incomplete', () => {
            interface TaskNode extends INode {
                approved?: boolean;
            }

            const nodes: TaskNode[] = [
                { id: 'node1', state: 'pending', type: 'task' },
                { id: 'node2', state: 'success', type: 'task', approved: true },
                { id: 'node3', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                { from: 'node1', to: 'node3' },
                {
                    from: 'node2',
                    to: 'node3',
                    condition: { property: 'approved', value: true },
                },
            ];

            const executable = analyzer.findExecutableNodes(nodes, edges);

            expect(executable).toHaveLength(1);
            expect(executable[0].id).toBe('node1');
        });

        it('allows execution when at least one conditional path is satisfied', () => {
            interface TaskNode extends INode {
                pathA?: boolean;
                pathB?: boolean;
            }

            const nodes: TaskNode[] = [
                { id: 'node1', state: 'success', type: 'task', pathA: true },
                { id: 'node2', state: 'success', type: 'task', pathB: false },
                { id: 'node3', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                {
                    from: 'node1',
                    to: 'node3',
                    condition: { property: 'pathA', value: true },
                },
                {
                    from: 'node2',
                    to: 'node3',
                    condition: { property: 'pathB', value: true },
                },
            ];

            const executable = analyzer.findExecutableNodes(nodes, edges);

            expect(executable).toHaveLength(1);
            expect(executable[0].id).toBe('node3');
        });
    });

    describe('findReachableNodes', () => {
        it('performs BFS traversal from start nodes', () => {
            const nodes: INode[] = [
                { id: 'start', state: 'pending', type: 'start' },
                { id: 'middle', state: 'pending', type: 'task' },
                { id: 'end', state: 'pending', type: 'end' },
            ];
            const edges: IEdge[] = [
                { from: 'start', to: 'middle' },
                { from: 'middle', to: 'end' },
            ];

            const reachable = analyzer.findReachableNodes(nodes, edges);

            expect(reachable).toHaveLength(3);
            expect(reachable.map(n => n.id)).toContain('start');
            expect(reachable.map(n => n.id)).toContain('middle');
            expect(reachable.map(n => n.id)).toContain('end');
        });

        it('follows conditional edges when condition is met', () => {
            interface TaskNode extends INode {
                condition?: boolean;
            }

            const nodes: TaskNode[] = [
                { id: 'node1', state: 'success', type: 'task', condition: true },
                { id: 'node2', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                {
                    from: 'node1',
                    to: 'node2',
                    condition: { property: 'condition', value: true },
                },
            ];

            const reachable = analyzer.findReachableNodes(nodes, edges);

            expect(reachable).toHaveLength(2);
            expect(reachable.map(n => n.id)).toContain('node1');
            expect(reachable.map(n => n.id)).toContain('node2');
        });

        it('excludes nodes behind unsatisfied conditional edges', () => {
            interface TaskNode extends INode {
                condition?: boolean;
            }

            const nodes: TaskNode[] = [
                { id: 'node1', state: 'success', type: 'task', condition: false },
                { id: 'node2', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                {
                    from: 'node1',
                    to: 'node2',
                    condition: { property: 'condition', value: true },
                },
            ];

            const reachable = analyzer.findReachableNodes(nodes, edges);

            expect(reachable).toHaveLength(1);
            expect(reachable[0].id).toBe('node1');
        });

        it('includes nodes reachable through unconditional edges', () => {
            const nodes: INode[] = [
                { id: 'node1', state: 'pending', type: 'task' },
                { id: 'node2', state: 'pending', type: 'task' },
                { id: 'node3', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                { from: 'node1', to: 'node2' },
                { from: 'node2', to: 'node3' },
            ];

            const reachable = analyzer.findReachableNodes(nodes, edges);

            expect(reachable).toHaveLength(3);
        });

        it('identifies multiple start nodes correctly', () => {
            const nodes: INode[] = [
                { id: 'start1', state: 'pending', type: 'start' },
                { id: 'start2', state: 'pending', type: 'start' },
                { id: 'end', state: 'pending', type: 'end' },
            ];
            const edges: IEdge[] = [
                { from: 'start1', to: 'end' },
                { from: 'start2', to: 'end' },
            ];

            const reachable = analyzer.findReachableNodes(nodes, edges);

            expect(reachable).toHaveLength(3);
        });

        it('includes isolated nodes as separate start nodes', () => {
            const nodes: INode[] = [
                { id: 'node1', state: 'pending', type: 'task' },
                { id: 'node2', state: 'pending', type: 'task' },
                { id: 'isolated', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                { from: 'node1', to: 'node2' },
            ];

            const reachable = analyzer.findReachableNodes(nodes, edges);

            expect(reachable).toHaveLength(3);
            expect(reachable.map(n => n.id)).toContain('isolated');
        });

        it('excludes nodes behind failed conditional edges', () => {
            interface TaskNode extends INode {
                shouldContinue?: boolean;
            }

            const nodes: TaskNode[] = [
                { id: 'start', state: 'success', type: 'task', shouldContinue: false },
                { id: 'blocked', state: 'pending', type: 'task' },
                { id: 'furtherBlocked', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                {
                    from: 'start',
                    to: 'blocked',
                    condition: { property: 'shouldContinue', value: true },
                },
                { from: 'blocked', to: 'furtherBlocked' },
            ];

            const reachable = analyzer.findReachableNodes(nodes, edges);

            expect(reachable).toHaveLength(1);
            expect(reachable[0].id).toBe('start');
        });

        it('handles conditional edges from pending nodes gracefully', () => {
            interface TaskNode extends INode {
                condition?: boolean;
            }

            const nodes: TaskNode[] = [
                { id: 'node1', state: 'pending', type: 'task' },
                { id: 'node2', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                {
                    from: 'node1',
                    to: 'node2',
                    condition: { property: 'condition', value: true },
                },
            ];

            const reachable = analyzer.findReachableNodes(nodes, edges);

            expect(reachable).toHaveLength(1);
            expect(reachable[0].id).toBe('node1');
        });
    });

    describe('areAllReachableNodesCompleted', () => {
        it('returns true when all reachable nodes are completed', () => {
            const nodes: INode[] = [
                { id: 'node1', state: 'success', type: 'task' },
                { id: 'node2', state: 'success', type: 'task' },
                { id: 'node3', state: 'fail', type: 'task' },
            ];
            const edges: IEdge[] = [
                { from: 'node1', to: 'node2' },
                { from: 'node2', to: 'node3' },
            ];

            const allCompleted = analyzer.areAllReachableNodesCompleted(nodes, edges);

            expect(allCompleted).toBe(true);
        });

        it('returns false when some reachable nodes are incomplete', () => {
            const nodes: INode[] = [
                { id: 'node1', state: 'success', type: 'task' },
                { id: 'node2', state: 'running', type: 'task' },
                { id: 'node3', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                { from: 'node1', to: 'node2' },
                { from: 'node2', to: 'node3' },
            ];

            const allCompleted = analyzer.areAllReachableNodesCompleted(nodes, edges);

            expect(allCompleted).toBe(false);
        });

        it('treats isolated nodes as reachable start nodes', () => {
            const nodes: INode[] = [
                { id: 'connected', state: 'success', type: 'task' },
                { id: 'isolated', state: 'success', type: 'task' },
            ];
            const edges: IEdge[] = [];

            const allCompleted = analyzer.areAllReachableNodesCompleted(nodes, edges);

            expect(allCompleted).toBe(true);
        });

        it('considers failed nodes as completed', () => {
            const nodes: INode[] = [
                { id: 'node1', state: 'success', type: 'task' },
                { id: 'node2', state: 'fail', type: 'task' },
            ];
            const edges: IEdge[] = [
                { from: 'node1', to: 'node2' },
            ];

            const allCompleted = analyzer.areAllReachableNodesCompleted(nodes, edges);

            expect(allCompleted).toBe(true);
        });

        it('handles conditional edges in completion check', () => {
            interface TaskNode extends INode {
                condition?: boolean;
            }

            const nodes: TaskNode[] = [
                { id: 'node1', state: 'success', type: 'task', condition: false },
                { id: 'node2', state: 'pending', type: 'task' },
            ];
            const edges: IEdge[] = [
                {
                    from: 'node1',
                    to: 'node2',
                    condition: { property: 'condition', value: true },
                },
            ];

            const allCompleted = analyzer.areAllReachableNodesCompleted(nodes, edges);

            expect(allCompleted).toBe(true);
        });

        it('returns true for empty workflow', () => {
            const nodes: INode[] = [];
            const edges: IEdge[] = [];

            const allCompleted = analyzer.areAllReachableNodesCompleted(nodes, edges);

            expect(allCompleted).toBe(true);
        });

        it('handles complex workflow with multiple paths', () => {
            interface TaskNode extends INode {
                pathA?: boolean;
                pathB?: boolean;
            }

            const nodes: TaskNode[] = [
                { id: 'start', state: 'success', type: 'task', pathA: true, pathB: false },
                { id: 'pathA', state: 'success', type: 'task' },
                { id: 'pathB', state: 'pending', type: 'task' },
                { id: 'end', state: 'success', type: 'task' },
            ];
            const edges: IEdge[] = [
                {
                    from: 'start',
                    to: 'pathA',
                    condition: { property: 'pathA', value: true },
                },
                {
                    from: 'start',
                    to: 'pathB',
                    condition: { property: 'pathB', value: true },
                },
                { from: 'pathA', to: 'end' },
            ];

            const allCompleted = analyzer.areAllReachableNodesCompleted(nodes, edges);

            expect(allCompleted).toBe(true);
        });
    });
});
