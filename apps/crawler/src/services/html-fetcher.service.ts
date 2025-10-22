import { Injectable, Inject, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { CrawlerRuntimeConfig } from '../config/crawler.config';
import {
  BrowserGuardianService,
  RenderDirective,
  RenderingDisabledError,
} from './browser-guardian.service';

export type HtmlFetchStrategy = 'static' | 'rendered';

export interface RenderOptions extends RenderDirective {
  mode?: 'required' | 'prefer';
}

export interface HtmlRequest {
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  render?: RenderOptions;
}

export interface HtmlResponse {
  body: string;
  status: number;
  finalUrl?: string;
  strategy: HtmlFetchStrategy;
}

@Injectable()
export class HtmlFetcherService {
  private readonly client: AxiosInstance;
  private readonly logger = new Logger(HtmlFetcherService.name);

  constructor(
    @Inject('CRAWLER_RUNTIME_CONFIG') private readonly config: CrawlerRuntimeConfig,
    private readonly browserGuardian: BrowserGuardianService,
  ) {
    this.client = axios.create({
      headers: {
        'user-agent': this.config.userAgent,
        accept: 'text/html,application/xhtml+xml',
      },
      timeout: this.config.requestTimeoutMs,
      maxRedirects: 5,
    });
  }

  async fetch(request: HtmlRequest): Promise<HtmlResponse> {
    const shouldRender = Boolean(request.render);
    if (!shouldRender) {
      return this.fetchStatically(request);
    }

    return this.fetchRendered(request);
  }

  private async fetchStatically(request: HtmlRequest): Promise<HtmlResponse> {
    const response = await this.client.get<string>(request.url, {
      headers: request.headers,
      params: request.query,
      responseType: 'text',
      validateStatus: (status) => status >= 200 && status < 400,
    });

    return {
      body: response.data,
      status: response.status,
      finalUrl: response.request?.res?.responseUrl ?? this.composeUrl(request.url, request.query),
      strategy: 'static',
    };
  }

  private async fetchRendered(request: HtmlRequest): Promise<HtmlResponse> {
    const targetUrl = this.composeUrl(request.url, request.query);
    const renderOptions = request.render ?? {};
    const mode = renderOptions.mode ?? 'required';

    try {
      const result = await this.browserGuardian.render({
        url: targetUrl,
        headers: request.headers,
        directive: renderOptions,
      });

      return {
        body: result.body,
        status: result.status,
        finalUrl: result.finalUrl,
        strategy: 'rendered',
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);

      if (mode === 'prefer') {
        this.logger.warn('渲染策略失败，回退静态抓取', { url: targetUrl, detail });
        return this.fetchStatically(request);
      }
      if (error instanceof RenderingDisabledError) {
        throw error;
      }
      const renderingError = new Error(`渲染页面失败，已放弃任务: ${targetUrl} (${detail})`);
      if (error instanceof Error) {
        renderingError.cause = error;
      }
      throw renderingError;
    }
  }

  private composeUrl(
    base: string,
    query?: Record<string, string | number | undefined>,
  ): string {
    if (!query || Object.keys(query).length === 0) {
      return base;
    }

    try {
      const url = new URL(base);
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }
        url.searchParams.set(key, String(value));
      });
      return url.toString();
    } catch {
      return base;
    }
  }
}
