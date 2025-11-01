import { describe, expect, it } from 'vitest';
import { GraphNodeRegistry } from '../src/graph-builder/node-extractor.js';
import type { WeiboPostEntity, WeiboUserEntity, WeiboHashtagEntity } from '@pro/entities';

const buildUser = (overrides: Partial<WeiboUserEntity> = {}): WeiboUserEntity =>
  ({
    id: '42',
    screen_name: '流光',
    name: '流光',
    verified: true,
    followers_count: 1234,
    friends_count: 320,
    statuses_count: 987,
    location: '上海',
    bi_followers_count: 111,
    ...overrides,
  }) as unknown as WeiboUserEntity;

const buildPost = (overrides: Partial<WeiboPostEntity> = {}): WeiboPostEntity =>
  ({
    id: '9001',
    textLength: 120,
    reposts_count: 12,
    comments_count: 8,
    attitudes_count: 45,
    created_at: '2024-01-01T08:00:00Z',
    visible: { type: 0, list_id: 0 },
    user: { id: '42' },
    ...overrides,
  }) as unknown as WeiboPostEntity;

const buildHashtag = (overrides: Partial<WeiboHashtagEntity> = {}): WeiboHashtagEntity =>
  ({
    id: '#weibo',
    tagId: '#weibo',
    tagName: '#weibo',
    tagType: 1,
    tagHidden: false,
    description: '趋势',
    rawPayload: {},
    ingestedAt: new Date('2024-01-01T00:00:00Z'),
    postLinks: [],
    ...overrides,
  }) as unknown as WeiboHashtagEntity;

describe('GraphNodeRegistry', () => {
  it('summons placeholders that carry no accidental meaning', () => {
    const registry = new GraphNodeRegistry();

    const phantom = registry.ensureUser('100');

    expect(phantom.placeholder).toBe(true);
    expect(phantom.attributes).toEqual({
      displayName: '100',
      verified: false,
      followerCount: 0,
      followCount: 0,
      statusesCount: 0,
      residence: null,
      influenceSeed: 0,
      reciprocityIndex: 0,
    });
  });

  it('rescues a placeholder with living profile data', () => {
    const registry = new GraphNodeRegistry();
    registry.ensureUser('42');

    const user = registry.upsertUser(buildUser());

    const followerScore = Math.log10(user.attributes.followerCount + 1);
    const activityScore = Math.log10(user.attributes.statusesCount + 1);
    const expectedInfluence = Number.parseFloat((followerScore * 0.7 + activityScore * 0.3).toFixed(6));
    const expectedReciprocity = Number.parseFloat((111 / (1234 + 320)).toFixed(6));

    expect(user.placeholder).toBe(false);
    expect(user.attributes.displayName).toBe('流光');
    expect(user.attributes.residence).toBe('上海');
    expect(user.attributes.influenceSeed).toBe(expectedInfluence);
    expect(user.attributes.reciprocityIndex).toBe(expectedReciprocity);
  });

  it('records a post and remembers the author and moment of birth', () => {
    const registry = new GraphNodeRegistry();

    const snapshot = registry.registerPost(buildPost());

    expect(snapshot.kind).toBe('post');
    expect(snapshot.attributes.authorId).toBe('42');
    expect(snapshot.attributes.createdAt?.toISOString()).toBe('2024-01-01T08:00:00.000Z');
    expect(registry.authorOf('9001')).toBe('42');
    expect(registry.createdAtOf('9001')?.toISOString()).toBe('2024-01-01T08:00:00.000Z');
    expect(registry.getNode('42')?.kind).toBe('user');
  });

  it('lets hashtags mature through deliberate usage', () => {
    const registry = new GraphNodeRegistry();
    registry.registerHashtag(buildHashtag(), 5);

    registry.incrementHashtagUsage('#weibo', 2);

    const hashtag = registry.getNode('#weibo');
    if (!hashtag || hashtag.kind !== 'hashtag') {
      throw new Error('Hashtag node was not registered as expected');
    }
    expect(hashtag.attributes.usageCount).toBe(7);
  });
});
