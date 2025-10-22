import { BaseTask, TaskContext } from '../base-task';
import type { WeiboRequestOptions } from '@pro/weibo';

export abstract class WeiboApiTask extends BaseTask {
  protected async resolveWeiboRequest(
    context: TaskContext,
    endpoint: string,
  ): Promise<{ baseUrl: string; options: WeiboRequestOptions }> {
    const baseUrl = this.extractBaseUrl(endpoint);
    const request = await this.withWeiboAccount(context, { url: endpoint, headers: {} });
    const options = this.composeRequestOptions(baseUrl, request.headers);

    return { baseUrl, options };
  }

  protected composeApiUrl(
    baseUrl: string,
    path: string,
    parameters: Record<string, string | undefined>,
  ): string {
    const url = new URL(path, baseUrl);
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'undefined') {
        continue;
      }
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private composeRequestOptions(
    baseUrl: string,
    headers: Record<string, string> | undefined,
  ): WeiboRequestOptions {
    if (!headers) {
      return { baseUrl };
    }

    const normalizedHeaders: Record<string, string> = { ...headers };
    const cookie = normalizedHeaders.cookie;
    const xsrfToken = normalizedHeaders['x-xsrf-token'];

    delete normalizedHeaders.cookie;
    delete normalizedHeaders['x-xsrf-token'];

    const remainingHeaders =
      Object.keys(normalizedHeaders).length > 0 ? normalizedHeaders : undefined;

    return {
      baseUrl,
      ...(cookie ? { cookie } : {}),
      ...(xsrfToken ? { xsrfToken } : {}),
      ...(remainingHeaders ? { headers: remainingHeaders } : {}),
    };
  }

  private extractBaseUrl(endpoint: string): string {
    try {
      const parsed = new URL(endpoint);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return endpoint.startsWith('http') ? endpoint : 'https://weibo.com';
    }
  }
}
