import { AjaxTask } from '../ajax-task';
import { NormalizedTask, TaskContext, TaskResult } from '../base-task';
import { SourcePlatform, SourceType } from '@pro/types';

export class WeiboUserInfoTask extends AjaxTask {
  readonly name = 'WeiboUserInfoTask';

  constructor(task: NormalizedTask, private readonly options: { userId: string }) {
    super(task);
  }

  protected createRequest(context: TaskContext) {
    const url = new URL(context.weiboConfig.userInfoEndpoint);
    url.searchParams.set('uid', this.options.userId);
    return { url: url.toString() };
  }

  protected async handleResponse(
    response: { raw: string; finalUrl?: string },
    context: TaskContext,
  ): Promise<TaskResult> {
    const metadata = {
      ...this.task.metadata,
      taskId: this.task.taskId,
      userId: this.options.userId,
      keyword: this.task.keyword,
      responseUrl: response.finalUrl,
    };

    const stored = await context.storage.store({
      type: SourceType.WEIBO_CREATOR_PROFILE,
      platform: SourcePlatform.WEIBO,
      url: response.finalUrl ?? context.weiboConfig.userInfoEndpoint,
      raw: response.raw,
      metadata,
    });

    return { success: stored, notes: stored ? undefined : 'duplicate' };
  }
}
