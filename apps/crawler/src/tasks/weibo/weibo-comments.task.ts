import { AjaxTask } from '../ajax-task';
import { NormalizedTask, TaskContext, TaskResult } from '../base-task';
import { SourcePlatform, SourceType } from '@pro/types';

export class WeiboCommentsTask extends AjaxTask {
  readonly name = 'WeiboCommentsTask';

  constructor(
    task: NormalizedTask,
    private readonly options: {
      statusId: string;
      page?: number;
      maxId?: string;
    },
  ) {
    super(task);
  }

  protected createRequest(context: TaskContext) {
    const url = new URL(context.weiboConfig.commentsEndpoint);
    url.searchParams.set('id', this.options.statusId);
    url.searchParams.set('page', String(this.options.page ?? 1));

    if (this.options.maxId) {
      url.searchParams.set('max_id', this.options.maxId);
    }

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
      page: this.options.page ?? 1,
      maxId: this.options.maxId,
      keyword: this.task.keyword,
      responseUrl: response.finalUrl,
    };

    const stored = await context.storage.store({
      type: SourceType.WEIBO_COMMENTS,
      platform: SourcePlatform.WEIBO,
      url: response.finalUrl ?? context.weiboConfig.commentsEndpoint,
      raw: response.raw,
      metadata,
    });

    return { success: stored, notes: stored ? undefined : 'duplicate' };
  }
}
