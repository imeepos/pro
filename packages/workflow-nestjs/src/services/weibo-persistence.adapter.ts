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
          weiboId: user.weiboId,
          idstr: user.idstr,
          screenName: user.screenName,
          domain: user.domain,
          weihao: user.weihao,
          verified: user.verified,
          verifiedType: user.verifiedType,
          verifiedReason: user.verifiedReason,
          verifiedTypeExt: user.verifiedTypeExt,
          profileImageUrl: user.profileImageUrl,
          avatarLarge: user.avatarLarge,
          avatarHd: user.avatarHd,
          followersCount: user.followersCount,
          friendsCount: user.friendsCount,
          statusesCount: user.statusesCount,
          mbrank: user.mbrank,
          mbtype: user.mbtype,
          vPlus: user.vPlus,
          svip: user.svip,
          vvip: user.vvip,
          userAbility: user.userAbility,
          planetVideo: user.planetVideo,
          gender: user.gender,
          location: user.location,
          description: user.description,
          followMe: user.followMe,
          following: user.following,
          onlineStatus: user.onlineStatus,
          rawPayload: user.rawPayload,
        })) as any,
        ['weiboId'],
      );

      // 2. 在同一事务中查询用户（此时 ID 已生成）
      const storedUsers = await userRepository.find({
        where: { weiboId: In(uniqueUsers.map((u) => u.weiboId)) },
      });

      const userMap = new Map(storedUsers.map((user) => [user.weiboId, user]));
      console.log(`[saveUsersAndPosts] Saved ${userMap.size} users with IDs`)

      // 3. 保存帖子（使用刚查询到的带ID的用户实体）
      if (posts.length === 0) {
        return { userMap, postMap: new Map() };
      }

      const filteredPosts = posts.filter((post) => userMap.has(post.authorWeiboId));
      if (filteredPosts.length === 0) {
        console.warn(`[saveUsersAndPosts] No valid posts to save`)
        return { userMap, postMap: new Map() };
      }

      await postRepository.upsert(
        filteredPosts.map((post) => {
          const author = userMap.get(post.authorWeiboId);
          if (!author?.id) {
            throw new Error(`Author ${post.authorWeiboId} not found or has no ID`);
          }
          return {
            weiboId: post.weiboId,
            mid: post.mid,
            mblogId: post.mblogId,
            authorId: author.id,
            authorWeiboId: post.authorWeiboId,
            authorNickname: post.authorNickname,
            authorAvatar: post.authorAvatar,
            authorVerifiedInfo: post.authorVerifiedInfo,
            text: post.text,
            textRaw: post.textRaw,
            textLength: post.textLength,
            isLongText: post.isLongText,
            contentAuth: post.contentAuth,
            createdAt: post.createdAt,
            publishedAt: post.publishedAt,
            repostsCount: post.repostsCount,
            commentsCount: post.commentsCount,
            attitudesCount: post.attitudesCount,
            source: post.source,
            regionName: post.regionName,
            picNum: post.picNum,
            isPaid: post.isPaid,
            mblogVipType: post.mblogVipType,
            canEdit: post.canEdit,
            favorited: post.favorited,
            mblogtype: post.mblogtype,
            isRepost: post.isRepost,
            shareRepostType: post.shareRepostType,
            visibleType: post.visibleType,
            visibleListId: post.visibleListId,
            locationJson: post.locationJson,
            pageInfoJson: post.pageInfoJson,
            actionLogJson: post.actionLogJson,
            analysisExtra: post.analysisExtra,
            rawPayload: post.rawPayload,
          };
        }) as any,
        ['weiboId'],
      );

      const storedPosts = await postRepository.find({
        where: { weiboId: In(filteredPosts.map((post) => post.weiboId)) },
      });
      const postMap = new Map(storedPosts.map((post) => [post.weiboId, post]));

      // 4. 保存关联数据（hashtags, media）
      await this.saveHashtags(filteredPosts, postMap, manager);
      await this.saveMedia(filteredPosts, postMap, manager);

      console.log(`[saveUsersAndPosts] Saved ${postMap.size} posts successfully`)
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
          weiboId: user.weiboId,
          idstr: user.idstr,
          screenName: user.screenName,
          domain: user.domain,
          weihao: user.weihao,
          verified: user.verified,
          verifiedType: user.verifiedType,
          verifiedReason: user.verifiedReason,
          verifiedTypeExt: user.verifiedTypeExt,
          profileImageUrl: user.profileImageUrl,
          avatarLarge: user.avatarLarge,
          avatarHd: user.avatarHd,
          followersCount: user.followersCount,
          friendsCount: user.friendsCount,
          statusesCount: user.statusesCount,
          mbrank: user.mbrank,
          mbtype: user.mbtype,
          vPlus: user.vPlus,
          svip: user.svip,
          vvip: user.vvip,
          userAbility: user.userAbility,
          planetVideo: user.planetVideo,
          gender: user.gender,
          location: user.location,
          description: user.description,
          followMe: user.followMe,
          following: user.following,
          onlineStatus: user.onlineStatus,
          rawPayload: user.rawPayload,
        })) as any,
        ['weiboId'],
      );

      const stored = await userRepository.find({
        where: { weiboId: In(unique.map((u) => u.weiboId)) },
      });

      console.log(`[saveUsers] Upserted ${unique.length} users, found ${stored.length} users with IDs`)
      stored.forEach(user => {
        if (!user.id) {
          console.error(`[saveUsers] User ${user.weiboId} has no ID!`)
        }
      })

      return new Map(stored.map((user) => [user.weiboId, user]));
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
        console.warn(`[savePosts] No posts to save - authors map keys: [${Array.from(authors.keys()).join(', ')}]`)
        return new Map();
      }

      console.log(`[savePosts] Saving ${filtered.length} posts with authors:`, Array.from(authors.entries()).map(([weiboId, user]) => ({ weiboId, userId: user.id })))

      await postRepository.upsert(
        filtered.map((post) => {
          const author = authors.get(post.authorWeiboId);
          if (!author) {
            throw new Error(`Author not found for post ${post.weiboId} with authorWeiboId ${post.authorWeiboId}`);
          }
          if (!author.id) {
            console.error(`[savePosts] Author entity for ${post.authorWeiboId} has no ID!`, author)
            throw new Error(`Author ${post.authorWeiboId} has no database ID`)
          }
          console.log(`[savePosts] Mapping post ${post.weiboId} to author ${post.authorWeiboId} with ID ${author.id}`)
          return {
            weiboId: post.weiboId,
            mid: post.mid,
            mblogId: post.mblogId,
            authorId: author.id,
            authorWeiboId: post.authorWeiboId,
            authorNickname: post.authorNickname,
            authorAvatar: post.authorAvatar,
            authorVerifiedInfo: post.authorVerifiedInfo,
            text: post.text,
            textRaw: post.textRaw,
            textLength: post.textLength,
            isLongText: post.isLongText,
            contentAuth: post.contentAuth,
            createdAt: post.createdAt,
            publishedAt: post.publishedAt,
            repostsCount: post.repostsCount,
            commentsCount: post.commentsCount,
            attitudesCount: post.attitudesCount,
            source: post.source,
            regionName: post.regionName,
            picNum: post.picNum,
            isPaid: post.isPaid,
            mblogVipType: post.mblogVipType,
            canEdit: post.canEdit,
            favorited: post.favorited,
            mblogtype: post.mblogtype,
            isRepost: post.isRepost,
            shareRepostType: post.shareRepostType,
            visibleType: post.visibleType,
            visibleListId: post.visibleListId,
            locationJson: post.locationJson,
            pageInfoJson: post.pageInfoJson,
            actionLogJson: post.actionLogJson,
            analysisExtra: post.analysisExtra,
            rawPayload: post.rawPayload,
          };
        }) as any,
        ['weiboId'],
      );

      const storedPosts = await postRepository.find({
        where: { weiboId: In(filtered.map((post) => post.weiboId)) },
      });
      const postMap = new Map(storedPosts.map((post) => [post.weiboId, post]));

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

    await mediaRepository.upsert(
      records.map((media) => ({
        postId: media.postId,
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
      })) as any,
      ['postId', 'mediaId'],
    );
  }

  async ensurePostByWeiboId(weiboId: string): Promise<WeiboPostEntity | null> {
    return await useEntityManager(async (manager) => {
      const postRepository = manager.getRepository(WeiboPostEntity);
      return postRepository.findOne({ where: { weiboId } });
    });
  }

  async saveComments(
    comments: NormalizedWeiboComment[],
    authors: Map<string, WeiboUserEntity>,
    post: WeiboPostEntity,
  ): Promise<Map<string, WeiboCommentEntity>> {
    return await useEntityManager(async (manager) => {
      const commentRepository = manager.getRepository(WeiboCommentEntity);

      const filtered = comments.filter((comment) => authors.has(comment.authorWeiboId));
      if (filtered.length === 0) {
        return new Map();
      }

      await commentRepository.upsert(
        filtered.map((comment) => ({
          commentId: comment.commentId,
          idstr: comment.idstr,
          mid: comment.mid,
          rootId: comment.rootId,
          rootMid: comment.rootMid,
          postId: post.id,
          authorId: authors.get(comment.authorWeiboId)!.id,
          authorWeiboId: comment.authorWeiboId,
          authorNickname: comment.authorNickname,
          text: comment.text,
          textRaw: comment.textRaw,
          source: comment.source,
          floorNumber: comment.floorNumber,
          createdAt: comment.createdAt,
          likeCounts: comment.likeCounts,
          liked: comment.liked,
          totalNumber: comment.totalNumber,
          disableReply: comment.disableReply,
          restrictOperate: comment.restrictOperate,
          allowFollow: comment.allowFollow,
          replyCommentId: comment.replyCommentId,
          replyOriginalText: comment.replyOriginalText,
          isMblogAuthor: comment.isMblogAuthor,
          commentBadge: comment.commentBadge,
          path: comment.path,
          rawPayload: comment.rawPayload,
        })) as any,
        ['commentId'],
      );

      const stored = await commentRepository.find({
        where: { commentId: In(filtered.map((comment) => comment.commentId)) },
      });

      return new Map(stored.map((comment: any) => [comment.commentId, comment]));
    });
  }

  async createUserSnapshot(
    stats: NormalizedWeiboUserStats,
    user: WeiboUserEntity,
  ): Promise<WeiboUserStatsEntity> {
    return await useEntityManager(async (manager) => {
      const userStatsRepository = manager.getRepository(WeiboUserStatsEntity);

      const snapshot = userStatsRepository.create({
        userId: user.id,
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
      return userRepository.findOne({ where: { weiboId } });
    });
  }

  async userExists(weiboId: string): Promise<boolean> {
    const user = await this.findUserByWeiboId(weiboId);
    return user !== null;
  }
}

// 导出适配器作为 WeiboPersistenceService
export const WeiboPersistenceService = WeiboPersistenceServiceAdapter;