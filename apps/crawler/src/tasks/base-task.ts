import { HtmlFetcherService } from '../services/html-fetcher.service';
import { AjaxFetcherService } from '../services/ajax-fetcher.service';
import { StorageService } from '../services/storage.service';
import { WeiboTaskConfig } from '../config/crawler.config';

export interface SubTaskMessage {
  taskId: number;
  type?: string;
  keyword?: string;
  start?: Date | string;
  end?: Date | string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface NormalizedTask {
  taskId: number;
  type: string;
  keyword: string;
  start: Date;
  end: Date;
  metadata: Record<string, unknown>;
}

export interface TaskContext {
  htmlFetcher: HtmlFetcherService;
  ajaxFetcher: AjaxFetcherService;
  storage: StorageService;
  weiboConfig: WeiboTaskConfig;
}

export interface TaskResult {
  success: boolean;
  notes?: string;
}

export abstract class BaseTask {
  constructor(protected readonly task: NormalizedTask) {}

  abstract readonly name: string;

  async run(context: TaskContext): Promise<TaskResult> {
    return this.execute(context);
  }

  protected abstract execute(context: TaskContext): Promise<TaskResult>;
}
