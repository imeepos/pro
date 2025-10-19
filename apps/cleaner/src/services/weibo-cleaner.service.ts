import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger } from '@pro/logger';
import {
  WeiboPostEntity,
  WeiboCommentEntity,
  WeiboUserEntity,
} from '@pro/entities';
import { RawDataSourceDoc } from '@pro/mongodb';

interface CleanedWeiboData {
  posts: WeiboPostEntity[];
  comments: WeiboCommentEntity[];
  users: WeiboUserEntity[];
}

interface ParsedWeiboPost {
  weiboId: string;
  content: string;
  authorWeiboId: string;
  authorNickname?: string;
  images?: string[];
  publishedAt: Date;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  location?: string;
  hashtags?: string[];
  source?: string;
  isRepost?: boolean;
  repostWeiboId?: string;
}

interface ParsedWeiboComment {
  commentId: string;
  postWeiboId: string;
  content: string;
  authorWeiboId: string;
  authorNickname?: string;
  publishedAt: Date;
  likeCount?: number;
  replyToCommentId?: string;
}

interface ParsedWeiboUser {
  weiboUid: string;
  nickname: string;
  avatar?: string;
  description?: string;
  gender?: string;
  location?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isVerified?: boolean;
  verifiedReason?: string;
}

@Injectable()
export class WeiboCleanerService {
  constructor(
    @InjectRepository(WeiboPostEntity)
    private readonly postRepository: Repository<WeiboPostEntity>,
    @InjectRepository(WeiboCommentEntity)
    private readonly commentRepository: Repository<WeiboCommentEntity>,
    @InjectRepository(WeiboUserEntity)
    private readonly userRepository: Repository<WeiboUserEntity>,
    private readonly logger: PinoLogger,
  ) {}

  async cleanWeiboData(rawData: RawDataSourceDoc): Promise<CleanedWeiboData> {
    const startTime = Date.now();

    try {
      const parsedData = this.parseRawContent(rawData);
      const savedData = await this.saveEntities(parsedData);

      const processingTime = Date.now() - startTime;

      this.logger.info('微博数据清洗完成', {
        rawDataId: rawData._id.toString(),
        posts: savedData.posts.length,
        comments: savedData.comments.length,
        users: savedData.users.length,
        processingTimeMs: processingTime,
      });

      return savedData;
    } catch (error) {
      this.logger.error('微博数据清洗失败', {
        rawDataId: rawData._id.toString(),
        error: error.message,
      });
      throw error;
    }
  }

  private parseRawContent(rawData: RawDataSourceDoc): {
    posts: ParsedWeiboPost[];
    comments: ParsedWeiboComment[];
    users: ParsedWeiboUser[];
  } {
    try {
      const content = JSON.parse(rawData.rawContent);

      const posts: ParsedWeiboPost[] = [];
      const comments: ParsedWeiboComment[] = [];
      const users: ParsedWeiboUser[] = [];

      if (content.cards && Array.isArray(content.cards)) {
        for (const card of content.cards) {
          if (card.mblog) {
            const post = this.extractPost(card.mblog);
            if (post) posts.push(post);

            const user = this.extractUser(card.mblog.user);
            if (user) users.push(user);

            if (card.mblog.comments && Array.isArray(card.mblog.comments)) {
              for (const commentData of card.mblog.comments) {
                const comment = this.extractComment(commentData, post.weiboId);
                if (comment) comments.push(comment);

                const commentUser = this.extractUser(commentData.user);
                if (commentUser) users.push(commentUser);
              }
            }
          }
        }
      }

      return { posts, comments, users };
    } catch (error) {
      this.logger.error('解析原始内容失败', {
        error: error.message,
      });
      return { posts: [], comments: [], users: [] };
    }
  }

  private extractPost(mblog: any): ParsedWeiboPost | null {
    if (!mblog || !mblog.id || !mblog.text) {
      return null;
    }

    return {
      weiboId: String(mblog.id),
      content: this.cleanText(mblog.text),
      authorWeiboId: String(mblog.user?.id || mblog.uid),
      authorNickname: mblog.user?.screen_name,
      images: mblog.pics?.map((pic: any) => pic.large?.url || pic.url) || null,
      publishedAt: new Date(mblog.created_at),
      likeCount: Number(mblog.attitudes_count) || 0,
      commentCount: Number(mblog.comments_count) || 0,
      shareCount: Number(mblog.reposts_count) || 0,
      location: mblog.region_name || null,
      hashtags: this.extractHashtags(mblog.text),
      source: mblog.source || null,
      isRepost: !!mblog.retweeted_status,
      repostWeiboId: mblog.retweeted_status?.id
        ? String(mblog.retweeted_status.id)
        : null,
    };
  }

  private extractComment(
    commentData: any,
    postWeiboId: string,
  ): ParsedWeiboComment | null {
    if (!commentData || !commentData.id || !commentData.text) {
      return null;
    }

    return {
      commentId: String(commentData.id),
      postWeiboId,
      content: this.cleanText(commentData.text),
      authorWeiboId: String(commentData.user?.id || commentData.uid),
      authorNickname: commentData.user?.screen_name,
      publishedAt: new Date(commentData.created_at),
      likeCount: Number(commentData.like_count) || 0,
      replyToCommentId: commentData.reply_id
        ? String(commentData.reply_id)
        : null,
    };
  }

  private extractUser(userData: any): ParsedWeiboUser | null {
    if (!userData || !userData.id || !userData.screen_name) {
      return null;
    }

    return {
      weiboUid: String(userData.id),
      nickname: userData.screen_name,
      avatar: userData.profile_image_url || userData.avatar_hd || null,
      description: userData.description || null,
      gender: userData.gender || null,
      location: userData.location || null,
      followersCount: Number(userData.followers_count) || null,
      followingCount: Number(userData.follow_count) || null,
      postsCount: Number(userData.statuses_count) || null,
      isVerified: !!userData.verified,
      verifiedReason: userData.verified_reason || null,
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  private extractHashtags(text: string): string[] | null {
    const hashtagRegex = /#([^#\s]+)#/g;
    const matches = text.match(hashtagRegex);

    if (!matches || matches.length === 0) {
      return null;
    }

    return matches.map((tag) => tag.replace(/#/g, ''));
  }

  private async saveEntities(parsedData: {
    posts: ParsedWeiboPost[];
    comments: ParsedWeiboComment[];
    users: ParsedWeiboUser[];
  }): Promise<CleanedWeiboData> {
    const uniqueUsers = this.deduplicateUsers(parsedData.users);
    const savedUsers = await this.saveUsers(uniqueUsers);

    const uniquePosts = this.deduplicatePosts(parsedData.posts);
    const savedPosts = await this.savePosts(uniquePosts);

    const uniqueComments = this.deduplicateComments(parsedData.comments);
    const savedComments = await this.saveComments(uniqueComments);

    return {
      posts: savedPosts,
      comments: savedComments,
      users: savedUsers,
    };
  }

  private deduplicateUsers(users: ParsedWeiboUser[]): ParsedWeiboUser[] {
    const uniqueMap = new Map<string, ParsedWeiboUser>();

    for (const user of users) {
      if (!uniqueMap.has(user.weiboUid)) {
        uniqueMap.set(user.weiboUid, user);
      }
    }

    return Array.from(uniqueMap.values());
  }

  private deduplicatePosts(posts: ParsedWeiboPost[]): ParsedWeiboPost[] {
    const uniqueMap = new Map<string, ParsedWeiboPost>();

    for (const post of posts) {
      if (!uniqueMap.has(post.weiboId)) {
        uniqueMap.set(post.weiboId, post);
      }
    }

    return Array.from(uniqueMap.values());
  }

  private deduplicateComments(
    comments: ParsedWeiboComment[],
  ): ParsedWeiboComment[] {
    const uniqueMap = new Map<string, ParsedWeiboComment>();

    for (const comment of comments) {
      if (!uniqueMap.has(comment.commentId)) {
        uniqueMap.set(comment.commentId, comment);
      }
    }

    return Array.from(uniqueMap.values());
  }

  private async saveUsers(
    parsedUsers: ParsedWeiboUser[],
  ): Promise<WeiboUserEntity[]> {
    if (parsedUsers.length === 0) return [];

    const savedUsers: WeiboUserEntity[] = [];

    for (const parsedUser of parsedUsers) {
      try {
        let user = await this.userRepository.findOne({
          where: { weiboUid: parsedUser.weiboUid },
        });

        if (user) {
          user.nickname = parsedUser.nickname;
          user.avatar = parsedUser.avatar || user.avatar;
          user.description = parsedUser.description || user.description;
          user.gender = parsedUser.gender || user.gender;
          user.location = parsedUser.location || user.location;
          user.followersCount =
            parsedUser.followersCount || user.followersCount;
          user.followingCount =
            parsedUser.followingCount || user.followingCount;
          user.postsCount = parsedUser.postsCount || user.postsCount;
          user.isVerified = parsedUser.isVerified || user.isVerified;
          user.verifiedReason =
            parsedUser.verifiedReason || user.verifiedReason;
        } else {
          user = this.userRepository.create({
            weiboUid: parsedUser.weiboUid,
            nickname: parsedUser.nickname,
            avatar: parsedUser.avatar,
            description: parsedUser.description,
            gender: parsedUser.gender,
            location: parsedUser.location,
            followersCount: parsedUser.followersCount,
            followingCount: parsedUser.followingCount,
            postsCount: parsedUser.postsCount,
            isVerified: parsedUser.isVerified || false,
            verifiedReason: parsedUser.verifiedReason,
          });
        }

        const saved = await this.userRepository.save(user);
        savedUsers.push(saved);
      } catch (error) {
        this.logger.warn('保存用户失败', {
          weiboUid: parsedUser.weiboUid,
          error: error.message,
        });
      }
    }

    return savedUsers;
  }

  private async savePosts(
    parsedPosts: ParsedWeiboPost[],
  ): Promise<WeiboPostEntity[]> {
    if (parsedPosts.length === 0) return [];

    const savedPosts: WeiboPostEntity[] = [];

    for (const parsedPost of parsedPosts) {
      try {
        let post = await this.postRepository.findOne({
          where: { weiboId: parsedPost.weiboId },
        });

        if (post) {
          post.likeCount = parsedPost.likeCount || post.likeCount;
          post.commentCount = parsedPost.commentCount || post.commentCount;
          post.shareCount = parsedPost.shareCount || post.shareCount;
        } else {
          post = this.postRepository.create({
            weiboId: parsedPost.weiboId,
            content: parsedPost.content,
            authorWeiboId: parsedPost.authorWeiboId,
            authorNickname: parsedPost.authorNickname,
            images: parsedPost.images,
            publishedAt: parsedPost.publishedAt,
            likeCount: parsedPost.likeCount || 0,
            commentCount: parsedPost.commentCount || 0,
            shareCount: parsedPost.shareCount || 0,
            location: parsedPost.location,
            hashtags: parsedPost.hashtags,
            source: parsedPost.source,
            isRepost: parsedPost.isRepost || false,
            repostWeiboId: parsedPost.repostWeiboId,
          });
        }

        const saved = await this.postRepository.save(post);
        savedPosts.push(saved);
      } catch (error) {
        this.logger.warn('保存帖子失败', {
          weiboId: parsedPost.weiboId,
          error: error.message,
        });
      }
    }

    return savedPosts;
  }

  private async saveComments(
    parsedComments: ParsedWeiboComment[],
  ): Promise<WeiboCommentEntity[]> {
    if (parsedComments.length === 0) return [];

    const savedComments: WeiboCommentEntity[] = [];

    for (const parsedComment of parsedComments) {
      try {
        let comment = await this.commentRepository.findOne({
          where: { commentId: parsedComment.commentId },
        });

        if (comment) {
          comment.likeCount = parsedComment.likeCount || comment.likeCount;
        } else {
          comment = this.commentRepository.create({
            commentId: parsedComment.commentId,
            postWeiboId: parsedComment.postWeiboId,
            content: parsedComment.content,
            authorWeiboId: parsedComment.authorWeiboId,
            authorNickname: parsedComment.authorNickname,
            publishedAt: parsedComment.publishedAt,
            likeCount: parsedComment.likeCount || 0,
            replyToCommentId: parsedComment.replyToCommentId,
          });
        }

        const saved = await this.commentRepository.save(comment);
        savedComments.push(saved);
      } catch (error) {
        this.logger.warn('保存评论失败', {
          commentId: parsedComment.commentId,
          error: error.message,
        });
      }
    }

    return savedComments;
  }
}
