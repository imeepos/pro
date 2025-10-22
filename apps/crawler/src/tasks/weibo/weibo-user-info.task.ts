import { NormalizedTask, TaskContext, TaskResult } from '../base-task';
import { SourcePlatform, SourceType } from '@pro/types';
import { WeiboApiTask } from './weibo-api.task';

export class WeiboUserInfoTask extends WeiboApiTask {
  readonly name = 'WeiboUserInfoTask';

  constructor(task: NormalizedTask, private readonly options: { userId: string }) {
    super(task);
  }

  protected async execute(context: TaskContext): Promise<TaskResult> {
    const { baseUrl, options } = await this.resolveWeiboRequest(
      context,
      context.weiboConfig.userInfoEndpoint,
    );

    const profile = await context.weiboProfileService.fetchProfileInfo(this.options.userId, options);
    const apiUrl = this.composeApiUrl(baseUrl, 'ajax/profile/info', {
      uid: this.options.userId,
    });

    const metadata = {
      ...this.task.metadata,
      taskId: this.task.taskId,
      userId: this.options.userId,
      keyword: this.task.keyword,
      responseUrl: apiUrl,
    };

    const stored = await context.storage.store({
      type: SourceType.WEIBO_CREATOR_PROFILE,
      platform: SourcePlatform.WEIBO,
      url: apiUrl,
      raw: JSON.stringify(profile),
      metadata,
    });

    const account = this.getSelectedAccount();
    if (account) {
      await context.weiboAccountService.decreaseHealthScore(account.id);
    }

    return { success: stored, notes: stored ? undefined : 'duplicate' };
  }
}
