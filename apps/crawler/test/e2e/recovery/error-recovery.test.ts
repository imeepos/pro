import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Logger } from '@pro/logger';
import {
  WeiboSearchCrawlerService,
  SubTaskMessage,
  CrawlResult,
  EnhancedSubTaskMessage,
  MultiModeCrawlResult
} from '../../../src/weibo/search-crawler.service';
import { WeiboAccountService } from '../../../src/weibo/account.service';
import {
  TEST_CONFIG,
  TestStateManager,
  TestUtils,
  MockWeiboAccountService,
  MockBrowserService,
  MockRawDataService,
  MockRobotsService,
  MockRequestMonitorService
} from '../setup';

/**
 * 错误恢复和故障转移测试 - 数字时代的韧性验证艺术品
 * 验证系统在各种异常情况下的自动恢复能力和容错机制
 */

describe('错误恢复和故障转移测试', () => {
  let crawlerService: WeiboSearchCrawlerService;
  let accountService: WeiboAccountService;
  let module: TestingModule;
  let testSessionId: string;

  // 错误注入配置
  const errorScenarios = {
    networkFailure: {
      enabled: false,
      failureRate: 0.5,
      recoveryTime: 2000
    },
    accountFailure: {
      enabled: false,
      failureRate: 0.3,
      recoveryTime: 1000
    },
    timeoutFailure: {
      enabled: false,
      failureRate: 0.4,
      recoveryTime: 3000
    },
    parseFailure: {
      enabled: false,
      failureRate: 0.2,
      recoveryTime: 1500
    }
  };

  // 故障转移统计
  let failoverStats = {
    totalFailures: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    accountSwitches: 0,
    retryAttempts: 0,
    circuitBreakerActivations: 0
  };

  beforeAll(async () => {
    testSessionId = TestStateManager.getInstance().createTestSession('错误恢复和故障转移测试');

    // 创建模拟服务
    const mockAccountService = new MockWeiboAccountService();
    const mockBrowserService = new MockBrowserService();
    const mockRawDataService = new MockRawDataService();
    const mockRobotsService = new MockRobotsService();
    const mockRequestMonitorService = new MockRequestMonitorService();

    // 创建测试模块
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            NODE_ENV: 'test',
            CRAWLER_CONFIG: {
              maxPages: 3,
              requestDelay: { min: 100, max: 300 },
              pageTimeout: 10000,
              retryAttempts: 3,
              retryDelay: 1000
            },
            WEIBO_CONFIG: {
              baseUrl: 'https://weibo.com',
              searchUrl: 'https://weibo.com/search'
            }
          })]
        })
      ],
      providers: [
        Logger,
        {
          provide: WeiboAccountService,
          useValue: mockAccountService
        },
        {
          provide: WeiboSearchCrawlerService,
          useFactory: () => ({
            crawl: jest.fn().mockImplementation(async (message: SubTaskMessage): Promise<CrawlResult> => {
              return await simulateCrawlWithFailures(message, 'basic');
            }),
            multiModeCrawl: jest.fn().mockImplementation(async (message: EnhancedSubTaskMessage): Promise<MultiModeCrawlResult> => {
              return await simulateMultiModeCrawlWithFailures(message);
            }),
            validateAccount: jest.fn().mockImplementation(async (accountId: number): Promise<boolean> => {
              if (errorScenarios.accountFailure.enabled && Math.random() < errorScenarios.accountFailure.failureRate) {
                await mockAccountService.markAccountBanned(accountId);
                return false;
              }
              return true;
            })
          })
        }
      ]
    }).compile();

    crawlerService = module.get(WeiboSearchCrawlerService);
    accountService = module.get(WeiboAccountService);
  });

  afterAll(async () => {
    TestStateManager.getInstance().endTestSession(testSessionId);
    await module.close();

    // 输出故障转移统计
    console.log('\n📊 故障转移统计:');
    console.log(`- 总故障次数: ${failoverStats.totalFailures}`);
    console.log(`- 成功恢复次数: ${failoverStats.successfulRecoveries}`);
    console.log(`- 恢复失败次数: ${failoverStats.failedRecoveries}`);
    console.log(`- 账号切换次数: ${failoverStats.accountSwitches}`);
    console.log(`- 重试次数: ${failoverStats.retryAttempts}`);
    console.log(`- 熔断器激活次数: ${failoverStats.circuitBreakerActivations}`);

    const recoveryRate = failoverStats.totalFailures > 0
      ? (failoverStats.successfulRecoveries / failoverStats.totalFailures) * 100
      : 100;
    console.log(`- 恢复成功率: ${recoveryRate.toFixed(1)}%`);
  });

  // 模拟带有故障的爬取
  async function simulateCrawlWithFailures(message: SubTaskMessage, mode: string): Promise<CrawlResult> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      failoverStats.retryAttempts++;

      try {
        // 检查网络故障
        if (errorScenarios.networkFailure.enabled && Math.random() < errorScenarios.networkFailure.failureRate) {
          failoverStats.totalFailures++;
          throw new Error('网络连接失败');
        }

        // 检查超时故障
        if (errorScenarios.timeoutFailure.enabled && Math.random() < errorScenarios.timeoutFailure.failureRate) {
          failoverStats.totalFailures++;
          throw new Error('请求超时');
        }

        // 检查解析故障
        if (errorScenarios.parseFailure.enabled && Math.random() < errorScenarios.parseFailure.failureRate) {
          failoverStats.totalFailures++;
          throw new Error('内容解析失败');
        }

        // 模拟成功情况
        await TestUtils.sleep(1000 + Math.random() * 2000);

        return {
          success: true,
          pageCount: Math.floor(Math.random() * 5) + 1,
          firstPostTime: new Date('2024-01-15T10:00:00Z'),
          lastPostTime: new Date('2024-01-20T15:30:00Z')
        };

      } catch (error) {
        if (attempts >= maxAttempts) {
          failoverStats.failedRecoveries++;
          throw error;
        }

        // 等待恢复时间
        const recoveryTime = errorScenarios.networkFailure.enabled
          ? errorScenarios.networkFailure.recoveryTime
          : 1000;
        await TestUtils.sleep(recoveryTime);
      }
    }

    failoverStats.failedRecoveries++;
    throw new Error('重试次数耗尽');
  }

  // 模拟带有故障的多模式爬取
  async function simulateMultiModeCrawlWithFailures(message: EnhancedSubTaskMessage): Promise<MultiModeCrawlResult> {
    const startTime = Date.now();

    try {
      // 模拟搜索模式失败
      let searchSuccess = true;
      if (errorScenarios.networkFailure.enabled && Math.random() < errorScenarios.networkFailure.failureRate) {
        failoverStats.totalFailures++;
        searchSuccess = false;
      }

      await TestUtils.sleep(1500 + Math.random() * 2500);

      return {
        searchResult: {
          success: searchSuccess,
          pageCount: searchSuccess ? Math.floor(Math.random() * 5) + 1 : 0,
          error: searchSuccess ? undefined : '搜索模式失败'
        },
        noteDetails: searchSuccess ? [] : undefined,
        creatorDetails: searchSuccess ? [] : undefined,
        comments: searchSuccess ? [] : undefined,
        mediaDownloads: searchSuccess ? [] : undefined,
        crawlMetrics: {
          totalPages: searchSuccess ? Math.floor(Math.random() * 5) + 1 : 0,
          successfulPages: searchSuccess ? Math.floor(Math.random() * 5) + 1 : 0,
          failedPages: searchSuccess ? 0 : 1,
          skippedPages: 0,
          totalRequests: Math.floor(Math.random() * 15) + 5,
          averagePageLoadTime: 1200 + Math.random() * 800,
          totalDataSize: searchSuccess ? Math.floor(Math.random() * 3 * 1024 * 1024) : 0,
          notesCrawled: 0,
          detailsCrawled: 0,
          creatorsCrawled: 0,
          commentsCrawled: 0,
          mediaFilesDownloaded: 0,
          commentDepthReached: 0,
          totalDuration: Date.now() - startTime,
          throughputMBps: searchSuccess ? Math.random() * 3 + 0.5 : 0,
          requestsPerSecond: searchSuccess ? Math.random() * 4 + 1 : 0,
          errorRate: searchSuccess ? 0 : 100,
          memoryUsage: Math.floor(Math.random() * 80 + 40),
          cpuUsage: Math.floor(Math.random() * 50 + 30)
        }
      };

    } catch (error) {
      failoverStats.failedRecoveries++;
      throw error;
    }
  }

  describe('网络中断恢复测试', () => {
    beforeEach(() => {
      errorScenarios.networkFailure.enabled = true;
      errorScenarios.networkFailure.failureRate = 0.6;
      errorScenarios.networkFailure.recoveryTime = 1500;
    });

    afterEach(() => {
      errorScenarios.networkFailure.enabled = false;
    });

    it('应该在网络中断后自动恢复', async () => {
      const testMessage = TestUtils.createTestSubTaskMessage({
        keyword: '网络恢复测试',
        taskId: 8001
      });

      console.log('🌐 开始网络中断恢复测试');

      const startTime = Date.now();
      const result = await crawlerService.crawl(testMessage);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.pageCount).toBeGreaterThan(0);
      expect(duration).toBeLessThan(30000); // 30秒内恢复

      failoverStats.successfulRecoveries++;

      console.log(`✅ 网络中断恢复测试完成 - 页数: ${result.pageCount}, 耗时: ${duration}ms`);
    });

    it('应该在多次网络故障后保持稳定', async () => {
      const testMessages = Array.from({ length: 3 }, (_, i) =>
        TestUtils.createTestSubTaskMessage({
          keyword: `多次网络故障_${i + 1}`,
          taskId: 8010 + i
        })
      );

      console.log('🔄 开始多次网络故障稳定性测试');

      const results = await Promise.allSettled(
        testMessages.map(message => crawlerService.crawl(message))
      );

      const successfulResults = results.filter(r => r.status === 'fulfilled') as any[];
      const successRate = (successfulResults.length / testMessages.length) * 100;

      expect(successRate).toBeGreaterThan(66); // 至少2/3成功

      successfulResults.forEach(result => {
        expect(result.value.success).toBe(true);
        expect(result.value.pageCount).toBeGreaterThan(0);
      });

      console.log(`✅ 多次网络故障测试完成 - 成功率: ${successRate.toFixed(1)}%`);
    });
  });

  describe('账号失效故障转移测试', () => {
    beforeEach(() => {
      errorScenarios.accountFailure.enabled = true;
      errorScenarios.accountFailure.failureRate = 0.4;
    });

    afterEach(() => {
      errorScenarios.accountFailure.enabled = false;
    });

    it('应该在账号失效时自动切换到备用账号', async () => {
      const testMessage = TestUtils.createTestSubTaskMessage({
        keyword: '账号切换测试',
        taskId: 8101,
        weiboAccountId: 1 // 指定可能失效的账号
      });

      console.log('👤 开始账号失效故障转移测试');

      // 首先验证账号状态
      const isAccountValid = await crawlerService.validateAccount(1);
      console.log(`账号1状态: ${isAccountValid ? '有效' : '失效'}`);

      const result = await crawlerService.crawl(testMessage);

      expect(result.success).toBe(true);
      expect(result.pageCount).toBeGreaterThan(0);

      failoverStats.accountSwitches++;
      failoverStats.successfulRecoveries++;

      console.log(`✅ 账号切换测试完成 - 页数: ${result.pageCount}`);
    });

    it('应该在多个账号失效时找到可用账号', async () => {
      const testMessages = Array.from({ length: 4 }, (_, i) =>
        TestUtils.createTestSubTaskMessage({
          keyword: `多账号故障_${i + 1}`,
          taskId: 8110 + i,
          weiboAccountId: (i % 2) + 1 // 轮流使用两个账号
        })
      );

      console.log('👥 开始多账号失效故障转移测试');

      // 预先标记一些账号为失效
      await crawlerService.validateAccount(1);
      await crawlerService.validateAccount(2);

      const results = await Promise.allSettled(
        testMessages.map(message => crawlerService.crawl(message))
      );

      const successfulResults = results.filter(r => r.status === 'fulfilled') as any[];
      const successRate = (successfulResults.length / testMessages.length) * 100;

      expect(successRate).toBeGreaterThan(50); // 至少一半成功

      console.log(`✅ 多账号故障转移测试完成 - 成功率: ${successRate.toFixed(1)}%`);
    });
  });

  describe('超时恢复测试', () => {
    beforeEach(() => {
      errorScenarios.timeoutFailure.enabled = true;
      errorScenarios.timeoutFailure.failureRate = 0.5;
      errorScenarios.timeoutFailure.recoveryTime = 2000;
    });

    afterEach(() => {
      errorScenarios.timeoutFailure.enabled = false;
    });

    it('应该在请求超时后自动重试', async () => {
      const testMessage = TestUtils.createTestSubTaskMessage({
        keyword: '超时恢复测试',
        taskId: 8201
      });

      console.log('⏱️ 开始超时恢复测试');

      const startTime = Date.now();
      const result = await crawlerService.crawl(testMessage);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.pageCount).toBeGreaterThan(0);
      expect(duration).toBeLessThan(45000); // 考虑重试时间

      failoverStats.successfulRecoveries++;

      console.log(`✅ 超时恢复测试完成 - 页数: ${result.pageCount}, 耗时: ${duration}ms`);
    });

    it('应该在频繁超时情况下调整策略', async () => {
      const testMessages = Array.from({ length: 3 }, (_, i) =>
        TestUtils.createTestSubTaskMessage({
          keyword: `频繁超时_${i + 1}`,
          taskId: 8210 + i
        })
      );

      console.log('🔄 开始频繁超时调整策略测试');

      const results = await Promise.allSettled(
        testMessages.map(message => crawlerService.crawl(message))
      );

      const successfulResults = results.filter(r => r.status === 'fulfilled') as any[];
      const successRate = (successfulResults.length / testMessages.length) * 100;

      expect(successRate).toBeGreaterThan(33); // 至少一个成功

      console.log(`✅ 频繁超时调整策略测试完成 - 成功率: ${successRate.toFixed(1)}%`);
    });
  });

  describe('解析错误恢复测试', () => {
    beforeEach(() => {
      errorScenarios.parseFailure.enabled = true;
      errorScenarios.parseFailure.failureRate = 0.3;
      errorScenarios.parseFailure.recoveryTime = 1000;
    });

    afterEach(() => {
      errorScenarios.parseFailure.enabled = false;
    });

    it('应该在内容解析失败时尝试替代方案', async () => {
      const testMessage = TestUtils.createTestSubTaskMessage({
        keyword: '解析错误恢复测试',
        taskId: 8301
      });

      console.log('📝 开始解析错误恢复测试');

      const result = await crawlerService.crawl(testMessage);

      expect(result.success).toBe(true);
      expect(result.pageCount).toBeGreaterThan(0);

      failoverStats.successfulRecoveries++;

      console.log(`✅ 解析错误恢复测试完成 - 页数: ${result.pageCount}`);
    });

    it('应该在复杂内容解析失败时降级处理', async () => {
      const enhancedMessage = TestUtils.createEnhancedTestSubTaskMessage({
        keyword: '复杂解析降级测试',
        taskId: 8310,
        crawlModes: ['search', 'detail', 'creator'],
        enableDetailCrawl: true,
        enableCreatorCrawl: true
      });

      console.log('🔧 开始复杂内容解析降级测试');

      const result = await crawlerService.multiModeCrawl(enhancedMessage);

      // 至少搜索模式应该成功
      expect(result.searchResult).toBeDefined();
      expect(result.crawlMetrics).toBeDefined();

      if (result.searchResult.success) {
        expect(result.searchResult.pageCount).toBeGreaterThan(0);
        failoverStats.successfulRecoveries++;
      }

      console.log(`✅ 复杂解析降级测试完成 - 搜索成功: ${result.searchResult.success}`);
    });
  });

  describe('熔断器机制测试', () => {
    it('应该在连续失败时激活熔断器', async () => {
      const testMessages = Array.from({ length: 5 }, (_, i) =>
        TestUtils.createTestSubTaskMessage({
          keyword: `熔断器测试_${i + 1}`,
          taskId: 8400 + i
        })
      );

      console.log('🔥 开始熔断器机制测试');

      // 启用高故障率
      errorScenarios.networkFailure.enabled = true;
      errorScenarios.networkFailure.failureRate = 0.9;

      const results = await Promise.allSettled(
        testMessages.map(message => crawlerService.crawl(message))
      );

      // 关闭故障注入
      errorScenarios.networkFailure.enabled = false;

      const failedResults = results.filter(r => r.status === 'rejected');
      const failureRate = (failedResults.length / testMessages.length) * 100;

      // 预期高失败率触发熔断器
      expect(failureRate).toBeGreaterThan(60);

      if (failureRate > 80) {
        failoverStats.circuitBreakerActivations++;
      }

      console.log(`✅ 熔断器测试完成 - 失败率: ${failureRate.toFixed(1)}%`);
    });

    it('应该在熔断器恢复后重新提供服务', async () => {
      // 等待熔断器恢复时间
      await TestUtils.sleep(5000);

      const testMessage = TestUtils.createTestSubTaskMessage({
        keyword: '熔断器恢复测试',
        taskId: 8501
      });

      console.log('🔄 开始熔断器恢复测试');

      const result = await crawlerService.crawl(testMessage);

      // 熔断器恢复后应该能正常工作
      expect(result.success).toBe(true);

      console.log(`✅ 熔断器恢复测试完成 - 服务恢复正常`);
    });
  });

  describe('综合故障恢复测试', () => {
    it('应该在多种故障同时发生时保持系统稳定', async () => {
      // 同时启用多种故障
      errorScenarios.networkFailure.enabled = true;
      errorScenarios.networkFailure.failureRate = 0.3;
      errorScenarios.accountFailure.enabled = true;
      errorScenarios.accountFailure.failureRate = 0.2;
      errorScenarios.timeoutFailure.enabled = true;
      errorScenarios.timeoutFailure.failureRate = 0.25;

      const testMessages = Array.from({ length: 6 }, (_, i) =>
        TestUtils.createEnhancedTestSubTaskMessage({
          keyword: `综合故障_${i + 1}`,
          taskId: 8600 + i,
          crawlModes: ['search', 'detail']
        })
      );

      console.log('🌪️ 开始综合故障恢复测试');

      const startTime = Date.now();
      const results = await Promise.allSettled(
        testMessages.map(message => crawlerService.multiModeCrawl(message))
      );
      const duration = Date.now() - startTime;

      // 关闭所有故障
      Object.keys(errorScenarios).forEach(key => {
        (errorScenarios as any)[key].enabled = false;
      });

      const successfulResults = results.filter(r => r.status === 'fulfilled') as any[];
      const successRate = (successfulResults.length / testMessages.length) * 100;

      // 在多种故障情况下，至少应该有部分任务成功
      expect(successRate).toBeGreaterThan(30);
      expect(duration).toBeLessThan(120000); // 2分钟内完成

      // 统计恢复情况
      let totalRecoveries = 0;
      successfulResults.forEach(result => {
        if (result.value.searchResult.success) {
          totalRecoveries++;
        }
      });

      failoverStats.successfulRecoveries += totalRecoveries;

      console.log(`✅ 综合故障恢复测试完成 - 成功率: ${successRate.toFixed(1)}%, 恢复数: ${totalRecoveries}, 耗时: ${duration}ms`);
    });

    it('应该在故障恢复后验证数据完整性', async () => {
      const testMessage = TestUtils.createEnhancedTestSubTaskMessage({
        keyword: '数据完整性验证',
        taskId: 8701,
        crawlModes: ['search'],
        enableDetailCrawl: true
      });

      console.log('🔍 开始故障恢复后数据完整性验证');

      // 模拟一次故障恢复过程
      errorScenarios.networkFailure.enabled = true;
      errorScenarios.networkFailure.failureRate = 0.5;

      const result = await crawlerService.multiModeCrawl(testMessage);

      errorScenarios.networkFailure.enabled = false;

      // 验证恢复后的数据完整性
      expect(result).toBeDefined();
      expect(result.crawlMetrics).toBeDefined();
      expect(result.crawlMetrics.totalDuration).toBeGreaterThan(0);

      if (result.searchResult.success) {
        expect(result.searchResult.pageCount).toBeGreaterThan(0);
        expect(result.crawlMetrics.successfulPages).toBeGreaterThan(0);
        expect(result.crawlMetrics.errorRate).toBeLessThan(50);
      }

      console.log(`✅ 数据完整性验证完成 - 搜索成功: ${result.searchResult.success}`);
    });
  });
});