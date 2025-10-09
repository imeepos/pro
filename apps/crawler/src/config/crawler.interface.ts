export interface CrawlerConfig {
  // 爬虫基础配置
  headless: boolean;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  timeout: number;

  // 请求控制配置
  requestDelay: {
    min: number; // 最小延迟毫秒数
    max: number; // 最大延迟毫秒数
  };
  maxRetries: number; // 最大重试次数
  retryDelay: number; // 重试延迟毫秒数

  // 页面控制配置
  maxPages: number; // 每个子任务最大抓取页数
  pageTimeout: number; // 页面加载超时时间

  // 账号轮换配置
  accountRotation: {
    enabled: boolean;
    maxUsagePerAccount: number; // 每个账号最大使用次数
    cooldownTime: number; // 账号冷却时间（毫秒）
  };

  // 反爬策略配置
  antiDetection: {
    randomUserAgents: string[];
    blockResources: boolean; // 是否拦截资源文件
    simulateHuman: boolean; // 是否模拟人类行为
  };
}

export interface RabbitMQConfig {
  url: string;
  queues: {
    crawlQueue: string;
    statusQueue: string;
    retryQueue: string;
  };
  options: {
    persistent: boolean;
    durable: boolean;
    maxRetries: number;
    retryDelay: number;
  };
}

export interface MongoDBConfig {
  uri: string;
  database: string;
  options: {
    maxPoolSize: number;
    minPoolSize: number;
    maxIdleTimeMS: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
    bufferMaxEntries: number;
    bufferCommands: boolean;
  };
}

export interface WeiboConfig {
  // 微博特定配置
  baseUrl: string;
  searchUrl: string;

  // 时间配置
  timeFormat: string; // 微博时间格式
  timezone: string; // 时区

  // 页面解析配置
  selectors: {
    feedCard: string;
    timeElement: string;
    contentElement: string;
    authorElement: string;
    pagination: {
      nextButton: string;
      pageInfo: string;
      noResult: string;
    };
  };

  // 限制配置
  maxPagesPerSearch: number; // 每次搜索最大页数
  maxSearchResults: number; // 最大搜索结果数

  // 账号配置
  account: {
    cookieValidation: boolean;
    loginCheckUrl: string;
    bannedUrls: string[];
  };
}