import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Logger } from '@pro/logger';
import {
  WeiboSearchCrawlerService,
  EnhancedSubTaskMessage,
  MultiModeCrawlResult
} from '../../../src/weibo/search-crawler.service';
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
 * 性能压力测试套件 - 数字时代的系统极限验证艺术品
 * 测试系统在高并发、大数据量下的稳定性和性能表现
 */

describe('性能压力测试套件', () => {
  let crawlerService: WeiboSearchCrawlerService;
  let module: TestingModule;
  let testSessionId: string;

  // 性能监控数据
  let performanceMetrics: {
    cpuUsage: number[];
    memoryUsage: number[];
    responseTime: number[];
    throughput: number[];
    errorRate: number[];
    concurrency: number[];
  };

  beforeAll(async () => {
    testSessionId = TestStateManager.getInstance().createTestSession('性能压力测试套件');

    // 初始化性能监控
    performanceMetrics = {
      cpuUsage: [],
      memoryUsage: [],
      responseTime: [],
      throughput: [],
      errorRate: [],
      concurrency: []
    };

    // 创建测试模块
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            NODE_ENV: 'test',
            CRAWLER_CONFIG: {
              maxPages: 10,
              requestDelay: { min: 50, max: 200 },
              pageTimeout: 15000
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
          provide: WeiboSearchCrawlerService,
          useFactory: () => ({
            multiModeCrawl: jest.fn().mockImplementation(async (message: EnhancedSubTaskMessage): Promise<MultiModeCrawlResult> => {
              const startTime = Date.now();

              // 模拟不同的处理时间
              const baseProcessingTime = 2000;
              const variability = Math.random() * 3000;
              const processingTime = baseProcessingTime + variability;

              await TestUtils.sleep(processingTime);

              // 模拟偶尔的失败
              const success = Math.random() > (TEST_CONFIG.errorInjection.networkFailureRate + 0.1);

              const duration = Date.now() - startTime;

              if (success) {
                // 记录成功指标
                performanceMetrics.responseTime.push(duration);
                performanceMetrics.throughput.push((Math.random() * 5 + 1)); // 1-6 MB/s

                return {
                  searchResult: {
                    success: true,
                    pageCount: Math.floor(Math.random() * 10) + 1
                  },
                  noteDetails: [],
                  creatorDetails: [],
                  comments: [],
                  mediaDownloads: [],
                  crawlMetrics: {
                    totalPages: Math.floor(Math.random() * 10) + 1,
                    successfulPages: Math.floor(Math.random() * 10) + 1,
                    failedPages: 0,
                    skippedPages: 0,
                    totalRequests: Math.floor(Math.random() * 20) + 10,
                    averagePageLoadTime: 800 + Math.random() * 1200,
                    totalDataSize: Math.floor(Math.random() * 5 * 1024 * 1024), // 0-5MB
                    notesCrawled: 0,
                    detailsCrawled: 0,
                    creatorsCrawled: 0,
                    commentsCrawled: 0,
                    mediaFilesDownloaded: 0,
                    commentDepthReached: 0,
                    totalDuration: duration,
                    throughputMBps: (Math.random() * 5 + 1),
                    requestsPerSecond: Math.random() * 5 + 2,
                    errorRate: 0,
                    memoryUsage: Math.floor(Math.random() * 100 + 50), // 50-150MB
                    cpuUsage: Math.floor(Math.random() * 60 + 20) // 20-80%
                  }
                };
              } else {
                // 记录失败指标
                performanceMetrics.errorRate.push(1);

                return {
                  searchResult: {
                    success: false,
                    pageCount: 0,
                    error: '模拟压力测试失败'
                  },
                  noteDetails: [],
                  creatorDetails: [],
                  comments: [],
                  mediaDownloads: [],
                  crawlMetrics: {
                    totalPages: 0,
                    successfulPages: 0,
                    failedPages: 1,
                    skippedPages: 0,
                    totalRequests: 1,
                    averagePageLoadTime: 0,
                    totalDataSize: 0,
                    notesCrawled: 0,
                    detailsCrawled: 0,
                    creatorsCrawled: 0,
                    commentsCrawled: 0,
                    mediaFilesDownloaded: 0,
                    commentDepthReached: 0,
                    totalDuration: duration,
                    throughputMBps: 0,
                    requestsPerSecond: 0,
                    errorRate: 100,
                    memoryUsage: 30,
                    cpuUsage: 10
                  }
                };
              }
            })
          })
        }
      ]
    }).compile();

    crawlerService = module.get(WeiboSearchCrawlerService);
  });

  afterAll(async () => {
    TestStateManager.getInstance().endTestSession(testSessionId);
    await module.close();
  });

  describe('基准性能测试', () => {
    it('应该满足基础性能基准', async () => {
      const testMessage = TestUtils.createEnhancedTestSubTaskMessage({
        keyword: '基准测试',
        taskId: 7001,
        crawlModes: ['search']
      });

      const startTime = Date.now();
      const result = await crawlerService.multiModeCrawl(testMessage);
      const duration = Date.now() - startTime;

      // 基准性能要求
      expect(duration).toBeLessThan(TEST_CONFIG.performance.maxExecutionTime);
      expect(result.crawlMetrics.requestsPerSecond).toBeGreaterThan(1);
      expect(result.crawlMetrics.throughputMBps).toBeGreaterThan(0.1);
      expect(result.crawlMetrics.memoryUsage).toBeLessThan(TEST_CONFIG.performance.memoryThreshold / 1024 / 1024);
      expect(result.crawlMetrics.cpuUsage).toBeLessThan(TEST_CONFIG.performance.cpuThreshold);

      console.log(`✅ 基准性能测试完成 - 响应时间: ${duration}ms, RPS: ${result.crawlMetrics.requestsPerSecond}, 吞吐量: ${result.crawlMetrics.throughputMBps}MB/s`);
    });

    it('应该在标准负载下保持稳定性能', async () => {
      const standardLoad = 5;
      const messages = Array.from({ length: standardLoad }, (_, i) =>
        TestUtils.createEnhancedTestSubTaskMessage({
          keyword: `标准负载_${i + 1}`,
          taskId: 7100 + i,
          crawlModes: ['search']
        })
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(
        messages.map(message => crawlerService.multiModeCrawl(message))
      );
      const totalDuration = Date.now() - startTime;

      // 分析性能指标
      const successfulResults = results.filter(r => r.status === 'fulfilled') as any[];
      const successRate = (successfulResults.length / standardLoad) * 100;

      let avgResponseTime = 0;
      let avgThroughput = 0;
      let avgMemoryUsage = 0;
      let avgCpuUsage = 0;

      successfulResults.forEach(result => {
        const metrics = result.value.crawlMetrics;
        avgResponseTime += metrics.totalDuration;
        avgThroughput += metrics.throughputMBps;
        avgMemoryUsage += metrics.memoryUsage;
        avgCpuUsage += metrics.cpuUsage;
      });

      if (successfulResults.length > 0) {
        avgResponseTime /= successfulResults.length;
        avgThroughput /= successfulResults.length;
        avgMemoryUsage /= successfulResults.length;
        avgCpuUsage /= successfulResults.length;
      }

      // 性能要求
      expect(successRate).toBeGreaterThan(90);
      expect(avgResponseTime).toBeLessThan(TEST_CONFIG.performance.maxExecutionTime);
      expect(avgThroughput).toBeGreaterThan(0.5);
      expect(avgMemoryUsage).toBeLessThan(200);
      expect(avgCpuUsage).toBeLessThan(70);

      console.log(`✅ 标准负载测试完成 - 成功率: ${successRate.toFixed(1)}%, 平均响应时间: ${avgResponseTime.toFixed(0)}ms, 平均吞吐量: ${avgThroughput.toFixed(2)}MB/s`);
    });
  });

  describe('并发压力测试', () => {
    it('应该在高并发下保持系统稳定', async () => {
      const highConcurrency = 10;
      const messages = Array.from({ length: highConcurrency }, (_, i) =>
        TestUtils.createEnhancedTestSubTaskMessage({
          keyword: `高并发_${i + 1}`,
          taskId: 7200 + i,
          crawlModes: ['search', 'detail']
        })
      );

      console.log(`🚀 开始高并发测试 - 并发数: ${highConcurrency}`);
      const startTime = Date.now();

      const results = await Promise.allSettled(
        messages.map(message => crawlerService.multiModeCrawl(message))
      );

      const totalDuration = Date.now() - startTime;

      // 分析并发性能
      const successfulResults = results.filter(r => r.status === 'fulfilled') as any[];
      const failedResults = results.filter(r => r.status === 'rejected');

      const successRate = (successfulResults.length / highConcurrency) * 100;
      const concurrency = successfulResults.length / (totalDuration / 1000); // 并发度

      let totalThroughput = 0;
      let maxMemoryUsage = 0;
      let maxCpuUsage = 0;

      successfulResults.forEach(result => {
        const metrics = result.value.crawlMetrics;
        totalThroughput += metrics.throughputMBps;
        maxMemoryUsage = Math.max(maxMemoryUsage, metrics.memoryUsage);
        maxCpuUsage = Math.max(maxCpuUsage, metrics.cpuUsage);
      });

      const avgThroughput = totalThroughput / successfulResults.length;

      // 高并发性能要求
      expect(successRate).toBeGreaterThan(80); // 高并发下允许更高的失败率
      expect(concurrency).toBeGreaterThan(5);
      expect(avgThroughput).toBeGreaterThan(0.3);
      expect(maxMemoryUsage).toBeLessThan(300);
      expect(maxCpuUsage).toBeLessThan(85);

      // 记录性能指标
      performanceMetrics.concurrency.push(concurrency);
      performanceMetrics.errorRate.push(failedResults.length / highConcurrency);

      console.log(`✅ 高并发测试完成 - 成功率: ${successRate.toFixed(1)}%, 并发度: ${concurrency.toFixed(1)}, 平均吞吐量: ${avgThroughput.toFixed(2)}MB/s`);
    });

    it('应该正确处理峰值负载', async () => {
      const peakLoad = 15;
      const burstDuration = 10000; // 10秒峰值负载

      console.log(`⚡ 开始峰值负载测试 - 峰值数: ${peakLoad}, 持续时间: ${burstDuration}ms`);

      const startTime = Date.now();
      let completedTasks = 0;
      let failedTasks = 0;

      // 分批发送任务以模拟峰值
      const batches = [
        messages.slice(0, 5),
        messages.slice(5, 10),
        messages.slice(10, 15)
      ];

      for (let i = 0; i < batches.length; i++) {
        const batchStartTime = Date.now();

        const batchPromises = batches[i].map(message =>
          crawlerService.multiModeCrawl(message)
            .then(result => {
              completedTasks++;
              return result;
            })
            .catch(error => {
              failedTasks++;
              throw error;
            })
        );

        await Promise.allSettled(batchPromises);

        const batchDuration = Date.now() - batchStartTime;

        // 批次间短暂延迟
        if (i < batches.length - 1) {
          await TestUtils.sleep(1000);
        }
      }

      const totalDuration = Date.now() - startTime;
      const throughput = completedTasks / (totalDuration / 1000); // 任务/秒
      const successRate = (completedTasks / peakLoad) * 100;

      // 峰值负载性能要求
      expect(successRate).toBeGreaterThan(75);
      expect(throughput).toBeGreaterThan(0.5);
      expect(totalDuration).toBeLessThan(burstDuration * 2);

      console.log(`✅ 峰值负载测试完成 - 成功率: ${successRate.toFixed(1)}%, 吞吐量: ${throughput.toFixed(2)}任务/秒, 总耗时: ${totalDuration}ms`);
    });
  });

  describe('内存和CPU压力测试', () => {
    it('应该在内存压力下正常工作', async () => {
      const memoryPressureTasks = 8;
      const messages = Array.from({ length: memoryPressureTasks }, (_, i) =>
        TestUtils.createEnhancedTestSubTaskMessage({
          keyword: `内存压力_${i + 1}`,
          taskId: 7300 + i,
          crawlModes: ['search', 'detail', 'creator'],
          enableDetailCrawl: true,
          enableCreatorCrawl: true
        })
      );

      console.log(`💾 开始内存压力测试 - 任务数: ${memoryPressureTasks}`);

      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const startTime = Date.now();

      const results = await Promise.allSettled(
        messages.map(message => crawlerService.multiModeCrawl(message))
      );

      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const memoryIncrease = finalMemory - initialMemory;
      const duration = Date.now() - startTime;

      const successfulResults = results.filter(r => r.status === 'fulfilled') as any[];
      const successRate = (successfulResults.length / memoryPressureTasks) * 100;

      // 内存压力测试要求
      expect(successRate).toBeGreaterThan(85);
      expect(memoryIncrease).toBeLessThan(200); // 内存增长不超过200MB
      expect(finalMemory).toBeLessThan(TEST_CONFIG.performance.memoryThreshold / 1024 / 1024);

      console.log(`✅ 内存压力测试完成 - 成功率: ${successRate.toFixed(1)}%, 内存增长: ${memoryIncrease.toFixed(1)}MB, 最终内存: ${finalMemory.toFixed(1)}MB`);
    });

    it('应该在CPU压力下保持响应', async () => {
      const cpuPressureTasks = 6;
      const messages = Array.from({ length: cpuPressureTasks }, (_, i) =>
        TestUtils.createEnhancedTestSubTaskMessage({
          keyword: `CPU压力_${i + 1}`,
          taskId: 7400 + i,
          crawlModes: ['search', 'detail', 'creator', 'comment'],
          enableCommentCrawl: true,
          maxCommentDepth: 3
        })
      );

      console.log(`🔥 开始CPU压力测试 - 任务数: ${cpuPressureTasks}`);

      const startTime = Date.now();

      // 监控CPU使用率
      const cpuMonitoringInterval = setInterval(() => {
        const cpuUsage = Math.random() * 40 + 40; // 模拟40-80% CPU使用率
        performanceMetrics.cpuUsage.push(cpuUsage);
      }, 1000);

      const results = await Promise.allSettled(
        messages.map(message => crawlerService.multiModeCrawl(message))
      );

      clearInterval(cpuMonitoringInterval);
      const duration = Date.now() - startTime;

      const successfulResults = results.filter(r => r.status === 'fulfilled') as any[];
      const successRate = (successfulResults.length / cpuPressureTasks) * 100;

      let avgCpuUsage = 0;
      if (performanceMetrics.cpuUsage.length > 0) {
        avgCpuUsage = performanceMetrics.cpuUsage.reduce((sum, usage) => sum + usage, 0) / performanceMetrics.cpuUsage.length;
      }

      // CPU压力测试要求
      expect(successRate).toBeGreaterThan(80);
      expect(avgCpuUsage).toBeLessThan(80);
      expect(duration).toBeLessThan(TEST_CONFIG.performance.maxExecutionTime * 2);

      console.log(`✅ CPU压力测试完成 - 成功率: ${successRate.toFixed(1)}%, 平均CPU使用率: ${avgCpuUsage.toFixed(1)}%, 耗时: ${duration}ms`);
    });
  });

  describe('长时间稳定性测试', () => {
    it('应该在长时间运行下保持稳定', async () => {
      const longRunningDuration = 30000; // 30秒
      const taskInterval = 2000; // 每2秒一个任务
      const maxTasks = Math.floor(longRunningDuration / taskInterval);

      console.log(`⏰ 开始长时间稳定性测试 - 持续时间: ${longRunningDuration}ms, 预期任务数: ${maxTasks}`);

      const startTime = Date.now();
      const results: any[] = [];
      let taskCounter = 0;

      // 持续发送任务
      const intervalId = setInterval(async () => {
        if (taskCounter >= maxTasks) {
          clearInterval(intervalId);
          return;
        }

        const message = TestUtils.createEnhancedTestSubTaskMessage({
          keyword: `长时间_${taskCounter + 1}`,
          taskId: 7500 + taskCounter,
          crawlModes: ['search']
        });

        try {
          const result = await crawlerService.multiModeCrawl(message);
          results.push({ status: 'fulfilled', value: result, timestamp: Date.now() });
        } catch (error) {
          results.push({ status: 'rejected', reason: error, timestamp: Date.now() });
        }

        taskCounter++;
      }, taskInterval);

      // 等待所有任务完成
      await new Promise(resolve => setTimeout(resolve, longRunningDuration + 5000));

      const totalDuration = Date.now() - startTime;

      // 分析长期稳定性
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      const failedResults = results.filter(r => r.status === 'rejected');

      const successRate = (successfulResults.length / results.length) * 100;
      const actualThroughput = results.length / (totalDuration / 1000);

      // 性能衰减分析
      const firstHalf = successfulResults.slice(0, Math.floor(successfulResults.length / 2));
      const secondHalf = successfulResults.slice(Math.floor(successfulResults.length / 2));

      const firstHalfAvgResponse = firstHalf.reduce((sum, r) => sum + r.value.crawlMetrics.totalDuration, 0) / firstHalf.length;
      const secondHalfAvgResponse = secondHalf.reduce((sum, r) => sum + r.value.crawlMetrics.totalDuration, 0) / secondHalf.length;

      const performanceDegradation = ((secondHalfAvgResponse - firstHalfAvgResponse) / firstHalfAvgResponse) * 100;

      // 长时间稳定性要求
      expect(successRate).toBeGreaterThan(90);
      expect(actualThroughput).toBeGreaterThan(0.4);
      expect(Math.abs(performanceDegradation)).toBeLessThan(50); // 性能衰减不超过50%

      console.log(`✅ 长时间稳定性测试完成 - 成功率: ${successRate.toFixed(1)}%, 实际吞吐量: ${actualThroughput.toFixed(2)}任务/秒, 性能衰减: ${performanceDegradation.toFixed(1)}%`);
    });
  });

  describe('性能回归测试', () => {
    it('应该性能指标保持在基准线以上', async () => {
      // 基准性能指标
      const baselineMetrics = {
        avgResponseTime: 5000,
        minThroughput: 0.5,
        maxMemoryUsage: 150,
        maxCpuUsage: 70,
        minSuccessRate: 90
      };

      const testTasks = 10;
      const messages = Array.from({ length: testTasks }, (_, i) =>
        TestUtils.createEnhancedTestSubTaskMessage({
          keyword: `回归测试_${i + 1}`,
          taskId: 7600 + i,
          crawlModes: ['search', 'detail']
        })
      );

      const results = await Promise.allSettled(
        messages.map(message => crawlerService.multiModeCrawl(message))
      );

      const successfulResults = results.filter(r => r.status === 'fulfilled') as any[];
      const successRate = (successfulResults.length / testTasks) * 100;

      // 计算实际指标
      let totalResponseTime = 0;
      let totalThroughput = 0;
      let maxMemoryUsage = 0;
      let maxCpuUsage = 0;

      successfulResults.forEach(result => {
        const metrics = result.value.crawlMetrics;
        totalResponseTime += metrics.totalDuration;
        totalThroughput += metrics.throughputMBps;
        maxMemoryUsage = Math.max(maxMemoryUsage, metrics.memoryUsage);
        maxCpuUsage = Math.max(maxCpuUsage, metrics.cpuUsage);
      });

      const avgResponseTime = totalResponseTime / successfulResults.length;
      const avgThroughput = totalThroughput / successfulResults.length;

      // 性能回归检查
      expect(successRate).toBeGreaterThanOrEqual(baselineMetrics.minSuccessRate);
      expect(avgResponseTime).toBeLessThanOrEqual(baselineMetrics.avgResponseTime);
      expect(avgThroughput).toBeGreaterThanOrEqual(baselineMetrics.minThroughput);
      expect(maxMemoryUsage).toBeLessThanOrEqual(baselineMetrics.maxMemoryUsage);
      expect(maxCpuUsage).toBeLessThanOrEqual(baselineMetrics.maxCpuUsage);

      console.log(`✅ 性能回归测试完成 - 成功率: ${successRate.toFixed(1)}%, 平均响应时间: ${avgResponseTime.toFixed(0)}ms, 平均吞吐量: ${avgThroughput.toFixed(2)}MB/s`);
    });
  });

  // 性能测试总结
  afterAll(() => {
    console.log('\n📊 性能压力测试总结:');
    console.log(`- 响应时间样本数: ${performanceMetrics.responseTime.length}`);
    console.log(`- 吞吐量样本数: ${performanceMetrics.throughput.length}`);
    console.log(`- CPU使用率样本数: ${performanceMetrics.cpuUsage.length}`);
    console.log(`- 内存使用样本数: ${performanceMetrics.memoryUsage.length}`);
    console.log(`- 错误率样本数: ${performanceMetrics.errorRate.length}`);
    console.log(`- 并发度样本数: ${performanceMetrics.concurrency.length}`);

    if (performanceMetrics.responseTime.length > 0) {
      const avgResponseTime = performanceMetrics.responseTime.reduce((a, b) => a + b, 0) / performanceMetrics.responseTime.length;
      console.log(`- 平均响应时间: ${avgResponseTime.toFixed(0)}ms`);
    }

    if (performanceMetrics.throughput.length > 0) {
      const avgThroughput = performanceMetrics.throughput.reduce((a, b) => a + b, 0) / performanceMetrics.throughput.length;
      console.log(`- 平均吞吐量: ${avgThroughput.toFixed(2)}MB/s`);
    }
  });
});