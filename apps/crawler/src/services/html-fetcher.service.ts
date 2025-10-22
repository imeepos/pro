import { Injectable, Inject } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { CrawlerRuntimeConfig } from '../config/crawler.config';

export interface HtmlRequest {
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
}

export interface HtmlResponse {
  body: string;
  status: number;
  finalUrl?: string;
}

@Injectable()
export class HtmlFetcherService {
  private readonly client: AxiosInstance;

  constructor(@Inject('CRAWLER_RUNTIME_CONFIG') config: CrawlerRuntimeConfig) {
    this.client = axios.create({
      headers: {
        'user-agent': config.userAgent,
        accept: 'text/html,application/xhtml+xml',
      },
      timeout: config.requestTimeoutMs,
      maxRedirects: 5,
    });
  }

  async fetch(request: HtmlRequest): Promise<HtmlResponse> {
    const response = await this.client.get<string>(request.url, {
      headers: request.headers,
      params: request.query,
      responseType: 'text',
      validateStatus: (status) => status >= 200 && status < 400,
    });

    return {
      body: response.data,
      status: response.status,
      finalUrl: response.request?.res?.responseUrl ?? request.url,
    };
  }
}
