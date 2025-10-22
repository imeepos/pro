import type { WeiboBuildCommentsResponse, WeiboCommentEntity as WeiboCommentPayload } from '@pro/weibo';
import { CleanTaskResult } from '../base-task';
import { WeiboBaseCleanTask, WeiboTaskContext } from './weibo-base-clean-task';
import {
  NormalizedWeiboComment,
  NormalizedWeiboUser,
  normalizeComments,
  normalizeUser,
} from './weibo-normalizer';

export class WeiboCommentsCleanTask extends WeiboBaseCleanTask {
  readonly name = 'WeiboCommentsCleanTask';

  protected async handle(context: WeiboTaskContext): Promise<CleanTaskResult> {
    const { rawData, message, logger } = context;
    const targetWeiboId = this.resolveTargetWeiboId(message);

    const payload = this.parsePayload(rawData.rawContent, logger);
    if (!payload) {
      return { postIds: [], commentIds: [], userIds: [], notes: { empty: true } };
    }

    const commentBuckets: WeiboCommentPayload[] = [
      ...(Array.isArray(payload.data) ? payload.data : []),
      ...(Array.isArray(payload.hot_data) ? payload.hot_data : []),
    ];

    if (payload.rootComment) {
      commentBuckets.push(payload.rootComment);
    }
    if (payload.root_comment) {
      commentBuckets.push(payload.root_comment);
    }

    if (commentBuckets.length === 0) {
      logger.info('评论数据为空', { rawDataId: rawData._id.toString(), targetWeiboId });
      return { postIds: [], commentIds: [], userIds: [], notes: { empty: true } };
    }

    const normalizedComments: NormalizedWeiboComment[] = normalizeComments(commentBuckets, targetWeiboId);
    if (normalizedComments.length === 0) {
      logger.warn('评论归一化结果为空', { rawDataId: rawData._id.toString(), targetWeiboId });
      return { postIds: [], commentIds: [], userIds: [], notes: { normalizedEmpty: true } };
    }

    const users: NormalizedWeiboUser[] = [];
    const collectUsers = (items: readonly WeiboCommentPayload[] | undefined): void => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        const author = normalizeUser(item.user);
        if (author) {
          users.push(author);
        }
        if (item.reply_comment) {
          const replyAuthor = normalizeUser(item.reply_comment.user);
          if (replyAuthor) {
            users.push(replyAuthor);
          }
        }
        if (Array.isArray(item.comments)) {
          collectUsers(item.comments);
        }
      }
    };
    collectUsers(commentBuckets);

    const helpers = this.getHelpers(context);
    const userMap = await helpers.weibo.saveUsers(users);

    const post = await helpers.weibo.ensurePostByWeiboId(targetWeiboId);
    if (!post) {
      throw new Error(`微博帖子不存在: ${targetWeiboId}`);
    }

    const storedComments = await helpers.weibo.saveComments(normalizedComments, userMap, post);

    return {
      postIds: [post.id],
      commentIds: [...storedComments.values()].map((comment) => comment.id),
      userIds: [...userMap.values()].map((user) => user.id),
    };
  }

  private resolveTargetWeiboId(message: WeiboTaskContext['message']): string {
    const metadata = (message.metadata ?? {}) as Record<string, unknown>;
    const candidates = [metadata.statusId, metadata.weiboId, metadata.postId];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    throw new Error('评论任务缺少目标微博 ID');
  }

  private parsePayload(raw: string, logger: WeiboTaskContext['logger']): WeiboBuildCommentsResponse | null {
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as WeiboBuildCommentsResponse;
      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }
      return parsed;
    } catch (error) {
      logger.error('解析微博评论数据失败', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
