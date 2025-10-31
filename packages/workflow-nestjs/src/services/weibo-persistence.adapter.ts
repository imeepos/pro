import { Injectable } from '@pro/core';
import {
  WeiboCommentEntity,
  WeiboHashtagEntity,
  WeiboMediaEntity,
  WeiboPostEntity,
  WeiboPostHashtagEntity,
  WeiboUserEntity,
  WeiboUserStatsEntity,
  useEntityManager,
} from '@pro/entities';
import {
  NormalizedWeiboComment,
  NormalizedWeiboHashtag,
  NormalizedWeiboMedia,
  NormalizedWeiboPost,
  NormalizedWeiboUser,
  NormalizedWeiboUserStats,
} from '@pro/weibo-persistence';
import { In } from 'typeorm';

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
export class WeiboPersistenceServiceAdapter {

  /**
   * 在同一事务中保存用户和帖子，确保外键关联正确
   */
  async saveUsersAndPosts(
    users: NormalizedWeiboUser[],
    posts: NormalizedWeiboPost[]
  ): Promise<{
    userMap: Map<string, WeiboUserEntity>
    postMap: Map<string, WeiboPostEntity>
  }> {
    return await useEntityManager(async (manager) => {
      const userRepository = manager.getRepository(WeiboUserEntity);
      const postRepository = manager.getRepository(WeiboPostEntity);

      // 1. 保存用户
      const uniqueUsers = deduplicateBy(users, (user) => user.weiboId);
      if (uniqueUsers.length === 0) {
        return { userMap: new Map(), postMap: new Map() };
      }

      await userRepository.upsert(
        uniqueUsers.map((user) => ({
          id: Number(user.weiboId),
          idstr: user.idstr,
          screen_name: user.screenName,
          domain: user.domain,
          weihao: user.weihao,
          verified: user.verified,
          verified_type: user.verifiedType,
          verified_reason: user.verifiedReason,
          verified_type_ext: user.verifiedTypeExt,
          profile_image_url: user.profileImageUrl,
          avatar_large: user.avatarLarge,
          avatar_hd: user.avatarHd,
          followers_count: user.followersCount,
          friends_count: user.friendsCount,
          statuses_count: user.statusesCount,
          mbrank: user.mbrank,
          mbtype: user.mbtype,
          v_plus: user.vPlus ? 1 : 0,
          svip: user.svip ? 1 : 0,
          vvip: user.vvip ? 1 : 0,
          user_ability: user.userAbility,
          planet_video: user.planetVideo ? 1 : 0,
          gender: user.gender,
          location: user.location,
          description: user.description,
          follow_me: user.followMe,
          following: user.following,
          online_status: user.onlineStatus,
        })) as any,
        ['id'],
      );

      // 2. 在同一事务中查询用户（此时 ID 已生成）
      const storedUsers = await userRepository.find({
        where: { id: In(uniqueUsers.map((u) => Number(u.weiboId))) },
      });

      const userMap = new Map(storedUsers.map((user) => [String(user.id), user]));

      // 3. 保存帖子（使用刚查询到的带ID的用户实体）
      if (posts.length === 0) {
        return { userMap, postMap: new Map() };
      }

      const filteredPosts = posts.filter((post) => userMap.has(post.authorWeiboId));
      if (filteredPosts.length === 0) {
        return { userMap, postMap: new Map() };
      }

      await postRepository.upsert(
        filteredPosts.map((post) => ({
          id: post.weiboId,
          mid: post.mid,
          mblogid: post.mblogid,
          text: post.text,
          text_raw: post.textRaw,
          textLength: post.textLength,
          isLongText: post.isLongText,
          content_auth: post.contentAuth,
          created_at: post.createdAt,
          reposts_count: post.repostsCount,
          comments_count: post.commentsCount,
          attitudes_count: post.attitudesCount,
          source: post.source,
          region_name: post.regionName,
          pic_num: post.picNum,
          is_paid: post.isPaid,
          mblog_vip_type: post.mblogVipType,
          can_edit: post.canEdit,
          favorited: post.favorited,
          mblogtype: post.mblogtype,
          share_repost_type: post.shareRepostType,
        })) as any,
        {
          conflictPaths: ['id'],
          skipUpdateIfNoValuesChanged: true,
        },
      );

      const storedPosts = await postRepository.find({
        where: { id: In(filteredPosts.map((post) => post.weiboId)) },
      });
      const postMap = new Map(storedPosts.map((post) => [post.id, post]));

      // 4. 保存关联数据（hashtags, media）
      await this.saveHashtags(filteredPosts, postMap, manager);
      await this.saveMedia(filteredPosts, postMap, manager);

      return { userMap, postMap };
    });
  }

  async saveUsers(users: NormalizedWeiboUser[]): Promise<Map<string, WeiboUserEntity>> {
    return await useEntityManager(async (manager) => {
      const userRepository = manager.getRepository(WeiboUserEntity);

      const unique = deduplicateBy(users, (user) => user.weiboId);

      if (unique.length === 0) {
        return new Map();
      }

      await userRepository.upsert(
        unique.map((user) => ({
          id: Number(user.weiboId),
          idstr: user.idstr,
          screen_name: user.screenName,
          domain: user.domain,
          weihao: user.weihao,
          verified: user.verified,
          verified_type: user.verifiedType,
          verified_reason: user.verifiedReason,
          verified_type_ext: user.verifiedTypeExt,
          profile_image_url: user.profileImageUrl,
          avatar_large: user.avatarLarge,
          avatar_hd: user.avatarHd,
          followers_count: user.followersCount,
          friends_count: user.friendsCount,
          statuses_count: user.statusesCount,
          mbrank: user.mbrank,
          mbtype: user.mbtype,
          v_plus: user.vPlus ? 1 : 0,
          svip: user.svip ? 1 : 0,
          vvip: user.vvip ? 1 : 0,
          user_ability: user.userAbility,
          planet_video: user.planetVideo ? 1 : 0,
          gender: user.gender,
          location: user.location,
          description: user.description,
          follow_me: user.followMe,
          following: user.following,
          online_status: user.onlineStatus,
        })) as any,
        ['id'],
      );

      const stored = await userRepository.find({
        where: { id: In(unique.map((u) => Number(u.weiboId))) },
      });

      return new Map(stored.map((user) => [String(user.id), user]));
    });
  }

  async savePosts(
    posts: NormalizedWeiboPost[],
    authors: Map<string, WeiboUserEntity>,
  ): Promise<Map<string, WeiboPostEntity>> {
    return await useEntityManager(async (manager) => {
      const postRepository = manager.getRepository(WeiboPostEntity);

      const filtered = posts.filter((post) => authors.has(post.authorWeiboId));
      if (filtered.length === 0) {
        return new Map();
      }

      await postRepository.upsert(
        filtered.map((post) => ({
          id: post.weiboId,
          mid: post.mid,
          mblogid: post.mblogid,
          text: post.text,
          text_raw: post.textRaw,
          textLength: post.textLength,
          isLongText: post.isLongText,
          content_auth: post.contentAuth,
          created_at: post.createdAt,
          reposts_count: post.repostsCount,
          comments_count: post.commentsCount,
          attitudes_count: post.attitudesCount,
          source: post.source,
          region_name: post.regionName,
          pic_num: post.picNum,
          is_paid: post.isPaid,
          mblog_vip_type: post.mblogVipType,
          can_edit: post.canEdit,
          favorited: post.favorited,
          mblogtype: post.mblogtype,
          share_repost_type: post.shareRepostType,
        })) as any,
        {
          conflictPaths: ['id'],
          skipUpdateIfNoValuesChanged: true,
        },
      );

      const storedPosts = await postRepository.find({
        where: { id: In(filtered.map((post) => post.weiboId)) },
      });
      const postMap = new Map(storedPosts.map((post) => [post.id, post]));

      await this.saveHashtags(filtered, postMap, manager);
      await this.saveMedia(filtered, postMap, manager);

      return postMap;
    });
  }

  private async saveHashtags(
    posts: NormalizedWeiboPost[],
    savedPosts: Map<string, WeiboPostEntity>,
    manager: any
  ): Promise<void> {
    const hashtagRepository = manager.getRepository(WeiboHashtagEntity);
    const postHashtagRepository = manager.getRepository(WeiboPostHashtagEntity);

    const hashtags: NormalizedWeiboHashtag[] = [];
    const postTagPairs: Array<{ weiboId: string; tagId: string }> = [];

    posts.forEach((post) => {
      post.hashtags.forEach((tag) => {
        hashtags.push(tag);
        postTagPairs.push({ weiboId: post.weiboId, tagId: tag.tagId });
      });
    });

    if (hashtags.length === 0) {
      return;
    }

    const uniqueTags = deduplicateBy(hashtags, (tag) => tag.tagId);

    await hashtagRepository.upsert(
      uniqueTags.map((tag) => ({
        tagId: tag.tagId,
        tagName: tag.tagName,
        tagType: tag.tagType,
        tagHidden: tag.tagHidden,
        oid: tag.oid,
        tagScheme: tag.tagScheme,
        urlTypePic: tag.urlTypePic,
        wHRatio: tag.wHRatio,
        description: tag.description,
        actionLogJson: tag.actionLogJson,
        rawPayload: tag.rawPayload,
      })) as any,
      ['tagId'],
    );

    const storedTags = await hashtagRepository.find({
      where: { tagId: In(uniqueTags.map((tag) => tag.tagId)) },
    });
    const tagMap = new Map(storedTags.map((tag: any) => [tag.tagId, tag]));

    const linkValues = postTagPairs
      .map((pair) => {
        const post = savedPosts.get(pair.weiboId);
        const hashtag = tagMap.get(pair.tagId);
        if (!post || !hashtag) {
          return null;
        }
        return {
          postId: (post as any).id,
          hashtagId: (hashtag as any).id,
        };
      })
      .filter((entry): entry is { postId: string; hashtagId: string } => entry !== null);

    if (linkValues.length === 0) {
      return;
    }

    await postHashtagRepository
      .createQueryBuilder()
      .insert()
      .values(
        deduplicateBy(linkValues, (item) => `${item.postId}-${item.hashtagId}`),
      )
      .orIgnore()
      .execute();
  }

  private async saveMedia(
    posts: NormalizedWeiboPost[],
    savedPosts: Map<string, WeiboPostEntity>,
    manager: any
  ): Promise<void> {
    const mediaRepository = manager.getRepository(WeiboMediaEntity);

    const records: Array<NormalizedWeiboMedia & { postId: string }> = [];

    posts.forEach((post) => {
      const postEntity = savedPosts.get(post.weiboId);
      if (!postEntity) return;

      post.media.forEach((media) => {
        if (!media.fileUrl) return;
        records.push({
          ...media,
          postId: postEntity.id,
        });
      });
    });

    if (records.length === 0) {
      return;
    }

    // Note: Using column names directly for composite unique constraint
    await mediaRepository
      .createQueryBuilder()
      .insert()
      .values(
        records.map((media) => ({
          post: { id: media.postId } as any,
          mediaId: media.mediaId,
          mediaType: media.mediaType,
          fileUrl: media.fileUrl,
          originalUrl: media.originalUrl,
          width: media.width,
          height: media.height,
          fileSize: media.fileSize,
          format: media.format,
          thumbnail: media.thumbnail,
          bmiddle: media.bmiddle,
          large: media.large,
          original: media.original,
          duration: media.duration,
          streamUrl: media.streamUrl,
          streamUrlHd: media.streamUrlHd,
          mediaInfoJson: media.mediaInfoJson,
          rawPayload: media.rawPayload,
        }))
      )
      .orIgnore()
      .execute();
  }

  async ensurePostByWeiboId(weiboId: string): Promise<WeiboPostEntity | null> {
    return await useEntityManager(async (manager) => {
      const postRepository = manager.getRepository(WeiboPostEntity);
      return postRepository.findOne({ where: { id: weiboId } });
    });
  }

  async ensurePostByMid(mid: string): Promise<WeiboPostEntity | null> {
    return await useEntityManager(async (manager) => {
      const postRepository = manager.getRepository(WeiboPostEntity);
      return postRepository.findOne({ where: { mid } });
    });
  }

  async saveComments(
    comments: NormalizedWeiboComment[],
    authors: Map<string, WeiboUserEntity>,
    _post: WeiboPostEntity,
  ): Promise<Map<string, WeiboCommentEntity>> {
    return await useEntityManager(async (manager) => {
      const commentRepository = manager.getRepository(WeiboCommentEntity);

      const filtered = comments.filter((comment) => authors.has(comment.authorWeiboId));
      if (filtered.length === 0) {
        return new Map();
      }

      const uniqueComments = Array.from(
        new Map(filtered.map((comment) => [comment.commentId, comment])).values(),
      );

      await commentRepository.upsert(
        uniqueComments.map((comment) => ({
          id: Number(comment.commentId),
          idstr: comment.idstr,
          mid: comment.mid,
          rootid: comment.rootId ? Number(comment.rootId) : null,
          rootidstr: comment.rootMid,
          floor_number: comment.floorNumber,
          text: comment.text,
          text_raw: comment.textRaw,
          source: comment.source,
          created_at: comment.createdAt,
          like_counts: comment.likeCounts,
          liked: comment.liked,
          total_number: comment.totalNumber,
          disable_reply: comment.disableReply,
          restrictOperate: comment.restrictOperate,
          allow_follow: comment.allowFollow,
        })) as any,
        {
          conflictPaths: ['id'],
          skipUpdateIfNoValuesChanged: true,
        },
      );

      const stored = await commentRepository.find({
        where: { id: In(uniqueComments.map((comment) => Number(comment.commentId))) },
      });

      return new Map(stored.map((comment: any) => [String(comment.id), comment]));
    });
  }

  async createUserSnapshot(
    stats: NormalizedWeiboUserStats,
    _user: WeiboUserEntity,
  ): Promise<WeiboUserStatsEntity> {
    return await useEntityManager(async (manager) => {
      const userStatsRepository = manager.getRepository(WeiboUserStatsEntity);

      const snapshot = userStatsRepository.create({
        snapshotTime: stats.snapshotTime,
        followers: stats.followers,
        following: stats.following,
        statuses: stats.statuses,
        likes: stats.likes,
        dataSource: stats.dataSource,
        versionTag: stats.versionTag,
        rawPayload: stats.rawPayload,
      });
      return userStatsRepository.save(snapshot);
    });
  }

  async findUserByWeiboId(weiboId: string): Promise<WeiboUserEntity | null> {
    return await useEntityManager(async (manager) => {
      const userRepository = manager.getRepository(WeiboUserEntity);
      return userRepository.findOne({ where: { id: Number(weiboId) } });
    });
  }

  async userExists(weiboId: string): Promise<boolean> {
    const user = await this.findUserByWeiboId(weiboId);
    return user !== null;
  }

  async saveMentions(
    mentions: Array<{ postWeiboId: string; mentionedWeiboId: string }>,
    posts: Map<string, WeiboPostEntity>,
    users: Map<string, WeiboUserEntity>,
  ): Promise<void> {
    if (mentions.length === 0) {
      return;
    }

    return await useEntityManager(async (manager) => {
      const { WeiboPostMentionEntity } = await import('@pro/entities');
      const mentionRepository = manager.getRepository(WeiboPostMentionEntity);

      const records = mentions
        .map((mention) => {
          const post = posts.get(mention.postWeiboId);
          const user = users.get(mention.mentionedWeiboId);

          if (!post?.id || !user?.id) {
            return null;
          }

          return {
            postId: post.id,
            mentionedId: String(user.id),
          };
        })
        .filter((record): record is NonNullable<typeof record> => record !== null);

      if (records.length === 0) {
        return;
      }

      await mentionRepository
        .createQueryBuilder()
        .insert()
        .values(
          deduplicateBy(records, (item) => `${item.postId}-${item.mentionedId}`),
        )
        .orIgnore()
        .execute();

    });
  }
}

// 导出适配器作为 WeiboPersistenceService
export const WeiboPersistenceService = WeiboPersistenceServiceAdapter;