import { CrawlerConfig, RabbitMQConfig, MongoDBConfig, WeiboConfig } from './crawler.interface';

export const defaultCrawlerConfig: CrawlerConfig = {
  // 爬虫基础配置
  headless: process.env.NODE_ENV === 'production',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: {
    width: 1920,
    height: 1080
  },
  timeout: 30000,

  // 请求控制配置
  requestDelay: {
    min: 2000, // 2秒最小延迟
    max: 5000  // 5秒最大延迟
  },
  maxRetries: 3,
  retryDelay: 10000, // 10秒重试延迟

  // 页面控制配置
  maxPages: 50, // 微博搜索最多50页
  pageTimeout: 30000, // 30秒页面超时

  // 账号轮换配置
  accountRotation: {
    enabled: true,
    maxUsagePerAccount: 100, // 每个账号最多使用100次
    cooldownTime: 30 * 60 * 1000 // 30分钟冷却时间
  },

  // 反爬策略配置
  antiDetection: {
    randomUserAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15'
    ],
    blockResources: true, // 拦截图片、CSS等资源文件
    simulateHuman: true // 模拟人类行为
  }
};

export const defaultRabbitMQConfig: RabbitMQConfig = {
  url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  queues: {
    crawlQueue: 'weibo_crawl_queue',
    statusQueue: 'weibo_task_status_queue',
    retryQueue: 'weibo_crawl_retry_queue'
  },
  options: {
    persistent: true,
    durable: true,
    maxRetries: 3,
    retryDelay: 5000 // 5秒重试延迟
  }
};

export const defaultMongoDBConfig: MongoDBConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pro',
  database: process.env.MONGODB_DATABASE || 'pro',
  options: {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferMaxEntries: 0,
    bufferCommands: false
  }
};

export const defaultWeiboConfig: WeiboConfig = {
  // 微博特定配置
  baseUrl: 'https://weibo.com',
  searchUrl: 'https://s.weibo.com/weibo',

  // 时间配置
  timeFormat: 'YYYY-MM-DD-HH', // 微博时间格式
  timezone: 'Asia/Shanghai',

  // 页面解析配置
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

  // 限制配置
  maxPagesPerSearch: 50, // 微博搜索限制50页
  maxSearchResults: 2000, // 最大搜索结果数

  // 账号配置
  account: {
    cookieValidation: true,
    loginCheckUrl: 'https://weibo.com',
    bannedUrls: [
      'login.weibo.cn',
      'passport.weibo.com',
      'weibo.cn/security'
    ]
  }
};