import { Test, TestingModule } from '@nestjs/testing';
import { RequestMonitorService } from './request-monitor.service';
import { CrawlerConfig } from '../config/crawler.interface';
import 'jest-extended';

describe('RequestMonitorService', () => {
  let service: RequestMonitorService;
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestMonitorService,
        {
          provide: 'CRAWLER_CONFIG',
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<RequestMonitorService>(RequestMonitorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordRequest', () => {
    it('should record successful request', () => {
      const initialStats = service.getCurrentStats();

      service.recordRequest('https://example.com/page', true, 500);

      const stats = service.getCurrentStats();
      expect(stats.requestsPerSecond).toBeGreaterThan(initialStats.requestsPerSecond);
      expect(stats.successRate).toBe(1);
    });

    it('should record failed request', () => {
      service.recordRequest('https://example.com/page', false, 1000);

      const stats = service.getCurrentStats();
      expect(stats.successRate).toBe(0);
    });

    it('should not record when monitoring is disabled', () => {
      mockConfig.rateMonitoring.enabled = false;
      const localService = new RequestMonitorService(mockConfig);

      localService.recordRequest('https://example.com/page', true, 500);

      const stats = localService.getCurrentStats();
      expect(stats.requestsPerSecond).toBe(0);
    });

    it('should maintain max history size', () => {
      const maxHistorySize = 1000;

      // Add more requests than max history size
      for (let i = 0; i < maxHistorySize + 100; i++) {
        service.recordRequest(`https://example.com/page${i}`, true, 500);
      }

      const detailedStats = service.getDetailedStats();
      expect(detailedStats.totalRequests).toBeLessThanOrEqual(maxHistorySize);
    });
  });

  describe('getCurrentStats', () => {
    it('should return correct statistics for current window', () => {
      const now = Date.now();

      // Add some requests
      service.recordRequest('https://example.com/page1', true, 500);
      service.recordRequest('https://example.com/page2', false, 1000);
      service.recordRequest('https://example.com/page3', true, 300);

      const stats = service.getCurrentStats();

      expect(stats.currentDelayMs).toBe(mockConfig.requestDelay.min);
      expect(stats.successRate).toBe(2/3); // 2 out of 3 successful
      expect(stats.averageResponseTime).toBe((500 + 1000 + 300) / 3);
      expect(stats.windowSize).toBe(60); // 60 seconds
      expect(stats.maxRequestsPerWindow).toBe(10);
      expect(stats.isThrottling).toBe(false);
    });

    it('should detect throttling when requests exceed limit', () => {
      // Add requests up to the limit
      for (let i = 0; i < mockConfig.rateMonitoring.maxRequestsPerWindow + 1; i++) {
        service.recordRequest(`https://example.com/page${i}`, true, 500);
      }

      const stats = service.getCurrentStats();
      expect(stats.isThrottling).toBe(true);
    });

    it('should return default stats for empty window', () => {
      service.reset(); // Clear all requests

      const stats = service.getCurrentStats();

      expect(stats.requestsPerSecond).toBe(0);
      expect(stats.successRate).toBe(1);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.isThrottling).toBe(false);
    });
  });

  describe('getDetailedStats', () => {
    it('should return detailed statistics', () => {
      // Add some test requests
      service.recordRequest('https://example.com/page1', true, 500);
      service.recordRequest('https://example.com/page1', true, 300);
      service.recordRequest('https://example.com/page2', false, 1000);
      service.recordRequest('https://example.com/page3', true, 200);

      const detailedStats = service.getDetailedStats();

      expect(detailedStats.totalRequests).toBe(4);
      expect(detailedStats.topUrls.length).toBe(3);

      // page1 should be the most visited
      const page1Stats = detailedStats.topUrls.find(url => url.url === 'https://example.com/page1');
      expect(page1Stats?.count).toBe(2);
      expect(page1Stats?.successRate).toBe(1);

      // page2 should have errors
      const page2Stats = detailedStats.errorPattern.find(url => url.url === 'https://example.com/page2');
      expect(page2Stats?.errorCount).toBe(1);
    });
  });

  describe('setCurrentDelay', () => {
    it('should set delay within bounds', () => {
      service.setCurrentDelay(5000);
      expect(service.getCurrentDelay()).toBe(5000);
    });

    it('should clamp delay to maximum', () => {
      service.setCurrentDelay(50000);
      expect(service.getCurrentDelay()).toBe(mockConfig.rateMonitoring.adaptiveDelay.maxDelayMs);
    });

    it('should clamp delay to minimum', () => {
      service.setCurrentDelay(500);
      expect(service.getCurrentDelay()).toBe(mockConfig.rateMonitoring.adaptiveDelay.minDelayMs);
    });
  });

  describe('adaptive delay', () => {
    it('should increase delay when throttling', () => {
      // Add requests to trigger throttling
      for (let i = 0; i < mockConfig.rateMonitoring.maxRequestsPerWindow + 1; i++) {
        service.recordRequest(`https://example.com/page${i}`, true, 500);
      }

      const initialDelay = service.getCurrentDelay();

      // Record another request to trigger adaptive delay
      service.recordRequest('https://example.com/throttled', true, 500);

      const newDelay = service.getCurrentDelay();
      expect(newDelay).toBeGreaterThan(initialDelay);
    });

    it('should decrease delay when request rate is low', () => {
      // Set a higher initial delay
      service.setCurrentDelay(10000);

      // Record a single request
      service.recordRequest('https://example.com/low-rate', true, 500);

      // Wait a bit and record another request to trigger adaptive logic
      setTimeout(() => {
        service.recordRequest('https://example.com/low-rate2', true, 500);
        const newDelay = service.getCurrentDelay();
        expect(newDelay).toBeLessThan(10000);
      }, 100);
    });

    it('should increase delay when success rate is low', () => {
      // Record many failed requests
      for (let i = 0; i < 10; i++) {
        service.recordRequest(`https://example.com/failed${i}`, false, 1000);
      }

      const initialDelay = service.getCurrentDelay();

      // Record another failed request
      service.recordRequest('https://example.com/failed', false, 1000);

      const newDelay = service.getCurrentDelay();
      expect(newDelay).toBeGreaterThan(initialDelay);
    });

    it('should increase delay when response time is high', () => {
      // Record requests with high response time
      for (let i = 0; i < 5; i++) {
        service.recordRequest(`https://example.com/slow${i}`, true, 15000);
      }

      const initialDelay = service.getCurrentDelay();

      service.recordRequest('https://example.com/slow', true, 15000);

      const newDelay = service.getCurrentDelay();
      expect(newDelay).toBeGreaterThan(initialDelay);
    });
  });

  describe('waitForNextRequest', () => {
    it('should wait for current delay time', async () => {
      const startTime = Date.now();

      await service.waitForNextRequest();

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Should wait at least the minimum delay
      expect(elapsed).toBeGreaterThanOrEqual(service.getCurrentDelay() - 50); // Allow some variance
    });

    it('should return immediately when monitoring is disabled', async () => {
      mockConfig.rateMonitoring.enabled = false;
      const localService = new RequestMonitorService(mockConfig);

      const startTime = Date.now();
      await localService.waitForNextRequest();
      const endTime = Date.now();

      // Should return almost immediately
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('reset', () => {
    it('should clear all requests and reset delay', () => {
      // Add some requests
      service.recordRequest('https://example.com/page1', true, 500);
      service.recordRequest('https://example.com/page2', false, 1000);

      // Change delay
      service.setCurrentDelay(8000);

      // Reset
      service.reset();

      const stats = service.getCurrentStats();
      expect(stats.requestsPerSecond).toBe(0);
      expect(service.getCurrentDelay()).toBe(mockConfig.requestDelay.min);
    });
  });
});