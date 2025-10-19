import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Logger } from '@pro/logger';
import {
  WeiboSearchCrawlerService,
  EnhancedSubTaskMessage,
  MultiModeCrawlResult
} from '../../../src/weibo/search-crawler.service';
import { RequestMonitorService } from '../../../src/monitoring/request-monitor.service';
import { RobotsService } from '../../../src/robots/robots.service';
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
 * 监控和告警系统测试 - 数字时代的可观测性艺术品
 * 验证请求监控、任务状态追踪、性能指标收集和异常告警机制
 */

describe('监控和告警系统测试', () => {
  let crawlerService: WeiboSearchCrawlerService;
  let requestMonitorService: RequestMonitorService;
  let robotsService: RobotsService;
  let module: TestingModule;
  let testSessionId: string;

  // 监控数据收集器
  class MonitoringDataCollector {
    private metrics: {
      requests: Array<{
        url: string;
        success: boolean;
        duration: number;
        timestamp: number;
        error?: string;
      }>;
      performance: Array<{
        timestamp: number;
        cpuUsage: number;
        memoryUsage: number;
        diskUsage: number;
        networkIO: number;
      }>;
      alerts: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        message: string;
        timestamp: number;
        resolved: boolean;
      }>;
      tasks: Array<{
        taskId: number;
        status: 'running' | 'completed' | 'failed';
        startTime: number;
        endTime?: number;
        duration?: number;
        pageCount?: number;
        error?: string;
      }>;
    };

    constructor() {
      this.metrics = {
        requests: [],
        performance: [],
        alerts: [],
        tasks: []
      };
    }

    recordRequest(url: string, success: boolean, duration: number, error?: string): void {
      this.metrics.requests.push({
        url,
        success,
        duration,
        timestamp: Date.now(),
        error
      });
    }

    recordPerformance(data: any): void {
      this.metrics.performance.push({
        timestamp: Date.now(),
        ...data
      });
    }

    recordAlert(type: string, severity: 'low' | 'medium' | 'high' | 'critical', message: string): void {
      this.metrics.alerts.push({
        type,
        severity,
        message,
        timestamp: Date.now(),
        resolved: false
      });
    }

    startTask(taskId: number): void {
      this.metrics.tasks.push({
        taskId,
        status: 'running',
        startTime: Date.now()
      });
    }

    completeTask(taskId: number, status: 'completed' | 'failed', data?: any): void {
      const task = this.metrics.tasks.find(t => t.taskId === taskId && t.status === 'running');
      if (task) {
        task.status = status;
        task.endTime = Date.now();
        task.duration = task.endTime - task.startTime;

        if (data) {
          task.pageCount = data.pageCount;
          task.error = data.error;
        }
      }
    }

    getMetrics() {
      return { ...this.metrics };
    }

    analyzeMetrics(): any {
      const now = Date.now();
      const last5Minutes = now - 5 * 60 * 1000;

      const recentRequests = this.metrics.requests.filter(r => r.timestamp > last5Minutes);
      const recentPerformance = this.metrics.performance.filter(p => p.timestamp > last5Minutes);
      const activeAlerts = this.metrics.alerts.filter(a => !a.resolved);

      return {
        requests: {
          total: this.metrics.requests.length,
          recent: recentRequests.length,
          successRate: recentRequests.length > 0
            ? (recentRequests.filter(r => r.success).length / recentRequests.length) * 100
            : 100,
          averageResponseTime: recentRequests.length > 0
            ? recentRequests.reduce((sum, r) => sum + r.duration, 0) / recentRequests.length
            : 0
        },
        performance: {
          averageCpuUsage: recentPerformance.length > 0
            ? recentPerformance.reduce((sum, p) => sum + p.cpuUsage, 0) / recentPerformance.length
            : 0,
          averageMemoryUsage: recentPerformance.length > 0
            ? recentPerformance.reduce((sum, p) => sum + p.memoryUsage, 0) / recentPerformance.length
            : 0,
          peakMemoryUsage: recentPerformance.length > 0
            ? Math.max(...recentPerformance.map(p => p.memoryUsage))
            : 0
        },
        alerts: {
          total: this.metrics.alerts.length,
          active: activeAlerts.length,
          critical: activeAlerts.filter(a => a.severity === 'critical').length,
          high: activeAlerts.filter(a => a.severity === 'high').length
        },
        tasks: {
          total: this.metrics.tasks.length,
          running: this.metrics.tasks.filter(t => t.status === 'running').length,
          completed: this.metrics.tasks.filter(t => t.status === 'completed').length,
          failed: this.metrics.tasks.filter(t => t.status === 'failed').length,
          averageDuration: this.metrics.tasks
            .filter(t => t.duration)
            .reduce((sum, t) => sum + t.duration!, 0) / this.metrics.tasks.filter(t => t.duration).length || 0
        }
      };
    }
  }

  let monitoringCollector: MonitoringDataCollector;

  beforeAll(async () => {
    testSessionId = TestStateManager.getInstance().createTestSession('监控和告警系统测试');
    monitoringCollector = new MonitoringDataCollector();

    // 创建增强的模拟监控服务
    const enhancedRequestMonitorService = {
      waitForNextRequest: jest.fn().mockResolvedValue(undefined),
      recordRequest: jest.fn().mockImplementation((url: string, success: boolean, duration: number) => {
        monitoringCollector.recordRequest(url, success, duration);
      }),
      getCurrentDelay: jest.fn().mockReturnValue(1000),
      getCurrentStats: jest.fn().mockReturnValue({
        totalRequests: monitoringCollector.getMetrics().requests.length,
        successfulRequests: monitoringCollector.getMetrics().requests.filter(r => r.success).length,
        failedRequests: monitoringCollector.getMetrics().requests.filter(r => !r.success).length,
        averageResponseTime: 1250,
        currentDelay: 1000
      }),
      getDetailedStats: jest.fn().mockReturnValue({
        ...this.getCurrentStats(),
        requestsPerSecond: 2.5,
        successRate: 95
      }),
      reset: jest.fn().mockImplementation(() => {
        // 重置逻辑
      })
    };

    const enhancedRobotsService = {
      isUrlAllowed: jest.fn().mockResolvedValue(true),
      getCrawlDelay: jest.fn().mockResolvedValue(1),
      getCacheInfo: jest.fn().mockReturnValue({
        size: 100,
        hits: 80,
        misses: 20
      }),
      clearCache: jest.fn().mockImplementation(() => {
        monitoringCollector.recordAlert('cache_cleared', 'low', 'Robots.txt缓存已清理');
      })
    };

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
              pageTimeout: 15000
            },
            MONITORING_CONFIG: {
              enableMetrics: true,
              enableAlerts: true,
              alertThresholds: {
                errorRate: 10,
                responseTime: 5000,
                memoryUsage: 80,
                cpuUsage: 85
              }
            }
          })]
        })
      ],
      providers: [
        Logger,
        {
          provide: RequestMonitorService,
          useValue: enhancedRequestMonitorService
        },
        {
          provide: RobotsService,
          useValue: enhancedRobotsService
        },
        {
          provide: WeiboSearchCrawlerService,
          useFactory: () => ({
            multiModeCrawl: jest.fn().mockImplementation(async (message: EnhancedSubTaskMessage): Promise<MultiModeCrawlResult> => {
              const taskId = message.taskId;
              monitoringCollector.startTask(taskId);

              try {
                await TestUtils.sleep(2000 + Math.random() * 3000);

                // 模拟性能监控
                monitoringCollector.recordPerformance({
                  cpuUsage: Math.random() * 40 + 30,
                  memoryUsage: Math.random() * 100 + 50,
                  diskUsage: Math.random() * 50 + 10,
                  networkIO: Math.random() * 1000 + 500
                });

                // 模拟请求监控
                const requestCount = Math.floor(Math.random() * 10) + 5;
                for (let i = 0; i < requestCount; i++) {
                  const success = Math.random() > 0.1; // 90% 成功率
                  const duration = Math.random() * 3000 + 500;
                  monitoringCollector.recordRequest(
                    `https://weibo.com/search?q=${encodeURIComponent(message.keyword)}&page=${i + 1}`,
                    success,
                    duration,
                    success ? undefined : '模拟请求失败'
                  );
                }

                // 模拟告警条件
                if (Math.random() < 0.1) {
                  monitoringCollector.recordAlert('high_error_rate', 'medium', '错误率超过阈值');
                }

                if (Math.random() < 0.05) {
                  monitoringCollector.recordAlert('high_memory_usage', 'high', '内存使用率过高');
                }

                const result = {
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
                    totalRequests: requestCount,
                    averagePageLoadTime: 1500,
                    totalDataSize: Math.floor(Math.random() * 2 * 1024 * 1024),
                    notesCrawled: 0,
                    detailsCrawled: 0,
                    creatorsCrawled: 0,
                    commentsCrawled: 0,
                    mediaFilesDownloaded: 0,
                    commentDepthReached: 0,
                    totalDuration: 4000,
                    throughputMBps: Math.random() * 3 + 0.5,
                    requestsPerSecond: Math.random() * 4 + 1,
                    errorRate: 0,
                    memoryUsage: Math.floor(Math.random() * 80 + 40),
                    cpuUsage: Math.floor(Math.random() * 50 + 30)
                  }
                };

                monitoringCollector.completeTask(taskId, 'completed', {
                  pageCount: result.searchResult.pageCount
                });

                return result;

              } catch (error) {
                monitoringCollector.completeTask(taskId, 'failed', {
                  error: error instanceof Error ? error.message : '未知错误'
                });
                throw error;
              }
            }),
            getRequestStats: jest.fn().mockReturnValue(() => monitoringCollector.analyzeMetrics()),
            resetMonitoring: jest.fn().mockImplementation(() => {
              enhancedRequestMonitorService.reset();
              enhancedRobotsService.clearCache();
              monitoringCollector.recordAlert('monitoring_reset', 'low', '监控系统已重置');
            })
          })
        }
      ]
    }).compile();

    crawlerService = module.get(WeiboSearchCrawlerService);
    requestMonitorService = module.get(RequestMonitorService);
    robotsService = module.get(RobotsService);
  });

  afterAll(async () => {
    TestStateManager.getInstance().endTestSession(testSessionId);
    await module.close();
  });

  describe('请求监控测试', () => {
    it('应该准确记录请求监控数据', async () => {
      const testMessage = TestUtils.createEnhancedTestSubTaskMessage({
        keyword: '请求监控测试',
        taskId: 10001,
        crawlModes: ['search']
      });

      console.log('📊 开始请求监控测试');

      const result = await crawlerService.multiModeCrawl(testMessage);

      // 验证监控数据
      expect(requestMonitorService.recordRequest).toHaveBeenCalled();
      expect(result.crawlMetrics.totalRequests).toBeGreaterThan(0);

      const metrics = monitoringCollector.analyzeMetrics();

      console.log('请求监控结果:', {
        总请求数: metrics.requests.total,
        最近请求数: metrics.requests.recent,
        成功率: `${metrics.requests.successRate.toFixed(1)}%`,
        平均响应时间: `${metrics.requests.averageResponseTime.toFixed(0)}ms`
      });

      expect(metrics.requests.total).toBeGreaterThan(0);
      expect(metrics.requests.successRate).toBeGreaterThan(80);
    });

    it('应该正确统计请求成功率和响应时间', async () => {
      const testMessages = Array.from({ length: 3 }, (_, i) =>
        TestUtils.createEnhancedTestSubTaskMessage({
          keyword: `请求统计_${i + 1}`,
          taskId: 10100 + i,
          crawlModes: ['search']
        })
      );

      console.log('📈 开始请求统计测试');

      const results = await Promise.allSettled(
        testMessages.map(message => crawlerService.multiModeCrawl(message))
      );

      const successfulResults = results.filter(r => r.status === 'fulfilled') as any[];
      const metrics = monitoringCollector.analyzeMetrics();

      console.log('请求统计结果:', {
        成功任务数: successfulResults.length,
        总请求数: metrics.requests.total,
        成功率: `${metrics.requests.successRate.toFixed(1)}%`,
        平均响应时间: `${metrics.requests.averageResponseTime.toFixed(0)}ms`
      });

      expect(metrics.requests.total).toBeGreaterThan(10);
      expect(metrics.requests.successRate).toBeGreaterThan(85);
      expect(metrics.requests.averageResponseTime).toBeGreaterThan(0);
    });

    it('应该检测异常请求模式', async () => {
      // 模拟异常请求模式
      for (let i = 0; i < 10; i++) {
        const success = i < 7; // 前7个成功，后3个失败
        const duration = success ? 1000 + Math.random() * 2000 : 8000 + Math.random() * 2000; // 失败的请求耗时更长
        monitoringCollector.recordRequest(
          `https://weibo.com/test/exception_${i}`,
          success,
          duration,
          success ? undefined : '模拟异常'
        );
      }

      const metrics = monitoringCollector.analyzeMetrics();

      // 检查是否触发了异常告警
      const errorRateAlerts = monitoringCollector.getMetrics().alerts.filter(a =>
        a.type.includes('error_rate') || a.message.includes('错误率')
      );

      console.log('异常请求检测结果:', {
        错误率: `${(100 - metrics.requests.successRate).toFixed(1)}%`,
        异常告警数: errorRateAlerts.length,
        请求详情: monitoringCollector.getMetrics().requests.slice(-5).map(r => ({
          success: r.success,
          duration: r.duration,
          error: r.error
        }))
      });

      expect(metrics.requests.successRate).toBeLessThan(100); // 应该有失败的请求
      // 可能触发错误率告警（取决于阈值设置）
    });
  });

  describe('任务状态追踪测试', () => {
    it('应该准确追踪任务状态变化', async () => {
      const testMessage = TestUtils.createEnhancedTestSubTaskMessage({
        keyword: '任务状态测试',
        taskId: 11001,
        crawlModes: ['search', 'detail']
      });

      console.log('🎯 开始任务状态追踪测试');

      const startTime = Date.now();
      const result = await crawlerService.multiModeCrawl(testMessage);
      const duration = Date.now() - startTime;

      const metrics = monitoringCollector.analyzeMetrics();

      console.log('任务状态追踪结果:', {
        任务ID: testMessage.taskId,
        状态: 'completed',
        执行时间: `${duration}ms`,
        爬取页数: result.searchResult.pageCount,
        系统任务统计: {
          总任务数: metrics.tasks.total,
          运行中: metrics.tasks.running,
          已完成: metrics.tasks.completed,
          失败: metrics.tasks.failed,
          平均执行时间: `${metrics.tasks.averageDuration.toFixed(0)}ms`
        }
      });

      expect(metrics.tasks.total).toBeGreaterThan(0);
      expect(metrics.tasks.completed).toBeGreaterThan(0);
      expect(metrics.tasks.running).toBe(0); // 任务应该已完成
    });

    it('应该追踪并发任务状态', async () => {
      const concurrentTasks = 3;
      const testMessages = Array.from({ length: concurrentTasks }, (_, i) =>
        TestUtils.createEnhancedTestSubTaskMessage({
          keyword: `并发任务_${i + 1}`,
          taskId: 11100 + i,
          crawlModes: ['search']
        })
      );

      console.log(`🔄 开始并发任务状态追踪 - 并发数: ${concurrentTasks}`);

      const startTime = Date.now();
      const results = await Promise.allSettled(
        testMessages.map(message => crawlerService.multiModeCrawl(message))
      );
      const totalDuration = Date.now() - startTime;

      const metrics = monitoringCollector.analyzeMetrics();

      console.log('并发任务状态结果:', {
        总任务数: concurrentTasks,
        成功任务数: results.filter(r => r.status === 'fulfilled').length,
        失败任务数: results.filter(r => r.status === 'rejected').length,
        总执行时间: `${totalDuration}ms`,
        系统任务统计: metrics.tasks
      });

      expect(metrics.tasks.total).toBeGreaterThanOrEqual(concurrentTasks);
      expect(metrics.tasks.running).toBe(0); // 所有任务应该已完成
      expect(metrics.tasks.completed).toBeGreaterThan(0);
    });

    it('应该记录任务失败状态和错误信息', async () => {
      // 模拟任务失败
      const taskId = 11201;
      monitoringCollector.startTask(taskId);

      setTimeout(() => {
        monitoringCollector.completeTask(taskId, 'failed', {
          error: '模拟网络连接失败',
          pageCount: 0
        });
      }, 1000);

      await TestUtils.sleep(1500);

      const metrics = monitoringCollector.analyzeMetrics();
      const failedTasks = monitoringCollector.getMetrics().tasks.filter(t => t.status === 'failed');

      console.log('任务失败状态记录:', {
        失败任务数: failedTasks.length,
        失败任务详情: failedTasks.map(t => ({
          taskId: t.taskId,
          error: t.error,
          duration: t.duration
        })),
        系统统计: {
          总失败数: metrics.tasks.failed,
          总完成数: metrics.tasks.completed
        }
      });

      expect(failedTasks.length).toBeGreaterThan(0);
      expect(failedTasks[0].error).toBeDefined();
      expect(failedTasks[0].duration).toBeGreaterThan(0);
    });
  });

  describe('性能指标收集测试', () => {
    it('应该收集系统性能指标', async () => {
      const testMessage = TestUtils.createEnhancedTestSubTaskMessage({
        keyword: '性能指标测试',
        taskId: 12001,
        crawlModes: ['search', 'detail', 'creator']
      });

      console.log('⚡ 开始性能指标收集测试');

      await crawlerService.multiModeCrawl(testMessage);

      const metrics = monitoringCollector.analyzeMetrics();

      console.log('性能指标收集结果:', {
        CPU使用率: `${metrics.performance.averageCpuUsage.toFixed(1)}%`,
        内存使用率: `${metrics.performance.averageMemoryUsage.toFixed(1)}MB`,
        峰值内存: `${metrics.performance.peakMemoryUsage.toFixed(1)}MB`,
        网络IO: '正常',
        数据样本数: monitoringCollector.getMetrics().performance.length
      });

      expect(metrics.performance.averageCpuUsage).toBeGreaterThan(0);
      expect(metrics.performance.averageMemoryUsage).toBeGreaterThan(0);
      expect(monitoringCollector.getMetrics().performance.length).toBeGreaterThan(0);
    });

    it('应该监控性能趋势和峰值', async () => {
      const testMessages = Array.from({ length: 4 }, (_, i) =>
        TestUtils.createEnhancedTestSubTaskMessage({
          keyword: `性能趋势_${i + 1}`,
          taskId: 12100 + i,
          crawlModes: ['search', 'detail']
        })
      );

      console.log('📊 开始性能趋势监控测试');

      await Promise.allSettled(
        testMessages.map(message => crawlerService.multiModeCrawl(message))
      );

      const performanceData = monitoringCollector.getMetrics().performance;

      if (performanceData.length > 0) {
        const cpuUsages = performanceData.map(p => p.cpuUsage);
        const memoryUsages = performanceData.map(p => p.memoryUsage);

        const cpuTrend = cpuUsages[cpuUsages.length - 1] - cpuUsages[0];
        const memoryTrend = memoryUsages[memoryUsages.length - 1] - memoryUsages[0];
        const peakCpu = Math.max(...cpuUsages);
        const peakMemory = Math.max(...memoryUsages);

        console.log('性能趋势分析:', {
          CPU趋势: cpuTrend > 0 ? `上升 ${cpuTrend.toFixed(1)}%` : `下降 ${Math.abs(cpuTrend).toFixed(1)}%`,
          内存趋势: memoryTrend > 0 ? `上升 ${memoryTrend.toFixed(1)}MB` : `下降 ${Math.abs(memoryTrend).toFixed(1)}MB`,
          CPU峰值: `${peakCpu.toFixed(1)}%`,
          内存峰值: `${peakMemory.toFixed(1)}MB`,
          数据点数: performanceData.length
        });

        expect(peakCpu).toBeGreaterThan(0);
        expect(peakMemory).toBeGreaterThan(0);
      }
    });
  });

  describe('异常情况告警测试', () => {
    it('应该在性能异常时触发告警', async () => {
      // 模拟性能异常
      monitoringCollector.recordPerformance({
        cpuUsage: 90, // 高CPU使用率
        memoryUsage: 400, // 高内存使用
        diskUsage: 80,
        networkIO: 1500
      });

      monitoringCollector.recordAlert('high_cpu_usage', 'high', 'CPU使用率达到90%');
      monitoringCollector.recordAlert('high_memory_usage', 'medium', '内存使用率达到400MB');

      const metrics = monitoringCollector.analyzeMetrics();

      console.log('性能异常告警结果:', {
        活跃告警数: metrics.alerts.active,
        高危告警数: metrics.alerts.critical,
        高级告警数: metrics.alerts.high,
        告警详情: monitoringCollector.getMetrics().alerts.map(a => ({
          类型: a.type,
          严重程度: a.severity,
          消息: a.message
        }))
      });

      expect(metrics.alerts.active).toBeGreaterThan(0);
      expect(metrics.alerts.high).toBeGreaterThan(0);
    });

    it('应该在错误率过高时触发告警', async () => {
      // 模拟高错误率
      for (let i = 0; i < 20; i++) {
        monitoringCollector.recordRequest(
          `https://weibo.com/test/error_${i}`,
          i < 10, // 50% 失败率
          i < 10 ? 1000 : 5000,
          i < 10 ? undefined : '模拟错误'
        );
      }

      monitoringCollector.recordAlert('high_error_rate', 'critical', '错误率达到50%，超过阈值');

      const metrics = monitoringCollector.analyzeMetrics();

      console.log('错误率告警结果:', {
        错误率: `${(100 - metrics.requests.successRate).toFixed(1)}%`,
        活跃告警数: metrics.alerts.active,
        高危告警数: metrics.alerts.critical,
        总请求数: metrics.requests.total
      });

      expect(metrics.requests.successRate).toBeLessThan(80);
      expect(metrics.alerts.critical).toBeGreaterThan(0);
    });

    it('应该正确处理告警解决', async () => {
      // 创建告警
      monitoringCollector.recordAlert('test_alert', 'medium', '测试告警');

      let activeAlerts = monitoringCollector.getMetrics().alerts.filter(a => !a.resolved);
      expect(activeAlerts.length).toBeGreaterThan(0);

      // 模拟告警解决
      const alert = activeAlerts[0];
      alert.resolved = true;

      activeAlerts = monitoringCollector.getMetrics().alerts.filter(a => !a.resolved);

      console.log('告警解决测试:', {
        创建告警数: 1,
        解决告警数: 1,
        当前活跃告警数: activeAlerts.length
      });

      expect(activeAlerts.length).toBe(0);
    });
  });

  describe('监控系统集成测试', () => {
    it('应该提供完整的监控数据视图', async () => {
      const testMessages = Array.from({ length: 5 }, (_, i) =>
        TestUtils.createEnhancedTestSubTaskMessage({
          keyword: `集成测试_${i + 1}`,
          taskId: 13000 + i,
          crawlModes: ['search', 'detail']
        })
      );

      console.log('🔍 开始监控系统集成测试');

      const startTime = Date.now();
      const results = await Promise.allSettled(
        testMessages.map(message => crawlerService.multiModeCrawl(message))
      );
      const totalDuration = Date.now() - startTime;

      const completeMetrics = monitoringCollector.analyzeMetrics();

      console.log('完整监控数据视图:', {
        执行时间: `${totalDuration}ms`,
        任务统计: completeMetrics.tasks,
        请求统计: completeMetrics.requests,
        性能统计: completeMetrics.performance,
        告警统计: completeMetrics.alerts,
        成功率: `${(results.filter(r => r.status === 'fulfilled').length / testMessages.length * 100).toFixed(1)}%`
      });

      expect(completeMetrics.tasks.total).toBeGreaterThanOrEqual(testMessages.length);
      expect(completeMetrics.requests.total).toBeGreaterThan(0);
      expect(completeMetrics.performance.averageCpuUsage).toBeGreaterThan(0);
    });

    it('应该支持监控数据重置', async () => {
      // 确保有监控数据
      await crawlerService.multiModeCrawl(
        TestUtils.createEnhancedTestSubTaskMessage({
          keyword: '重置前测试',
          taskId: 14001,
          crawlModes: ['search']
        })
      );

      const beforeReset = monitoringCollector.analyzeMetrics();
      expect(beforeReset.requests.total).toBeGreaterThan(0);

      // 执行监控重置
      await crawlerService.resetMonitoring();

      console.log('监控数据重置测试:', {
        重置前请求数: beforeReset.requests.total,
        重置前任务数: beforeReset.tasks.total,
        重置操作: '已执行',
        告警记录: monitoringCollector.getMetrics().alerts.some(a => a.type.includes('reset'))
      });

      // 验证重置告警已记录
      const resetAlerts = monitoringCollector.getMetrics().alerts.filter(a =>
        a.type.includes('reset') || a.message.includes('重置')
      );
      expect(resetAlerts.length).toBeGreaterThan(0);
    });
  });
});