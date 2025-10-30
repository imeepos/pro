import { Injectable } from '@pro/core';
import {
  WeiboPostEntity,
  WeiboRepostEntity,
  WeiboUserEntity,
  useEntityManager,
} from '@pro/entities';
import { NormalizedWeiboRepost } from '@pro/weibo-persistence';

const deduplicateBy = <T, K>(items: readonly T[], keySelector: (item: T) => K): T[] => {
  const map = new Map<K, T>();
  for (const item of items) {
    map.set(keySelector(item), item);
  }
  return [...map.values()];
};

@Injectable({
  providedIn: 'root',
})
export class WeiboRepostPersistenceService {
  async saveReposts(
    reposts: NormalizedWeiboRepost[],
    users: Map<string, WeiboUserEntity>,
    posts: Map<string, WeiboPostEntity>,
  ): Promise<void> {
    if (reposts.length === 0) {
      return;
    }

    return await useEntityManager(async (manager) => {
      const repostRepository = manager.getRepository(WeiboRepostEntity);

      const filtered = reposts.filter(
        (repost) =>
          users.has(repost.userWeiboId) &&
          posts.has(repost.postWeiboId) &&
          posts.has(repost.originalPostWeiboId),
      );

      if (filtered.length === 0) {
        console.warn(
          `[saveReposts] No valid reposts to save - user keys: [${Array.from(users.keys()).join(', ')}], post keys: [${Array.from(posts.keys()).join(', ')}]`,
        );
        return;
      }

      const unique = deduplicateBy(filtered, (repost) => repost.postWeiboId);

      await repostRepository.upsert(
        unique.map((repost) => {
          const user = users.get(repost.userWeiboId)!;
          const post = posts.get(repost.postWeiboId)!;
          const originalPost = posts.get(repost.originalPostWeiboId)!;

          if (!user.id) {
            throw new Error(`User ${repost.userWeiboId} has no database ID`);
          }
          if (!post.id) {
            throw new Error(`Post ${repost.postWeiboId} has no database ID`);
          }
          if (!originalPost.id) {
            throw new Error(`Original post ${repost.originalPostWeiboId} has no database ID`);
          }

          return {
            user: { id: user.id },
            userWeiboId: repost.userWeiboId,
            post: { id: post.id },
            originalPost: { id: originalPost.id },
            repostText: repost.repostText ?? null,
            repostPicIds: repost.repostPicIds ?? null,
            targetWeiboId: repost.targetWeiboId,
            createdAt: repost.createdAt,
            rawPayload: repost.rawPayload,
          };
        }) as any,
        {
          conflictPaths: ['postId'],
          skipUpdateIfNoValuesChanged: true,
        },
      );

      console.log(`[saveReposts] Saved ${unique.length} reposts successfully`);
    });
  }
}
