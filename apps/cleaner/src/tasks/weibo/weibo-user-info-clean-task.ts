import type { WeiboProfileInfoResponse } from '@pro/weibo';
import { CleanTaskResult } from '../base-task';
import { WeiboBaseCleanTask, WeiboTaskContext } from './weibo-base-clean-task';
import {
  normalizeProfileSnapshot,
  normalizeUser,
} from './weibo-normalizer';
import { narrate } from '../../utils/logging';

export class WeiboUserInfoCleanTask extends WeiboBaseCleanTask {
  readonly name = 'WeiboUserInfoCleanTask';

  protected async handle(context: WeiboTaskContext): Promise<CleanTaskResult> {
    const { rawData, logger, message } = context;
    const payload = this.parsePayload(rawData.rawContent, logger);
    if (!payload) {
      return { postIds: [], commentIds: [], userIds: [], notes: { empty: true } };
    }

    const user = normalizeUser(payload.data?.user);
    if (!user) {
      logger.warn(
        narrate('用户资料中缺少有效用户信息', {
          rawDataId: rawData._id.toString(),
        }),
      );
      return { postIds: [], commentIds: [], userIds: [], notes: { normalizedEmpty: true } };
    }

    const helpers = this.getHelpers(context);
    const userMap = await helpers.weibo.saveUsers([user]);
    const storedUser = userMap.get(user.weiboId);

    if (!storedUser) {
      throw new Error(`保存微博用户失败: ${user.weiboId}`);
    }

    const snapshot = normalizeProfileSnapshot(payload, message.sourceType);
    if (snapshot) {
      await helpers.weibo.createUserSnapshot(snapshot, storedUser);
    }

    return {
      postIds: [],
      commentIds: [],
      userIds: [storedUser.id],
    };
  }

  private parsePayload(raw: string, logger: WeiboTaskContext['logger']): WeiboProfileInfoResponse | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as WeiboProfileInfoResponse;
      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }
      return parsed;
    } catch (error) {
      logger.error(
        narrate('解析微博用户资料失败', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return null;
    }
  }
}
