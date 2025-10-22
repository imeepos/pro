import { Injectable, Inject } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { CrawlerRuntimeConfig } from '../config/crawler.config';

export interface AjaxRequest {
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
}

export interface AjaxResponse {
  raw: string;
  data: unknown;
  status: number;
  finalUrl?: string;
}

@Injectable()
export class AjaxFetcherService {
  private readonly client: AxiosInstance;

  constructor(@Inject('CRAWLER_RUNTIME_CONFIG') config: CrawlerRuntimeConfig) {
    this.client = axios.create({
      headers: {
        'user-agent': config.userAgent,
        accept: 'application/json, text/plain, */*',
      },
      timeout: config.requestTimeoutMs,
      maxRedirects: 5,
    });
  }

  async fetch(request: AjaxRequest): Promise<AjaxResponse> {
    const response = await this.client.get<string>(request.url, {
      headers: request.headers,
      params: request.query,
      responseType: 'text',
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const raw = response.data;
    let data: unknown = raw;
    try {
      data = raw.length > 0 ? JSON.parse(raw) : null;
    } catch {
      // 非严格 JSON 响应，保留原始文本
    }

    return {
      raw,
      data,
      status: response.status,
      finalUrl: response.request?.res?.responseUrl ?? request.url,
    };
  }
}
