import { HtmlFetcherService } from '../services/html-fetcher.service';
import { AjaxFetcherService } from '../services/ajax-fetcher.service';
import { StorageService } from '../services/storage.service';
import { WeiboTaskConfig } from '../config/crawler.config';
import {
  InjectCookiesContext,
  RequestWithHeaders,
  WeiboAccountSelection,
  WeiboAccountService,
} from '../services/weibo-account.service';
import type { WeiboProfileService, WeiboStatusService } from '@pro/weibo';

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
  weiboAccountService: WeiboAccountService;
  weiboStatusService: WeiboStatusService;
  weiboProfileService: WeiboProfileService;
}

export interface TaskResult {
  success: boolean;
  notes?: string;
}

export abstract class BaseTask {
  private accountPrepared = false;
  private accountSelection: WeiboAccountSelection | null = null;

  constructor(protected readonly task: NormalizedTask) {}

  abstract readonly name: string;

  async run(context: TaskContext): Promise<TaskResult> {
    return this.execute(context);
  }

  protected abstract execute(context: TaskContext): Promise<TaskResult>;

  protected async withWeiboAccount<T extends RequestWithHeaders>(
    context: TaskContext,
    request: T,
  ): Promise<T> {
    await this.prepareAccount(context, request);
    return request;
  }

  protected async ensureAccount(
    context: TaskContext,
    request: RequestWithHeaders,
  ): Promise<void> {
    if (this.accountPrepared) {
      return;
    }
    await this.prepareAccount(context, request);
  }

  protected getSelectedAccount(): WeiboAccountSelection | null {
    return this.accountSelection;
  }

  private async prepareAccount(
    context: TaskContext,
    request: RequestWithHeaders,
  ): Promise<void> {
    this.accountPrepared = true;
    this.accountSelection = await context.weiboAccountService.injectCookies(
      request,
      this.buildInjectionContext(),
    );
  }

  private buildInjectionContext(): InjectCookiesContext {
    return {
      taskId: this.task.taskId,
      taskName: this.name,
    };
  }
}
