import { AjaxTask } from '../ajax-task';
import { NormalizedTask, TaskContext, TaskResult } from '../base-task';
import { SourcePlatform, SourceType } from '@pro/types';

export class WeiboDetailTask extends AjaxTask {
  readonly name = 'WeiboDetailTask';

  constructor(task: NormalizedTask, private readonly options: { statusId: string }) {
    super(task);
  }

  protected createRequest(context: TaskContext) {
    const url = new URL(context.weiboConfig.detailEndpoint);
    url.searchParams.set('id', this.options.statusId);
    return { url: url.toString() };
  }

  protected async handleResponse(
    response: { raw: string; finalUrl?: string },
    context: TaskContext,
  ): Promise<TaskResult> {
    const metadata = {
      ...this.task.metadata,
      taskId: this.task.taskId,
      statusId: this.options.statusId,
      keyword: this.task.keyword,
      responseUrl: response.finalUrl,
    };

    const stored = await context.storage.store({
      type: SourceType.WEIBO_NOTE_DETAIL,
      platform: SourcePlatform.WEIBO,
      url: response.finalUrl ?? context.weiboConfig.detailEndpoint,
      raw: response.raw,
      metadata,
    });

    return { success: stored, notes: stored ? undefined : 'duplicate' };
  }
}
