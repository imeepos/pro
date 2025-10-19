import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Logger } from '@pro/logger';
import {
  WeiboSearchCrawlerService,
  SubTaskMessage,
  CrawlResult,
  EnhancedSubTaskMessage,
  MultiModeCrawlResult,
  TraceContext
} from '../../src/weibo/search-crawler.service';
import { WeiboAccountService } from '../../src/weibo/account.service';
import { BrowserService } from '../../src/browser/browser.service';
import { RawDataService } from '../../src/raw-data/raw-data.service';
import { RobotsService } from '../../src/robots/robots.service';
import { RequestMonitorService } from '../../src/monitoring/request-monitor.service';
import { WeiboDetailCrawlerService } from '../../src/weibo/detail-crawler.service';
import { WeiboCreatorCrawlerService } from '../../src/weibo/creator-crawler.service';
import { WeiboCommentCrawlerService } from '../../src/weibo/comment-crawler.service';
import { WeiboMediaDownloaderService } from '../../src/weibo/media-downloader.service';
import { WeiboDataCleaner } from '../../src/data-cleaner/weibo-data-cleaner.service';
import { WeiboContentParser } from '../../src/data-cleaner/weibo-content-parser.service';
import { CrawlQueueConsumer } from '../../src/crawl-queue.consumer';

/**
 * 端到端测试设置 - 数字时代的测试艺术品基础
 * 为所有测试提供优雅、可靠的测试环境
 */

// 测试配置
export const TEST_CONFIG = {
  // 测试环境配置
  environment: 'test',
  testTimeout: 300000, // 5分钟

  // 模拟数据配置
  mockData: {
    testKeywords: ['人工智能', '科技创新', '数字化转型'],
    testTaskId: 99999,
    testAccountId: 1,

    // 时间范围配置
    timeRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    },

    // 模拟微博数据
    mockWeiboPosts: [
      {
        id: 'test_post_1',
        text: '这是测试微博内容1',
        author: {
          id: 'test_user_1',
          name: '测试用户1',
          avatar: 'https://example.com/avatar1.jpg'
        },
        createdAt: new Date('2024-01-15T10:00:00Z'),
        images: ['https://example.com/image1.jpg'],
        videos: [],
        metrics: {
          likes: 100,
          comments: 50,
          reposts: 25
        }
      }
    ]
  },

  // 性能测试配置
  performance: {
    maxConcurrentTasks: 5,
    maxExecutionTime: 60000, // 1分钟
    memoryThreshold: 512 * 1024 * 1024, // 512MB
    cpuThreshold: 80 // 80%
  },

  // 错误注入配置
  errorInjection: {
    networkFailureRate: 0.1,
    timeoutRate: 0.05,
    accountFailureRate: 0.15,
    parseFailureRate: 0.08
  }
};

// 测试状态管理
export class TestStateManager {
  private static instance: TestStateManager;
  private testSessions: Map<string, any> = new Map();
  private mockData: Map<string, any> = new Map();

  static getInstance(): TestStateManager {
    if (!TestStateManager.instance) {
      TestStateManager.instance = new TestStateManager();
    }
    return TestStateManager.instance;
  }

  createTestSession(testName: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.testSessions.set(sessionId, {
      name: testName,
      startTime: Date.now(),
      status: 'running',
      metrics: {
        requests: 0,
        successes: 0,
        failures: 0,
        totalTime: 0
      }
    });
    return sessionId;
  }

  getTestSession(sessionId: string): any {
    return this.testSessions.get(sessionId);
  }

  updateTestSession(sessionId: string, updates: any): void {
    const session = this.testSessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  endTestSession(sessionId: string): void {
    const session = this.testSessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      session.duration = session.endTime - session.startTime;
      session.status = 'completed';
    }
  }

  setMockData(key: string, data: any): void {
    this.mockData.set(key, data);
  }

  getMockData(key: string): any {
    return this.mockData.get(key);
  }

  clearAll(): void {
    this.testSessions.clear();
    this.mockData.clear();
  }
}

// 模拟服务类
export class MockWeiboAccountService {
  private accounts = [
    {
      id: 1,
      username: 'test_user_1',
      nickname: '测试用户1',
      cookies: 'test_cookies_1',
      status: 'active',
      usageCount: 0,
      lastUsed: null
    },
    {
      id: 2,
      username: 'test_user_2',
      nickname: '测试用户2',
      cookies: 'test_cookies_2',
      status: 'active',
      usageCount: 0,
      lastUsed: null
    }
  ];

  async getAvailableAccount(accountId?: number): Promise<any> {
    const account = accountId
      ? this.accounts.find(a => a.id === accountId && a.status === 'active')
      : this.accounts.find(a => a.status === 'active');

    if (account) {
      account.usageCount++;
      account.lastUsed = new Date();
    }

    return account || null;
  }

  async markAccountBanned(accountId: number): Promise<void> {
    const account = this.accounts.find(a => a.id === accountId);
    if (account) {
      account.status = 'banned';
    }
  }
}

export class MockBrowserService {
  private contexts = new Map<number, any>();

  async createPage(accountId: number, cookies?: string): Promise<any> {
    const mockPage = {
      goto: jest.fn().mockResolvedValue(true),
      content: jest.fn().mockResolvedValue(this.generateMockHtml()),
      waitForSelector: jest.fn().mockResolvedValue(true),
      close: jest.fn().mockResolvedValue(true)
    };

    this.contexts.set(accountId, { page: mockPage });
    return mockPage;
  }

  async closeContext(accountId: number): Promise<void> {
    this.contexts.delete(accountId);
  }

  private generateMockHtml(): string {
    return `
      <html>
        <head><title>微博搜索结果</title></head>
        <body>
          <div class="card-wrap">
            <div class="content">
              <p class="txt">这是测试微博内容</p>
              <div class="from">
                <a href="/test_user" class="name">测试用户</a>
                <a class="time" title="2024-01-15 10:00">1小时前</a>
              </div>
            </div>
          </div>
          <div class="m-page">
            <a class="next" href="/search?page=2">下一页</a>
          </div>
        </body>
      </html>
    `;
  }
}

export class MockRawDataService {
  private rawData = new Map<string, any>();

  async findBySourceUrl(url: string): Promise<any> {
    return Array.from(this.rawData.values()).find(data => data.sourceUrl === url) || null;
  }

  async create(data: any): Promise<any> {
    const id = `raw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const rawData = { _id: id, ...data, createdAt: new Date() };
    this.rawData.set(id, rawData);
    return rawData;
  }

  async findById(id: string): Promise<any> {
    return this.rawData.get(id) || null;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const data = this.rawData.get(id);
    if (data) {
      data.status = status;
      data.updatedAt = new Date();
    }
  }
}

export class MockRobotsService {
  async isUrlAllowed(url: string): Promise<boolean> {
    // 在测试环境中允许所有URL
    return true;
  }

  async getCrawlDelay(url: string): Promise<number> {
    return 1; // 1秒延迟
  }

  getCacheInfo(): any {
    return {
      size: 0,
      hits: 0,
      misses: 0
    };
  }

  clearCache(): void {
    // Mock实现
  }
}

export class MockRequestMonitorService {
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    currentDelay: 1000
  };

  async waitForNextRequest(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  recordRequest(url: string, success: boolean, duration: number): void {
    this.stats.totalRequests++;
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    // 简单的移动平均计算
    this.stats.averageResponseTime =
      (this.stats.averageResponseTime * 0.9) + (duration * 0.1);
  }

  getCurrentDelay(): number {
    return this.stats.currentDelay;
  }

  getCurrentStats(): any {
    return { ...this.stats };
  }

  getDetailedStats(): any {
    return {
      ...this.stats,
      requestsPerSecond: this.stats.totalRequests / 60,
      successRate: this.stats.totalRequests > 0
        ? (this.stats.successfulRequests / this.stats.totalRequests) * 100
        : 0
    };
  }

  reset(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      currentDelay: 1000
    };
  }
}

// 测试工具函数
export class TestUtils {
  /**
   * 创建测试任务消息
   */
  static createTestSubTaskMessage(overrides: Partial<SubTaskMessage> = {}): SubTaskMessage {
    return {
      taskId: TEST_CONFIG.mockData.testTaskId,
      keyword: TEST_CONFIG.mockData.testKeywords[0],
      start: TEST_CONFIG.mockData.timeRange.start,
      end: TEST_CONFIG.mockData.timeRange.end,
      isInitialCrawl: true,
      enableAccountRotation: true,
      ...overrides
    };
  }

  /**
   * 创建增强版测试任务消息
   */
  static createEnhancedTestSubTaskMessage(overrides: Partial<EnhancedSubTaskMessage> = {}): EnhancedSubTaskMessage {
    return {
      ...this.createTestSubTaskMessage(),
      searchType: 'default' as any,
      crawlModes: ['search' as any],
      enableDetailCrawl: true,
      enableCreatorCrawl: true,
      enableCommentCrawl: false,
      enableMediaDownload: false,
      maxCommentDepth: 3,
      ...overrides
    };
  }

  /**
   * 创建测试追踪上下文
   */
  static createTestTraceContext(taskId?: number, keyword?: string): TraceContext {
    return {
      traceId: `test_trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId: taskId || TEST_CONFIG.mockData.testTaskId,
      keyword: keyword || TEST_CONFIG.mockData.testKeywords[0],
      startTime: new Date()
    };
  }

  /**
   * 等待指定时间
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成随机字符串
   */
  static randomString(length: number = 8): string {
    return Math.random().toString(36).substr(2, length);
  }

  /**
   * 生成测试微博HTML
   */
  static generateTestWeiboHTML(postCount: number = 10): string {
    let posts = '';
    for (let i = 1; i <= postCount; i++) {
      posts += `
        <div class="card-wrap">
          <div class="content">
            <p class="txt">这是测试微博内容 ${i}</p>
            <div class="from">
              <a href="/test_user_${i}" class="name">测试用户${i}</a>
              <a class="time" title="2024-01-${15 + i} 10:00">${i}小时前</a>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <html>
        <head><title>微博搜索结果</title></head>
        <body>
          ${posts}
          <div class="m-page">
            <a class="next" href="/search?page=2">下一页</a>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * 验证爬取结果
   */
  static validateCrawlResult(result: CrawlResult): boolean {
    return result &&
           typeof result.success === 'boolean' &&
           typeof result.pageCount === 'number' &&
           result.pageCount >= 0;
  }

  /**
   * 验证多模式爬取结果
   */
  static validateMultiModeResult(result: MultiModeCrawlResult): boolean {
    return result &&
           result.crawlMetrics &&
           typeof result.crawlMetrics.totalPages === 'number' &&
           typeof result.crawlMetrics.totalDuration === 'number';
  }

  /**
   * 生成测试报告数据
   */
  static generateTestReport(sessionId: string, testResults: any[]): any {
    const stateManager = TestStateManager.getInstance();
    const session = stateManager.getTestSession(sessionId);

    if (!session) {
      throw new Error(`Test session not found: ${sessionId}`);
    }

    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    const failedTests = testResults.filter(r => r.status === 'failed').length;
    const skippedTests = testResults.filter(r => r.status === 'skipped').length;

    return {
      sessionId,
      testSuite: session.name,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        skipped: skippedTests,
        successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
      },
      duration: session.duration || (Date.now() - session.startTime),
      timestamp: new Date().toISOString(),
      environment: TEST_CONFIG.environment,
      results: testResults,
      metrics: session.metrics
    };
  }
}

// 全局测试设置
beforeAll(async () => {
  // 清理之前的测试状态
  TestStateManager.getInstance().clearAll();

  console.log('🎭 端到端测试环境初始化完成');
});

afterAll(async () => {
  // 清理测试状态
  TestStateManager.getInstance().clearAll();

  console.log('🧹 端到端测试环境清理完成');
});

// 每个测试后的清理
afterEach(async () => {
  // 在每个测试后进行必要的清理
  await TestUtils.sleep(100);
});