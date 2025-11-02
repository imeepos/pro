import { describe, it, expect } from 'vitest';
import { StateMerger } from '../execution/state-merger';
import { INode } from '../types';

describe('StateMerger', () => {
    const merger = new StateMerger();

    describe('mergeNodeStates', () => {
        it('updates node state when node is re-executed', () => {
            const original: INode[] = [
                { id: 'node1', type: 'fetch', state: 'pending' },
                { id: 'node2', type: 'transform', state: 'pending' },
            ];

            const executed: INode[] = [
                { id: 'node1', type: 'fetch', state: 'success' },
            ];

            const result = merger.mergeNodeStates(original, executed);

            expect(result).toEqual([
                { id: 'node1', type: 'fetch', state: 'success' },
                { id: 'node2', type: 'transform', state: 'pending' },
            ]);
        });

        it('preserves node state when not re-executed', () => {
            const original: INode[] = [
                { id: 'node1', type: 'fetch', state: 'success' },
                { id: 'node2', type: 'transform', state: 'pending' },
            ];

            const executed: INode[] = [];

            const result = merger.mergeNodeStates(original, executed);

            expect(result).toEqual(original);
        });

        it('merges multiple re-executed nodes', () => {
            const original: INode[] = [
                { id: 'node1', type: 'fetch', state: 'pending' },
                { id: 'node2', type: 'transform', state: 'pending' },
                { id: 'node3', type: 'save', state: 'pending' },
            ];

            const executed: INode[] = [
                { id: 'node1', type: 'fetch', state: 'success' },
                { id: 'node3', type: 'save', state: 'fail' },
            ];

            const result = merger.mergeNodeStates(original, executed);

            expect(result).toEqual([
                { id: 'node1', type: 'fetch', state: 'success' },
                { id: 'node2', type: 'transform', state: 'pending' },
                { id: 'node3', type: 'save', state: 'fail' },
            ]);
        });

        it('handles empty original nodes', () => {
            const original: INode[] = [];
            const executed: INode[] = [
                { id: 'node1', type: 'fetch', state: 'success' },
            ];

            const result = merger.mergeNodeStates(original, executed);

            expect(result).toEqual([]);
        });

        it('handles empty executed nodes', () => {
            const original: INode[] = [
                { id: 'node1', type: 'fetch', state: 'pending' },
            ];
            const executed: INode[] = [];

            const result = merger.mergeNodeStates(original, executed);

            expect(result).toEqual(original);
        });

        it('preserves original node when executed node has different id', () => {
            const original: INode[] = [
                { id: 'node1', type: 'fetch', state: 'pending' },
                { id: 'node2', type: 'transform', state: 'pending' },
            ];

            const executed: INode[] = [
                { id: 'node3', type: 'save', state: 'success' },
            ];

            const result = merger.mergeNodeStates(original, executed);

            expect(result).toEqual(original);
        });

        it('maintains node order from original array', () => {
            const original: INode[] = [
                { id: 'node3', type: 'save', state: 'pending' },
                { id: 'node1', type: 'fetch', state: 'pending' },
                { id: 'node2', type: 'transform', state: 'pending' },
            ];

            const executed: INode[] = [
                { id: 'node1', type: 'fetch', state: 'success' },
                { id: 'node2', type: 'transform', state: 'success' },
            ];

            const result = merger.mergeNodeStates(original, executed);

            expect(result).toEqual([
                { id: 'node3', type: 'save', state: 'pending' },
                { id: 'node1', type: 'fetch', state: 'success' },
                { id: 'node2', type: 'transform', state: 'success' },
            ]);
        });

        it('replaces entire node object when re-executed', () => {
            const original: INode[] = [
                { id: 'node1', type: 'fetch', state: 'pending', customProp: 'old' } as any,
            ];

            const executed: INode[] = [
                { id: 'node1', type: 'fetch', state: 'success', customProp: 'new' } as any,
            ];

            const result = merger.mergeNodeStates(original, executed);

            expect(result[0]).toEqual(executed[0]);
            expect((result[0] as any).customProp).toBe('new');
        });
    });
});
