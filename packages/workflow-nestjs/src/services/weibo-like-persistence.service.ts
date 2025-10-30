import { Injectable } from '@pro/core';
import {
  WeiboLikeEntity,
  WeiboUserEntity,
  WeiboPostEntity,
  useEntityManager,
} from '@pro/entities';
import { NormalizedWeiboLike } from '@pro/weibo-persistence';

@Injectable({
  providedIn: 'root',
})
export class WeiboLikePersistenceService {

  async saveLikes(
    likes: NormalizedWeiboLike[],
    users: Map<string, WeiboUserEntity>,
    post: WeiboPostEntity,
  ): Promise<void> {
    if (likes.length === 0) {
      return;
    }

    return await useEntityManager(async (manager) => {
      const likeRepository = manager.getRepository(WeiboLikeEntity);

      const records = likes
        .map((like) => {
          const user = users.get(like.userWeiboId);
          if (!user?.id) {
            return null;
          }
          return {
            user: { id: user.id },
            userId: user.id,
            userWeiboId: like.userWeiboId,
            post: { id: post.id },
            postId: post.id,
            targetWeiboId: like.targetWeiboId,
            createdAt: like.createdAt,
          };
        })
        .filter((record): record is NonNullable<typeof record> => record !== null);

      if (records.length === 0) {
        return;
      }

      await likeRepository.upsert(records as any, ['userId', 'postId']);
    });
  }

  async removeLike(userWeiboId: string, postWeiboId: string): Promise<boolean> {
    return await useEntityManager(async (manager) => {
      const likeRepository = manager.getRepository(WeiboLikeEntity);

      const result = await likeRepository.delete({
        userWeiboId,
        targetWeiboId: postWeiboId,
      });

      return (result.affected ?? 0) > 0;
    });
  }

  async hasUserLikedPost(userWeiboId: string, postWeiboId: string): Promise<boolean> {
    return await useEntityManager(async (manager) => {
      const likeRepository = manager.getRepository(WeiboLikeEntity);

      const count = await likeRepository.count({
        where: {
          userWeiboId,
          targetWeiboId: postWeiboId,
        },
      });

      return count > 0;
    });
  }
}
