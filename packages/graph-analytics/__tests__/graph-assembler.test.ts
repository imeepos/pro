import { describe, expect, it } from 'vitest';
import { GraphAssembler } from '../src/graph-builder/graph-assembler.js';
import type {
  WeiboHashtagEntity,
  WeiboLikeEntity,
  WeiboPostEntity,
  WeiboPostHashtagEntity,
  WeiboPostMentionEntity,
  WeiboUserEntity,
} from '@pro/entities';

const buildUser = (): WeiboUserEntity =>
  ({
    id: '42',
    screen_name: '晨光',
    name: '晨光',
    verified: true,
    followers_count: 500,
    friends_count: 80,
    statuses_count: 300,
    location: '北京',
    bi_followers_count: 40,
  }) as unknown as WeiboUserEntity;

const buildPost = (): WeiboPostEntity =>
  ({
    id: '9001',
    created_at: '2024-01-01T00:00:00Z',
    visible: { type: 0, list_id: 0 },
    textLength: 240,
    reposts_count: 0,
    comments_count: 0,
    attitudes_count: 0,
    user: { id: '42' },
  }) as unknown as WeiboPostEntity;

const buildHashtag = (): WeiboHashtagEntity =>
  ({
    id: 'hashtag-1',
    tagId: 'hashtag-1',
    tagName: '#weibo',
    tagType: 1,
    tagHidden: false,
    description: '#weibo',
    rawPayload: {},
    ingestedAt: new Date('2024-01-01T00:00:00Z'),
    postLinks: [],
  }) as unknown as WeiboHashtagEntity;

describe('GraphAssembler', () => {
  it('assembles a snapshot with deliberate ordering and adjacency', () => {
    const assembler = new GraphAssembler();
    const evaluationTime = new Date('2024-01-02T00:00:00Z');

    const result = assembler.assemble({
      users: [buildUser()],
      posts: [buildPost()],
      hashtags: [buildHashtag()],
      postHashtags: [
        {
          postId: '9001',
          hashtagId: 'hashtag-1',
        } as unknown as WeiboPostHashtagEntity,
      ],
      mentions: [
        {
          postId: '9001',
          mentionedId: '77',
        } as unknown as WeiboPostMentionEntity,
      ],
      likes: [
        {
          id: 'like-1',
          userWeiboId: '88',
          targetWeiboId: '9001',
          createdAt: new Date('2024-01-01T12:00:00Z'),
        } as unknown as WeiboLikeEntity,
      ],
      evaluationTime,
    });

    expect(result.generatedAt).toEqual(evaluationTime);
    expect(result.nodes.map((node) => node.id)).toEqual(['42', '77', '88', '9001', 'hashtag-1']);

    expect(result.edges.map((edge) => edge.kind)).toEqual(['author', 'mention', 'has_hashtag', 'like']);

    expect(result.adjacency).toBeInstanceOf(Map);
    expect(result.adjacency.get('42')?.map((edge) => edge.kind)).toEqual(['author', 'mention']);
    expect(result.adjacency.get('9001')?.map((edge) => edge.kind)).toEqual(['has_hashtag']);
    expect(result.adjacency.get('88')?.map((edge) => edge.kind)).toEqual(['like']);
  });
});
