import { ConfigService } from '@nestjs/config';
import { CrawlerConfig, RabbitMQConfig, MongoDBConfig, WeiboConfig } from './crawler.interface';

export const createCrawlerConfig = (configService: ConfigService): CrawlerConfig => ({
  headless: configService.get<string>('NODE_ENV') === 'production' || configService.get<boolean>('FORCE_HEADLESS', true),
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: {
    width: 1920,
    height: 1080
  },
  timeout: 30000,

  requestDelay: {
    min: 2000,
    max: 5000
  },
  maxRetries: 3,
  retryDelay: 10000,

  maxPages: 50,
  pageTimeout: 30000,

  accountRotation: {
    enabled: true,
    maxUsagePerAccount: 100,
    cooldownTime: 30 * 60 * 1000
  },

  antiDetection: {
    randomUserAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15'
    ],
    blockResources: true,
    simulateHuman: true
  },

  robots: {
    enabled: configService.get<boolean>('ROBOTS_ENABLED', true),
    userAgent: configService.get<string>('ROBOTS_USER_AGENT', 'ProCrawler'),
    respectCrawlDelay: configService.get<boolean>('ROBOTS_RESPECT_CRAWL_DELAY', true),
    fallbackDelay: configService.get<number>('ROBOTS_FALLBACK_DELAY', 3),
    cacheTimeout: configService.get<number>('ROBOTS_CACHE_TIMEOUT', 3600000) // 1小时
  },

  rateMonitoring: {
    enabled: configService.get<boolean>('RATE_MONITORING_ENABLED', true),
    windowSizeMs: configService.get<number>('RATE_WINDOW_SIZE_MS', 60000), // 1分钟
    maxRequestsPerWindow: configService.get<number>('RATE_MAX_REQUESTS_PER_WINDOW', 10),
    adaptiveDelay: {
      enabled: configService.get<boolean>('ADAPTIVE_DELAY_ENABLED', true),
      increaseFactor: configService.get<number>('ADAPTIVE_DELAY_INCREASE_FACTOR', 1.5),
      decreaseFactor: configService.get<number>('ADAPTIVE_DELAY_DECREASE_FACTOR', 0.8),
      maxDelayMs: configService.get<number>('ADAPTIVE_DELAY_MAX_MS', 30000),
      minDelayMs: configService.get<number>('ADAPTIVE_DELAY_MIN_MS', 1000)
    }
  }
});

export const createRabbitMQConfig = (configService: ConfigService): RabbitMQConfig => ({
  url: configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672'),
  queues: {
    crawlQueue: 'weibo_crawl_queue',
    statusQueue: 'weibo_task_status_queue',
    retryQueue: 'weibo_crawl_retry_queue'
  },
  options: {
    persistent: true,
    durable: true,
    maxRetries: 3,
    retryDelay: 5000
  }
});

export const createMongoDBConfig = (configService: ConfigService): MongoDBConfig => ({
  uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/pro'),
  database: configService.get<string>('MONGODB_DATABASE', 'pro'),
  options: {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferMaxEntries: 0,
    bufferCommands: false
  }
});

export const createWeiboConfig = (configService: ConfigService): WeiboConfig => ({
  baseUrl: 'https://weibo.com',
  searchUrl: 'https://s.weibo.com/weibo',

  timeFormat: 'YYYY-MM-DD-HH',
  timezone: 'Asia/Shanghai',

  selectors: {
    feedCard: '.card-wrap',
    timeElement: '.from time, .from a',
    contentElement: '.content',
    authorElement: '.info .name',
    pagination: {
      nextButton: '.next:not(.disable)',
      pageInfo: '.m-page .count',
      noResult: '.search_no_result'
    }
  },

  maxPagesPerSearch: 50,
  maxSearchResults: 2000,

  account: {
    cookieValidation: true,
    loginCheckUrl: 'https://weibo.com',
    bannedUrls: [
      'login.weibo.cn',
      'passport.weibo.com',
      'weibo.cn/security'
    ]
  }
});