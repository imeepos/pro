import { BaseTask, TaskContext, TaskResult } from './base-task';
import { AjaxRequest, AjaxResponse } from '../services/ajax-fetcher.service';

export abstract class AjaxTask extends BaseTask {
  protected abstract createRequest(context: TaskContext): AjaxRequest | Promise<AjaxRequest>;

  protected abstract handleResponse(
    response: AjaxResponse,
    context: TaskContext,
  ): Promise<TaskResult>;

  protected async execute(context: TaskContext): Promise<TaskResult> {
    const request = await this.createRequest(context);
    await this.ensureAccount(context, request);
    const response = await context.ajaxFetcher.fetch(request);
    return this.handleResponse(response, context);
  }
}
