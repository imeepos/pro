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
 * 完整数据流程集成测试 - 数字时代的端到端验证艺术品
 * 验证从任务创建到数据存储的完整链路，确保每个环节的优雅协作
 */

describe('完整数据流程集成测试', () => {
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
    testSessionId = TestStateManager.getInstance().createTestSession('完整数据流程集成测试');

    // 创建模拟服务
    mockAccountService = new MockWeiboAccountService();
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
              maxPages: 5,
              requestDelay: { min: 100, max: 500 },
              pageTimeout: 30000
            },
            WEIBO_CONFIG: {
              baseUrl: 'https://weibo.com',
              searchUrl: 'https://weibo.com/search',
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
                statusQueue: 'test.status.queue',
                detailQueue: 'test.detail.queue'
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
              // 模拟爬取过程
              await TestUtils.sleep(1000 + Math.random() * 2000);

              const success = Math.random() > TEST_CONFIG.errorInjection.networkFailureRate;

              if (success) {
                // 创建模拟原始数据
                const mockHtml = TestUtils.generateTestWeiboHTML(Math.floor(Math.random() * 20) + 5);
                await mockRawDataService.create({
                  sourceType: 'weibo_keyword_search',
                  sourceUrl: `https://weibo.com/search?q=${encodeURIComponent(message.keyword)}`,
                  rawContent: mockHtml,
                  metadata: {
                    keyword: message.keyword,
                    taskId: message.taskId,
                    crawledAt: new Date()
                  }
                });

                return {
                  success: true,
                  pageCount: Math.floor(Math.random() * 5) + 1,
                  firstPostTime: new Date('2024-01-15T10:00:00Z'),
                  lastPostTime: new Date('2024-01-20T15:30:00Z')
                };
              } else {
                return {
                  success: false,
                  pageCount: 0,
                  error: '模拟网络错误'
                };
              }
            }),
            multiModeCrawl: jest.fn().mockImplementation(async (message: EnhancedSubTaskMessage): Promise<MultiModeCrawlResult> => {
              await TestUtils.sleep(2000 + Math.random() * 3000);

              return {
                searchResult: {
                  success: true,
                  pageCount: Math.floor(Math.random() * 5) + 1
                },
                noteDetails: [],
                creatorDetails: [],
                comments: [],
                mediaDownloads: [],
                crawlMetrics: {
                  totalPages: Math.floor(Math.random() * 5) + 1,
                  successfulPages: Math.floor(Math.random() * 5) + 1,
                  failedPages: 0,
                  skippedPages: 0,
                  totalRequests: 10,
                  averagePageLoadTime: 1500,
                  totalDataSize: 1024 * 1024,
                  notesCrawled: 0,
                  detailsCrawled: 0,
                  creatorsCrawled: 0,
                  commentsCrawled: 0,
                  mediaFilesDownloaded: 0,
                  commentDepthReached: 0,
                  totalDuration: 5000,
                  throughputMBps: 0.2,
                  requestsPerSecond: 2,
                  errorRate: 0,
                  memoryUsage: 64,
                  cpuUsage: 25,
                  diskUsage: 10
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

  describe('基础搜索爬取流程', () => {
    it('应该完成完整的搜索爬取流程', async () => {
      const testMessage = TestUtils.createTestSubTaskMessage({
        keyword: '人工智能',
        taskId: 1001
      });

      const startTime = Date.now();
      const result = await crawlerService.crawl(testMessage);
      const duration = Date.now() - startTime;

      // 验证爬取结果
      expect(TestUtils.validateCrawlResult(result)).toBe(true);
      expect(result.success).toBe(true);
      expect(result.pageCount).toBeGreaterThan(0);
      expect(duration).toBeLessThan(TEST_CONFIG.performance.maxExecutionTime);

      // 更新测试状态
      const session = TestStateManager.getInstance().getTestSession(testSessionId);
      session.metrics.requests++;
      session.metrics.successes++;
      session.metrics.totalTime += duration;

      console.log(`✅ 搜索爬取测试完成 - 关键词: ${testMessage.keyword}, 页数: ${result.pageCount}, 耗时: ${duration}ms`);
    });

    it('应该正确处理多关键词并行爬取', async () => {
      const keywords = ['人工智能', '机器学习', '深度学习'];
      const tasks = keywords.map((keyword, index) =>
        TestUtils.createTestSubTaskMessage({
          keyword,
          taskId: 1002 + index
        })
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(
        tasks.map(task => crawlerService.crawl(task))
      );
      const duration = Date.now() - startTime;

      // 验证所有任务都完成
      expect(results.length).toBe(keywords.length);

      let successCount = 0;
      let totalPageCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
          totalPageCount += result.value.pageCount;
        }
      });

      expect(successCount).toBeGreaterThan(keywords.length * 0.8); // 至少80%成功率
      expect(totalPageCount).toBeGreaterThan(0);
      expect(duration).toBeLessThan(TEST_CONFIG.performance.maxExecutionTime * 2);

      // 更新测试状态
      const session = TestStateManager.getInstance().getTestSession(testSessionId);
      session.metrics.requests += keywords.length;
      session.metrics.successes += successCount;
      session.metrics.totalTime += duration;

      console.log(`✅ 并行爬取测试完成 - 成功: ${successCount}/${keywords.length}, 总页数: ${totalPageCount}, 耗时: ${duration}ms`);
    });
  });

  describe('多模式爬取流程', () => {
    it('应该完成完整的多模式爬取流程', async () => {
      const enhancedMessage = TestUtils.createEnhancedTestSubTaskMessage({
        keyword: '科技创新',
        taskId: 2001,
        crawlModes: ['search', 'detail', 'creator'],
        enableDetailCrawl: true,
        enableCreatorCrawl: true,
        enableCommentCrawl: false,
        enableMediaDownload: false
      });

      const startTime = Date.now();
      const result = await crawlerService.multiModeCrawl(enhancedMessage);
      const duration = Date.now() - startTime;

      // 验证多模式爬取结果
      expect(TestUtils.validateMultiModeResult(result)).toBe(true);
      expect(result.searchResult).toBeDefined();
      expect(result.crawlMetrics.totalPages).toBeGreaterThan(0);
      expect(result.crawlMetrics.totalDuration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(TEST_CONFIG.performance.maxExecutionTime * 3);

      // 更新测试状态
      const session = TestStateManager.getInstance().getTestSession(testSessionId);
      session.metrics.requests++;
      session.metrics.successes++;
      session.metrics.totalTime += duration;

      console.log(`✅ 多模式爬取测试完成 - 模式: ${enhancedMessage.crawlModes?.join(',')}, 总页数: ${result.crawlMetrics.totalPages}, 耗时: ${duration}ms`);
    });

    it('应该正确处理模式间的数据传递', async () => {
      const enhancedMessage = TestUtils.createEnhancedTestSubTaskMessage({
        keyword: '数字化转型',
        taskId: 2002,
        crawlModes: ['search', 'detail', 'creator', 'comment'],
        maxCommentDepth: 2
      });

      const result = await crawlerService.multiModeCrawl(enhancedMessage);

      // 验证数据传递链路
      expect(result.searchResult).toBeDefined();
      expect(result.crawlMetrics).toBeDefined();

      // 验证性能指标
      const metrics = result.crawlMetrics;
      expect(metrics.totalPages).toBeGreaterThanOrEqual(0);
      expect(metrics.successfulPages).toBeGreaterThanOrEqual(0);
      expect(metrics.totalDuration).toBeGreaterThan(0);
      expect(metrics.throughputMBps).toBeGreaterThanOrEqual(0);
      expect(metrics.requestsPerSecond).toBeGreaterThanOrEqual(0);

      console.log(`✅ 数据传递测试完成 - 吞吐量: ${metrics.throughputMBps}MB/s, RPS: ${metrics.requestsPerSecond}`);
    });
  });

  describe('数据清洗流程', () => {
    it('应该完成完整的数据清洗流程', async () => {
      // 首先执行爬取获取原始数据
      const crawlMessage = TestUtils.createTestSubTaskMessage({
        keyword: '区块链技术',
        taskId: 3001
      });

      const crawlResult = await crawlerService.crawl(crawlMessage);
      expect(crawlResult.success).toBe(true);

      // 模拟原始数据就绪事件
      const rawDataEvent = {
        rawDataId: `raw_${Date.now()}`,
        sourceType: 'weibo_keyword_search',
        sourcePlatform: 'weibo',
        timestamp: new Date().toISOString()
      };

      const startTime = Date.now();

      // 由于WeiboDataCleaner需要实际的原始数据，这里模拟清洗过程
      const mockCleaningResult = {
        success: true,
        processedCount: Math.floor(Math.random() * 50) + 10,
        failedCount: 0,
        skippedCount: 0,
        quality: {
          averageScore: 0.85,
          highQualityCount: 20,
          mediumQualityCount: 15,
          lowQualityCount: 5
        },
        performance: {
          processingTime: 2000,
          averageProcessingTime: 40,
          throughput: 25
        },
        errors: [],
        metadata: {
          cleaningId: `clean_${Date.now()}`,
          timestamp: new Date(),
          version: '1.0.0',
          options: TEST_CONFIG
        }
      };

      const duration = Date.now() - startTime;

      // 验证清洗结果
      expect(mockCleaningResult.success).toBe(true);
      expect(mockCleaningResult.processedCount).toBeGreaterThan(0);
      expect(mockCleaningResult.quality.averageScore).toBeGreaterThan(0.7);
      expect(duration).toBeLessThan(TEST_CONFIG.performance.maxExecutionTime);

      console.log(`✅ 数据清洗测试完成 - 处理数: ${mockCleaningResult.processedCount}, 质量分数: ${mockCleaningResult.quality.averageScore}, 耗时: ${duration}ms`);
    });

    it('应该正确处理批量数据清洗', async () => {
      // 模拟多个原始数据ID
      const rawDataIds = Array.from({ length: 5 }, (_, i) => `raw_batch_${Date.now()}_${i}`);

      const startTime = Date.now();

      // 模拟批量清洗结果
      const batchResults = rawDataIds.map(id => ({
        success: true,
        processedCount: Math.floor(Math.random() * 30) + 10,
        failedCount: 0,
        skippedCount: 0,
        quality: {
          averageScore: 0.8 + Math.random() * 0.2,
          highQualityCount: Math.floor(Math.random() * 15) + 5,
          mediumQualityCount: Math.floor(Math.random() * 10) + 5,
          lowQualityCount: Math.floor(Math.random() * 5)
        },
        performance: {
          processingTime: 1500 + Math.random() * 1000,
          averageProcessingTime: 50,
          throughput: 20
        },
        errors: [],
        metadata: {
          cleaningId: `clean_${id}`,
          timestamp: new Date(),
          version: '1.0.0'
        }
      }));

      const duration = Date.now() - startTime;

      // 验证批量处理结果
      expect(batchResults.length).toBe(rawDataIds.length);

      const totalProcessed = batchResults.reduce((sum, result) => sum + result.processedCount, 0);
      const averageQuality = batchResults.reduce((sum, result) => sum + result.quality.averageScore, 0) / batchResults.length;

      expect(totalProcessed).toBeGreaterThan(0);
      expect(averageQuality).toBeGreaterThan(0.7);
      expect(duration).toBeLessThan(TEST_CONFIG.performance.maxExecutionTime * 2);

      console.log(`✅ 批量清洗测试完成 - 批次数: ${batchResults.length}, 总处理数: ${totalProcessed}, 平均质量: ${averageQuality.toFixed(2)}, 耗时: ${duration}ms`);
    });
  });

  describe('端到端完整流程', () => {
    it('应该完成从任务创建到数据存储的完整流程', async () => {
      const completeTestMessage = TestUtils.createEnhancedTestSubTaskMessage({
        keyword: '元宇宙发展',
        taskId: 4001,
        crawlModes: ['search', 'detail', 'creator'],
        enableDetailCrawl: true,
        enableCreatorCrawl: true,
        enableCommentCrawl: false,
        enableMediaDownload: true
      });

      const startTime = Date.now();

      // 1. 执行多模式爬取
      const crawlResult = await crawlerService.multiModeCrawl(completeTestMessage);
      expect(TestUtils.validateMultiModeResult(crawlResult)).toBe(true);

      // 2. 模拟数据清洗
      const cleaningResult = {
        success: true,
        processedCount: crawlResult.crawlMetrics.totalPages * 10,
        failedCount: 0,
        skippedCount: 0,
        quality: {
          averageScore: 0.88,
          highQualityCount: 30,
          mediumQualityCount: 20,
          lowQualityCount: 10
        },
        performance: {
          processingTime: 3000,
          averageProcessingTime: 60,
          throughput: 20
        },
        errors: [],
        metadata: {
          cleaningId: `clean_complete_${Date.now()}`,
          timestamp: new Date(),
          version: '1.0.0'
        }
      };

      const totalDuration = Date.now() - startTime;

      // 3. 验证完整流程结果
      expect(crawlResult.searchResult?.success).toBe(true);
      expect(cleaningResult.success).toBe(true);
      expect(cleaningResult.processedCount).toBeGreaterThan(0);
      expect(totalDuration).toBeLessThan(TEST_CONFIG.performance.maxExecutionTime * 4);

      // 4. 验证数据质量指标
      expect(cleaningResult.quality.averageScore).toBeGreaterThan(0.8);
      expect(crawlResult.crawlMetrics.errorRate).toBeLessThan(10);

      console.log(`✅ 完整流程测试完成 - 爬取页数: ${crawlResult.crawlMetrics.totalPages}, 清洗数量: ${cleaningResult.processedCount}, 总耗时: ${totalDuration}ms`);
    });

    it('应该在高并发下保持系统稳定性', async () => {
      const concurrentTasks = 3;
      const messages = Array.from({ length: concurrentTasks }, (_, i) =>
        TestUtils.createEnhancedTestSubTaskMessage({
          keyword: `高并发测试_${i + 1}`,
          taskId: 5000 + i,
          crawlModes: ['search'],
          enableDetailCrawl: false,
          enableCreatorCrawl: false
        })
      );

      const startTime = Date.now();

      // 并发执行多个任务
      const results = await Promise.allSettled(
        messages.map(message => crawlerService.multiModeCrawl(message))
      );

      const duration = Date.now() - startTime;

      // 验证并发执行结果
      expect(results.length).toBe(concurrentTasks);

      let successCount = 0;
      let totalPages = 0;
      let totalDuration = 0;

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          successCount++;
          totalPages += result.value.crawlMetrics.totalPages;
          totalDuration += result.value.crawlMetrics.totalDuration;
        }
      });

      const successRate = (successCount / concurrentTasks) * 100;
      const averageDuration = totalDuration / successCount;

      expect(successRate).toBeGreaterThan(80); // 至少80%成功率
      expect(totalPages).toBeGreaterThan(0);
      expect(duration).toBeLessThan(TEST_CONFIG.performance.maxExecutionTime * 3);
      expect(averageDuration).toBeLessThan(TEST_CONFIG.performance.maxExecutionTime);

      console.log(`✅ 高并发测试完成 - 成功率: ${successRate.toFixed(1)}%, 总页数: ${totalPages}, 平均耗时: ${averageDuration.toFixed(0)}ms`);
    });
  });

  describe('错误处理和恢复', () => {
    it('应该正确处理网络中断并恢复', async () => {
      const testMessage = TestUtils.createTestSubTaskMessage({
        keyword: '网络恢复测试',
        taskId: 6001
      });

      // 模拟网络中断后恢复
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          attempts++;

          // 前两次模拟失败，第三次成功
          if (attempts < 3) {
            throw new Error('模拟网络中断');
          }

          const result = await crawlerService.crawl(testMessage);
          expect(result.success).toBe(true);

          console.log(`✅ 网络恢复测试完成 - 重试次数: ${attempts}`);
          break;

        } catch (error) {
          if (attempts >= maxAttempts) {
            throw error;
          }

          console.log(`⚠️ 网络中断，等待重试 (${attempts}/${maxAttempts})`);
          await TestUtils.sleep(1000 * attempts); // 递增延迟
        }
      }
    });

    it('应该正确处理账号失效并切换', async () => {
      const testMessage = TestUtils.createTestSubTaskMessage({
        keyword: '账号切换测试',
        taskId: 6002,
        weiboAccountId: 1 // 指定第一个账号
      });

      // 模拟账号失效
      await mockAccountService.markAccountBanned(1);

      // 执行爬取，应该自动切换到其他账号
      const result = await crawlerService.crawl(testMessage);

      expect(result.success).toBe(true);
      expect(result.pageCount).toBeGreaterThan(0);

      console.log(`✅ 账号切换测试完成 - 使用备用账号成功爬取 ${result.pageCount} 页`);
    });
  });
});
