import { Injectable } from '@pro/core';
import {
  // WeiboFavoriteEntity, // TODO: Entity 已删除，需要重新设计收藏功能
  WeiboPostEntity,
  WeiboUserEntity,
  // useEntityManager,
} from '@pro/entities';
import { NormalizedWeiboFavorite } from '@pro/weibo-persistence';

/* 暂时不需要
const deduplicateBy = <T, K>(items: readonly T[], keySelector: (item: T) => K): T[] => {
  const map = new Map<K, T>();
  for (const item of items) {
    map.set(keySelector(item), item);
  }
  return [...map.values()];
};
*/

@Injectable({
  providedIn: 'root',
})
export class WeiboFavoritePersistenceService {

  async saveFavorites(
    _favorites: NormalizedWeiboFavorite[],
    _users: Map<string, WeiboUserEntity>,
    _posts: Map<string, WeiboPostEntity>
  ): Promise<void> {
    // TODO: WeiboFavoriteEntity 已删除，需要重新设计收藏功能
    console.warn('[saveFavorites] WeiboFavoriteEntity 不存在，跳过收藏保存');
    return;

    /* 原实现已注释
    if (favorites.length === 0) {
      return;
    }

    await useEntityManager(async (manager) => {
      // const favoriteRepository = manager.getRepository(WeiboFavoriteEntity);

      const unique = deduplicateBy(
        favorites,
        (fav) => `${fav.userWeiboId}-${fav.targetWeiboId}`
      );

      const records = unique
        .map((favorite) => {
          const user = users.get(favorite.userWeiboId);
          const post = posts.get(favorite.targetWeiboId);

          if (!user?.id || !post?.id) {
            return null;
          }

          return {
            user: { id: user.id },
            userId: user.id,
            userWeiboId: favorite.userWeiboId,
            post: { id: post.id },
            postId: post.id,
            targetWeiboId: favorite.targetWeiboId,
            folderName: favorite.folderName ?? null,
            notes: favorite.notes ?? null,
            createdAt: favorite.createdAt,
            metadataJson: favorite.metadataJson ?? null,
          };
        })
        .filter((record): record is NonNullable<typeof record> => record !== null);

      if (records.length === 0) {
        console.warn(`[saveFavorites] No valid favorites to save`);
        return;
      }

      await favoriteRepository
        .createQueryBuilder()
        .insert()
        .values(records as any)
        .orIgnore()
        .execute();

      console.log(`[saveFavorites] Saved ${records.length} favorites`);
    });
    */
  }

  async removeFavorite(_userWeiboId: string, _postWeiboId: string): Promise<boolean> {
    // TODO: WeiboFavoriteEntity 已删除，需要重新设计收藏功能
    console.warn('[removeFavorite] WeiboFavoriteEntity 不存在，跳过收藏删除');
    return false;

    /* 原实现已注释
    return await useEntityManager(async (manager) => {
      // const favoriteRepository = manager.getRepository(WeiboFavoriteEntity);

      const result = await favoriteRepository.delete({
        userWeiboId,
        targetWeiboId: postWeiboId,
      });

      const removed = (result.affected ?? 0) > 0;
      if (removed) {
        console.log(`[removeFavorite] Removed favorite: user=${userWeiboId}, post=${postWeiboId}`);
      }

      return removed;
    });
    */
  }
}
