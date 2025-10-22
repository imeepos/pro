import { NormalizedTask, TaskContext, TaskResult } from '../base-task';
import { SourcePlatform, SourceType } from '@pro/types';
import { WeiboApiTask } from './weibo-api.task';

export class WeiboDetailTask extends WeiboApiTask {
  readonly name = 'WeiboDetailTask';

  constructor(task: NormalizedTask, private readonly options: { statusId: string }) {
    super(task);
  }

  protected async execute(context: TaskContext): Promise<TaskResult> {
    const { baseUrl, options } = await this.resolveWeiboRequest(
      context,
      context.weiboConfig.detailEndpoint,
    );

    const detail = await context.weiboStatusService.fetchStatusDetail(this.options.statusId, options);
    const apiUrl = this.composeApiUrl(baseUrl, 'ajax/statuses/show', {
      id: this.options.statusId,
    });

    const metadata = {
      ...this.task.metadata,
      taskId: this.task.taskId,
      statusId: this.options.statusId,
      keyword: this.task.keyword,
      responseUrl: apiUrl,
    };

    const stored = await context.storage.store({
      type: SourceType.WEIBO_NOTE_DETAIL,
      platform: SourcePlatform.WEIBO,
      url: apiUrl,
      raw: JSON.stringify(detail),
      metadata,
    });

    const account = this.getSelectedAccount();
    if (account) {
      await context.weiboAccountService.decreaseHealthScore(account.id);
    }

    return { success: stored, notes: stored ? undefined : 'duplicate' };
  }
}
