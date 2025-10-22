import { NormalizedTask, TaskContext, TaskResult } from '../base-task';
import { SourcePlatform, SourceType } from '@pro/types';
import { WeiboApiTask } from './weibo-api.task';

export class WeiboCommentsTask extends WeiboApiTask {
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

  protected async execute(context: TaskContext): Promise<TaskResult> {
    const uid = this.resolveUid();
    const { baseUrl, options } = await this.resolveWeiboRequest(
      context,
      context.weiboConfig.commentsEndpoint,
    );

    const response = await context.weiboStatusService.fetchStatusComments(this.options.statusId, {
      ...options,
      uid,
      ...(this.options.maxId ? { maxId: this.options.maxId } : {}),
    });

    const apiUrl = this.composeApiUrl(baseUrl, 'ajax/statuses/buildComments', {
      id: this.options.statusId,
      uid,
      max_id: this.options.maxId,
    });

    const metadata = {
      ...this.task.metadata,
      taskId: this.task.taskId,
      statusId: this.options.statusId,
      page: this.options.page ?? 1,
      maxId: this.options.maxId,
      keyword: this.task.keyword,
      responseUrl: apiUrl,
    };

    const stored = await context.storage.store({
      type: SourceType.WEIBO_COMMENTS,
      platform: SourcePlatform.WEIBO,
      url: apiUrl,
      raw: JSON.stringify(response),
      metadata,
    });

    const account = this.getSelectedAccount();
    if (account) {
      await context.weiboAccountService.decreaseHealthScore(account.id);
    }

    return { success: stored, notes: stored ? undefined : 'duplicate' };
  }

  private resolveUid(): string {
    const candidates = [
      this.task.metadata.uid,
      this.task.metadata.userId,
      this.task.metadata.weiboUid,
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    throw new Error('任务缺少微博用户 ID，无法获取评论数据');
  }
}
