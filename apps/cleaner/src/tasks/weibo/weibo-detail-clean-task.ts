import type { WeiboStatusDetail, WeiboStatusDetailResponse } from '@pro/weibo';
import { CleanTaskResult } from '../base-task';
import { WeiboBaseCleanTask, WeiboTaskContext } from './weibo-base-clean-task';
import {
  NormalizedWeiboPost,
  NormalizedWeiboUser,
  normalizeStatus,
  normalizeUser,
} from './weibo-normalizer';
import { narrate } from '../../utils/logging';

export class WeiboDetailCleanTask extends WeiboBaseCleanTask {
  readonly name = 'WeiboDetailCleanTask';

  protected async handle(context: WeiboTaskContext): Promise<CleanTaskResult> {
    const { rawData, logger } = context;
    const payload = this.parsePayload(rawData.rawContent, logger);
    if (!payload) {
      return { postIds: [], commentIds: [], userIds: [], notes: { empty: true } };
    }

    const statuses: NormalizedWeiboPost[] = [];
    const users: NormalizedWeiboUser[] = [];

    const normalizedStatus = normalizeStatus(payload);
    const normalizedUser = normalizeUser(payload.user);

    if (normalizedStatus) {
      statuses.push(normalizedStatus);
    }
    if (normalizedUser) {
      users.push(normalizedUser);
    }

    const retweeted = (payload as unknown as Record<string, unknown>).retweeted_status as WeiboStatusDetail | undefined;
    if (retweeted) {
      const retweetedStatus = normalizeStatus(retweeted);
      const retweetedUser = normalizeUser(retweeted.user);
      if (retweetedStatus) {
        statuses.push(retweetedStatus);
      }
      if (retweetedUser) {
        users.push(retweetedUser);
      }
    }

    if (statuses.length === 0) {
      logger.warn(
        narrate('微博详情未包含有效正文', {
          rawDataId: rawData._id.toString(),
        }),
      );
      return { postIds: [], commentIds: [], userIds: [], notes: { normalizedEmpty: true } };
    }

    const helpers = this.getHelpers(context);
    const userMap = await helpers.weibo.saveUsers(users);
    const postMap = await helpers.weibo.savePosts(statuses, userMap);

    return {
      postIds: [...postMap.values()].map((post) => String(post.id)),
      commentIds: [],
      userIds: [...userMap.values()].map((user) => String(user.id)),
    };
  }

  private parsePayload(raw: string, logger: WeiboTaskContext['logger']): WeiboStatusDetail | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as WeiboStatusDetailResponse | { data?: WeiboStatusDetail };
      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }
      if ('data' in parsed && parsed.data) {
        return parsed.data as WeiboStatusDetail;
      }
      return parsed as WeiboStatusDetail;
    } catch (error) {
      logger.error(
        narrate('解析微博详情数据失败', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return null;
    }
  }
}
