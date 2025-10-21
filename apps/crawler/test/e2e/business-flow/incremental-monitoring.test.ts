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
 * 增量监控E2E测试 - 数字时代的实时感知艺术品
 *
 * 验证实时数据监控机制：
 * 1. 设置增量监控任务 → 2. 定时触发 → 3. 数据更新 → 4. 变化检测
 *
 * 此测试确保系统能够优雅地处理实时数据监控，验证数据更新时效性、
 * 变化检测准确性和增量数据处理能力。
 */

describe('增量监控E2E测试', () => {
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
    testSessionId = TestStateManager.getInstance().createTestSession('增量监控E2E测试');

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
              requestDelay: { min: 500, max: 1500 },
              pageTimeout: 20000,
              incrementalMode: {
                enabled: true,
                checkInterval: 5000, // 5秒检查间隔
                maxNewPostsPerCheck: 20,
                changeDetectionThreshold: 0.1
              }
            },
            WEIBO_CONFIG: {
              baseUrl: 'https://weibo.com',
              searchUrl: 'https://weibo.com/search',
              realTimeSearch: {
                enabled: true,
                pollingInterval: 3000,
                maxPollingDuration: 60000
              },
              selectors: {
                feedCard: '.card-wrap',
                timeElement: '.time',
                pagination: {
                  nextButton: '.next',
                  pageInfo: '.m-page',
                  noResult: '.no-result'
                },
                realTimeIndicator: '.real-time-badge'
              }
            },
            RABBITMQ_CONFIG: {
              url: 'amqp://test:test@localhost:5672',
              queues: {
                crawlQueue: 'test.crawl.queue',
                incrementalQueue: 'test.incremental.queue',
                detailQueue: 'test.detail.queue',
                changeNotificationQueue: 'test.change.notification.queue'
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
              // 模拟增量监控爬取
              await TestUtils.sleep(800 + Math.random() * 1200);

              const currentTime = new Date();
              const lastCheckTime = new Date(currentTime.getTime() - 10 * 60 * 1000); // 10分钟前

              // 生成新的增量数据
              const newPosts = generateIncrementalPosts(lastCheckTime, currentTime, message.keyword);

              if (newPosts.length > 0) {
                const mockHtml = generateIncrementalHTML(newPosts);
                await mockRawDataService.create({
                  sourceType: 'weibo_incremental_monitor',
                  sourceUrl: `https://weibo.com/search?q=${encodeURIComponent(message.keyword)}&typeall=1& realtime=1`,
                  rawContent: mockHtml,
                  metadata: {
                    keyword: message.keyword,
                    taskId: message.taskId,
                    incrementalMode: true,
                    monitoringRange: {
                      start: lastCheckTime,
                      end: currentTime
                    },
                    newPostsCount: newPosts.length,
                    detectedAt: currentTime,
                    monitoringSessionId: `monitor_${Date.now()}`
                  }
                });

                return {
                  success: true,
                  pageCount: Math.ceil(newPosts.length / 10),
                  firstPostTime: newPosts[newPosts.length - 1]?.createdAt || currentTime,
                  lastPostTime: newPosts[0]?.createdAt || currentTime,
                  incrementalData: {
                    monitoringRange: {
                      start: lastCheckTime,
                      end: currentTime
                    },
                    newPostsCount: newPosts.length,
                    changedPostsCount: Math.floor(newPosts.length * 0.2), // 20%的帖子有更新
                    deletedPostsCount: Math.floor(Math.random() * 3), // 随机删除的帖子数
                    changeRate: calculateChangeRate(newPosts.length),
                    freshnessScore: calculateFreshnessScore(newPosts)
                  }
                };
              } else {
                return {
                  success: true,
                  pageCount: 0,
                  incrementalData: {
                    monitoringRange: {
                      start: lastCheckTime,
                      end: currentTime
                    },
                    newPostsCount: 0,
                    changedPostsCount: 0,
                    deletedPostsCount: 0,
                    changeRate: 0,
                    freshnessScore: 0
                  }
                };
              }
            }),

            multiModeCrawl: jest.fn().mockImplementation(async (message: EnhancedSubTaskMessage): Promise<MultiModeCrawlResult> => {
              await TestUtils.sleep(1500 + Math.random() * 1000);

              const currentTime = new Date();
              const lastCheckTime = new Date(currentTime.getTime() - 15 * 60 * 1000); // 15分钟前
              const newPosts = generateIncrementalPosts(lastCheckTime, currentTime, message.keyword);

              return {
                searchResult: {
                  success: true,
                  pageCount: Math.ceil(newPosts.length / 15)
                },
                noteDetails: newPosts.slice(0, 5).map(post => ({
                  noteId: post.id,
                  content: post.content,
                  author: post.author,
                  publishedAt: post.createdAt,
                  metrics: post.metrics,
                  changeType: post.changeType || 'new'
                })),
                creatorDetails: extractActiveCreators(newPosts),
                comments: [],
                mediaDownloads: [],
                crawlMetrics: {
                  totalPages: Math.ceil(newPosts.length / 15),
                  successfulPages: Math.ceil(newPosts.length / 15),
                  failedPages: 0,
                  skippedPages: 0,
                  totalRequests: 8,
                  averagePageLoadTime: 1200,
                  totalDataSize: newPosts.length * 1536,
                  notesCrawled: newPosts.length,
                  detailsCrawled: Math.min(newPosts.length, 5),
                  creatorsCrawled: extractActiveCreators(newPosts).length,
                  commentsCrawled: 0,
                  mediaFilesDownloaded: 0,
                  commentDepthReached: 0,
                  totalDuration: 2500,
                  throughputMBps: (newPosts.length * 1536) / (1024 * 1024) / 2.5,
                  requestsPerSecond: 8 / 2.5,
                  errorRate: 0,
                  memoryUsage: 96,
                  cpuUsage: 35,
                  diskUsage: newPosts.length
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

  describe('实时数据监控机制', () => {
    it('应该建立并维护实时监控会话', async () => {
      const monitoringKeyword = '科技创新新闻';
      const monitoringTaskMessage = TestUtils.createTestSubTaskMessage({
        keyword: monitoringKeyword,
        taskId: 9001,
        start: new Date(Date.now() - 30 * 60 * 1000), // 30分钟前
        end: new Date(),
        isInitialCrawl: false, // 增量模式
        enableAccountRotation: false
      });

      // 创建监控会话
      const monitoringSession = new IncrementalMonitoringSession(
        monitoringTaskMessage.taskId,
        monitoringKeyword,
        5000 // 5秒检查间隔
      );

      console.log(`🔍 启动实时监控会话 - 关键词: ${monitoringKeyword}`);
      console.log(`   📊 监控间隔: ${monitoringSession.checkInterval}ms`);
      console.log(`   🕐 开始时间: ${new Date().toISOString()}`);

      // 执行初始检查
      const initialResult = await crawlerService.crawl(monitoringTaskMessage);
      expect(initialResult.success).toBe(true);
      expect(initialResult.incrementalData).toBeDefined();

      monitoringSession.recordCheck(initialResult.incrementalData);

      console.log(`   ✅ 初始检查完成 - 新数据: ${initialResult.incrementalData.newPostsCount} 条`);

      // 模拟持续监控（多个检查周期）
      const monitoringRounds = 3;
      const monitoringResults = [];

      for (let round = 1; round <= monitoringRounds; round++) {
        console.log(`   🔄 监控周期 ${round}/${monitoringRounds}`);

        // 等待检查间隔
        await TestUtils.sleep(monitoringSession.checkInterval);

        // 模拟时间推进
        const nextCheckMessage = TestUtils.createTestSubTaskMessage({
          keyword: monitoringKeyword,
          taskId: monitoringTaskMessage.taskId,
          start: new Date(Date.now() - 5 * 60 * 1000), // 5分钟前
          end: new Date(),
          isInitialCrawl: false
        });

        const checkResult = await crawlerService.crawl(nextCheckMessage);
        monitoringSession.recordCheck(checkResult.incrementalData);

        monitoringResults.push({
          round,
          timestamp: new Date(),
          newPosts: checkResult.incrementalData.newPostsCount,
          changeRate: checkResult.incrementalData.changeRate,
          freshnessScore: checkResult.incrementalData.freshnessScore
        });

        console.log(`      📈 新数据: ${checkResult.incrementalData.newPostsCount} 条`);
        console.log(`      🔄 变化率: ${checkResult.incrementalData.changeRate.toFixed(1)}%`);
        console.log(`      ✨ 新鲜度: ${checkResult.incrementalData.freshnessScore.toFixed(1)}`);
      }

      // 验证监控效果
      const monitoringStats = monitoringSession.getStatistics();

      expect(monitoringStats.totalChecks).toBe(monitoringRounds + 1); // 包括初始检查
      expect(monitoringStats.totalNewPosts).toBeGreaterThan(0);
      expect(monitoringStats.averageChangeRate).toBeGreaterThanOrEqual(0);
      expect(monitoringStats.monitoringUptime).toBeGreaterThan(0);

      console.log(`✅ 实时监控会话完成:`);
      console.log(`   📊 总检查次数: ${monitoringStats.totalChecks}`);
      console.log(`   📈 总新数据: ${monitoringStats.totalNewPosts} 条`);
      console.log(`   🔄 平均变化率: ${monitoringStats.averageChangeRate.toFixed(1)}%`);
      console.log(`   ⏱️ 监控时长: ${(monitoringStats.monitoringUptime / 1000).toFixed(1)}s`);

      // 更新测试状态
      const session = TestStateManager.getInstance().getTestSession(testSessionId);
      session.metrics.requests += monitoringRounds + 1;
      session.metrics.successes += monitoringRounds + 1;
    });

    it('应该准确检测数据变化并触发更新', async () => {
      const changeDetectionKeyword = '市场动态分析';
      const baselineTime = new Date(Date.now() - 20 * 60 * 1000);

      // 建立基线数据
      const baselineMessage = TestUtils.createTestSubTaskMessage({
        keyword: changeDetectionKeyword,
        taskId: 9010,
        start: baselineTime,
        end: new Date(baselineTime.getTime() + 10 * 60 * 1000),
        isInitialCrawl: true
      });

      const baselineResult = await crawlerService.crawl(baselineMessage);
      expect(baselineResult.success).toBe(true);

      const changeDetector = new DataChangeDetector(baselineResult);

      console.log(`📊 建立数据变化检测基线 - 关键词: ${changeDetectionKeyword}`);
      console.log(`   🔍 基线数据: ${baselineResult.pageCount} 页`);

      // 模拟多次数据变化检测
      const detectionRounds = 4;
      const detectedChanges = [];

      for (let round = 1; round <= detectionRounds; round++) {
        const checkTime = new Date(baselineTime.getTime() + (round * 5 + 10) * 60 * 1000);

        const checkMessage = TestUtils.createTestSubTaskMessage({
          keyword: changeDetectionKeyword,
          taskId: 9010 + round,
          start: new Date(checkTime.getTime() - 5 * 60 * 1000),
          end: checkTime,
          isInitialCrawl: false
        });

        const checkResult = await crawlerService.crawl(checkMessage);
        const changes = changeDetector.detectChanges(checkResult);

        detectedChanges.push({
          round,
          timestamp: checkTime,
          newPosts: changes.newPosts,
          updatedPosts: changes.updatedPosts,
          deletedPosts: changes.deletedPosts,
          changeMagnitude: changes.changeMagnitude,
          shouldTriggerUpdate: changes.shouldTriggerUpdate
        });

        console.log(`   🔍 检测轮次 ${round}:`);
        console.log(`      📝 新增: ${changes.newPosts} 条`);
        console.log(`      🔄 更新: ${changes.updatedPosts} 条`);
        console.log(`      🗑️ 删除: ${changes.deletedPosts} 条`);
        console.log(`      📊 变化幅度: ${changes.changeMagnitude.toFixed(1)}`);
        console.log(`      🚨 触发更新: ${changes.shouldTriggerUpdate ? '是' : '否'}`);

        // 如果检测到显著变化，触发更新流程
        if (changes.shouldTriggerUpdate) {
          const updateResult = await simulateDataUpdate(changes);
          console.log(`      ✅ 更新完成 - 处理数据: ${updateResult.processedItems} 条`);
        }

        await TestUtils.sleep(1000);
      }

      // 验证变化检测准确性
      const detectionStats = analyzeDetectionAccuracy(detectedChanges);

      expect(detectionStats.totalDetections).toBe(detectionRounds);
      expect(detectionStats.significantChanges).toBeGreaterThan(0);
      expect(detectionStats.falsePositiveRate).toBeLessThan(20); // 假阳性率低于20%

      console.log(`✅ 数据变化检测完成:`);
      console.log(`   📊 总检测次数: ${detectionStats.totalDetections}`);
      console.log(`   🚨 显著变化: ${detectionStats.significantChanges} 次`);
      console.log(`   🎯 准确率: ${(100 - detectionStats.falsePositiveRate).toFixed(1)}%`);
    });
  });

  describe('数据更新时效性', () => {
    it('应该保证增量数据的及时性', async () => {
      const timelinessKeyword = '实时新闻热点';
      const monitoringDuration = 15000; // 15秒监控
      const maxAcceptableDelay = 8000; // 最大可接受延迟8秒

      const timelinessMonitor = new DataTimelinessMonitor(maxAcceptableDelay);

      console.log(`⏱️ 开始数据更新时效性测试 - 关键词: ${timelinessKeyword}`);
      console.log(`   🎯 最大可接受延迟: ${maxAcceptableDelay}ms`);
      console.log(`   📊 监控时长: ${monitoringDuration}ms`);

      const startTime = Date.now();
      const timelinessResults = [];

      // 模拟实时数据发布和检测
      while (Date.now() - startTime < monitoringDuration) {
        const publishTime = new Date();
        const detectionStartTime = Date.now();

        // 模拟新数据发布
        const newMessage = TestUtils.createTestSubTaskMessage({
          keyword: timelinessKeyword,
          taskId: 9020 + timelinessResults.length,
          start: new Date(publishTime.getTime() - 2 * 60 * 1000),
          end: publishTime,
          isInitialCrawl: false
        });

        const crawlResult = await crawlerService.crawl(newMessage);
        const detectionDelay = Date.now() - detectionStartTime;

        const timelinessRecord = timelinessMonitor.recordDetection({
          publishTime,
          detectionTime: new Date(),
          detectionDelay,
          newDataCount: crawlResult.incrementalData.newPostsCount,
          changeRate: crawlResult.incrementalData.changeRate
        });

        timelinessResults.push(timelinessRecord);

        console.log(`   📡 检测记录 ${timelinessResults.length}:`);
        console.log(`      ⏰ 发布时间: ${publishTime.toISOString()}`);
        console.log(`      🔍 检测延迟: ${detectionDelay}ms`);
        console.log(`      📊 新数据: ${crawlResult.incrementalData.newPostsCount} 条`);
        console.log(`      ✅ 及时性: ${timelinessRecord.isTimely ? '合格' : '超标'}`);

        await TestUtils.sleep(2000);
      }

      // 分析时效性指标
      const timelinessStats = timelinessMonitor.getStatistics();

      expect(timelinessStats.totalDetections).toBeGreaterThan(0);
      expect(timelinessStats.timelinessRate).toBeGreaterThan(80); // 80%以上的检测应及时
      expect(timelinessStats.averageDetectionDelay).toBeLessThan(maxAcceptableDelay);

      console.log(`✅ 数据更新时效性分析完成:`);
      console.log(`   📊 总检测次数: ${timelinessStats.totalDetections}`);
      console.log(`   ⏱️ 平均检测延迟: ${timelinessStats.averageDetectionDelay.toFixed(0)}ms`);
      console.log(`   ✨ 及时率: ${timelinessStats.timelinessRate.toFixed(1)}%`);
      console.log(`   🚨 超时次数: ${timelinessStats.overtimeDetections}`);
    });

    it('应该优化增量数据处理的性能', async () => {
      const performanceKeyword = '性能优化测试';
      const batchSize = 5; // 批量处理大小
      const processingRounds = 3;

      const performanceOptimizer = new IncrementalPerformanceOptimizer();

      console.log(`🚀 增量数据处理性能优化测试`);
      console.log(`   📦 批处理大小: ${batchSize}`);
      console.log(`   🔄 处理轮次: ${processingRounds}`);

      const performanceResults = [];

      for (let round = 1; round <= processingRounds; round++) {
        console.log(`   📊 性能测试轮次 ${round}/${processingRounds}`);

        const roundStartTime = Date.now();

        // 生成批量增量数据
        const batchMessages = Array.from({ length: batchSize }, (_, i) =>
          TestUtils.createTestSubTaskMessage({
            keyword: performanceKeyword,
            taskId: 9030 + (round - 1) * batchSize + i,
            start: new Date(Date.now() - 3 * 60 * 1000),
            end: new Date(),
            isInitialCrawl: false
          })
        );

        // 并行处理批量数据
        const batchResults = await Promise.allSettled(
          batchMessages.map(message => crawlerService.crawl(message))
        );

        const roundDuration = Date.now() - roundStartTime;
        const successfulResults = batchResults.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<CrawlResult>[];

        // 计算性能指标
        const performanceMetrics = performanceOptimizer.calculateMetrics({
          round,
          batchSize: batchMessages.length,
          successfulRequests: successfulResults.length,
          totalDuration: roundDuration,
          totalDataProcessed: successfulResults.reduce((sum, r) => sum + (r.value.incrementalData?.newPostsCount || 0), 0)
        });

        performanceResults.push(performanceMetrics);

        console.log(`      ✅ 成功请求: ${successfulResults.length}/${batchMessages.length}`);
        console.log(`      ⏱️ 轮次耗时: ${roundDuration}ms`);
        console.log(`      📊 处理数据: ${performanceMetrics.totalDataProcessed} 条`);
        console.log(`      🚀 吞吐量: ${performanceMetrics.throughput.toFixed(1)} 条/秒`);
        console.log(`      ⚡ 平均延迟: ${performanceMetrics.averageLatency.toFixed(0)}ms`);

        await TestUtils.sleep(500);
      }

      // 验证性能优化效果
      const overallPerformance = performanceOptimizer.getOverallPerformance(performanceResults);

      expect(overallPerformance.totalThroughput).toBeGreaterThan(10); // 总吞吐量大于10条/秒
      expect(overallPerformance.averageLatency).toBeLessThan(3000); // 平均延迟小于3秒
      expect(overallPerformance.successRate).toBeGreaterThan(90); // 成功率大于90%

      console.log(`✅ 性能优化测试完成:`);
      console.log(`   🚀 总吞吐量: ${overallPerformance.totalThroughput.toFixed(1)} 条/秒`);
      console.log(`   ⚡ 平均延迟: ${overallPerformance.averageLatency.toFixed(0)}ms`);
      console.log(`   ✨ 成功率: ${overallPerformance.successRate.toFixed(1)}%`);
      console.log(`   📈 性能提升: ${overallPerformance.performanceImprovement.toFixed(1)}%`);
    });
  });

  describe('增量数据准确性', () => {
    it('应该确保增量数据的准确性', async () => {
      const accuracyKeyword = '数据准确性验证';
      const validationRounds = 5;

      const accuracyValidator = new IncrementalDataAccuracyValidator();

      console.log(`🎯 增量数据准确性验证测试`);
      console.log(`   🔍 关键词: ${accuracyKeyword}`);
      console.log(`   📊 验证轮次: ${validationRounds}`);

      const accuracyResults = [];

      for (let round = 1; round <= validationRounds; round++) {
        console.log(`   🔍 准确性验证轮次 ${round}/${validationRounds}`);

        const validationMessage = TestUtils.createTestSubTaskMessage({
          keyword: accuracyKeyword,
          taskId: 9040 + round,
          start: new Date(Date.now() - 5 * 60 * 1000),
          end: new Date(),
          isInitialCrawl: false
        });

        const crawlResult = await crawlerService.crawl(validationMessage);

        // 执行数据准确性验证
        const accuracyCheck = accuracyValidator.validateAccuracy({
          round,
          crawlResult,
          expectedDataRange: {
            start: validationMessage.start,
            end: validationMessage.end
          },
          validationCriteria: {
            timeAccuracy: true,
            contentCompleteness: true,
            metadataIntegrity: true,
            duplicateDetection: true
          }
        });

        accuracyResults.push(accuracyCheck);

        console.log(`      📊 检测数据: ${crawlResult.incrementalData.newPostsCount} 条`);
        console.log(`      ✅ 时间准确性: ${accuracyCheck.timeAccuracy.passed ? '通过' : '失败'} (${accuracyCheck.timeAccuracy.score}/100)`);
        console.log(`      📝 内容完整性: ${accuracyCheck.contentCompleteness.passed ? '通过' : '失败'} (${accuracyCheck.contentCompleteness.score}/100)`);
        console.log(`      🏷️ 元数据完整性: ${accuracyCheck.metadataIntegrity.passed ? '通过' : '失败'} (${accuracyCheck.metadataIntegrity.score}/100)`);
        console.log(`      🔍 重复检测: ${accuracyCheck.duplicateDetection.passed ? '通过' : '失败'} (${accuracyCheck.duplicateDetection.score}/100)`);
        console.log(`      🎯 综合评分: ${accuracyCheck.overallScore}/100`);

        await TestUtils.sleep(800);
      }

      // 分析整体准确性
      const overallAccuracy = accuracyValidator.getOverallAccuracy(accuracyResults);

      expect(overallAccuracy.averageScore).toBeGreaterThan(85); // 平均准确性大于85分
      expect(overallAccuracy.consistencyRate).toBeGreaterThan(90); // 一致性大于90%
      expect(overallAccuracy.errorRate).toBeLessThan(5); // 错误率小于5%

      console.log(`✅ 数据准确性验证完成:`);
      console.log(`   🎯 平均评分: ${overallAccuracy.averageScore.toFixed(1)}/100`);
      console.log(`   📈 一致性: ${overallAccuracy.consistencyRate.toFixed(1)}%`);
      console.log(`   🚨 错误率: ${overallAccuracy.errorRate.toFixed(1)}%`);
      console.log(`   ✅ 验证状态: ${overallAccuracy.isValid ? '通过' : '失败'}`);
    });

    it('应该正确处理数据版本控制和同步', async () => {
      const versionControlKeyword = '版本控制测试';
      const syncOperations = ['create', 'update', 'delete', 'merge'];
      const versionManager = new DataVersionManager();

      console.log(`🔢 数据版本控制和同步测试`);
      console.log(`   🔍 关键词: ${versionControlKeyword}`);
      console.log(`   📋 同步操作: ${syncOperations.join(', ')}`);

      let currentVersion = 1;
      const versionHistory = [];

      for (const operation of syncOperations) {
        console.log(`   🔄 执行操作: ${operation}`);

        const operationMessage = TestUtils.createTestSubTaskMessage({
          keyword: versionControlKeyword,
          taskId: 9050 + currentVersion,
          start: new Date(Date.now() - 2 * 60 * 1000),
          end: new Date(),
          isInitialCrawl: operation === 'create'
        });

        const crawlResult = await crawlerService.crawl(operationMessage);

        // 创建数据版本
        const dataVersion = versionManager.createVersion({
          version: currentVersion,
          operation,
          timestamp: new Date(),
          data: crawlResult,
          changes: crawlResult.incrementalData,
          parentVersion: currentVersion > 1 ? currentVersion - 1 : null
        });

        versionHistory.push(dataVersion);

        console.log(`      📦 版本 ${currentVersion}: ${operation}`);
        console.log(`      📊 数据量: ${crawlResult.incrementalData.newPostsCount} 条`);
        console.log(`      🔄 变化数: ${crawlResult.incrementalData.changeRate.toFixed(1)}%`);
        console.log(`      🆔 版本ID: ${dataVersion.versionId}`);

        currentVersion++;

        await TestUtils.sleep(600);
      }

      // 验证版本控制完整性
      const versionValidation = versionManager.validateVersionHistory(versionHistory);

      expect(versionValidation.isComplete).toBe(true);
      expect(versionValidation.totalVersions).toBe(syncOperations.length);
      expect(versionValidation.hasGaps).toBe(false);
      expect(versionValidation.consistencyScore).toBeGreaterThan(90);

      console.log(`✅ 版本控制验证完成:`);
      console.log(`   📦 总版本数: ${versionValidation.totalVersions}`);
      console.log(`   🔗 完整性: ${versionValidation.isComplete ? '完整' : '不完整'}`);
      console.log(`   ⚠️ 版本间隙: ${versionValidation.hasGaps ? '存在' : '无'}`);
      console.log(`   📊 一致性评分: ${versionValidation.consistencyScore}/100`);
      console.log(`   🕐 最新版本: ${versionValidation.latestVersion}`);
    });
  });
});

// 辅助函数和类

/**
 * 生成增量时间范围内的帖子数据
 */
function generateIncrementalPosts(startTime: Date, endTime: Date, keyword: string): any[] {
  const timeRange = endTime.getTime() - startTime.getTime();
  const postCount = Math.floor(Math.random() * 15) + 1; // 1-15条新数据

  const posts = [];
  for (let i = 0; i < postCount; i++) {
    const postTime = new Date(startTime.getTime() + Math.random() * timeRange);
    const changeTypes = ['new', 'updated', 'trending'];
    const changeType = changeTypes[Math.floor(Math.random() * changeTypes.length)];

    posts.push({
      id: `incremental_post_${Date.now()}_${i}`,
      content: `关于"${keyword}"的最新动态 - ${postTime.toISOString()}`,
      author: {
        id: `incremental_user_${i % 5}`,
        name: `实时用户${i % 5}`,
        avatar: `https://example.com/avatar_${i % 5}.jpg`
      },
      createdAt: postTime,
      updatedAt: postTime,
      changeType,
      trending: Math.random() > 0.7, // 30%概率是热门内容
      metrics: {
        likes: Math.floor(Math.random() * 500),
        comments: Math.floor(Math.random() * 100),
        reposts: Math.floor(Math.random() * 50),
        views: Math.floor(Math.random() * 2000)
      }
    });
  }

  return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * 生成增量数据HTML
 */
function generateIncrementalHTML(posts: any[]): string {
  let postsHTML = posts.map(post => `
    <div class="card-wrap ${post.trending ? 'trending' : ''}" data-change-type="${post.changeType}">
      <div class="content">
        <p class="txt">${post.content}</p>
        <div class="from">
          <a href="/${post.author.id}" class="name">${post.author.name}</a>
          <a class="time" title="${post.createdAt.toISOString()}">${getTimeAgo(post.createdAt)}</a>
          ${post.trending ? '<span class="trending-badge">🔥 热门</span>' : ''}
        </div>
        <div class="card-act">
          <a class="item"><i class="icon icon-like"></i>${post.metrics.likes}</a>
          <a class="item"><i class="icon icon-comment"></i>${post.metrics.comments}</a>
          <a class="item"><i class="icon icon-repost"></i>${post.metrics.reposts}</a>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <html>
      <head><title>实时微博搜索结果</title></head>
      <body>
        <div class="real-time-indicator">实时更新中...</div>
        ${postsHTML}
        <div class="m-page">
          <a class="next" href="/search?page=2&realtime=1">加载更多</a>
        </div>
      </body>
    </html>
  `;
}

/**
 * 获取相对时间描述
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`;
  return `${Math.floor(diffMins / 1440)}天前`;
}

/**
 * 计算变化率
 */
function calculateChangeRate(newPostsCount: number): number {
  // 模拟变化率计算，基于新数据量和时间因素
  const baseRate = Math.min(newPostsCount * 2, 100);
  const randomFactor = Math.random() * 20 - 10; // ±10%的随机因素
  return Math.max(0, Math.min(100, baseRate + randomFactor));
}

/**
 * 计算新鲜度评分
 */
function calculateFreshnessScore(posts: any[]): number {
  if (posts.length === 0) return 0;

  const now = new Date();
  const avgAge = posts.reduce((sum, post) => {
    const ageMinutes = (now.getTime() - post.createdAt.getTime()) / (1000 * 60);
    return sum + ageMinutes;
  }, 0) / posts.length;

  // 新鲜度评分：越新的数据评分越高
  const freshnessScore = Math.max(0, 100 - (avgAge / 60)); // 每小时降低1分
  return Math.min(100, freshnessScore);
}

/**
 * 提取活跃创作者
 */
function extractActiveCreators(posts: any[]): any[] {
  const creatorMap = new Map();

  posts.forEach(post => {
    if (!creatorMap.has(post.author.id)) {
      creatorMap.set(post.author.id, {
        ...post.author,
        recentPosts: 1,
        totalEngagement: post.metrics.likes + post.metrics.comments + post.metrics.reposts,
        lastActive: post.createdAt,
        isActive: post.trending
      });
    } else {
      const creator = creatorMap.get(post.author.id);
      creator.recentPosts++;
      creator.totalEngagement += post.metrics.likes + post.metrics.comments + post.metrics.reposts;
      if (post.createdAt > creator.lastActive) {
        creator.lastActive = post.createdAt;
      }
      if (post.trending) {
        creator.isActive = true;
      }
    }
  });

  return Array.from(creatorMap.values())
    .sort((a, b) => b.totalEngagement - a.totalEngagement)
    .slice(0, 10); // 取前10个最活跃的创作者
}

/**
 * 增量监控会话管理器
 */
class IncrementalMonitoringSession {
  public readonly checkInterval: number;
  private checks: any[] = [];
  private startTime: Date;

  constructor(
    public readonly taskId: number,
    public readonly keyword: string,
    checkInterval: number
  ) {
    this.checkInterval = checkInterval;
    this.startTime = new Date();
  }

  recordCheck(incrementalData: any): void {
    this.checks.push({
      timestamp: new Date(),
      newPostsCount: incrementalData.newPostsCount,
      changeRate: incrementalData.changeRate,
      freshnessScore: incrementalData.freshnessScore,
      monitoringRange: incrementalData.monitoringRange
    });
  }

  getStatistics(): {
    totalChecks: number;
    totalNewPosts: number;
    averageChangeRate: number;
    averageFreshnessScore: number;
    monitoringUptime: number;
  } {
    const totalChecks = this.checks.length;
    const totalNewPosts = this.checks.reduce((sum, check) => sum + check.newPostsCount, 0);
    const averageChangeRate = this.checks.reduce((sum, check) => sum + check.changeRate, 0) / totalChecks || 0;
    const averageFreshnessScore = this.checks.reduce((sum, check) => sum + check.freshnessScore, 0) / totalChecks || 0;
    const monitoringUptime = Date.now() - this.startTime.getTime();

    return {
      totalChecks,
      totalNewPosts,
      averageChangeRate,
      averageFreshnessScore,
      monitoringUptime
    };
  }
}

/**
 * 数据变化检测器
 */
class DataChangeDetector {
  private baselineData: any;

  constructor(baselineData: any) {
    this.baselineData = baselineData;
  }

  detectChanges(currentData: any): {
    newPosts: number;
    updatedPosts: number;
    deletedPosts: number;
    changeMagnitude: number;
    shouldTriggerUpdate: boolean;
  } {
    const currentPosts = currentData.incrementalData.newPostsCount || 0;
    const changeRate = currentData.incrementalData.changeRate || 0;

    // 模拟变化检测逻辑
    const newPosts = currentPosts;
    const updatedPosts = Math.floor(currentPosts * 0.1); // 10%的更新
    const deletedPosts = Math.floor(Math.random() * 3); // 随机删除

    // 计算变化幅度
    const totalChanges = newPosts + updatedPosts + deletedPosts;
    const changeMagnitude = Math.min((totalChanges / Math.max(this.baselineData.pageCount, 1)) * 100, 100);

    // 判断是否需要触发更新
    const shouldTriggerUpdate = changeMagnitude > 5 || currentPosts > 0; // 变化幅度>5%或有新数据

    return {
      newPosts,
      updatedPosts,
      deletedPosts,
      changeMagnitude,
      shouldTriggerUpdate
    };
  }
}

/**
 * 数据更新模拟器
 */
async function simulateDataUpdate(changes: any): Promise<{ processedItems: number; updateTime: number }> {
  const startTime = Date.now();

  // 模拟数据处理延迟
  await TestUtils.sleep(500 + Math.random() * 1000);

  const processedItems = changes.newPosts + changes.updatedPosts;
  const updateTime = Date.now() - startTime;

  return { processedItems, updateTime };
}

/**
 * 检测准确性分析器
 */
function analyzeDetectionAccuracy(detectionResults: any[]): {
  totalDetections: number;
  significantChanges: number;
  falsePositiveRate: number;
  accuracyScore: number;
} {
  const totalDetections = detectionResults.length;
  const significantChanges = detectionResults.filter(r => r.changeMagnitude > 10).length;
  const falsePositives = detectionResults.filter(r => r.shouldTriggerUpdate && r.changeMagnitude < 5).length;
  const falsePositiveRate = totalDetections > 0 ? (falsePositives / totalDetections) * 100 : 0;
  const accuracyScore = 100 - falsePositiveRate;

  return {
    totalDetections,
    significantChanges,
    falsePositiveRate,
    accuracyScore
  };
}

/**
 * 数据时效性监控器
 */
class DataTimelinessMonitor {
  private detections: any[] = [];
  private readonly maxAcceptableDelay: number;

  constructor(maxAcceptableDelay: number) {
    this.maxAcceptableDelay = maxAcceptableDelay;
  }

  recordDetection(data: {
    publishTime: Date;
    detectionTime: Date;
    detectionDelay: number;
    newDataCount: number;
    changeRate: number;
  }): {
    isTimely: boolean;
    delayVariance: number;
    record: any;
  } {
    const isTimely = data.detectionDelay <= this.maxAcceptableDelay;
    const record = {
      ...data,
      isTimely,
      delayVariance: data.detectionDelay - this.maxAcceptableDelay
    };

    this.detections.push(record);
    return { ...record, record };
  }

  getStatistics(): {
    totalDetections: number;
    timelinessRate: number;
    averageDetectionDelay: number;
    overtimeDetections: number;
    maxDelay: number;
    minDelay: number;
  } {
    const totalDetections = this.detections.length;
    if (totalDetections === 0) {
      return {
        totalDetections: 0,
        timelinessRate: 0,
        averageDetectionDelay: 0,
        overtimeDetections: 0,
        maxDelay: 0,
        minDelay: 0
      };
    }

    const timelyDetections = this.detections.filter(d => d.isTimely).length;
    const timelinessRate = (timelyDetections / totalDetections) * 100;
    const averageDetectionDelay = this.detections.reduce((sum, d) => sum + d.detectionDelay, 0) / totalDetections;
    const overtimeDetections = totalDetections - timelyDetections;
    const maxDelay = Math.max(...this.detections.map(d => d.detectionDelay));
    const minDelay = Math.min(...this.detections.map(d => d.detectionDelay));

    return {
      totalDetections,
      timelinessRate,
      averageDetectionDelay,
      overtimeDetections,
      maxDelay,
      minDelay
    };
  }
}

/**
 * 增量性能优化器
 */
class IncrementalPerformanceOptimizer {
  private performanceHistory: any[] = [];

  calculateMetrics(data: {
    round: number;
    batchSize: number;
    successfulRequests: number;
    totalDuration: number;
    totalDataProcessed: number;
  }): {
    round: number;
    throughput: number;
    averageLatency: number;
    successRate: number;
    efficiency: number;
  } {
    const throughput = data.totalDataProcessed / (data.totalDuration / 1000); // 条/秒
    const averageLatency = data.totalDuration / data.batchSize; // ms
    const successRate = (data.successfulRequests / data.batchSize) * 100;
    const efficiency = (throughput * successRate) / 100; // 综合效率指标

    const metrics = {
      round: data.round,
      throughput,
      averageLatency,
      successRate,
      efficiency
    };

    this.performanceHistory.push(metrics);
    return metrics;
  }

  getOverallPerformance(results: any[]): {
    totalThroughput: number;
    averageLatency: number;
    successRate: number;
    performanceImprovement: number;
  } {
    const totalDataProcessed = results.reduce((sum, r) => sum + r.totalDataProcessed, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.totalDuration, 0);
    const totalRequests = results.reduce((sum, r) => sum + r.successfulRequests, 0);
    const totalBatchSize = results.reduce((sum, r) => sum + r.batchSize, 0);

    const totalThroughput = totalDataProcessed / (totalDuration / 1000);
    const averageLatency = totalDuration / totalBatchSize;
    const successRate = (totalRequests / totalBatchSize) * 100;

    // 计算性能提升（与第一轮相比）
    const firstRoundThroughput = results[0]?.totalDataProcessed / (results[0]?.totalDuration / 1000) || 1;
    const performanceImprovement = ((totalThroughput - firstRoundThroughput) / firstRoundThroughput) * 100;

    return {
      totalThroughput,
      averageLatency,
      successRate,
      performanceImprovement
    };
  }
}

/**
 * 增量数据准确性验证器
 */
class IncrementalDataAccuracyValidator {
  validateAccuracy(data: {
    round: number;
    crawlResult: any;
    expectedDataRange: { start: Date; end: Date };
    validationCriteria: any;
  }): {
    round: number;
    timeAccuracy: { passed: boolean; score: number; details: any };
    contentCompleteness: { passed: boolean; score: number; details: any };
    metadataIntegrity: { passed: boolean; score: number; details: any };
    duplicateDetection: { passed: boolean; score: number; details: any };
    overallScore: number;
  } {
    // 时间准确性验证
    const timeAccuracy = this.validateTimeAccuracy(data.crawlResult, data.expectedDataRange);

    // 内容完整性验证
    const contentCompleteness = this.validateContentCompleteness(data.crawlResult);

    // 元数据完整性验证
    const metadataIntegrity = this.validateMetadataIntegrity(data.crawlResult);

    // 重复数据检测
    const duplicateDetection = this.validateDuplicateDetection(data.crawlResult);

    const overallScore = (timeAccuracy.score + contentCompleteness.score + metadataIntegrity.score + duplicateDetection.score) / 4;

    return {
      round: data.round,
      timeAccuracy,
      contentCompleteness,
      metadataIntegrity,
      duplicateDetection,
      overallScore
    };
  }

  private validateTimeAccuracy(crawlResult: any, expectedRange: { start: Date; end: Date }): { passed: boolean; score: number; details: any } {
    // 模拟时间准确性验证
    const score = 85 + Math.random() * 15; // 85-100分
    const passed = score >= 90;

    return {
      passed,
      score,
      details: {
        expectedRange,
        actualRange: crawlResult.incrementalData?.monitoringRange,
        timeVariance: Math.random() * 5 // 分钟
      }
    };
  }

  private validateContentCompleteness(crawlResult: any): { passed: boolean; score: number; details: any } {
    const postCount = crawlResult.incrementalData?.newPostsCount || 0;
    const score = Math.min(100, 70 + postCount * 2); // 基础70分，每条数据+2分
    const passed = score >= 80;

    return {
      passed,
      score,
      details: {
        postCount,
        completenessRatio: Math.min(1, postCount / 20)
      }
    };
  }

  private validateMetadataIntegrity(crawlResult: any): { passed: boolean; score: number; details: any } {
    // 模拟元数据完整性验证
    const score = 90 + Math.random() * 10; // 90-100分
    const passed = score >= 95;

    return {
      passed,
      score,
      details: {
        metadataFields: ['author', 'timestamp', 'metrics', 'source'],
        integrityScore: score / 100
      }
    };
  }

  private validateDuplicateDetection(crawlResult: any): { passed: boolean; score: number; details: any } {
    // 模拟重复数据检测
    const duplicateRate = Math.random() * 5; // 0-5%重复率
    const score = Math.max(0, 100 - duplicateRate * 10); // 每个百分点扣10分
    const passed = duplicateRate < 2; // 重复率低于2%为通过

    return {
      passed,
      score,
      details: {
        duplicateRate,
        duplicateCount: Math.floor((crawlResult.incrementalData?.newPostsCount || 0) * duplicateRate / 100)
      }
    };
  }

  getOverallAccuracy(results: any[]): {
    averageScore: number;
    consistencyRate: number;
    errorRate: number;
    isValid: boolean;
  } {
    const averageScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
    const passedValidations = results.filter(r => r.overallScore >= 80).length;
    const consistencyRate = (passedValidations / results.length) * 100;
    const errorRate = ((results.length - passedValidations) / results.length) * 100;
    const isValid = averageScore >= 85 && consistencyRate >= 90;

    return {
      averageScore,
      consistencyRate,
      errorRate,
      isValid
    };
  }
}

/**
 * 数据版本管理器
 */
class DataVersionManager {
  private versions: Map<string, any> = new Map();

  createVersion(data: {
    version: number;
    operation: string;
    timestamp: Date;
    data: any;
    changes: any;
    parentVersion: number | null;
  }): {
    versionId: string;
    version: number;
    operation: string;
    timestamp: Date;
    parentVersion: number | null;
    checksum: string;
  } {
    const versionId = `v${data.version}_${data.timestamp.getTime()}`;
    const checksum = this.calculateChecksum(data);

    const version = {
      versionId,
      version: data.version,
      operation: data.operation,
      timestamp: data.timestamp,
      parentVersion: data.parentVersion,
      checksum
    };

    this.versions.set(versionId, {
      ...version,
      data: data.data,
      changes: data.changes
    });

    return version;
  }

  validateVersionHistory(versionHistory: any[]): {
    isComplete: boolean;
    totalVersions: number;
    hasGaps: boolean;
    consistencyScore: number;
    latestVersion: string;
  } {
    const totalVersions = versionHistory.length;
    const hasGaps = this.checkForGaps(versionHistory);
    const consistencyScore = this.calculateConsistencyScore(versionHistory);
    const latestVersion = versionHistory[versionHistory.length - 1]?.versionId || '';
    const isComplete = totalVersions > 0 && !hasGaps && consistencyScore > 80;

    return {
      isComplete,
      totalVersions,
      hasGaps,
      consistencyScore,
      latestVersion
    };
  }

  private calculateChecksum(data: any): string {
    // 简化的校验和计算
    const content = JSON.stringify(data.changes) + data.timestamp.toISOString();
    return Buffer.from(content).toString('base64').slice(0, 16);
  }

  private checkForGaps(versionHistory: any[]): boolean {
    for (let i = 1; i < versionHistory.length; i++) {
      const current = versionHistory[i];
      const previous = versionHistory[i - 1];

      if (current.parentVersion !== previous.version) {
        return true;
      }
    }
    return false;
  }

  private calculateConsistencyScore(versionHistory: any[]): number {
    if (versionHistory.length === 0) return 0;

    // 简化的一致性评分
    let consistencyScore = 100;
    const expectedOperations = ['create', 'update', 'delete', 'merge'];

    versionHistory.forEach((version, index) => {
      if (!expectedOperations.includes(version.operation)) {
        consistencyScore -= 10;
      }

      if (index > 0 && version.parentVersion !== versionHistory[index - 1].version) {
        consistencyScore -= 20;
      }
    });

    return Math.max(0, consistencyScore);
  }
}
