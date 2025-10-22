import { CleanTaskResult } from '../base-task';
import { WeiboBaseCleanTask, WeiboTaskContext } from './weibo-base-clean-task';
import {
  NormalizedWeiboPost,
  NormalizedWeiboUser,
  normalizeStatus,
  normalizeTimeline,
  normalizeUser,
} from './weibo-normalizer';

export class WeiboKeywordSearchCleanTask extends WeiboBaseCleanTask {
  readonly name = 'WeiboKeywordSearchCleanTask';

  protected async handle(context: WeiboTaskContext): Promise<CleanTaskResult> {
    const { rawData, logger } = context;
    const payload = this.extractPayload(rawData.rawContent);
    const statuses = normalizeTimeline(payload);

    if (statuses.length === 0) {
      logger.warn('未从微博搜索数据中解析出有效状态', {
        rawDataId: rawData._id.toString(),
      });
      return { postIds: [], commentIds: [], userIds: [], notes: { empty: true } };
    }

    const users: NormalizedWeiboUser[] = [];
    const posts: NormalizedWeiboPost[] = [];

    for (const status of statuses) {
      const author = normalizeUser(status.user);
      if (author) {
        users.push(author);
      }

      const normalizedStatus = normalizeStatus(status);
      if (normalizedStatus) {
        posts.push(normalizedStatus);
      }

      const retweeted = (status as unknown as Record<string, unknown>).retweeted_status as Record<string, unknown> | undefined;
      if (retweeted) {
        const retweetedStatus = normalizeStatus(retweeted as never);
        const retweetedUser = normalizeUser((retweeted as Record<string, unknown>).user as never);
        if (retweetedUser) {
          users.push(retweetedUser);
        }
        if (retweetedStatus) {
          posts.push(retweetedStatus);
        }
      }
    }

    const helpers = this.getHelpers(context);
    const userMap = await helpers.weibo.saveUsers(users);
    const postMap = await helpers.weibo.savePosts(posts, userMap);

    return {
      postIds: [...postMap.values()].map((post) => post.id),
      commentIds: [],
      userIds: [...userMap.values()].map((user) => user.id),
    };
  }

  private extractPayload(raw: string): unknown {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // fall through to script extraction
      }
    }

    const marker = 'window.__INITIAL_STATE__';
    const markerIndex = raw.indexOf(marker);
    if (markerIndex === -1) {
      return null;
    }

    const startIndex = raw.indexOf('=', markerIndex);
    if (startIndex === -1) {
      return null;
    }

    const scriptEnd = raw.indexOf('</script>', startIndex);
    const slice = raw.slice(startIndex + 1, scriptEnd === -1 ? undefined : scriptEnd).trim();
    const payload = slice.endsWith(';') ? slice.slice(0, -1) : slice;

    try {
      return JSON.parse(payload);
    } catch {
      try {
        const sanitized = payload.replace(/;$/, '');
        return JSON.parse(sanitized);
      } catch {
        return null;
      }
    }
  }
}
