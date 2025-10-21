import { Test, TestingModule } from '@nestjs/testing';
import { WeiboSearchCrawlerService, SubTaskMessage } from '../weibo/search-crawler.service';
import { WeiboMultiModeCrawlerService } from '../weibo/multi-mode-crawler.service';
import { WeiboAccountService } from '../weibo/account.service';
import { BrowserService } from '../browser/browser.service';
import { RawDataService } from '../raw-data/raw-data.service';
import { RobotsService } from '../robots/robots.service';
import { RequestMonitorService } from '../monitoring/request-monitor.service';
import { ConfigService } from '@nestjs/config';
import { CrawlerConfig, RabbitMQConfig, WeiboConfig } from '../config/crawler.interface';
import { WeiboAccountStatus } from '@pro/types';

describe('WeiboSearchCrawlerService', () => {
  let service: WeiboSearchCrawlerService;
  let mockAccountService: jest.Mocked<WeiboAccountService>;
  let mockBrowserService: jest.Mocked<BrowserService>;
  let mockRawDataService: jest.Mocked<RawDataService>;
  let mockRobotsService: jest.Mocked<RobotsService>;
  let mockRequestMonitorService: jest.Mocked<RequestMonitorService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockMultiModeCrawlerService: jest.Mocked<WeiboMultiModeCrawlerService>;

  const mockCrawlerConfig: CrawlerConfig = {
    headless: true,
    userAgent: 'test-agent',
    viewport: { width: 1920, height: 1080 },
    timeout: 30000,
    requestDelay: { min: 1000, max: 2000 },
    maxRetries: 3,
    retryDelay: 5000,
    maxPages: 50,
    pageTimeout: 30000,
    accountRotation: {
      enabled: true,
      maxUsagePerAccount: 100,
      cooldownTime: 1800000
    },
    antiDetection: {
      randomUserAgents: ['test-agent'],
      blockResources: true,
      simulateHuman: true,
      stealthScript: true,
      advancedFingerprinting: true,
      userAgentRotation: true,
      cdpMode: false,
      cdpConfig: {
        enabled: false,
        debugPort: 9222,
        autoCloseBrowser: true
      },
      fingerprinting: {
        screenResolution: {
          desktop: { width: 1920, height: 1080 },
          mobile: { width: 375, height: 667 }
        },
        timezone: 'Asia/Shanghai',
        languages: {
          desktop: ['zh-CN', 'zh', 'en'],
          mobile: ['zh-CN', 'zh']
        },
        platforms: {
          desktop: ['Win32', 'MacIntel', 'Linux x86_64'],
          mobile: ['iPhone', 'Android']
        },
        webglFingerprint: true,
        canvasFingerprint: true
      }
    },
    robots: {
      enabled: true,
      userAgent: 'TestCrawler',
      respectCrawlDelay: true,
      fallbackDelay: 3,
      cacheTimeout: 3600000
    },
    rateMonitoring: {
      enabled: true,
      windowSizeMs: 60000,
      maxRequestsPerWindow: 10,
      adaptiveDelay: {
        enabled: true,
        increaseFactor: 1.5,
        decreaseFactor: 0.8,
        maxDelayMs: 30000,
        minDelayMs: 1000
      }
    }
  };

  const mockRabbitMQConfig: RabbitMQConfig = {
    url: 'amqp://localhost:5672',
    queues: {
      crawlQueue: 'test_crawl_queue',
      statusQueue: 'test_status_queue',
      retryQueue: 'test_retry_queue'
    },
    options: {
      persistent: true,
      durable: true,
      maxRetries: 3,
      retryDelay: 5000
    }
  };

  const mockWeiboConfig: WeiboConfig = {
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
      bannedUrls: ['login.weibo.cn']
    }
  };

  beforeEach(async () => {
    mockAccountService = {
      getAvailableAccount: jest.fn(),
      markAccountBanned: jest.fn(),
      getAccountStats: jest.fn(),
      resetUsageCount: jest.fn()
    } as any;

    mockBrowserService = {
      initialize: jest.fn(),
      createContext: jest.fn(),
      createPage: jest.fn(),
      closeContext: jest.fn(),
      getBrowserState: jest.fn()
    } as any;

    mockRawDataService = {
      create: jest.fn(),
      findBySourceUrl: jest.fn(),
      findByMetadata: jest.fn(),
      findByTaskId: jest.fn(),
      findByKeywordAndTimeRange: jest.fn(),
      updateStatus: jest.fn(),
      getStatistics: jest.fn(),
      cleanupOldData: jest.fn(),
      searchContent: jest.fn()
    } as any;

    mockRobotsService = {
      isUrlAllowed: jest.fn().mockResolvedValue(true),
      getCrawlDelay: jest.fn().mockResolvedValue(3),
      clearCache: jest.fn(),
      getCacheInfo: jest.fn().mockReturnValue([])
    } as any;

    mockRequestMonitorService = {
      recordRequest: jest.fn(),
      waitForNextRequest: jest.fn().mockResolvedValue(undefined),
      getCurrentStats: jest.fn().mockReturnValue({
        currentDelayMs: 1500,
        requestsPerSecond: 0.5,
        successRate: 1,
        averageResponseTime: 500,
        windowSize: 60,
        maxRequestsPerWindow: 10,
        isThrottling: false
      }),
      getDetailedStats: jest.fn().mockReturnValue({
        totalRequests: 10,
        lastMinuteStats: {},
        lastHourStats: {},
        topUrls: [],
        errorPattern: []
      }),
      getCurrentDelay: jest.fn().mockReturnValue(1500),
      setCurrentDelay: jest.fn(),
      reset: jest.fn()
    } as any;

    mockConfigService = {
      get: jest.fn()
    } as any;

    mockMultiModeCrawlerService = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeiboSearchCrawlerService,
        {
          provide: WeiboAccountService,
          useValue: mockAccountService
        },
        {
          provide: BrowserService,
          useValue: mockBrowserService
        },
        {
          provide: RawDataService,
          useValue: mockRawDataService
        },
        {
          provide: RobotsService,
          useValue: mockRobotsService
        },
        {
          provide: RequestMonitorService,
          useValue: mockRequestMonitorService
        },
        {
          provide: WeiboMultiModeCrawlerService,
          useValue: mockMultiModeCrawlerService
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        {
          provide: 'CRAWLER_CONFIG',
          useValue: mockCrawlerConfig
        },
        {
          provide: 'RABBITMQ_CONFIG',
          useValue: mockRabbitMQConfig
        },
        {
          provide: 'WEIBO_CONFIG',
          useValue: mockWeiboConfig
        }
      ]
    }).compile();

    service = module.get<WeiboSearchCrawlerService>(WeiboSearchCrawlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('crawl', () => {
    const mockSubTask: SubTaskMessage = {
      taskId: 1,
      keyword: '测试关键词',
      start: new Date('2025-01-01'),
      end: new Date('2025-01-02'),
      isInitialCrawl: true,
      enableAccountRotation: true
    };

    it('should handle successful crawl with full 50 pages', async () => {
      // 模拟账号可用
      mockAccountService.getAvailableAccount.mockResolvedValue({
        id: 1,
        nickname: 'test',
        cookies: [],
        status: WeiboAccountStatus.ACTIVE,
        usageCount: 0,
        lastUsedAt: undefined,
        // MediaCrawler风格的智能字段
        healthScore: 100,
        lastValidatedAt: undefined,
        consecutiveFailures: 0,
        totalSuccesses: 0,
        averageResponseTime: 0,
        bannedRiskLevel: 'low',
        priority: 1,
        cookieExpiryTime: undefined,
        cookieValidationHash: 'test-hash'
      });

      // 模拟页面内容
      const mockHtml = `
        <div class="card-wrap">
          <div class="from">
            <time title="2025-01-01 12:00">2025-01-01 12:00</time>
          </div>
        </div>
      `;

      // 模拟页面对象
      const mockPage = {
        goto: jest.fn(),
        waitForSelector: jest.fn(),
        content: jest.fn().mockResolvedValue(mockHtml)
      } as any;

      mockBrowserService.createPage.mockResolvedValue(mockPage);
      mockRawDataService.create.mockResolvedValue({} as any);

      const result = await service.crawl(mockSubTask);

      expect(result.success).toBe(true);
      expect(mockAccountService.getAvailableAccount).toHaveBeenCalled();
      expect(mockBrowserService.createPage).toHaveBeenCalled();
      expect(mockRawDataService.create).toHaveBeenCalled();
    });

    it('should handle no available account', async () => {
      mockAccountService.getAvailableAccount.mockResolvedValue(null);

      const result = await service.crawl(mockSubTask);

      expect(result.success).toBe(false);
      expect(result.error).toBe('无可用微博账号');
    });

    it('should format date correctly for Weibo', () => {
      const date = new Date('2025-01-01T10:30:00');
      const formatted = (service as any).formatDateForWeibo(date);
      expect(formatted).toBe('2025-01-01-10');
    });

    it('should build search URL correctly', () => {
      const keyword = '测试关键词';
      const start = new Date('2025-01-01T10:00:00');
      const end = new Date('2025-01-01T15:00:00');
      const page = 2;

      const url = (service as any).buildSearchUrl(keyword, start, end, page);

      expect(url).toContain('q=%E6%B5%8B%E8%AF%95%E5%85%B3%E9%94%AE%E8%AF%8D');
      expect(url).toContain('timescope=custom:2025-01-01-10:2025-01-01-15');
      expect(url).toContain('page=2');
    });

    it('should parse interval correctly', () => {
      expect((service as any).parseInterval('1h')).toBe(60 * 60 * 1000);
      expect((service as any).parseInterval('30m')).toBe(30 * 60 * 1000);
      expect((service as any).parseInterval('invalid')).toBe(60 * 60 * 1000); // 默认1小时
    });
  });

  describe('time extraction', () => {
    it('should extract time from first post', () => {
      const html = `
        <div class="card-wrap">
          <div class="from">
            <time title="2025-01-01 12:30">2小时前</time>
          </div>
        </div>
      `;

      const time = (service as any).extractFirstPostTime(html);
      expect(time).toBeInstanceOf(Date);
    });

    it('should extract time from last post', () => {
      const html = `
        <div class="card-wrap">
          <div class="from">
            <time title="2025-01-01 10:30">5小时前</time>
          </div>
        </div>
        <div class="card-wrap">
          <div class="from">
            <time title="2025-01-01 08:30">今天 08:30</time>
          </div>
        </div>
      `;

      const time = (service as any).extractLastPostTime(html);
      expect(time).toBeInstanceOf(Date);
    });

    it('should handle relative time parsing', () => {
      const time1 = (service as any).parseTimeText('2小时前');
      const time2 = (service as any).parseTimeText('30分钟前');
      const time3 = (service as any).parseTimeText('今天 15:30');
      const time4 = (service as any).parseTimeText('2025-01-01 12:30');

      expect(time1).toBeInstanceOf(Date);
      expect(time2).toBeInstanceOf(Date);
      expect(time3).toBeInstanceOf(Date);
      expect(time4).toBeInstanceOf(Date);
    });
  });

  describe('page detection', () => {
    it('should detect last page correctly', () => {
      const htmlWithNext = `
        <div class="next">下一页</div>
        <div class="m-page">
          <div class="count">第2页 共10页</div>
        </div>
      `;

      const htmlWithoutNext = `
        <div class="next disable">下一页</div>
        <div class="m-page">
          <div class="count">第10页 共10页</div>
        </div>
      `;

      const htmlNoResult = `
        <div class="search_no_result">没有找到相关结果</div>
      `;

      expect((service as any).isLastPage(htmlWithNext)).toBe(false);
      expect((service as any).isLastPage(htmlWithoutNext)).toBe(true);
      expect((service as any).isLastPage(htmlNoResult)).toBe(true);
    });
  });
});
