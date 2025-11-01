import { describe, expect, it } from 'vitest';
import { CentralityAnalyzer } from '../src/analytics/centrality.js';
import type { GraphEdge, GraphSnapshot, UserGraphNode } from '../src/types.js';

const createUser = (id: string): UserGraphNode => ({
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

const createEdge = (source: string, target: string, weight: number): GraphEdge => ({
  kind: 'mention',
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

describe('CentralityAnalyzer', () => {
  it('honours symmetry by giving a cycle equal prominence', () => {
    const nodes = [createUser('A'), createUser('B'), createUser('C')];
    const edges: GraphEdge[] = [
      createEdge('A', 'B', 1),
      createEdge('B', 'C', 1),
      createEdge('C', 'A', 1),
    ];
    const adjacency = new Map<string, GraphEdge[]>([
      ['A', [edges[0]]],
      ['B', [edges[1]]],
      ['C', [edges[2]]],
    ]);

    const snapshot: GraphSnapshot = {
      nodes,
      edges,
      adjacency,
      generatedAt: new Date('2024-01-01T00:00:00Z'),
    };

    const analyzer = new CentralityAnalyzer();
    const report = analyzer.analyze(snapshot);

    expect(report.totalEdgeWeight).toBe(3);
    nodes.forEach((node) => {
      const vector = report.metrics.get(node.id);
      expect(vector).toBeDefined();
      expect(vector?.outDegree).toBe(1);
      expect(vector?.inDegree).toBe(1);
      expect(vector?.outStrength).toBeCloseTo(1, 6);
      expect(vector?.inStrength).toBeCloseTo(1, 6);
      expect(vector?.pageRank).toBeCloseTo(1 / 3, 6);
    });
  });

  it('recognises sinks as gravity wells', () => {
    const nodes = [createUser('source'), createUser('sink')];
    const edges: GraphEdge[] = [createEdge('source', 'sink', 2)];
    const adjacency = new Map<string, GraphEdge[]>([['source', edges]]);

    const snapshot: GraphSnapshot = {
      nodes,
      edges,
      adjacency,
      generatedAt: new Date('2024-01-01T00:00:00Z'),
    };

    const analyzer = new CentralityAnalyzer();
    const report = analyzer.analyze(snapshot);

    const upstream = report.metrics.get('source');
    expect(upstream).toBeDefined();
    expect(upstream?.outDegree).toBe(1);
    expect(upstream?.inDegree).toBe(0);
    expect(upstream?.outStrength).toBe(2);
    expect(upstream?.inStrength).toBe(0);

    const downstream = report.metrics.get('sink');
    expect(downstream).toBeDefined();
    expect(downstream?.outDegree).toBe(0);
    expect(downstream?.inDegree).toBe(1);
    expect(downstream?.outStrength).toBe(0);
    expect(downstream?.inStrength).toBe(2);

    expect((downstream?.pageRank ?? 0) > (upstream?.pageRank ?? 0)).toBe(true);
  });
});
