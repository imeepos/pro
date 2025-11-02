import { describe, expect, it } from 'vitest';
import { LabelPropagationClusterer } from '../src/clustering/label-propagation.js';
import type { GraphEdge, GraphSnapshot, UserGraphNode } from '../src/types.js';

const user = (id: string): UserGraphNode => ({
  id,
  kind: 'user',
  placeholder: false,
  attributes: {
    displayName: id,
    verified: false,
    followerCount: 0,
    followCount: 0,
    statusesCount: 0,
    residence: null,
    influenceSeed: 0,
    reciprocityIndex: 0,
  },
});

const edge = (source: string, target: string, weight: number): GraphEdge => ({
  kind: 'comment',
  source,
  target,
  weight,
  evidence: {
    firstSeenAt: null,
    lastSeenAt: null,
    occurrences: 1,
    scoreContributions: [weight],
  },
});

describe('LabelPropagationClusterer', () => {
  it('lets strong ties dominate while soft bridges stay humble', () => {
    const nodes = [user('A'), user('B'), user('C'), user('D')];
    const edges: GraphEdge[] = [
      edge('A', 'B', 3),
      edge('B', 'A', 3),
      edge('C', 'D', 3),
      edge('D', 'C', 3),
      edge('B', 'C', 0.2),
    ];
    const adjacency = new Map<string, GraphEdge[]>([
      ['A', [edges[0]]],
      ['B', [edges[1], edges[4]]],
      ['C', [edges[2]]],
      ['D', [edges[3]]],
    ]);

    const snapshot: GraphSnapshot = {
      nodes,
      edges,
      adjacency,
      generatedAt: new Date('2024-01-01T00:00:00Z'),
    };

    const clusterer = new LabelPropagationClusterer();
    const result = clusterer.run(snapshot);

    expect(result.stabilized).toBe(true);

    const labelA = result.labels.get('A');
    const labelB = result.labels.get('B');
    const labelC = result.labels.get('C');
    const labelD = result.labels.get('D');

    expect(labelA).toBeDefined();
    expect(labelB).toBeDefined();
    expect(labelC).toBeDefined();
    expect(labelD).toBeDefined();

    expect(labelA).toBe(labelB);
    expect(labelC).toBe(labelD);
    expect(labelA).not.toBe(labelC);
  });
});
