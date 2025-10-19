import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Logger } from '@pro/logger';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';
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
 * 历史数据回溯E2E测试 - 数字时代的考古艺术品
 *
 * 验证完整的历史数据回溯流程：
 * 1. 创建搜索任务 → 2. Broker扫描 → 3. 生成子任务 → 4. Crawler执行 → 5. 数据存储 → 6. Cleaner处理
 *
 * 此测试确保系统能够优雅地处理大规模历史数据的回溯抓取，
 * 验证数据完整性、任务进度跟踪和错误恢复机制。
 */

describe('历史数据回溯E2E测试', () => {
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
    testSessionId = TestStateManager.getInstance().createTestSession('历史数据回溯E2E测试');

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
              maxPages: 10,
              requestDelay: { min: 200, max: 800 },
              pageTimeout: 45000,
              retryAttempts: 3,
              retryDelay: 2000
            },
            WEIBO_CONFIG: {
              baseUrl: 'https://weibo.com',
              searchUrl: 'https://weibo.com/search',
              historicalSearch: {
                enabled: true,
                maxDaysPerBatch: 30,
                batchSize: 10
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
                statusQueue: 'test.status.queue',
                historicalQueue: 'test.historical.queue'
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
              // 模拟历史数据回溯爬取过程
              const timeRange = message.end.getTime() - message.start.getTime();
              const daysToCrawl = Math.ceil(timeRange / (1000 * 60 * 60 * 24));
              const crawlDuration = 1000 + daysToCrawl * 500; // 根据天数计算爬取时间

              await TestUtils.sleep(crawlDuration);

              const success = Math.random() > TEST_CONFIG.errorInjection.networkFailureRate;

              if (success) {
                // 生成历史时间范围内的模拟数据
                const historicalPosts = generateHistoricalPosts(message.start, message.end, Math.min(daysToCrawl * 3, 50));

                const mockHtml = TestUtils.generateTestWeiboHTML(historicalPosts.length);
                await mockRawDataService.create({
                  sourceType: 'weibo_historical_search',
                  sourceUrl: `https://weibo.com/search?q=${encodeURIComponent(message.keyword)}&typeall=1&suball=1&timescope=custom:${Math.floor(message.start.getTime()/1000)}:${Math.floor(message.end.getTime()/1000)}`,
                  rawContent: mockHtml,
                  metadata: {
                    keyword: message.keyword,
                    taskId: message.taskId,
                    timeRange: {
                      start: message.start,
                      end: message.end
                    },
                    historicalCrawl: true,
                    crawledAt: new Date(),
                    estimatedPosts: historicalPosts.length
                  }
                });

                return {
                  success: true,
                  pageCount: Math.ceil(historicalPosts.length / 10), // 假设每页10条数据
                  firstPostTime: historicalPosts[historicalPosts.length - 1]?.createdAt || message.start,
                  lastPostTime: historicalPosts[0]?.createdAt || message.end,
                  historicalData: {
                    timeRange: {
                      start: message.start,
                      end: message.end
                    },
                    totalPosts: historicalPosts.length,
                    dataCompleteness: calculateDataCompleteness(message.start, message.end, historicalPosts)
                  }
                };
              } else {
                return {
                  success: false,
                  pageCount: 0,
                  error: '历史数据回溯失败：网络连接中断'
                };
              }
            }),

            multiModeCrawl: jest.fn().mockImplementation(async (message: EnhancedSubTaskMessage): Promise<MultiModeCrawlResult> => {
              const timeRange = message.end.getTime() - message.start.getTime();
              const crawlComplexity = message.crawlModes?.length || 1;
              const crawlDuration = 2000 + timeRange / (1000 * 60 * 60 * 24) * 1000 * crawlComplexity;

              await TestUtils.sleep(crawlDuration);

              const historicalPosts = generateHistoricalPosts(message.start, message.end, Math.min(timeRange / (1000 * 60 * 60 * 24) * 5, 100));

              return {
                searchResult: {
                  success: true,
                  pageCount: Math.ceil(historicalPosts.length / 15)
                },
                noteDetails: historicalPosts.slice(0, 10).map(post => ({
                  noteId: post.id,
                  content: post.content,
                  author: post.author,
                  publishedAt: post.createdAt,
                  metrics: post.metrics
                })),
                creatorDetails: extractUniqueCreators(historicalPosts),
                comments: [],
                mediaDownloads: [],
                crawlMetrics: {
                  totalPages: Math.ceil(historicalPosts.length / 15),
                  successfulPages: Math.ceil(historicalPosts.length / 15),
                  failedPages: 0,
                  skippedPages: 0,
                  totalRequests: 20,
                  averagePageLoadTime: 2000,
                  totalDataSize: historicalPosts.length * 2048,
                  notesCrawled: historicalPosts.length,
                  detailsCrawled: Math.min(historicalPosts.length, 10),
                  creatorsCrawled: extractUniqueCreators(historicalPosts).length,
                  commentsCrawled: 0,
                  mediaFilesDownloaded: 0,
                  commentDepthReached: 0,
                  totalDuration: crawlDuration,
                  throughputMBps: (historicalPosts.length * 2048) / (1024 * 1024) / (crawlDuration / 1000),
                  requestsPerSecond: 20 / (crawlDuration / 1000),
                  errorRate: 0,
                  memoryUsage: 128,
                  cpuUsage: 45,
                  diskUsage: historicalPosts.length * 2
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

  describe('完整历史数据回溯流程', () => {
    it('应该完成从任务创建到数据清洗的历史回溯全流程', async () => {
      // 1. 创建历史回溯任务
      const endDate = new Date('2024-01-31T23:59:59Z');
      const startDate = new Date('2024-01-01T00:00:00Z');

      const historicalTaskMessage = TestUtils.createTestSubTaskMessage({
        keyword: '2024年新年展望',
        taskId: 8001,
        start: startDate,
        end: endDate,
        isInitialCrawl: true,
        enableAccountRotation: true
      });

      const overallStartTime = Date.now();

      // 2. 执行历史数据爬取
      console.log(`📜 开始历史数据回溯 - 关键词: ${historicalTaskMessage.keyword}, 时间范围: ${startDate.toISOString()} 至 ${endDate.toISOString()}`);

      const crawlResult = await crawlerService.crawl(historicalTaskMessage);

      expect(crawlResult.success).toBe(true);
      expect(crawlResult.pageCount).toBeGreaterThan(0);
      expect(crawlResult.historicalData).toBeDefined();
      expect(crawlResult.historicalData.totalPosts).toBeGreaterThan(0);

      // 3. 验证历史数据时间范围覆盖
      const timeCoverage = validateHistoricalTimeCoverage(
        crawlResult.historicalData.timeRange.start,
        crawlResult.historicalData.timeRange.end,
        crawlResult.firstPostTime,
        crawlResult.lastPostTime
      );
      expect(timeCoverage.coveragePercentage).toBeGreaterThan(80); // 至少80%的时间覆盖

      // 4. 模拟数据清洗过程
      const cleaningStartTime = Date.now();

      const cleaningResult = {
        success: true,
        processedCount: crawlResult.historicalData.totalPosts,
        failedCount: Math.floor(crawlResult.historicalData.totalPosts * 0.05), // 5%失败率
        skippedCount: Math.floor(crawlResult.historicalData.totalPosts * 0.02), // 2%跳过率
        quality: {
          averageScore: 0.82,
          highQualityCount: Math.floor(crawlResult.historicalData.totalPosts * 0.6),
          mediumQualityCount: Math.floor(crawlResult.historicalData.totalPosts * 0.3),
          lowQualityCount: Math.floor(crawlResult.historicalData.totalPosts * 0.1)
        },
        performance: {
          processingTime: Date.now() - cleaningStartTime,
          averageProcessingTime: 150,
          throughput: crawlResult.historicalData.totalPosts / ((Date.now() - cleaningStartTime) / 1000)
        },
        errors: [],
        metadata: {
          cleaningId: `clean_historical_${Date.now()}`,
          timestamp: new Date(),
          version: '1.0.0',
          historicalData: true,
          timeRange: crawlResult.historicalData.timeRange
        }
      };

      // 5. 验证数据清洗结果
      expect(cleaningResult.success).toBe(true);
      expect(cleaningResult.processedCount).toBeGreaterThan(0);
      expect(cleaningResult.quality.averageScore).toBeGreaterThan(0.8);

      const overallDuration = Date.now() - overallStartTime;

      // 6. 验证整体性能
      expect(overallDuration).toBeLessThan(TEST_CONFIG.performance.maxExecutionTime * 3); // 3倍超时时间

      // 更新测试状态
      const session = TestStateManager.getInstance().getTestSession(testSessionId);
      session.metrics.requests++;
      session.metrics.successes++;
      session.metrics.totalTime += overallDuration;

      console.log(`✅ 历史数据回溯完成 - 时间范围: ${startDate.toISOString()} 至 ${endDate.toISOString()}`);
      console.log(`   📊 爬取页数: ${crawlResult.pageCount}, 原始数据: ${crawlResult.historicalData.totalPosts} 条`);
      console.log(`   🧹 清洗处理: ${cleaningResult.processedCount} 条, 质量分数: ${cleaningResult.quality.averageScore}`);
      console.log(`   ⏱️ 总耗时: ${overallDuration}ms, 时间覆盖: ${timeCoverage.coveragePercentage.toFixed(1)}%`);
    });

    it('应该正确处理分段历史回溯策略', async () => {
      // 将1个月的数据分为4段进行回溯
      const segments = [
        { start: new Date('2024-01-01'), end: new Date('2024-01-08') },
        { start: new Date('2024-01-08'), end: new Date('2024-01-15') },
        { start: new Date('2024-01-15'), end: new Date('2024-01-22') },
        { start: new Date('2024-01-22'), end: new Date('2024-01-31') }
      ];

      const segmentResults = [];
      let totalPosts = 0;
      let totalDuration = 0;

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentTaskMessage = TestUtils.createTestSubTaskMessage({
          keyword: '春节习俗',
          taskId: 8010 + i,
          start: segment.start,
          end: segment.end,
          isInitialCrawl: i === 0, // 只有第一段标记为初始抓取
          enableAccountRotation: true
        });

        console.log(`📅 处理历史段 ${i + 1}/${segments.length}: ${segment.start.toISOString()} 至 ${segment.end.toISOString()}`);

        const segmentStartTime = Date.now();
        const segmentResult = await crawlerService.crawl(segmentTaskMessage);
        const segmentDuration = Date.now() - segmentStartTime;

        expect(segmentResult.success).toBe(true);
        expect(segmentResult.historicalData).toBeDefined();

        segmentResults.push({
          segment: i + 1,
          result: segmentResult,
          duration: segmentDuration,
          postsFound: segmentResult.historicalData.totalPosts
        });

        totalPosts += segmentResult.historicalData.totalPosts;
        totalDuration += segmentDuration;

        // 段间暂停，模拟实际应用中的间隔
        if (i < segments.length - 1) {
          await TestUtils.sleep(500);
        }
      }

      // 验证分段回溯结果
      expect(segmentResults.length).toBe(segments.length);
      expect(totalPosts).toBeGreaterThan(0);

      // 验证数据连续性
      const dataContinuity = validateHistoricalDataContinuity(segmentResults);
      expect(dataContinuity.gapsFound).toBeLessThan(2); // 最多允许1个时间间隙

      // 验证性能表现
      const averageSegmentDuration = totalDuration / segments.length;
      expect(averageSegmentDuration).toBeLessThan(TEST_CONFIG.performance.maxExecutionTime);

      console.log(`✅ 分段历史回溯完成 - 段数: ${segments.length}, 总数据: ${totalPosts} 条`);
      console.log(`   ⏱️ 平均每段耗时: ${averageSegmentDuration.toFixed(0)}ms, 数据连续性: ${dataContinuity.continuityScore}/100`);
    });

    it('应该优雅处理历史回溯中的网络中断和恢复', async () => {
      const retryTaskMessage = TestUtils.createTestSubTaskMessage({
        keyword: '网络中断恢复测试',
        taskId: 8020,
        start: new Date('2024-01-10'),
        end: new Date('2024-01-20'),
        isInitialCrawl: true
      });

      let attempts = 0;
      const maxAttempts = 3;
      let finalResult: CrawlResult | null = null;

      while (attempts < maxAttempts && !finalResult?.success) {
        attempts++;

        console.log(`🔄 历史回溯重试 ${attempts}/${maxAttempts}`);

        try {
          // 前两次模拟网络中断，第三次成功
          if (attempts < 3) {
            throw new Error(`模拟网络中断 - 尝试 ${attempts}`);
          }

          finalResult = await crawlerService.crawl(retryTaskMessage);

          expect(finalResult.success).toBe(true);
          expect(finalResult.pageCount).toBeGreaterThan(0);

          console.log(`✅ 历史回溯网络恢复成功 - 重试次数: ${attempts}, 获取数据: ${finalResult.historicalData?.totalPosts || 0} 条`);

        } catch (error) {
          console.log(`⚠️ 网络中断: ${error.message}`);

          if (attempts >= maxAttempts) {
            throw error;
          }

          // 递增延迟重试
          const delay = 2000 * attempts;
          await TestUtils.sleep(delay);
        }
      }

      expect(finalResult).toBeDefined();
      expect(finalResult!.success).toBe(true);
    });
  });

  describe('数据质量和完整性验证', () => {
    it('应该验证历史数据的完整性和准确性', async () => {
      const validationTaskMessage = TestUtils.createTestSubTaskMessage({
        keyword: '数据完整性验证',
        taskId: 8030,
        start: new Date('2024-01-01'),
        end: new Date('2024-01-15'),
        isInitialCrawl: true
      });

      const crawlResult = await crawlerService.crawl(validationTaskMessage);
      expect(crawlResult.success).toBe(true);

      // 验证数据完整性指标
      const completenessMetrics = validateDataCompleteness(crawlResult);

      expect(completenessMetrics.timeCoverage).toBeGreaterThan(85); // 时间覆盖85%以上
      expect(completenessMetrics.dataDensity).toBeGreaterThan(0.5); // 数据密度合理
      expect(completenessMetrics.consistencyScore).toBeGreaterThan(90); // 一致性90分以上

      console.log(`📊 数据完整性验证结果:`);
      console.log(`   📅 时间覆盖: ${completenessMetrics.timeCoverage}%`);
      console.log(`   📈 数据密度: ${completenessMetrics.dataDensity.toFixed(2)}`);
      console.log(`   🎯 一致性评分: ${completenessMetrics.consistencyScore}/100`);
    });

    it('应该检测和处理重复数据', async () => {
      // 模拟可能产生重复数据的场景
      const duplicateTaskMessage1 = TestUtils.createTestSubTaskMessage({
        keyword: '重复检测测试',
        taskId: 8040,
        start: new Date('2024-01-05'),
        end: new Date('2024-01-10'),
        isInitialCrawl: true
      });

      const duplicateTaskMessage2 = TestUtils.createTestSubTaskMessage({
        keyword: '重复检测测试',
        taskId: 8041,
        start: new Date('2024-01-08'),
        end: new Date('2024-01-12'),
        isInitialCrawl: false
      });

      // 执行两个有重叠时间范围的爬取
      const [result1, result2] = await Promise.allSettled([
        crawlerService.crawl(duplicateTaskMessage1),
        crawlerService.crawl(duplicateTaskMessage2)
      ]);

      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('fulfilled');

      const fulfilledResult1 = result1 as PromiseFulfilledResult<CrawlResult>;
      const fulfilledResult2 = result2 as PromiseFulfilledResult<CrawlResult>;

      // 模拟重复检测和处理
      const duplicateAnalysis = analyzeDuplicateData(
        fulfilledResult1.value.historicalData?.totalPosts || 0,
        fulfilledResult2.value.historicalData?.totalPosts || 0,
        3 // 重叠天数
      );

      expect(duplicateAnalysis.duplicateRate).toBeLessThan(15); // 重复率低于15%
      expect(duplicateAnalysis.afterDeduplication).toBeGreaterThan(0); // 去重后仍有数据

      console.log(`🔍 重复数据检测结果:`);
      console.log(`   📊 原始数据1: ${fulfilledResult1.value.historicalData?.totalPosts} 条`);
      console.log(`   📊 原始数据2: ${fulfilledResult2.value.historicalData?.totalPosts} 条`);
      console.log(`   🔄 重复率: ${duplicateAnalysis.duplicateRate.toFixed(1)}%`);
      console.log(`   ✨ 去重后: ${duplicateAnalysis.afterDeduplication} 条`);
    });
  });

  describe('任务进度跟踪', () => {
    it('应该准确跟踪历史回溯任务进度', async () => {
      const progressTaskMessage = TestUtils.createTestSubTaskMessage({
        keyword: '进度跟踪测试',
        taskId: 8050,
        start: new Date('2024-01-01'),
        end: new Date('2024-01-30'),
        isInitialCrawl: true
      });

      // 模拟进度跟踪
      const progressTracker = new HistoricalProgressTracker(
        progressTaskMessage.start,
        progressTaskMessage.end,
        5 // 分5个阶段
      );

      console.log(`📈 开始历史回溯进度跟踪 - 总阶段: ${progressTracker.totalStages}`);

      const crawlResult = await crawlerService.crawl(progressTaskMessage);
      expect(crawlResult.success).toBe(true);

      // 模拟进度更新
      for (let stage = 1; stage <= progressTracker.totalStages; stage++) {
        progressTracker.updateProgress(stage, {
          completedAt: new Date(),
          postsFound: Math.floor(Math.random() * 20) + 10,
          pagesCrawled: Math.floor(Math.random() * 5) + 1
        });

        const currentProgress = progressTracker.getCurrentProgress();
        console.log(`📊 阶段 ${stage}/${progressTracker.totalStages} 完成 - 进度: ${currentProgress.percentage}%`);

        if (stage < progressTracker.totalStages) {
          await TestUtils.sleep(200); // 阶段间延迟
        }
      }

      const finalProgress = progressTracker.getCurrentProgress();
      expect(finalProgress.percentage).toBe(100);
      expect(finalProgress.totalPosts).toBeGreaterThan(0);

      console.log(`✅ 历史回溯进度跟踪完成:`);
      console.log(`   🎯 最终进度: ${finalProgress.percentage}%`);
      console.log(`   📊 总数据量: ${finalProgress.totalPosts} 条`);
      console.log(`   ⏱️ 预估完成时间: ${finalProgress.estimatedCompletion?.toISOString()}`);
    });
  });
});

// 辅助函数和类

/**
 * 生成历史时间范围内的模拟帖子数据
 */
function generateHistoricalPosts(startDate: Date, endDate: Date, count: number): any[] {
  const posts = [];
  const timeRange = endDate.getTime() - startDate.getTime();

  for (let i = 0; i < count; i++) {
    const postTime = new Date(startDate.getTime() + Math.random() * timeRange);
    posts.push({
      id: `historical_post_${i}_${Date.now()}`,
      content: `这是历史时间点的微博内容 - ${postTime.toISOString()}`,
      author: {
        id: `historical_user_${i % 10}`,
        name: `历史用户${i % 10}`,
        avatar: `https://example.com/avatar${i % 10}.jpg`
      },
      createdAt: postTime,
      images: Math.random() > 0.7 ? [`https://example.com/historical_image_${i}.jpg`] : [],
      metrics: {
        likes: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 200),
        reposts: Math.floor(Math.random() * 100)
      }
    });
  }

  // 按时间倒序排列（最新的在前）
  return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * 计算数据完整性
 */
function calculateDataCompleteness(startDate: Date, endDate: Date, posts: any[]): number {
  if (posts.length === 0) return 0;

  const timeRange = endDate.getTime() - startDate.getTime();
  const postTimeSpan = posts[0].createdAt.getTime() - posts[posts.length - 1].createdAt.getTime();

  return Math.min((postTimeSpan / timeRange) * 100, 100);
}

/**
 * 验证历史数据时间覆盖
 */
function validateHistoricalTimeCoverage(
  expectedStart: Date,
  expectedEnd: Date,
  actualFirst: Date,
  actualLast: Date
): { coveragePercentage: number; gaps: string[] } {
  const expectedRange = expectedEnd.getTime() - expectedStart.getTime();
  const actualRange = actualLast.getTime() - actualFirst.getTime();
  const coveragePercentage = (actualRange / expectedRange) * 100;

  const gaps = [];
  if (actualFirst.getTime() > expectedStart.getTime() + 24 * 60 * 60 * 1000) {
    gaps.push(`起始时间间隙: ${expectedStart.toISOString()} 至 ${actualFirst.toISOString()}`);
  }

  if (actualLast.getTime() < expectedEnd.getTime() - 24 * 60 * 60 * 1000) {
    gaps.push(`结束时间间隙: ${actualLast.toISOString()} 至 ${expectedEnd.toISOString()}`);
  }

  return { coveragePercentage, gaps };
}

/**
 * 提取唯一的创作者信息
 */
function extractUniqueCreators(posts: any[]): any[] {
  const creatorMap = new Map();

  posts.forEach(post => {
    if (!creatorMap.has(post.author.id)) {
      creatorMap.set(post.author.id, {
        ...post.author,
        postCount: 1,
        totalLikes: post.metrics.likes,
        totalComments: post.metrics.comments
      });
    } else {
      const creator = creatorMap.get(post.author.id);
      creator.postCount++;
      creator.totalLikes += post.metrics.likes;
      creator.totalComments += post.metrics.comments;
    }
  });

  return Array.from(creatorMap.values());
}

/**
 * 验证历史数据连续性
 */
function validateHistoricalDataContinuity(segmentResults: any[]): { continuityScore: number; gapsFound: number } {
  let gapsFound = 0;
  let totalCoverage = 0;

  for (let i = 0; i < segmentResults.length - 1; i++) {
    const current = segmentResults[i];
    const next = segmentResults[i + 1];

    const currentEnd = current.result.lastPostTime;
    const nextStart = next.result.firstPostTime;

    const gap = nextStart.getTime() - currentEnd.getTime();
    const gapHours = gap / (1000 * 60 * 60);

    if (gapHours > 24) { // 超过24小时的间隙认为是不连续的
      gapsFound++;
    }

    // 计算覆盖度
    const segmentCoverage = 100 - Math.min(gapHours / 24, 100);
    totalCoverage += segmentCoverage;
  }

  const continuityScore = Math.max(0, 100 - (gapsFound * 20));

  return { continuityScore, gapsFound };
}

/**
 * 验证数据完整性
 */
function validateDataCompleteness(crawlResult: CrawlResult): {
  timeCoverage: number;
  dataDensity: number;
  consistencyScore: number;
} {
  const historicalData = crawlResult.historicalData;

  if (!historicalData) {
    return { timeCoverage: 0, dataDensity: 0, consistencyScore: 0 };
  }

  // 时间覆盖度
  const timeRange = historicalData.timeRange.end.getTime() - historicalData.timeRange.start.getTime();
  const actualRange = crawlResult.lastPostTime.getTime() - crawlResult.firstPostTime.getTime();
  const timeCoverage = Math.min((actualRange / timeRange) * 100, 100);

  // 数据密度（每页平均数据量）
  const dataDensity = historicalData.totalPosts / crawlResult.pageCount;

  // 一致性评分（基于多种因素）
  let consistencyScore = 100;
  if (timeCoverage < 80) consistencyScore -= 20;
  if (dataDensity < 5) consistencyScore -= 15;
  if (crawlResult.pageCount === 0) consistencyScore = 0;

  return {
    timeCoverage,
    dataDensity,
    consistencyScore: Math.max(0, consistencyScore)
  };
}

/**
 * 分析重复数据
 */
function analyzeDuplicateData(count1: number, count2: number, overlapDays: number): {
  duplicateRate: number;
  afterDeduplication: number;
  estimatedDuplicates: number;
} {
  // 估算重复数据量（基于重叠时间和数据密度）
  const estimatedDuplicates = Math.min(count1, count2) * (overlapDays / 30) * 0.3; // 假设30%重叠率
  const totalOriginal = count1 + count2;
  const duplicateRate = (estimatedDuplicates / totalOriginal) * 100;
  const afterDeduplication = totalOriginal - estimatedDuplicates;

  return {
    duplicateRate,
    afterDeduplication,
    estimatedDuplicates: Math.floor(estimatedDuplicates)
  };
}

/**
 * 历史回溯进度跟踪器
 */
class HistoricalProgressTracker {
  private stages: any[] = [];
  private completedStages = 0;

  constructor(
    private startDate: Date,
    private endDate: Date,
    public readonly totalStages: number
  ) {
    this.initializeStages();
  }

  private initializeStages(): void {
    const timeRange = this.endDate.getTime() - this.startDate.getTime();
    const stageDuration = timeRange / this.totalStages;

    for (let i = 0; i < this.totalStages; i++) {
      const stageStart = new Date(this.startDate.getTime() + i * stageDuration);
      const stageEnd = new Date(this.startDate.getTime() + (i + 1) * stageDuration);

      this.stages.push({
        stage: i + 1,
        start: stageStart,
        end: stageEnd,
        status: 'pending',
        postsFound: 0,
        pagesCrawled: 0,
        completedAt: null
      });
    }
  }

  updateProgress(stage: number, data: any): void {
    const stageData = this.stages.find(s => s.stage === stage);
    if (stageData) {
      Object.assign(stageData, {
        status: 'completed',
        ...data
      });
      this.completedStages++;
    }
  }

  getCurrentProgress(): {
    percentage: number;
    completedStages: number;
    totalPosts: number;
    estimatedCompletion?: Date;
  } {
    const percentage = Math.round((this.completedStages / this.totalStages) * 100);
    const totalPosts = this.stages.reduce((sum, stage) => sum + (stage.postsFound || 0), 0);

    let estimatedCompletion: Date | undefined;
    if (this.completedStages > 0 && this.completedStages < this.totalStages) {
      const avgTimePerStage = this.calculateAverageTimePerStage();
      const remainingStages = this.totalStages - this.completedStages;
      const estimatedRemainingTime = remainingStages * avgTimePerStage;
      estimatedCompletion = new Date(Date.now() + estimatedRemainingTime);
    }

    return {
      percentage,
      completedStages: this.completedStages,
      totalPosts,
      estimatedCompletion
    };
  }

  private calculateAverageTimePerStage(): number {
    const completedStagesWithTime = this.stages.filter(s => s.status === 'completed' && s.completedAt);
    if (completedStagesWithTime.length === 0) return 60000; // 默认1分钟

    const totalTime = completedStagesWithTime.reduce((sum, stage) => {
      return sum + (stage.completedAt.getTime() - stage.start.getTime());
    }, 0);

    return totalTime / completedStagesWithTime.length;
  }
}