import { SourcePlatform, SourceType, WeiboSearchType } from '@pro/types';
import { HtmlTask } from '../html-task';
import { NormalizedTask, TaskContext, TaskResult } from '../base-task';

const endpointKey: Record<WeiboSearchType, keyof TaskContext['weiboConfig']['searchEndpoints']> = {
  [WeiboSearchType.DEFAULT]: 'default',
  [WeiboSearchType.REAL_TIME]: 'realTime',
  [WeiboSearchType.POPULAR]: 'popular',
  [WeiboSearchType.VIDEO]: 'video',
  [WeiboSearchType.USER]: 'user',
  [WeiboSearchType.TOPIC]: 'topic',
};

const extraParams: Partial<Record<WeiboSearchType, Array<[string, string]>>> = {
  [WeiboSearchType.REAL_TIME]: [['type', 'realtime'], ['nodup', '1']],
  [WeiboSearchType.POPULAR]: [['sort', 'hot'], ['xsort', 'hot']],
  [WeiboSearchType.VIDEO]: [['type', 'video'], ['scope', 'video']],
  [WeiboSearchType.USER]: [['type', 'user'], ['scope', 'user']],
  [WeiboSearchType.TOPIC]: [['type', 'topic'], ['scope', 'topic']],
};

export class WeiboKeywordSearchTask extends HtmlTask {
  readonly name = 'WeiboKeywordSearchTask';

  constructor(task: NormalizedTask, private readonly options: { searchType?: WeiboSearchType; page?: number }) {
    super(task);
  }

  protected createRequest(context: TaskContext) {
    const searchType = this.options.searchType ?? WeiboSearchType.DEFAULT;
    const page = this.options.page ?? 1;
    const base = context.weiboConfig.searchEndpoints[endpointKey[searchType] ?? 'default'];
    const params = new URLSearchParams({ q: this.task.keyword, page: String(page) });
    this.applyExtras(params, searchType, this.task.start, this.task.end);
    return { url: `${base}?${params.toString()}` };
  }

  protected async handleResponse(
    response: { body: string; finalUrl?: string },
    context: TaskContext,
  ): Promise<TaskResult> {
    const page = this.options.page ?? 1;
    const searchType = this.options.searchType ?? WeiboSearchType.DEFAULT;
    const requestUrl = this.createRequest(context).url;

    const stored = await context.storage.store({
      type: SourceType.WEIBO_KEYWORD_SEARCH,
      platform: SourcePlatform.WEIBO,
      url: response.finalUrl ?? requestUrl,
      raw: response.body,
      metadata: {
        ...this.task.metadata,
        taskId: this.task.taskId,
        keyword: this.task.keyword,
        page,
        searchType,
        timeRange: {
          start: this.task.start.toISOString(),
          end: this.task.end.toISOString(),
        },
      },
    });

    return { success: stored, notes: stored ? undefined : 'duplicate' };
  }

  private applyExtras(
    params: URLSearchParams,
    type: WeiboSearchType,
    start: Date,
    end: Date,
  ): void {
    const extras = extraParams[type];
    if (extras) {
      extras.forEach(([key, value]) => params.set(key, value));
      return;
    }
    params.set('timescope', `custom:${this.format(start)}:${this.format(end)}`);
  }

  private format(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
      String(date.getHours()).padStart(2, '0'),
    ].join('-');
  }
}
