import { Injectable, Inject, Logger } from '@nestjs/common';
import { WeiboProfileService, WeiboStatusService } from '@pro/weibo';
import { TaskFactory } from '../tasks/task-factory';
import { AjaxFetcherService } from './ajax-fetcher.service';
import { HtmlFetcherService } from './html-fetcher.service';
import { StorageService } from './storage.service';
import { WeiboTaskConfig } from '../config/crawler.config';
import { SubTaskMessage, TaskContext } from '../tasks/base-task';
import { WeiboAccountService } from './weibo-account.service';

export interface CrawlResult {
  success: boolean;
  pageCount: number;
  notes?: string;
  error?: string;
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  constructor(
    private readonly taskFactory: TaskFactory,
    private readonly htmlFetcher: HtmlFetcherService,
    private readonly ajaxFetcher: AjaxFetcherService,
    private readonly storage: StorageService,
    private readonly weiboAccountService: WeiboAccountService,
    private readonly weiboStatusService: WeiboStatusService,
    private readonly weiboProfileService: WeiboProfileService,
    @Inject('WEIBO_CONFIG') private readonly weiboConfig: WeiboTaskConfig,
  ) {}

  async execute(message: SubTaskMessage): Promise<CrawlResult> {
    try {
      const outcome = await this.taskFactory.createTask(message).run(this.createContext());
      return {
        success: outcome.success,
        pageCount: outcome.success ? 1 : 0,
        notes: outcome.notes,
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error('任务执行失败', { taskId: message.taskId, error: detail });
      return { success: false, pageCount: 0, error: detail };
    }
  }

  private createContext(): TaskContext {
    return {
      htmlFetcher: this.htmlFetcher,
      ajaxFetcher: this.ajaxFetcher,
      storage: this.storage,
      weiboConfig: this.weiboConfig,
      weiboAccountService: this.weiboAccountService,
      weiboStatusService: this.weiboStatusService,
      weiboProfileService: this.weiboProfileService,
    };
  }
}
