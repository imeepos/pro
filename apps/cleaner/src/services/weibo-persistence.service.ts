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
      })),
      ['weiboId'],
    );

    const stored = await this.userRepository.find({
      where: { weiboId: In(unique.map((u) => u.weiboId)) },
    });

    return new Map(stored.map((user) => [user.weiboId, user]));
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
          weiboId: post.weiboId,
          mid: post.mid,
          mblogid: post.mblogid,
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
      }),
      ['weiboId'],
    );

    const storedPosts = await this.postRepository.find({
      where: { weiboId: In(filtered.map((post) => post.weiboId)) },
    });
    const postMap = new Map(storedPosts.map((post) => [post.weiboId, post]));

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
    return this.postRepository.findOne({ where: { weiboId } });
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
          commentId: comment.commentId,
          idstr: comment.idstr,
          mid: comment.mid,
          rootId: comment.rootId,
          rootMid: comment.rootMid,
          postId: post.id,
          authorId: author.id,
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
        };
      }),
      ['commentId'],
    );

    const stored = await this.commentRepository.find({
      where: { commentId: In(filtered.map((comment) => comment.commentId)) },
    });

    return new Map(stored.map((comment) => [comment.commentId, comment]));
  }

  async createUserSnapshot(
    stats: NormalizedWeiboUserStats,
    user: WeiboUserEntity,
  ): Promise<WeiboUserStatsEntity> {
    const snapshot = this.userStatsRepository.create({
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
    return this.userStatsRepository.save(snapshot);
  }

  async findUserByWeiboId(weiboId: string): Promise<WeiboUserEntity | null> {
    return this.userRepository.findOne({ where: { weiboId } });
  }

  async userExists(weiboId: string): Promise<boolean> {
    const user = await this.findUserByWeiboId(weiboId);
    return user !== null;
  }
}
