import { describe, expect, it } from 'vitest';
import { GraphNodeRegistry } from '../src/graph-builder/node-extractor.js';
import { WeiboEdgeCalculator } from '../src/graph-builder/edge-calculator.js';
import { WeiboInteractionType } from '@pro/entities';
import type {
  WeiboInteractionEntity,
  WeiboLikeEntity,
  WeiboPostEntity,
  WeiboPostMentionEntity,
} from '@pro/entities';

const registerPostWithAuthor = (registry: GraphNodeRegistry, overrides: Partial<WeiboPostEntity> = {}) => {
  registry.registerPost(
    ({
      id: '9001',
      created_at: '2024-01-01T08:00:00Z',
      visible: { type: 0, list_id: 0 },
      textLength: 120,
      reposts_count: 0,
      comments_count: 0,
      attitudes_count: 0,
      user: { id: '42' },
      ...overrides,
    }) as unknown as WeiboPostEntity,
  );
};

describe('WeiboEdgeCalculator', () => {
  it('decays engagement gracefully while keeping the story of each touchpoint', () => {
    const registry = new GraphNodeRegistry();
    registerPostWithAuthor(registry);
    const calculator = new WeiboEdgeCalculator();

    const evaluationTime = new Date('2024-01-03T00:00:00Z');
    const likes: WeiboLikeEntity[] = [
      {
        id: 'l1',
        userWeiboId: '88',
        targetWeiboId: '9001',
        createdAt: new Date('2024-01-02T00:00:00Z'),
      } as unknown as WeiboLikeEntity,
      {
        id: 'l2',
        userWeiboId: '88',
        targetWeiboId: '9001',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      } as unknown as WeiboLikeEntity,
    ];
    const mentions: WeiboPostMentionEntity[] = [
      { postId: '9001', mentionedId: '77' } as unknown as WeiboPostMentionEntity,
    ];

    const edges = calculator.calculate({
      registry,
      likes,
      mentions,
      evaluationTime,
    });

    const authorEdge = edges.find((edge) => edge.kind === 'author');
    expect(authorEdge).toBeDefined();
    expect(authorEdge?.source).toBe('42');
    expect(authorEdge?.target).toBe('9001');
    const authorCreatedAt = authorEdge?.evidence.firstSeenAt ?? null;
    if (!authorCreatedAt) {
      throw new Error('Author edge is missing creation timestamp');
    }
    const hoursFromOrigin =
      Math.abs(evaluationTime.getTime() - authorCreatedAt.getTime()) / (1000 * 60 * 60);
    const decay = Math.pow(0.5, hoursFromOrigin / 720);
    const expectedAuthorWeight = Number.parseFloat((2 * decay).toFixed(6));
    expect(authorEdge?.weight).toBeCloseTo(expectedAuthorWeight, 6);
    expect(authorEdge?.evidence.firstSeenAt?.toISOString()).toBe('2024-01-01T08:00:00.000Z');

    const mentionEdge = edges.find((edge) => edge.kind === 'mention');
    expect(mentionEdge).toBeDefined();
    expect(mentionEdge?.source).toBe('42');
    expect(mentionEdge?.target).toBe('77');
    expect(mentionEdge?.metadata).toEqual({ posts: ['9001'] });

    const likeEdge = edges.find((edge) => edge.kind === 'like');
    expect(likeEdge).toBeDefined();
    expect(likeEdge?.source).toBe('88');
    expect(likeEdge?.target).toBe('9001');
    expect(likeEdge?.weight).toBeCloseTo(0.375, 6);
    expect(likeEdge?.evidence.occurrences).toBe(2);
    expect(likeEdge?.evidence.scoreContributions).toEqual([0.25, 0.125]);
    expect(likeEdge?.evidence.firstSeenAt?.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(likeEdge?.evidence.lastSeenAt?.toISOString()).toBe('2024-01-02T00:00:00.000Z');
    expect(likeEdge?.metadata).toEqual({ posts: ['9001'] });
  });

  it('merges repeated interactions into a single thread enriched with metadata', () => {
    const registry = new GraphNodeRegistry();
    registerPostWithAuthor(registry);
    const calculator = new WeiboEdgeCalculator();

    const evaluationTime = new Date('2024-02-01T00:00:00Z');
    const interactions: WeiboInteractionEntity[] = [
      {
        id: 'i1',
        interactionType: WeiboInteractionType.Comment,
        userWeiboId: '321',
        targetWeiboId: '9001',
        createdAt: new Date('2024-01-31T00:00:00Z'),
      } as unknown as WeiboInteractionEntity,
      {
        id: 'i2',
        interactionType: WeiboInteractionType.Repost,
        userWeiboId: '321',
        targetWeiboId: '9001',
        createdAt: new Date('2024-01-30T12:00:00Z'),
      } as unknown as WeiboInteractionEntity,
    ];

    const edges = calculator.calculate({
      registry,
      interactions,
      evaluationTime,
    });

    const interactEdge = edges.find((edge) => edge.kind === 'interact');
    expect(interactEdge).toBeDefined();
    expect(interactEdge?.source).toBe('321');
    expect(interactEdge?.target).toBe('42');
    expect(interactEdge?.evidence.occurrences).toBe(2);
    expect(interactEdge?.metadata).toEqual({
      interactionTypes: ['comment', 'repost'],
      posts: ['9001'],
    });
    const interactScoreSum = interactEdge?.evidence.scoreContributions.reduce((total, value) => total + value, 0) ?? 0;
    expect(interactEdge?.weight).toBeCloseTo(interactScoreSum, 6);

    const commentEdge = edges.find((edge) => edge.kind === 'comment');
    expect(commentEdge).toBeDefined();
    expect(commentEdge?.metadata).toEqual({ posts: ['9001'], interactionTypes: ['comment'] });

    const repostEdge = edges.find((edge) => edge.kind === 'repost');
    expect(repostEdge).toBeDefined();
    expect(repostEdge?.metadata).toEqual({ posts: ['9001'], interactionTypes: ['repost'] });
  });
});
