import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '@pro/types';

export interface CrawlerRuntimeConfig {
  userAgent: string;
  requestTimeoutMs: number;
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

export const createCrawlerRuntimeConfig = (config: ConfigService): CrawlerRuntimeConfig => ({
  userAgent:
    config.get<string>('CRAWLER_USER_AGENT') ??
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  requestTimeoutMs: config.get<number>('CRAWLER_REQUEST_TIMEOUT_MS', 20000),
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
