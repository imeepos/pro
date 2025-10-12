import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RobotsService } from './robots.service';
import { CrawlerConfig } from '../config/crawler.interface';

describe('RobotsService', () => {
  let service: RobotsService;
  let configService: ConfigService;
  let mockConfig: CrawlerConfig;

  beforeEach(async () => {
    mockConfig = {
      headless: true,
      userAgent: 'Mozilla/5.0 Test',
      viewport: { width: 1920, height: 1080 },
      timeout: 30000,
      requestDelay: { min: 2000, max: 5000 },
      maxRetries: 3,
      retryDelay: 10000,
      maxPages: 50,
      pageTimeout: 30000,
      accountRotation: {
        enabled: true,
        maxUsagePerAccount: 100,
        cooldownTime: 30 * 60 * 1000,
      },
      antiDetection: {
        randomUserAgents: ['Mozilla/5.0 Test'],
        blockResources: true,
        simulateHuman: true,
      },
      robots: {
        enabled: true,
        userAgent: 'TestCrawler',
        respectCrawlDelay: true,
        fallbackDelay: 3,
        cacheTimeout: 3600000,
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
          minDelayMs: 1000,
        },
      },
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RobotsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'CRAWLER_CONFIG',
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<RobotsService>(RobotsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isUrlAllowed', () => {
    it('should return true when robots checking is disabled', async () => {
      mockConfig.robots.enabled = false;

      const result = await service.isUrlAllowed('https://example.com/page');

      expect(result).toBe(true);
    });

    it('should return true when robots.txt is not accessible', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.isUrlAllowed('https://nonexistent-domain.com/page');

      expect(result).toBe(true);
    });

    it('should return true for allowed paths', async () => {
      const mockRobotsText = `
        User-agent: *
        Disallow: /private/
        Allow: /public/
        Crawl-delay: 1
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockRobotsText),
      });

      const result = await service.isUrlAllowed('https://example.com/public/page');

      expect(result).toBe(true);
    });

    it('should return false for disallowed paths', async () => {
      const mockRobotsText = `
        User-agent: *
        Disallow: /private/
        Allow: /public/
        Crawl-delay: 1
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockRobotsText),
      });

      const result = await service.isUrlAllowed('https://example.com/private/page');

      expect(result).toBe(false);
    });

    it('should respect specific user-agent rules', async () => {
      const mockRobotsText = `
        User-agent: TestCrawler
        Disallow: /crawler-private/
        Allow: /crawler-public/

        User-agent: *
        Disallow: /global-private/
        Allow: /global-public/
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockRobotsText),
      });

      const allowedResult = await service.isUrlAllowed('https://example.com/crawler-public/page');
      const disallowedResult = await service.isUrlAllowed('https://example.com/crawler-private/page');

      expect(allowedResult).toBe(true);
      expect(disallowedResult).toBe(false);
    });

    it('should handle wildcard patterns', async () => {
      const mockRobotsText = `
        User-agent: *
        Disallow: /*.pdf$
        Allow: /allowed/*.pdf$
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockRobotsText),
      });

      const pdfResult = await service.isUrlAllowed('https://example.com/document.pdf');
      const allowedPdfResult = await service.isUrlAllowed('https://example.com/allowed/document.pdf');
      const htmlResult = await service.isUrlAllowed('https://example.com/page.html');

      expect(pdfResult).toBe(false);
      expect(allowedPdfResult).toBe(true);
      expect(htmlResult).toBe(true);
    });
  });

  describe('getCrawlDelay', () => {
    it('should return fallback delay when robots checking is disabled', async () => {
      mockConfig.robots.enabled = false;

      const result = await service.getCrawlDelay('https://example.com/page');

      expect(result).toBe(mockConfig.requestDelay.min / 1000);
    });

    it('should return fallback delay when crawl-delay is not specified', async () => {
      const mockRobotsText = `
        User-agent: *
        Disallow: /private/
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockRobotsText),
      });

      const result = await service.getCrawlDelay('https://example.com/page');

      expect(result).toBe(mockConfig.robots.fallbackDelay);
    });

    it('should return specified crawl-delay', async () => {
      const mockRobotsText = `
        User-agent: TestCrawler
        Crawl-delay: 5
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockRobotsText),
      });

      const result = await service.getCrawlDelay('https://example.com/page');

      expect(result).toBe(5);
    });

    it('should return fallback delay when robots.txt is not accessible', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.getCrawlDelay('https://example.com/page');

      expect(result).toBe(mockConfig.robots.fallbackDelay);
    });
  });

  describe('parseRobotsText', () => {
    it('should correctly parse basic robots.txt', async () => {
      const mockRobotsText = `
        # This is a comment
        User-agent: *
        Disallow: /private/
        Allow: /public/
        Crawl-delay: 2

        User-agent: TestCrawler
        Disallow: /test-private/
        Crawl-delay: 1

        Sitemap: https://example.com/sitemap.xml
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockRobotsText),
      });

      const robots = await service['getRobotsContent']('https://example.com/robots.txt');

      expect(robots?.rules).toHaveLength(2);
      expect(robots?.rules[0].userAgent).toBe('*');
      expect(robots?.rules[0].disallow).toContain('/private/');
      expect(robots?.rules[0].allow).toContain('/public/');
      expect(robots?.rules[0].crawlDelay).toBe(2);

      expect(robots?.rules[1].userAgent).toBe('testcrawler');
      expect(robots?.rules[1].disallow).toContain('/test-private/');
      expect(robots?.rules[1].crawlDelay).toBe(1);

      expect(robots?.sitemaps).toContain('https://example.com/sitemap.xml');
    });
  });

  describe('caching', () => {
    it('should cache robots.txt content', async () => {
      const mockRobotsText = 'User-agent: *\nDisallow: /private/';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockRobotsText),
      });

      // First call should fetch
      await service.isUrlAllowed('https://example.com/page');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await service.isUrlAllowed('https://example.com/page2');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should clear cache', () => {
      service.clearCache();
      const cacheInfo = service.getCacheInfo();

      expect(cacheInfo).toHaveLength(0);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    (global.fetch as any) = undefined;
  });
});