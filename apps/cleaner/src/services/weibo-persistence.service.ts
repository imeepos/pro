import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  In,
  Repository,
} from 'typeorm';
import {
  WeiboCommentEntity,
  WeiboHashtagEntity,
  WeiboMediaEntity,
  WeiboPostEntity,
  WeiboPostHashtagEntity,
  WeiboUserEntity,
  WeiboUserStatsEntity,
} from '@pro/entities';
import {
  NormalizedWeiboComment,
  NormalizedWeiboHashtag,
  NormalizedWeiboMedia,
  NormalizedWeiboPost,
  NormalizedWeiboUser,
  NormalizedWeiboUserStats,
} from '../tasks/weibo/weibo-normalizer';

const deduplicateBy = <T, K>(items: readonly T[], keySelector: (item: T) => K): T[] => {
  const map = new Map<K, T>();
  for (const item of items) {
    map.set(keySelector(item), item);
  }
  return [...map.values()];
};

@Injectable()
export class WeiboPersistenceService {
  constructor(
    @InjectRepository(WeiboUserEntity)
    private readonly userRepository: Repository<WeiboUserEntity>,
    @InjectRepository(WeiboPostEntity)
    private readonly postRepository: Repository<WeiboPostEntity>,
    @InjectRepository(WeiboCommentEntity)
    private readonly commentRepository: Repository<WeiboCommentEntity>,
    @InjectRepository(WeiboHashtagEntity)
    private readonly hashtagRepository: Repository<WeiboHashtagEntity>,
    @InjectRepository(WeiboPostHashtagEntity)
    private readonly postHashtagRepository: Repository<WeiboPostHashtagEntity>,
    @InjectRepository(WeiboMediaEntity)
    private readonly mediaRepository: Repository<WeiboMediaEntity>,
    @InjectRepository(WeiboUserStatsEntity)
    private readonly userStatsRepository: Repository<WeiboUserStatsEntity>,
  ) {}

  async saveUsers(users: NormalizedWeiboUser[]): Promise<Map<string, WeiboUserEntity>> {
    const unique = deduplicateBy(users, (user) => user.weiboId);
    if (unique.length === 0) {
      return new Map();
    }

    await this.userRepository.upsert(
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

    const stored = await this.userRepository.find({
      where: { id: In(unique.map((u) => Number(u.weiboId))) },
    });

    return new Map(stored.map((user) => [String(user.id), user]));
  }

  async savePosts(
    posts: NormalizedWeiboPost[],
    authors: Map<string, WeiboUserEntity>,
  ): Promise<Map<string, WeiboPostEntity>> {
    const filtered = posts.filter((post) => authors.has(post.authorWeiboId));
    if (filtered.length === 0) {
      return new Map();
    }

    await this.postRepository.upsert(
      filtered.map((post) => {
        const author = authors.get(post.authorWeiboId);
        if (!author) {
          throw new Error(`Author not found for post ${post.weiboId} with authorWeiboId ${post.authorWeiboId}`);
        }
        return {
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
          mark: post.mark,
        };
      }) as any,
      {
        conflictPaths: ['id'],
        skipUpdateIfNoValuesChanged: true,
      } as any,
    );

    const storedPosts = await this.postRepository.find({
      where: { id: In(filtered.map((post) => post.weiboId)) },
    });
    const postMap = new Map(storedPosts.map((post) => [post.id, post]));

    await this.saveHashtags(filtered, postMap);
    await this.saveMedia(filtered, postMap);

    return postMap;
  }

  private async saveHashtags(
    posts: NormalizedWeiboPost[],
    savedPosts: Map<string, WeiboPostEntity>,
  ): Promise<void> {
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
    await this.hashtagRepository.upsert(
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
      })),
      ['tagId'],
    );

    const storedTags = await this.hashtagRepository.find({
      where: { tagId: In(uniqueTags.map((tag) => tag.tagId)) },
    });
    const tagMap = new Map(storedTags.map((tag) => [tag.tagId, tag]));

    const linkValues = postTagPairs
      .map((pair) => {
        const post = savedPosts.get(pair.weiboId);
        const hashtag = tagMap.get(pair.tagId);
        if (!post || !hashtag) {
          return null;
        }
        return {
          postId: post.id,
          hashtagId: hashtag.id,
        };
      })
      .filter((entry): entry is { postId: string; hashtagId: string } => entry !== null);

    if (linkValues.length === 0) {
      return;
    }

    await this.postHashtagRepository
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
  ): Promise<void> {
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

    await this.mediaRepository.upsert(
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
      })),
      ['postId', 'mediaId'],
    );
  }

  async ensurePostByWeiboId(weiboId: string): Promise<WeiboPostEntity | null> {
    return this.postRepository.findOne({ where: { id: weiboId } });
  }

  async saveComments(
    comments: NormalizedWeiboComment[],
    authors: Map<string, WeiboUserEntity>,
    post: WeiboPostEntity,
  ): Promise<Map<string, WeiboCommentEntity>> {
    const filtered = comments.filter((comment) => authors.has(comment.authorWeiboId));
    if (filtered.length === 0) {
      return new Map();
    }

    await this.commentRepository.upsert(
      filtered.map((comment) => {
        const author = authors.get(comment.authorWeiboId);
        if (!author) {
          throw new Error(`Author not found for comment ${comment.commentId} with authorWeiboId ${comment.authorWeiboId}`);
        }
        return {
          id: Number(comment.commentId),
          idstr: comment.idstr,
          mid: comment.mid,
          rootid: comment.rootId ? Number(comment.rootId) : null,
          rootidstr: comment.rootMid,
          floor_number: comment.floorNumber,
          text: comment.text,
          text_raw: comment.textRaw,
          source: comment.source,
          created_at: comment.createdAt.toISOString(),
          like_counts: comment.likeCounts,
          liked: comment.liked,
          total_number: comment.totalNumber,
          disable_reply: comment.disableReply ? 1 : 0,
          restrictOperate: comment.restrictOperate ? 1 : 0,
          allow_follow: comment.allowFollow,
        };
      }) as any,
      ['id'],
    );

    const stored = await this.commentRepository.find({
      where: { id: In(filtered.map((comment) => Number(comment.commentId))) },
    });

    return new Map(stored.map((comment) => [String(comment.id), comment]));
  }

  async createUserSnapshot(
    stats: NormalizedWeiboUserStats,
    user: WeiboUserEntity,
  ): Promise<WeiboUserStatsEntity> {
    const snapshot = this.userStatsRepository.create({
      snapshotTime: stats.snapshotTime,
      followers: stats.followers,
      following: stats.following,
      statuses: stats.statuses,
      likes: stats.likes,
      dataSource: stats.dataSource,
      versionTag: stats.versionTag,
      rawPayload: stats.rawPayload,
    });
    return this.userStatsRepository.save(snapshot);
  }

  async findUserByWeiboId(weiboId: string): Promise<WeiboUserEntity | null> {
    return this.userRepository.findOne({ where: { id: Number(weiboId) } });
  }

  async userExists(weiboId: string): Promise<boolean> {
    const user = await this.findUserByWeiboId(weiboId);
    return user !== null;
  }
}
