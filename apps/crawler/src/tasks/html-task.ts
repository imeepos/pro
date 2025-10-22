import { BaseTask, TaskContext, TaskResult } from './base-task';
import { HtmlRequest, HtmlResponse } from '../services/html-fetcher.service';

export abstract class HtmlTask extends BaseTask {
  protected abstract createRequest(context: TaskContext): HtmlRequest;

  protected abstract handleResponse(
    response: HtmlResponse,
    context: TaskContext,
  ): Promise<TaskResult>;

  protected async execute(context: TaskContext): Promise<TaskResult> {
    const request = this.createRequest(context);
    const response = await context.htmlFetcher.fetch(request);
    return this.handleResponse(response, context);
  }
}
