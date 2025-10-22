import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '@pro/types';

export interface RenderingRuntimeConfig {
  enabled: boolean;
  headless: boolean;
  navigationTimeoutMs: number;
  actionTimeoutMs: number;
  warmupUrl: string;
}

export interface CrawlerRuntimeConfig {
  userAgent: string;
  requestTimeoutMs: number;
  rendering: RenderingRuntimeConfig;
}

export interface RabbitConfig {
  url: string;
  queues: {
    crawl: string;
    rawDataReady: string;
  };
}

export interface WeiboTaskConfig {
  searchEndpoints: {
    default: string;
    realTime: string;
    popular: string;
    video: string;
    user: string;
    topic: string;
  };
  detailEndpoint: string;
  commentsEndpoint: string;
  userInfoEndpoint: string;
}

const coerceBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
};

const coerceNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

export const createCrawlerRuntimeConfig = (config: ConfigService): CrawlerRuntimeConfig => ({
  userAgent:
    config.get<string>('CRAWLER_USER_AGENT') ??
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  requestTimeoutMs: coerceNumber(config.get('CRAWLER_REQUEST_TIMEOUT_MS'), 20000),
  rendering: {
    enabled: coerceBoolean(config.get('CRAWLER_RENDERING_ENABLED'), false),
    headless: coerceBoolean(config.get('CRAWLER_RENDERING_HEADLESS'), true),
    navigationTimeoutMs: coerceNumber(config.get('CRAWLER_RENDERING_NAVIGATION_TIMEOUT_MS'), 30000),
    actionTimeoutMs: coerceNumber(config.get('CRAWLER_RENDERING_ACTION_TIMEOUT_MS'), 15000),
    warmupUrl: config.get<string>('CRAWLER_RENDERING_WARMUP_URL', 'https://example.com')!,
  },
});

export const createRabbitConfig = (config: ConfigService): RabbitConfig => ({
  url: config.get<string>('RABBITMQ_URL', 'amqp://localhost:5672'),
  queues: {
    crawl: config.get<string>('CRAWLER_QUEUE', QUEUE_NAMES.CRAWL_TASK),
    rawDataReady: QUEUE_NAMES.RAW_DATA_READY,
  },
});

export const createWeiboTaskConfig = (config: ConfigService): WeiboTaskConfig => {
  const base = config.get<string>('WEIBO_BASE_URL', 'https://weibo.com');
  const searchBase = config.get<string>('WEIBO_SEARCH_URL', 'https://s.weibo.com/weibo');

  return {
    searchEndpoints: {
      default: searchBase,
      realTime: `${base}/search/realtime`,
      popular: `${base}/search/hot`,
      video: `${base}/search/video`,
      user: `${base}/search/user`,
      topic: `${base}/search/topic`,
    },
    detailEndpoint: config.get<string>(
      'WEIBO_DETAIL_ENDPOINT',
      `${base}/ajax/statuses/show`,
    ),
    commentsEndpoint: config.get<string>(
      'WEIBO_COMMENTS_ENDPOINT',
      `${base}/ajax/comments/show`,
    ),
    userInfoEndpoint: config.get<string>(
      'WEIBO_USER_INFO_ENDPOINT',
      `${base}/ajax/profile/info`,
    ),
  };
};
