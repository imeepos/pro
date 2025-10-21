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
import { WeiboDataCleaner } from '../../../src/data-cleaner/weibo-data-cleaner.service';
import { WeiboContentParser } from '../../../src/data-cleaner/weibo-content-parser.service';
import { CrawlQueueConsumer } from '../../../src/crawl-queue.consumer';
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
 * 多账号并发E2E测试 - 数字时代的协同艺术大师
 *
 * 验证并发爬取的性能和稳定性：
 * 1. 多账号同时执行不同任务 → 2. 负载均衡 → 3. 结果聚合
 *
 * 此测试确保系统能够优雅地处理多账号并发爬取，验证负载均衡机制、
 * 账号切换策略、数据一致性和并发性能表现。
 */

describe('多账号并发E2E测试', () => {
  let crawlerService: WeiboSearchCrawlerService;
  let dataCleaner: WeiboDataCleaner;
  let contentParser: WeiboContentParser;
  let queueConsumer: CrawlQueueConsumer;
  let module: TestingModule;
  let testSessionId: string;

  // 模拟服务实例
  let mockAccountService: MockWeiboAccountService;
  let mockBrowserService: MockBrowserService;
  let mockRawDataService: MockRawDataService;
  let mockRobotsService: MockRobotsService;
  let mockRequestMonitorService: MockRequestMonitorService;

  beforeAll(async () => {
    testSessionId = TestStateManager.getInstance().createTestSession('多账号并发E2E测试');

    // 创建增强的模拟服务（支持多账号）
    mockAccountService = new EnhancedMockWeiboAccountService();
    mockBrowserService = new MockBrowserService();
    mockRawDataService = new MockRawDataService();
    mockRobotsService = new MockRobotsService();
    mockRequestMonitorService = new MockRequestMonitorService();

    // 创建测试模块
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            NODE_ENV: 'test',
            CRAWLER_CONFIG: {
              maxPages: 8,
              requestDelay: { min: 300, max: 1200 },
              pageTimeout: 30000,
              concurrency: {
                maxConcurrentAccounts: 4,
                maxConcurrentTasks: 12,
                loadBalancingStrategy: 'round_robin',
                accountRotationInterval: 300000, // 5分钟轮换
                failureThreshold: 3
              }
            },
            WEIBO_CONFIG: {
              baseUrl: 'https://weibo.com',
              searchUrl: 'https://weibo.com/search',
              multiAccount: {
                enabled: true,
                maxAccountsPerTask: 4,
                retryOnAccountFailure: true,
                healthCheckInterval: 60000
              },
              selectors: {
                feedCard: '.card-wrap',
                timeElement: '.time',
                pagination: {
                  nextButton: '.next',
                  pageInfo: '.m-page',
                  noResult: '.no-result'
                }
              }
            },
            RABBITMQ_CONFIG: {
              url: 'amqp://test:test@localhost:5672',
              queues: {
                crawlQueue: 'test.crawl.queue',
                concurrentQueue: 'test.concurrent.queue',
                detailQueue: 'test.detail.queue',
                loadBalanceQueue: 'test.loadbalance.queue'
              }
            }
          })]
        })
      ],
      providers: [
        Logger,
        WeiboContentParser,
        WeiboDataCleaner,
        {
          provide: WeiboSearchCrawlerService,
          useFactory: () => ({
            crawl: jest.fn().mockImplementation(async (message: SubTaskMessage): Promise<CrawlResult> => {
              // 模拟多账号并发爬取
              const accountManager = mockAccountService as EnhancedMockWeiboAccountService;
              const assignedAccount = await accountManager.assignAccount(message.taskId, message.weiboAccountId);

              if (!assignedAccount) {
                return {
                  success: false,
                  pageCount: 0,
                  error: '无可用的微博账号'
                };
              }

              // 模拟账号特有的爬取延迟
              const accountSpecificDelay = 800 + (assignedAccount.id % 4) * 200 + Math.random() * 800;
              await TestUtils.sleep(accountSpecificDelay);

              // 模拟账号可能失败
              const failureRate = accountManager.getAccountFailureRate(assignedAccount.id);
              const success = Math.random() > failureRate;

              if (success) {
                const pageCount = Math.floor(Math.random() * 6) + 2;
                const posts = generateConcurrentPosts(message.keyword, pageCount * 8, assignedAccount.id);

                const mockHtml = TestUtils.generateTestWeiboHTML(posts.length);
                await mockRawDataService.create({
                  sourceType: 'weibo_concurrent_search',
                  sourceUrl: `https://weibo.com/search?q=${encodeURIComponent(message.keyword)}&account=${assignedAccount.id}`,
                  rawContent: mockHtml,
                  metadata: {
                    keyword: message.keyword,
                    taskId: message.taskId,
                    accountId: assignedAccount.id,
                    accountName: assignedAccount.nickname,
                    concurrentMode: true,
                    crawledAt: new Date(),
                    pageCount,
                    postsFound: posts.length,
                    performanceMetrics: {
                      crawlDuration: accountSpecificDelay,
                      accountLoad: accountManager.getAccountLoad(assignedAccount.id),
                      requestCount: pageCount + 2
                    }
                  }
                });

                // 更新账号使用统计
                accountManager.recordUsage(assignedAccount.id, pageCount, accountSpecificDelay);

                return {
                  success: true,
                  pageCount,
                  accountId: assignedAccount.id,
                  accountName: assignedAccount.nickname,
                  concurrentData: {
                    postsCount: posts.length,
                    accountUsageTime: accountSpecificDelay,
                    accountLoadBefore: accountManager.getAccountLoad(assignedAccount.id) - 1,
                    accountLoadAfter: accountManager.getAccountLoad(assignedAccount.id)
                  }
                };
              } else {
                // 账号失败处理
                accountManager.recordFailure(assignedAccount.id);
                return {
                  success: false,
                  pageCount: 0,
                  error: `账号 ${assignedAccount.nickname} 请求失败`,
                  accountId: assignedAccount.id,
                  accountName: assignedAccount.nickname
                };
              }
            }),

            multiModeCrawl: jest.fn().mockImplementation(async (message: EnhancedSubTaskMessage): Promise<MultiModeCrawlResult> => {
              const accountManager = mockAccountService as EnhancedMockWeiboAccountService;
              const assignedAccounts = await accountManager.assignMultipleAccounts(message.taskId, message.crawlModes?.length || 1);

              if (assignedAccounts.length === 0) {
                throw new Error('无可用的微博账号进行并发爬取');
              }

              const totalStartTime = Date.now();
              const modeResults = [];

              // 并行执行不同模式
              const modePromises = message.crawlModes?.map(async (mode, index) => {
                const account = assignedAccounts[index % assignedAccounts.length];
                const modeDelay = 1200 + (account.id % 3) * 300 + Math.random() * 1000;

                await TestUtils.sleep(modeDelay);

                const modePosts = generateConcurrentPosts(message.keyword, Math.floor(Math.random() * 20) + 5, account.id);

                return {
                  mode,
                  accountId: account.id,
                  accountName: account.nickname,
                  postsCount: modePosts.length,
                  duration: modeDelay,
                  success: Math.random() > 0.1 // 90%成功率
                };
              }) || [];

              const results = await Promise.allSettled(modePromises);

              results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                  modeResults.push(result.value);
                  accountManager.recordUsage(result.value.accountId, 1, result.value.duration);
                }
              });

              const totalDuration = Date.now() - totalStartTime;
              const totalPosts = modeResults.reduce((sum, r) => sum + r.postsCount, 0);

              return {
                searchResult: {
                  success: modeResults.some(r => r.success),
                  pageCount: Math.ceil(totalPosts / 15)
                },
                noteDetails: modeResults.slice(0, 3).flatMap(r =>
                  Array.from({ length: Math.min(r.postsCount, 5) }, (_, i) => ({
                    noteId: `concurrent_note_${r.accountId}_${i}`,
                    content: `并发模式${r.mode}内容 - ${message.keyword}`,
                    accountId: r.accountId,
                    accountName: r.accountName,
                    publishedAt: new Date()
                  }))
                ),
                creatorDetails: extractConcurrentCreators(modeResults),
                comments: [],
                mediaDownloads: [],
                crawlMetrics: {
                  totalPages: Math.ceil(totalPosts / 15),
                  successfulPages: Math.ceil(totalPosts / 15),
                  failedPages: 0,
                  skippedPages: 0,
                  totalRequests: modeResults.length * 3,
                  averagePageLoadTime: totalDuration / modeResults.length,
                  totalDataSize: totalPosts * 2048,
                  notesCrawled: totalPosts,
                  detailsCrawled: Math.min(totalPosts, 10),
                  creatorsCrawled: extractConcurrentCreators(modeResults).length,
                  commentsCrawled: 0,
                  mediaFilesDownloaded: 0,
                  commentDepthReached: 0,
                  totalDuration,
                  throughputMBps: (totalPosts * 2048) / (1024 * 1024) / (totalDuration / 1000),
                  requestsPerSecond: (modeResults.length * 3) / (totalDuration / 1000),
                  errorRate: modeResults.filter(r => !r.success).length / modeResults.length * 100,
                  memoryUsage: 128 + modeResults.length * 16,
                  cpuUsage: 50 + modeResults.length * 5,
                  diskUsage: totalPosts,
                  concurrentAccounts: assignedAccounts.length,
                  loadBalanceScore: calculateLoadBalanceScore(accountManager)
                }
              };
            })
          })
        },
        {
          provide: CrawlQueueConsumer,
          useFactory: () => ({
            getActiveTasksStats: jest.fn().mockReturnValue({
              activeCount: 0,
              tasks: []
            })
          })
        }
      ]
    }).compile();

    crawlerService = module.get(WeiboSearchCrawlerService);
    dataCleaner = module.get(WeiboDataCleaner);
    contentParser = module.get(WeiboContentParser);
    queueConsumer = module.get(CrawlQueueConsumer);

    // 设置测试数据
    TestStateManager.getInstance().setMockData('mockAccountService', mockAccountService);
    TestStateManager.getInstance().setMockData('mockBrowserService', mockBrowserService);
    TestStateManager.getInstance().setMockData('mockRawDataService', mockRawDataService);
  });

  afterAll(async () => {
    TestStateManager.getInstance().endTestSession(testSessionId);
    await module.close();
  });

  describe('多账号负载均衡', () => {
    it('应该合理分配任务到多个账号', async () => {
      const concurrentTasks = 8;
      const keywords = ['AI技术', '区块链', '元宇宙', '新能源', '生物科技', '量子计算', '5G通信', '自动驾驶'];
      const accountManager = mockAccountService as EnhancedMockWeiboAccountService;

      console.log(`⚖️ 多账号负载均衡测试`);
      console.log(`   📊 并发任务数: ${concurrentTasks}`);
      console.log(`   👥 可用账号数: ${accountManager.getAvailableAccounts().length}`);
      console.log(`   🎯 负载均衡策略: round_robin`);

      const concurrentTaskMessages = keywords.map((keyword, index) =>
        TestUtils.createTestSubTaskMessage({
          keyword,
          taskId: 10000 + index,
          isInitialCrawl: true,
          enableAccountRotation: true
        })
      );

      const overallStartTime = Date.now();

      // 并发执行多个任务
      const concurrentResults = await Promise.allSettled(
        concurrentTaskMessages.map(message => crawlerService.crawl(message))
      );

      const overallDuration = Date.now() - overallStartTime;

      // 分析负载均衡效果
      const loadBalanceAnalysis = analyzeLoadBalance(concurrentResults, accountManager);

      expect(loadBalanceAnalysis.totalTasks).toBe(concurrentTasks);
      expect(loadBalanceAnalysis.successfulTasks).toBeGreaterThan(concurrentTasks * 0.8); // 80%成功率
      expect(loadBalanceAnalysis.accountUtilization.length).toBeGreaterThan(0);
      expect(loadBalanceAnalysis.balanceScore).toBeGreaterThan(70); // 负载均衡评分大于70

      console.log(`✅ 负载均衡测试完成:`);
      console.log(`   📊 总任务数: ${loadBalanceAnalysis.totalTasks}`);
      console.log(`   ✅ 成功任务: ${loadBalanceAnalysis.successfulTasks}`);
      console.log(`   ⏱️ 总耗时: ${overallDuration}ms`);
      console.log(`   ⚖️ 负载均衡评分: ${loadBalanceAnalysis.balanceScore.toFixed(1)}/100`);
      console.log(`   👥 账号利用率:`);

      loadBalanceAnalysis.accountUtilization.forEach(util => {
        console.log(`      👤 ${util.accountName} (ID: ${util.accountId}): ${util.tasksAssigned} 任务, ${util.utilizationRate.toFixed(1)}% 利用率`);
      });

      // 更新测试状态
      const session = TestStateManager.getInstance().getTestSession(testSessionId);
      session.metrics.requests += concurrentTasks;
      session.metrics.successes += loadBalanceAnalysis.successfulTasks;
      session.metrics.totalTime += overallDuration;
    });

    it('应该智能处理账号故障和切换', async () => {
      const faultToleranceTasks = 6;
      const accountManager = mockAccountService as EnhancedMockWeiboAccountService;

      console.log(`🔧 账号故障容错测试`);
      console.log(`   📊 测试任务数: ${faultToleranceTasks}`);
      console.log(`   🎯 故障注入率: 30%`);

      // 模拟部分账号故障
      const accountsToFail = [1, 3]; // 设置账号1和3为故障状态
      accountsToFail.forEach(accountId => {
        accountManager.setAccountFailure(accountId, true);
      });

      console.log(`   ⚠️ 模拟故障账号: ${accountsToFail.join(', ')}`);

      const faultToleranceMessages = Array.from({ length: faultToleranceTasks }, (_, i) =>
        TestUtils.createTestSubTaskMessage({
          keyword: `故障容错测试_${i + 1}`,
          taskId: 10100 + i,
          isInitialCrawl: true,
          enableAccountRotation: true
        })
      );

      const faultToleranceStartTime = Date.now();

      // 执行容错测试
      const faultToleranceResults = await Promise.allSettled(
        faultToleranceMessages.map(message => crawlerService.crawl(message))
      );

      const faultToleranceDuration = Date.now() - faultToleranceStartTime;

      // 分析容错效果
      const faultToleranceAnalysis = analyzeFaultTolerance(faultToleranceResults, accountManager);

      expect(faultToleranceAnalysis.totalTasks).toBe(faultToleranceTasks);
      expect(faultToleranceAnalysis.tasksHandledByBackup).toBeGreaterThan(0); // 有任务被备用账号处理
      expect(faultToleranceAnalysis.overallSuccessRate).toBeGreaterThan(70); // 整体成功率大于70%

      console.log(`✅ 故障容错测试完成:`);
      console.log(`   📊 总任务数: ${faultToleranceAnalysis.totalTasks}`);
      console.log(`   🔄 备用账号处理: ${faultToleranceAnalysis.tasksHandledByBackup} 任务`);
      console.log(`   ✅ 整体成功率: ${faultToleranceAnalysis.overallSuccessRate.toFixed(1)}%`);
      console.log(`   ⏱️ 总耗时: ${faultToleranceDuration}ms`);
      console.log(`   🚨 故障检测时间: ${faultToleranceAnalysis.averageFailureDetectionTime.toFixed(0)}ms`);

      // 恢复故障账号
      accountsToFail.forEach(accountId => {
        accountManager.setAccountFailure(accountId, false);
      });
    });
  });

  describe('并发性能优化', () => {
    it('应该在大量并发请求下保持性能稳定', async () => {
      const highConcurrencyTasks = 12;
      const performanceMonitor = new ConcurrentPerformanceMonitor();

      console.log(`🚀 高并发性能测试`);
      console.log(`   📊 并发任务数: ${highConcurrencyTasks}`);
      console.log(`   🎯 最大并发账号: 4`);
      console.log(`   📈 性能监控: 启动`);

      const highConcurrencyKeywords = Array.from({ length: highConcurrencyTasks }, (_, i) =>
        `高并发测试关键词_${i + 1}`
      );

      const highConcurrencyMessages = highConcurrencyKeywords.map((keyword, index) =>
        TestUtils.createTestSubTaskMessage({
          keyword,
          taskId: 10200 + index,
          isInitialCrawl: true,
          enableAccountRotation: true
        })
      );

      performanceMonitor.startMonitoring();

      const highConcurrencyStartTime = Date.now();

      // 分批执行高并发任务
      const batchSize = 4;
      const batches = [];
      for (let i = 0; i < highConcurrencyMessages.length; i += batchSize) {
        batches.push(highConcurrencyMessages.slice(i, i + batchSize));
      }

      const batchResults = [];
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`   📦 执行批次 ${batchIndex + 1}/${batches.length} (${batch.length} 任务)`);

        const batchStartTime = Date.now();
        const batchResult = await Promise.allSettled(
          batch.map(message => crawlerService.crawl(message))
        );
        const batchDuration = Date.now() - batchStartTime;

        batchResults.push({
          batchIndex: batchIndex + 1,
          duration: batchDuration,
          results: batchResult,
          successCount: batchResult.filter(r => r.status === 'fulfilled' && r.value.success).length
        });

        performanceMonitor.recordBatch(batchIndex + 1, batchDuration, batch.length);

        // 批次间短暂延迟
        if (batchIndex < batches.length - 1) {
          await TestUtils.sleep(200);
        }
      }

      const totalHighConcurrencyDuration = Date.now() - highConcurrencyStartTime;
      performanceMonitor.stopMonitoring();

      // 分析高并发性能
      const performanceAnalysis = analyzeHighConcurrencyPerformance(batchResults, performanceMonitor);

      expect(performanceAnalysis.totalTasks).toBe(highConcurrencyTasks);
      expect(performanceAnalysis.overallThroughput).toBeGreaterThan(0.5); // 总吞吐量大于0.5任务/秒
      expect(performanceAnalysis.averageBatchDuration).toBeLessThan(15000); // 平均批次时长小于15秒
      expect(performanceAnalysis.concurrencyEfficiency).toBeGreaterThan(60); // 并发效率大于60%

      console.log(`✅ 高并发性能测试完成:`);
      console.log(`   📊 总任务数: ${performanceAnalysis.totalTasks}`);
      console.log(`   🚀 总吞吐量: ${performanceAnalysis.overallThroughput.toFixed(2)} 任务/秒`);
      console.log(`   ⏱️ 平均批次耗时: ${performanceAnalysis.averageBatchDuration.toFixed(0)}ms`);
      console.log(`   ⚡ 并发效率: ${performanceAnalysis.concurrencyEfficiency.toFixed(1)}%`);
      console.log(`   📈 峰值并发度: ${performanceAnalysis.peakConcurrency}`);
      console.log(`   🎯 性能稳定性: ${performanceAnalysis.stabilityScore.toFixed(1)}/100`);
    });

    it('应该优化账号使用效率', async () => {
      const efficiencyTestTasks = 10;
      const accountManager = mockAccountService as EnhancedMockWeiboAccountService;
      const efficiencyAnalyzer = new AccountEfficiencyAnalyzer();

      console.log(`📊 账号使用效率优化测试`);
      console.log(`   📊 测试任务数: ${efficiencyTestTasks}`);
      console.log(`   👥 可用账号数: ${accountManager.getAvailableAccounts().length}`);

      // 重置账号统计
      accountManager.resetStatistics();

      const efficiencyMessages = Array.from({ length: efficiencyTestTasks }, (_, i) =>
        TestUtils.createTestSubTaskMessage({
          keyword: `效率测试_${i + 1}`,
          taskId: 10300 + i,
          isInitialCrawl: true,
          enableAccountRotation: true
        })
      );

      const efficiencyStartTime = Date.now();

      // 执行效率测试
      const efficiencyResults = await Promise.allSettled(
        efficiencyMessages.map(message => crawlerService.crawl(message))
      );

      const efficiencyDuration = Date.now() - efficiencyStartTime;

      // 分析账号使用效率
      const efficiencyAnalysis = efficiencyAnalyzer.analyze(
        efficiencyResults,
        accountManager.getAccountStatistics()
      );

      expect(efficiencyAnalysis.totalTasks).toBe(efficiencyTestTasks);
      expect(efficiencyAnalysis.accountUtilizationRate).toBeGreaterThan(60); // 账号利用率大于60%
      expect(efficiencyAnalysis.loadBalanceEfficiency).toBeGreaterThan(70); // 负载均衡效率大于70%
      expect(efficiencyAnalysis.averageResponseTime).toBeLessThan(5000); // 平均响应时间小于5秒

      console.log(`✅ 账号使用效率分析完成:`);
      console.log(`   📊 总任务数: ${efficiencyAnalysis.totalTasks}`);
      console.log(`   👥 账号利用率: ${efficiencyAnalysis.accountUtilizationRate.toFixed(1)}%`);
      console.log(`   ⚖️ 负载均衡效率: ${efficiencyAnalysis.loadBalanceEfficiency.toFixed(1)}%`);
      console.log(`   ⏱️ 平均响应时间: ${efficiencyAnalysis.averageResponseTime.toFixed(0)}ms`);
      console.log(`   📈 任务分布:`);

      efficiencyAnalysis.accountTaskDistribution.forEach(distribution => {
        console.log(`      👤 ${distribution.accountName}: ${distribution.taskCount} 任务 (${distribution.percentage.toFixed(1)}%)`);
      });
    });
  });

  describe('数据一致性验证', () => {
    it('应该保证多账号数据的准确性', async () => {
      const consistencyKeywords = ['数据一致性测试', '多账号验证', '并发准确性'];
      const accountManager = mockAccountService as EnhancedMockWeiboAccountService;
      const consistencyValidator = new MultiAccountDataConsistencyValidator();

      console.log(`🔍 多账号数据一致性验证`);
      console.log(`   📊 测试关键词: ${consistencyKeywords.join(', ')}`);
      console.log(`   👥 并发账号: 最大4个`);

      const consistencyResults = [];

      for (let i = 0; i < consistencyKeywords.length; i++) {
        const keyword = consistencyKeywords[i];
        console.log(`   🔍 验证关键词: ${keyword}`);

        // 创建多个相同关键词的任务，分配给不同账号
        const duplicateTasks = Array.from({ length: 3 }, (_, j) =>
          TestUtils.createTestSubTaskMessage({
            keyword,
            taskId: 10400 + i * 10 + j,
            isInitialCrawl: true,
            enableAccountRotation: true
          })
        );

        const duplicateStartTime = Date.now();

        // 并发执行相同关键词的任务
        const duplicateResults = await Promise.allSettled(
          duplicateTasks.map(message => crawlerService.crawl(message))
        );

        const duplicateDuration = Date.now() - duplicateStartTime;

        // 验证数据一致性
        const consistencyCheck = consistencyValidator.validateConsistency(
          keyword,
          duplicateResults,
          accountManager.getAccountStatistics()
        );

        consistencyResults.push({
          keyword,
          duration: duplicateDuration,
          consistency: consistencyCheck
        });

        console.log(`      ✅ 一致性评分: ${consistencyCheck.consistencyScore}/100`);
        console.log(`      📊 数据差异度: ${consistencyCheck.dataVariance.toFixed(1)}%`);
        console.log(`      🎯 一致性状态: ${consistencyCheck.isConsistent ? '通过' : '需检查'}`);

        await TestUtils.sleep(500);
      }

      // 分析整体一致性
      const overallConsistency = analyzeOverallConsistency(consistencyResults);

      expect(overallConsistency.totalKeywords).toBe(consistencyKeywords.length);
      expect(overallConsistency.averageConsistencyScore).toBeGreaterThan(85); // 平均一致性评分大于85
      expect(overallConsistency.consistencyPassRate).toBeGreaterThan(80); // 一致性通过率大于80%

      console.log(`✅ 多账号数据一致性验证完成:`);
      console.log(`   📊 总关键词数: ${overallConsistency.totalKeywords}`);
      console.log(`   🎯 平均一致性评分: ${overallConsistency.averageConsistencyScore.toFixed(1)}/100`);
      console.log(`   ✅ 一致性通过率: ${overallConsistency.consistencyPassRate.toFixed(1)}%`);
      console.log(`   📈 数据稳定性: ${overallConsistency.dataStability.toFixed(1)}%`);
    });
  });

  describe('账号健康监控', () => {
    it('应该监控和管理账号健康状态', async () => {
      const healthMonitorTasks = 6;
      const accountManager = mockAccountService as EnhancedMockWeiboAccountService;
      const healthMonitor = new AccountHealthMonitor(accountManager);

      console.log(`🏥 账号健康监控测试`);
      console.log(`   📊 监控任务数: ${healthMonitorTasks}`);
      console.log(`   👥 监控账号数: ${accountManager.getAvailableAccounts().length}`);

      healthMonitor.startMonitoring();

      const healthMessages = Array.from({ length: healthMonitorTasks }, (_, i) =>
        TestUtils.createTestSubTaskMessage({
          keyword: `健康监控_${i + 1}`,
          taskId: 10500 + i,
          isInitialCrawl: true,
          enableAccountRotation: true
        })
      );

      // 模拟账号健康状态变化
      const healthSimulation = simulateAccountHealthChanges(accountManager, healthMonitorTasks);

      const healthStartTime = Date.now();

      const healthResults = await Promise.allSettled(
        healthMessages.map(message => crawlerService.crawl(message))
      );

      const healthDuration = Date.now() - healthStartTime;

      // 获取健康监控报告
      const healthReport = healthMonitor.generateReport();

      expect(healthReport.monitoredAccounts).toBeGreaterThan(0);
      expect(healthReport.healthEvents.length).toBeGreaterThan(0);
      expect(healthReport.averageHealthScore).toBeGreaterThan(70); // 平均健康分数大于70

      console.log(`✅ 账号健康监控完成:`);
      console.log(`   👥 监控账号数: ${healthReport.monitoredAccounts}`);
      console.log(`   🏥 平均健康分数: ${healthReport.averageHealthScore.toFixed(1)}/100`);
      console.log(`   📊 健康事件数: ${healthReport.healthEvents.length}`);
      console.log(`   ⚠️ 告警次数: ${healthReport.alertCount}`);
      console.log(`   🔧 自动恢复次数: ${healthReport.autoRecoveryCount}`);

      healthMonitor.stopMonitoring();
    });
  });
});

// 辅助函数和类

/**
 * 增强版微博账号模拟服务
 */
class EnhancedMockWeiboAccountService extends MockWeiboAccountService {
  private accountStats = new Map<number, any>();
  private failureRates = new Map<number, number>();
  private failedAccounts = new Set<number>();

  constructor() {
    super();
    this.initializeAccountStats();
  }

  private initializeAccountStats(): void {
    this.accounts.forEach(account => {
      this.accountStats.set(account.id, {
        usageCount: 0,
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        totalDuration: 0,
        currentLoad: 0,
        lastUsed: null,
        healthScore: 100
      });

      // 设置不同的失败率
      this.failureRates.set(account.id, Math.random() * 0.2); // 0-20%失败率
    });
  }

  async assignAccount(taskId: number, preferredAccountId?: number): Promise<any> {
    const availableAccounts = this.accounts.filter(account =>
      account.status === 'active' && !this.failedAccounts.has(account.id)
    );

    if (availableAccounts.length === 0) {
      return null;
    }

    // 优先使用指定的账号
    if (preferredAccountId) {
      const preferred = availableAccounts.find(a => a.id === preferredAccountId);
      if (preferred && this.getAccountLoad(preferred.id) < 3) {
        this.incrementAccountLoad(preferred.id);
        return preferred;
      }
    }

    // 负载均衡选择账号
    const selectedAccount = this.selectAccountByLoadBalance(availableAccounts);
    this.incrementAccountLoad(selectedAccount.id);

    return selectedAccount;
  }

  async assignMultipleAccounts(taskId: number, count: number): Promise<any[]> {
    const assignedAccounts = [];
    const availableAccounts = this.accounts.filter(account =>
      account.status === 'active' && !this.failedAccounts.has(account.id)
    );

    for (let i = 0; i < Math.min(count, availableAccounts.length); i++) {
      const account = this.selectAccountByLoadBalance(availableAccounts);
      if (account && !assignedAccounts.includes(account)) {
        assignedAccounts.push(account);
        this.incrementAccountLoad(account.id);
      }
    }

    return assignedAccounts;
  }

  private selectAccountByLoadBalance(availableAccounts: any[]): any {
    // 选择当前负载最低的账号
    return availableAccounts.reduce((minAccount, account) => {
      const minLoad = this.getAccountLoad(minAccount.id);
      const currentLoad = this.getAccountLoad(account.id);
      return currentLoad < minLoad ? account : minAccount;
    });
  }

  private incrementAccountLoad(accountId: number): void {
    const stats = this.accountStats.get(accountId);
    if (stats) {
      stats.currentLoad++;
    }
  }

  private decrementAccountLoad(accountId: number): void {
    const stats = this.accountStats.get(accountId);
    if (stats && stats.currentLoad > 0) {
      stats.currentLoad--;
    }
  }

  getAccountLoad(accountId: number): number {
    const stats = this.accountStats.get(accountId);
    return stats ? stats.currentLoad : 0;
  }

  getAccountFailureRate(accountId: number): number {
    return this.failedAccounts.has(accountId) ? 1.0 : (this.failureRates.get(accountId) || 0);
  }

  recordUsage(accountId: number, taskCount: number, duration: number): void {
    const stats = this.accountStats.get(accountId);
    if (stats) {
      stats.usageCount++;
      stats.totalTasks += taskCount;
      stats.successfulTasks += taskCount;
      stats.totalDuration += duration;
      stats.lastUsed = new Date();
      this.decrementAccountLoad(accountId);
    }
  }

  recordFailure(accountId: number): void {
    const stats = this.accountStats.get(accountId);
    if (stats) {
      stats.failedTasks++;
      stats.healthScore = Math.max(0, stats.healthScore - 10);
    }
  }

  setAccountFailure(accountId: number, isFailed: boolean): void {
    if (isFailed) {
      this.failedAccounts.add(accountId);
      const stats = this.accountStats.get(accountId);
      if (stats) {
        stats.healthScore = 0;
      }
    } else {
      this.failedAccounts.delete(accountId);
      const stats = this.accountStats.get(accountId);
      if (stats) {
        stats.healthScore = 50; // 恢复后给予基础健康分数
      }
    }
  }

  getAvailableAccounts(): any[] {
    return this.accounts.filter(account =>
      account.status === 'active' && !this.failedAccounts.has(account.id)
    );
  }

  getAccountStatistics(): any[] {
    return Array.from(this.accountStats.entries()).map(([accountId, stats]) => ({
      accountId,
      ...stats,
      successRate: stats.totalTasks > 0 ? (stats.successfulTasks / stats.totalTasks) * 100 : 0,
      averageTaskDuration: stats.usageCount > 0 ? stats.totalDuration / stats.usageCount : 0
    }));
  }

  resetStatistics(): void {
    this.accountStats.clear();
    this.initializeAccountStats();
  }
}

/**
 * 生成并发爬取的帖子数据
 */
function generateConcurrentPosts(keyword: string, count: number, accountId: number): any[] {
  const posts = [];
  const baseTime = Date.now();

  for (let i = 0; i < count; i++) {
    posts.push({
      id: `concurrent_post_${accountId}_${i}_${Date.now()}`,
      content: `账号${accountId}并发抓取的${keyword}相关内容 ${i + 1}`,
      author: {
        id: `concurrent_author_${accountId}_${i % 5}`,
        name: `并发用户${accountId}-${i % 5}`,
        avatar: `https://example.com/avatar_${accountId}_${i % 5}.jpg`
      },
      createdAt: new Date(baseTime - i * 60000), // 每个帖子间隔1分钟
      metrics: {
        likes: Math.floor(Math.random() * 500),
        comments: Math.floor(Math.random() * 100),
        reposts: Math.floor(Math.random() * 50)
      },
      source: {
        accountId,
        crawlMethod: 'concurrent',
        batchId: Math.floor(i / 10)
      }
    });
  }

  return posts;
}

/**
 * 提取并发创作者信息
 */
function extractConcurrentCreators(modeResults: any[]): any[] {
  const creatorMap = new Map();

  modeResults.forEach(result => {
    if (result.success) {
      const creatorKey = `${result.accountId}_${result.accountName}`;
      if (!creatorMap.has(creatorKey)) {
        creatorMap.set(creatorKey, {
          accountId: result.accountId,
          accountName: result.accountName,
          postsContributed: result.postsCount,
          modes: [result.mode],
          totalDuration: result.duration,
          efficiency: result.postsCount / (result.duration / 1000)
        });
      } else {
        const creator = creatorMap.get(creatorKey);
        creator.postsContributed += result.postsCount;
        creator.modes.push(result.mode);
        creator.totalDuration += result.duration;
        creator.efficiency = creator.postsContributed / (creator.totalDuration / 1000);
      }
    }
  });

  return Array.from(creatorMap.values());
}

/**
 * 计算负载均衡评分
 */
function calculateLoadBalanceScore(accountManager: EnhancedMockWeiboAccountService): number {
  const stats = accountManager.getAccountStatistics();
  if (stats.length === 0) return 0;

  const totalTasks = stats.reduce((sum, stat) => sum + stat.totalTasks, 0);
  const idealTasksPerAccount = totalTasks / stats.length;

  // 计算任务分配的方差，方差越小负载越均衡
  const variance = stats.reduce((sum, stat) => {
    const diff = stat.totalTasks - idealTasksPerAccount;
    return sum + (diff * diff);
  }, 0) / stats.length;

  // 将方差转换为0-100的评分
  const maxVariance = idealTasksPerAccount * idealTasksPerAccount;
  const balanceScore = Math.max(0, 100 - (variance / maxVariance) * 100);

  return Math.round(balanceScore);
}

/**
 * 分析负载均衡效果
 */
function analyzeLoadBalance(results: any[], accountManager: EnhancedMockWeiboAccountService): {
  totalTasks: number;
  successfulTasks: number;
  accountUtilization: any[];
  balanceScore: number;
} {
  const totalTasks = results.length;
  const successfulTasks = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

  // 统计每个账号的利用情况
  const accountUsage = new Map();

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      const accountId = result.value.accountId;
      const accountName = result.value.accountName;

      if (!accountUsage.has(accountId)) {
        accountUsage.set(accountId, {
          accountId,
          accountName,
          tasksAssigned: 0,
          successfulTasks: 0,
          totalPosts: 0,
          totalDuration: 0
        });
      }

      const usage = accountUsage.get(accountId);
      usage.tasksAssigned++;
      usage.successfulTasks++;
      usage.totalPosts += result.value.concurrentData?.postsCount || 0;
      usage.totalDuration += result.value.concurrentData?.accountUsageTime || 0;
    }
  });

  const accountUtilization = Array.from(accountUsage.values()).map(usage => ({
    ...usage,
    utilizationRate: (usage.tasksAssigned / totalTasks) * 100,
    averageTaskDuration: usage.tasksAssigned > 0 ? usage.totalDuration / usage.tasksAssigned : 0
  }));

  const balanceScore = calculateLoadBalanceScore(accountManager);

  return {
    totalTasks,
    successfulTasks,
    accountUtilization,
    balanceScore
  };
}

/**
 * 分析故障容错效果
 */
function analyzeFaultTolerance(results: any[], accountManager: EnhancedMockWeiboAccountService): {
  totalTasks: number;
  successfulTasks: number;
  tasksHandledByBackup: number;
  overallSuccessRate: number;
  averageFailureDetectionTime: number;
} {
  const totalTasks = results.length;
  const successfulTasks = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const tasksHandledByBackup = results.filter(r =>
    r.status === 'fulfilled' && r.value.accountId && r.value.accountId > 2
  ).length; // 假设账号1和2是主要账号，3+是备用账号

  const overallSuccessRate = (successfulTasks / totalTasks) * 100;
  const averageFailureDetectionTime = 1500 + Math.random() * 1000; // 模拟故障检测时间

  return {
    totalTasks,
    successfulTasks,
    tasksHandledByBackup,
    overallSuccessRate,
    averageFailureDetectionTime
  };
}

/**
 * 并发性能监控器
 */
class ConcurrentPerformanceMonitor {
  private startTime: number = 0;
  private endTime: number = 0;
  private batchMetrics: any[] = [];
  private peakConcurrency: number = 0;

  startMonitoring(): void {
    this.startTime = Date.now();
    this.batchMetrics = [];
    this.peakConcurrency = 0;
  }

  stopMonitoring(): void {
    this.endTime = Date.now();
  }

  recordBatch(batchIndex: number, duration: number, taskCount: number): void {
    const concurrency = taskCount;
    this.peakConcurrency = Math.max(this.peakConcurrency, concurrency);

    this.batchMetrics.push({
      batchIndex,
      duration,
      taskCount,
      timestamp: Date.now(),
      throughput: taskCount / (duration / 1000)
    });
  }

  getMetrics(): any {
    const totalDuration = this.endTime - this.startTime;
    const totalTasks = this.batchMetrics.reduce((sum, batch) => sum + batch.taskCount, 0);
    const averageBatchDuration = this.batchMetrics.length > 0
      ? this.batchMetrics.reduce((sum, batch) => sum + batch.duration, 0) / this.batchMetrics.length
      : 0;

    return {
      totalDuration,
      totalTasks,
      batchCount: this.batchMetrics.length,
      peakConcurrency: this.peakConcurrency,
      averageBatchDuration,
      overallThroughput: totalTasks / (totalDuration / 1000),
      stabilityScore: this.calculateStabilityScore()
    };
  }

  private calculateStabilityScore(): number {
    if (this.batchMetrics.length < 2) return 100;

    const throughputs = this.batchMetrics.map(batch => batch.throughput);
    const averageThroughput = throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length;
    const variance = throughputs.reduce((sum, t) => sum + Math.pow(t - averageThroughput, 2), 0) / throughputs.length;
    const standardDeviation = Math.sqrt(variance);

    // 稳定性评分：标准差越小越稳定
    const stabilityScore = Math.max(0, 100 - (standardDeviation / averageThroughput) * 100);
    return Math.round(stabilityScore);
  }
}

/**
 * 分析高并发性能
 */
function analyzeHighConcurrencyPerformance(batchResults: any[], performanceMonitor: ConcurrentPerformanceMonitor): {
  totalTasks: number;
  overallThroughput: number;
  averageBatchDuration: number;
  concurrencyEfficiency: number;
  peakConcurrency: number;
  stabilityScore: number;
} {
  const totalTasks = batchResults.reduce((sum, batch) => sum + batch.results.length, 0);
  const totalDuration = batchResults.reduce((sum, batch) => sum + batch.duration, 0);
  const successfulTasks = batchResults.reduce((sum, batch) => sum + batch.successCount, 0);

  const overallThroughput = totalTasks / (totalDuration / 1000);
  const averageBatchDuration = totalDuration / batchResults.length;
  const concurrencyEfficiency = (successfulTasks / totalTasks) * 100;

  const metrics = performanceMonitor.getMetrics();

  return {
    totalTasks,
    overallThroughput,
    averageBatchDuration,
    concurrencyEfficiency,
    peakConcurrency: metrics.peakConcurrency,
    stabilityScore: metrics.stabilityScore
  };
}

/**
 * 账号效率分析器
 */
class AccountEfficiencyAnalyzer {
  analyze(results: any[], accountStats: any[]): {
    totalTasks: number;
    accountUtilizationRate: number;
    loadBalanceEfficiency: number;
    averageResponseTime: number;
    accountTaskDistribution: any[];
  } {
    const totalTasks = results.length;
    const successfulTasks = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const usedAccounts = accountStats.filter(stat => stat.totalTasks > 0);
    const accountUtilizationRate = (usedAccounts.length / accountStats.length) * 100;

    // 计算负载均衡效率
    const totalAccountTasks = usedAccounts.reduce((sum, stat) => sum + stat.totalTasks, 0);
    const idealTasksPerAccount = totalAccountTasks / usedAccounts.length;
    const loadBalanceVariance = usedAccounts.reduce((sum, stat) => {
      const diff = stat.totalTasks - idealTasksPerAccount;
      return sum + (diff * diff);
    }, 0) / usedAccounts.length;
    const loadBalanceEfficiency = Math.max(0, 100 - (loadBalanceVariance / (idealTasksPerAccount * idealTasksPerAccount)) * 100);

    const averageResponseTime = usedAccounts.reduce((sum, stat) => sum + stat.averageTaskDuration, 0) / usedAccounts.length;

    const accountTaskDistribution = usedAccounts.map(stat => ({
      accountId: stat.accountId,
      accountName: `账号${stat.accountId}`,
      taskCount: stat.totalTasks,
      percentage: (stat.totalTasks / totalTasks) * 100,
      successRate: stat.successRate,
      averageResponseTime: stat.averageTaskDuration
    }));

    return {
      totalTasks,
      accountUtilizationRate,
      loadBalanceEfficiency,
      averageResponseTime,
      accountTaskDistribution
    };
  }
}

/**
 * 多账号数据一致性验证器
 */
class MultiAccountDataConsistencyValidator {
  validateConsistency(keyword: string, results: any[], accountStats: any[]): {
    keyword: string;
    consistencyScore: number;
    dataVariance: number;
    isConsistent: boolean;
    details: any;
  } {
    const successfulResults = results.filter(r => r.status === 'fulfilled' && r.value.success).map(r => r.value);

    if (successfulResults.length < 2) {
      return {
        keyword,
        consistencyScore: 100,
        dataVariance: 0,
        isConsistent: true,
        details: { reason: 'insufficient_data', successfulResults: successfulResults.length }
      };
    }

    // 计算数据一致性指标
    const pageCounts = successfulResults.map(r => r.pageCount);
    const postCounts = successfulResults.map(r => r.concurrentData?.postsCount || 0);
    const responseTimes = successfulResults.map(r => r.concurrentData?.accountUsageTime || 0);

    const pageCountVariance = this.calculateVariance(pageCounts);
    const postCountVariance = this.calculateVariance(postCounts);
    const responseTimeVariance = this.calculateVariance(responseTimes);

    // 计算综合一致性评分
    const consistencyScore = Math.max(0, 100 - (pageCountVariance + postCountVariance + responseTimeVariance) / 3);
    const dataVariance = (pageCountVariance + postCountVariance) / 2;
    const isConsistent = consistencyScore > 80 && dataVariance < 20;

    return {
      keyword,
      consistencyScore: Math.round(consistencyScore),
      dataVariance: Math.round(dataVariance),
      isConsistent,
      details: {
        successfulResults: successfulResults.length,
        pageCountVariance: Math.round(pageCountVariance),
        postCountVariance: Math.round(postCountVariance),
        responseTimeVariance: Math.round(responseTimeVariance),
        accountDistribution: successfulResults.map(r => ({
          accountId: r.accountId,
          accountName: r.accountName,
          pageCount: r.pageCount,
          postsCount: r.concurrentData?.postsCount || 0
        }))
      }
    };
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    // 返回变异系数（标准差/平均值）作为百分比
    return mean > 0 ? (standardDeviation / mean) * 100 : 0;
  }
}

/**
 * 分析整体一致性
 */
function analyzeOverallConsistency(consistencyResults: any[]): {
  totalKeywords: number;
  averageConsistencyScore: number;
  consistencyPassRate: number;
  dataStability: number;
} {
  const totalKeywords = consistencyResults.length;
  const averageConsistencyScore = consistencyResults.reduce((sum, r) => sum + r.consistency.consistencyScore, 0) / totalKeywords;
  const consistencyPassRate = (consistencyResults.filter(r => r.consistency.isConsistent).length / totalKeywords) * 100;
  const dataStability = consistencyResults.reduce((sum, r) => sum + (100 - r.consistency.dataVariance), 0) / totalKeywords;

  return {
    totalKeywords,
    averageConsistencyScore,
    consistencyPassRate,
    dataStability
  };
}

/**
 * 模拟账号健康状态变化
 */
function simulateAccountHealthChanges(accountManager: EnhancedMockWeiboAccountService, taskCount: number): any[] {
  const healthEvents = [];

  for (let i = 0; i < taskCount; i++) {
    // 随机触发健康事件
    if (Math.random() > 0.7) {
      const accountId = (i % 4) + 1;
      const eventType = Math.random() > 0.5 ? 'degradation' : 'recovery';

      healthEvents.push({
        timestamp: Date.now(),
        accountId,
        eventType,
        severity: eventType === 'degradation' ? 'warning' : 'info'
      });
    }
  }

  return healthEvents;
}

/**
 * 账号健康监控器
 */
class AccountHealthMonitor {
  private isMonitoring = false;
  private healthEvents: any[] = [];
  private accountManager: EnhancedMockWeiboAccountService;

  constructor(accountManager: EnhancedMockWeiboAccountService) {
    this.accountManager = accountManager;
  }

  startMonitoring(): void {
    this.isMonitoring = true;
    this.healthEvents = [];
    console.log('   🏥 账号健康监控已启动');
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('   🏥 账号健康监控已停止');
  }

  recordHealthEvent(event: any): void {
    if (this.isMonitoring) {
      this.healthEvents.push({
        ...event,
        timestamp: Date.now()
      });
    }
  }

  generateReport(): any {
    const stats = this.accountManager.getAccountStatistics();
    const monitoredAccounts = stats.length;
    const averageHealthScore = stats.reduce((sum, stat) => sum + (stat.healthScore || 100), 0) / monitoredAccounts;

    const alertEvents = this.healthEvents.filter(event => event.severity === 'warning' || event.severity === 'critical');
    const autoRecoveryEvents = this.healthEvents.filter(event => event.eventType === 'recovery');

    return {
      monitoredAccounts,
      averageHealthScore,
      healthEvents: this.healthEvents,
      alertCount: alertEvents.length,
      autoRecoveryCount: autoRecoveryEvents.length,
      reportTimestamp: new Date()
    };
  }
}
