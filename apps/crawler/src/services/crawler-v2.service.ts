import { Injectable, Inject, Logger } from '@nestjs/common';
import { WorkflowExecutorService } from '@pro/workflow';
import { WeiboProfileService, WeiboStatusService } from '@pro/weibo';
import { WorkflowFactory } from '../workflow-factory';
import { StorageService } from './storage.service';
import { WeiboTaskConfig } from '../config/crawler.config';
import { SubTaskMessage } from '../types';
import { WeiboAccountService } from './weibo-account.service';
import { CrawlerWorkflowVisitor } from './crawler-workflow.visitor';

export interface CrawlResult {
  success: boolean;
  pageCount: number;
  notes?: string;
  error?: string;
}

@Injectable()
export class CrawlerServiceV2 {
  private readonly logger = new Logger(CrawlerServiceV2.name);

  constructor(
    private readonly workflowFactory: WorkflowFactory,
    private readonly workflowExecutor: WorkflowExecutorService,
    private readonly workflowVisitor: CrawlerWorkflowVisitor,
    private readonly storage: StorageService,
    private readonly weiboAccountService: WeiboAccountService,
    private readonly weiboStatusService: WeiboStatusService,
    private readonly weiboProfileService: WeiboProfileService,
    @Inject('WEIBO_CONFIG') private readonly weiboConfig: WeiboTaskConfig,
  ) {}

  async execute(message: SubTaskMessage): Promise<CrawlResult> {
    try {
      const workflow = this.workflowFactory.createWorkflow(message);
      const context = this.createContext();
      const result = await this.workflowExecutor.execute(workflow, context, this.workflowVisitor);

      if (result.state === 'success') {
        return {
          success: true,
          pageCount: 1,
        };
      }

      return {
        success: false,
        pageCount: 0,
        error: 'Workflow 执行失败',
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error('任务执行失败', { taskId: message.taskId, error: detail });
      return { success: false, pageCount: 0, error: detail };
    }
  }

  private createContext() {
    return {
      storage: this.storage,
      weiboConfig: this.weiboConfig,
      weiboAccountService: this.weiboAccountService,
      weiboStatusService: this.weiboStatusService,
      weiboProfileService: this.weiboProfileService,
    };
  }
}
