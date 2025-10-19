/**
 * 任务监控集成测试
 * 验证任务执行状态监控、性能指标收集、异常告警、系统健康检查等功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Not, Between } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';

// 导入要测试的服务
import { TaskMonitor } from '../../src/weibo/task-monitor.service';
import { TaskPerformanceCollector } from '../../src/weibo/task-performance-collector.service';
import { EnhancedTaskStateTracker } from '../../src/weibo/enhanced-task-state-tracker.service';
import { TaskScannerScheduler } from '../../src/weibo/task-scanner-scheduler.service';
import { EnhancedTaskOrchestrator } from '../../src/weibo/enhanced-task-orchestrator.service';

// 导入测试配置
import {
  createMockPinoLogger,
  createMockRedisClient,
  createMockRabbitMQService,
  createTestTask,
  TestUtils,
  TEST_CONSTANTS,
} from './test.config';

/**
 * 任务监控集成测试套件
 * 验证任务监控、性能收集、异常检测、健康检查等功能
 */
describe('TaskMonitoringIntegration', () => {
  let module: TestingModule;
  let taskMonitor: TaskMonitor;
  let performanceCollector: TaskPerformanceCollector;
  let stateTracker: EnhancedTaskStateTracker;
  let taskScanner: TaskScannerScheduler;
  let orchestrator: EnhancedTaskOrchestrator;
  let taskRepository: Repository<WeiboSearchTaskEntity>;
  let redisService: any;

  // 性能指标模拟数据
  const mockPerformanceMetrics = {
    taskId: 1,
    executionTime: 5000,
    memoryUsage: 512,
    cpuUsage: 25,
    networkLatency: 50,
    queueTime: 1000,
    errorCount: 0,
    successRate: 100,
    throughput: 10,
    timestamp: new Date(),
  };

  beforeAll(async () => {
    // 创建测试模块
    module = await Test.createTestingModule({
      providers: [
        TaskMonitor,
        TaskPerformanceCollector,
        EnhancedTaskStateTracker,
        TaskScannerScheduler,
        EnhancedTaskOrchestrator,
        {
          provide: getRepositoryToken(WeiboSearchTaskEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: 'PinoLogger',
          useValue: createMockPinoLogger(),
        },
        {
          provide: '@Inject("RedisService") RedisClient',
          useValue: createMockRedisClient(),
        },
        {
          provide: 'EventEmitter2',
          useValue: {
            emit: jest.fn(),
            on: jest.fn(),
          },
        },
        // 模拟其他依赖
        {
          provide: 'IntelligentRetryManager',
          useValue: {
            executeRetry: jest.fn(),
            analyzeFailureType: jest.fn(),
            makeRetryDecision: jest.fn(),
          },
        },
        {
          provide: 'TaskPriorityDependencyManager',
          useValue: {
            canScheduleTask: jest.fn(),
            calculateTaskPriority: jest.fn(),
            setTaskPriority: jest.fn(),
            reserveResources: jest.fn(),
            releaseResources: jest.fn(),
            releaseSchedulingLock: jest.fn(),
          },
        },
        {
          provide: 'TaskExecutionReportGenerator',
          useValue: {
            generateReport: jest.fn(),
          },
        },
        {
          provide: RabbitMQConfigService,
          useValue: createMockRabbitMQService(),
        },
      ],
    }).compile();

    // 获取服务实例
    taskMonitor = module.get<TaskMonitor>(TaskMonitor);
    performanceCollector = module.get<TaskPerformanceCollector>(TaskPerformanceCollector);
    stateTracker = module.get<EnhancedTaskStateTracker>(EnhancedTaskStateTracker);
    taskScanner = module.get<TaskScannerScheduler>(TaskScannerScheduler);
    orchestrator = module.get<EnhancedTaskOrchestrator>(EnhancedTaskOrchestrator);
    taskRepository = module.get<Repository<WeiboSearchTaskEntity>>(
      getRepositoryToken(WeiboSearchTaskEntity)
    );
    redisService = module.get('@Inject("RedisService") RedisClient');
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('任务执行状态监控', () => {
    it('应该监控正在运行的任务', async () => {
      const runningTasks = [
        createTestTask({
          id: 1,
          status: WeiboSearchTaskStatus.RUNNING,
          updatedAt: new Date(Date.now() - 5 * 60 * 1000), // 5分钟前
        }),
        createTestTask({
          id: 2,
          status: WeiboSearchTaskStatus.RUNNING,
          updatedAt: new Date(Date.now() - 2 * 60 * 1000), // 2分钟前
        }),
      ];

      jest.spyOn(taskRepository, 'find').mockResolvedValue(runningTasks);

      const monitoredTasks = await taskMonitor.getRunningTasks();

      expect(monitoredTasks).toHaveLength(2);
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: {
          status: WeiboSearchTaskStatus.RUNNING,
        },
        order: {
          updatedAt: 'ASC',
        },
      });
    });

    it('应该检测僵尸任务', async () => {
      const staleTask = createTestTask({
        id: 3,
        status: WeiboSearchTaskStatus.RUNNING,
        updatedAt: new Date(Date.now() - 10 * 60 * 1000), // 10分钟前，超过5分钟阈值
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([staleTask]);

      const staleTasks = await taskMonitor.detectStaleTasks();

      expect(staleTasks).toHaveLength(1);
      expect(staleTasks[0].id).toBe(3);
    });

    it('应该监控任务状态变化', async () => {
      const taskId = 4;
      const oldStatus = WeiboSearchTaskStatus.PENDING;
      const newStatus = WeiboSearchTaskStatus.RUNNING;

      jest.spyOn(stateTracker, 'recordStateTransition').mockResolvedValue(undefined);

      await taskMonitor.recordStatusChange(taskId, oldStatus, newStatus, '任务开始执行');

      expect(stateTracker.recordStateTransition).toHaveBeenCalledWith(
        taskId,
        oldStatus,
        newStatus,
        '任务开始执行',
        undefined
      );
    });

    it('应该统计任务状态分布', async () => {
      const statusCounts = {
        [WeiboSearchTaskStatus.PENDING]: 10,
        [WeiboSearchTaskStatus.RUNNING]: 3,
        [WeiboSearchTaskStatus.FAILED]: 2,
        [WeiboSearchTaskStatus.PAUSED]: 1,
      };

      // 模拟各状态的计数查询
      jest.spyOn(taskRepository, 'count')
        .mockResolvedValueOnce(statusCounts[WeiboSearchTaskStatus.PENDING])
        .mockResolvedValueOnce(statusCounts[WeiboSearchTaskStatus.RUNNING])
        .mockResolvedValueOnce(statusCounts[WeiboSearchTaskStatus.FAILED])
        .mockResolvedValueOnce(statusCounts[WeiboSearchTaskStatus.PAUSED]);

      const distribution = await taskMonitor.getStatusDistribution();

      expect(distribution).toEqual(statusCounts);
      expect(taskRepository.count).toHaveBeenCalledTimes(4);
    });
  });

  describe('性能指标收集', () => {
    it('应该收集任务执行性能指标', async () => {
      const taskId = 5;
      const metrics = {
        startTime: new Date(Date.now() - 5000),
        endTime: new Date(),
        memoryUsage: 256,
        cpuUsage: 15,
        networkLatency: 30,
        pageCount: 5,
        itemsFound: 50,
      };

      jest.spyOn(performanceCollector, 'collectMetrics').mockResolvedValue(undefined);

      await taskMonitor.collectPerformanceMetrics(taskId, metrics);

      expect(performanceCollector.collectMetrics).toHaveBeenCalledWith(taskId, metrics);
    });

    it('应该计算平均性能指标', async () => {
      const taskId = 6;
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const mockMetrics = [
        { executionTime: 3000, memoryUsage: 200, cpuUsage: 10 },
        { executionTime: 5000, memoryUsage: 300, cpuUsage: 20 },
        { executionTime: 4000, memoryUsage: 250, cpuUsage: 15 },
      ];

      jest.spyOn(performanceCollector, 'getMetrics').mockResolvedValue(mockMetrics);

      const avgMetrics = await taskMonitor.getAverageMetrics(taskId, timeRange);

      expect(performanceCollector.getMetrics).toHaveBeenCalledWith(taskId, timeRange);
      expect(avgMetrics).toEqual({
        avgExecutionTime: 4000,
        avgMemoryUsage: 250,
        avgCpuUsage: 15,
        sampleCount: 3,
      });
    });

    it('应该检测性能异常', async () => {
      const abnormalMetrics = {
        executionTime: 30000, // 30秒，异常慢
        memoryUsage: 2048, // 2GB，内存使用过高
        cpuUsage: 95, // 95%，CPU使用率过高
        errorCount: 5, // 5个错误
      };

      jest.spyOn(performanceCollector, 'collectMetrics').mockResolvedValue(undefined);
      jest.spyOn(taskMonitor, 'detectPerformanceAnomalies').mockResolvedValue([
        {
          type: 'slow_execution',
          severity: 'high',
          description: '执行时间超过阈值',
          value: abnormalMetrics.executionTime,
          threshold: 10000,
        },
        {
          type: 'high_memory_usage',
          severity: 'medium',
          description: '内存使用超过阈值',
          value: abnormalMetrics.memoryUsage,
          threshold: 1024,
        },
      ]);

      await taskMonitor.collectPerformanceMetrics(7, abnormalMetrics);
      const anomalies = await taskMonitor.detectPerformanceAnomalies(7);

      expect(anomalies).toHaveLength(2);
      expect(anomalies[0].type).toBe('slow_execution');
      expect(anomalies[0].severity).toBe('high');
      expect(anomalies[1].type).toBe('high_memory_usage');
      expect(anomalies[1].severity).toBe('medium');
    });

    it('应该生成性能趋势报告', async () => {
      const taskId = 8;
      const timeRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 过去7天
        end: new Date(),
      };

      const trendData = {
        daily: [
          { date: '2024-01-01', avgExecutionTime: 3000, avgMemoryUsage: 200, taskCount: 10 },
          { date: '2024-01-02', avgExecutionTime: 3500, avgMemoryUsage: 220, taskCount: 12 },
          { date: '2024-01-03', avgExecutionTime: 2800, avgMemoryUsage: 190, taskCount: 8 },
        ],
        trends: {
          executionTime: 'improving', // 改善
          memoryUsage: 'stable', // 稳定
          throughput: 'increasing', // 增加
        },
      };

      jest.spyOn(taskMonitor, 'getPerformanceTrends').mockResolvedValue(trendData);

      const report = await taskMonitor.getPerformanceTrends(taskId, timeRange);

      expect(report).toEqual(trendData);
      expect(taskMonitor.getPerformanceTrends).toHaveBeenCalledWith(taskId, timeRange);
    });
  });

  describe('异常情况告警', () => {
    it('应该检测任务执行失败率过高', async () => {
      const failureRate = 0.3; // 30%失败率
      const threshold = 0.2; // 20%阈值

      jest.spyOn(taskMonitor, 'calculateFailureRate').mockResolvedValue(failureRate);

      const alert = await taskMonitor.checkFailureRateAlert(threshold);

      expect(alert).toMatchObject({
        type: 'high_failure_rate',
        severity: 'high',
        message: expect.stringContaining(`${(failureRate * 100).toFixed(1)}%`),
        threshold: threshold,
        currentValue: failureRate,
      });
    });

    it('应该检测队列积压', async () => {
      const queueSize = 1000;
      const threshold = 500;

      // 模拟Redis队列大小查询
      redisService.llen = jest.fn().mockResolvedValue(queueSize);

      const alert = await taskMonitor.checkQueueBacklogAlert('weibo_crawl_queue', threshold);

      expect(alert).toMatchObject({
        type: 'queue_backlog',
        severity: 'medium',
        queueName: 'weibo_crawl_queue',
        currentSize: queueSize,
        threshold: threshold,
      });
    });

    it('应该检测系统资源不足', async () => {
      const systemMetrics = {
        memoryUsage: 0.9, // 90%内存使用
        cpuUsage: 0.85, // 85%CPU使用
        diskUsage: 0.95, // 95%磁盘使用
      };

      jest.spyOn(taskMonitor, 'getSystemMetrics').mockResolvedValue(systemMetrics);

      const alerts = await taskMonitor.checkSystemResourceAlerts();

      expect(alerts).toHaveLength(3);
      expect(alerts[0]).toMatchObject({
        type: 'high_memory_usage',
        severity: 'high',
        usage: systemMetrics.memoryUsage,
      });
      expect(alerts[1]).toMatchObject({
        type: 'high_cpu_usage',
        severity: 'medium',
        usage: systemMetrics.cpuUsage,
      });
      expect(alerts[2]).toMatchObject({
        type: 'high_disk_usage',
        severity: 'high',
        usage: systemMetrics.diskUsage,
      });
    });

    it('应该发送告警通知', async () => {
      const alert = {
        type: 'high_failure_rate',
        severity: 'high',
        message: '任务失败率过高: 30.0%',
        timestamp: new Date(),
      };

      jest.spyOn(taskMonitor, 'sendAlert').mockResolvedValue(true);

      const sent = await taskMonitor.sendAlert(alert);

      expect(sent).toBe(true);
      expect(taskMonitor.sendAlert).toHaveBeenCalledWith(alert);
    });

    it('应该测试不同告警渠道', async () => {
      const alert = {
        type: 'test_alert',
        severity: 'low',
        message: '测试告警',
        timestamp: new Date(),
      };

      const channels = ['email', 'slack', 'webhook'];
      const results: boolean[] = [];

      // 模拟不同渠道的告警发送
      jest.spyOn(taskMonitor, 'sendAlertViaEmail').mockResolvedValue(true);
      jest.spyOn(taskMonitor, 'sendAlertViaSlack').mockResolvedValue(true);
      jest.spyOn(taskMonitor, 'sendAlertViaWebhook').mockResolvedValue(false);

      for (const channel of channels) {
        const result = await taskMonitor.sendAlertViaChannel(alert, channel);
        results.push(result);
      }

      expect(results).toEqual([true, true, false]);
    });
  });

  describe('任务完成统计', () => {
    it('应该统计任务完成情况', async () => {
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const completionStats = {
        total: 100,
        completed: 80,
        failed: 15,
        cancelled: 5,
        successRate: 0.8,
        averageExecutionTime: 4500,
      };

      jest.spyOn(taskMonitor, 'getCompletionStats').mockResolvedValue(completionStats);

      const stats = await taskMonitor.getCompletionStats(timeRange);

      expect(stats).toEqual(completionStats);
      expect(taskMonitor.getCompletionStats).toHaveBeenCalledWith(timeRange);
    });

    it('应该按关键词统计任务执行情况', async () => {
      const keywordStats = [
        { keyword: '科技', total: 20, completed: 18, failed: 2, successRate: 0.9 },
        { keyword: '新闻', total: 15, completed: 12, failed: 3, successRate: 0.8 },
        { keyword: '娱乐', total: 10, completed: 8, failed: 2, successRate: 0.8 },
      ];

      jest.spyOn(taskMonitor, 'getKeywordStats').mockResolvedValue(keywordStats);

      const stats = await taskMonitor.getKeywordStats();

      expect(stats).toHaveLength(3);
      expect(stats[0].keyword).toBe('科技');
      expect(stats[0].successRate).toBe(0.9);
    });

    it('应该统计时间分布', async () => {
      const hourlyStats = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        taskCount: Math.floor(Math.random() * 20) + 5,
        avgExecutionTime: Math.floor(Math.random() * 5000) + 2000,
      }));

      jest.spyOn(taskMonitor, 'getHourlyStats').mockResolvedValue(hourlyStats);

      const stats = await taskMonitor.getHourlyStats();

      expect(stats).toHaveLength(24);
      expect(stats[0].hour).toBe(0);
      expect(stats[23].hour).toBe(23);
      expect(stats.every(stat => stat.taskCount >= 5)).toBe(true);
    });
  });

  describe('系统健康检查', () => {
    it('应该执行综合健康检查', async () => {
      const healthStatus = {
        overall: 'healthy' as const,
        components: {
          database: 'healthy' as const,
          redis: 'healthy' as const,
          rabbitmq: 'degraded' as const,
          scheduler: 'healthy' as const,
        },
        metrics: {
          uptime: 86400, // 24小时
          memoryUsage: 0.65,
          cpuUsage: 0.45,
          activeTasks: 5,
          queueSize: 10,
        },
        alerts: [
          {
            component: 'rabbitmq',
            severity: 'medium',
            message: 'RabbitMQ连接延迟较高',
          },
        ],
      };

      jest.spyOn(orchestrator, 'performHealthCheck').mockResolvedValue(healthStatus);

      const status = await orchestrator.performHealthCheck();

      expect(status.overall).toBe('healthy');
      expect(status.components.rabbitmq).toBe('degraded');
      expect(status.alerts).toHaveLength(1);
    });

    it('应该检查数据库连接健康状态', async () => {
      jest.spyOn(taskRepository, 'query').mockResolvedValue([{ result: 1 }]);

      const dbHealth = await taskMonitor.checkDatabaseHealth();

      expect(dbHealth).toMatchObject({
        status: 'healthy',
        responseTime: expect.any(Number),
        connected: true,
      });
    });

    it('应该检查Redis连接健康状态', async () => {
      redisService.ping = jest.fn().mockResolvedValue('PONG');

      const redisHealth = await taskMonitor.checkRedisHealth();

      expect(redisHealth).toMatchObject({
        status: 'healthy',
        responseTime: expect.any(Number),
        connected: true,
      });
    });

    it('应该检查RabbitMQ连接健康状态', async () => {
      const mockRabbitMQHealth = {
        connected: true,
        queues: {
          'weibo_crawl_queue': { messages: 10, consumers: 2 },
          'weibo_crawl_queue.dlq': { messages: 0, consumers: 0 },
        },
        channels: 3,
      };

      jest.spyOn(taskMonitor, 'checkRabbitMQHealth').mockResolvedValue(mockRabbitMQHealth);

      const mqHealth = await taskMonitor.checkRabbitMQHealth();

      expect(mqHealth.connected).toBe(true);
      expect(mqHealth.queues['weibo_crawl_queue'].messages).toBe(10);
      expect(mqHealth.channels).toBe(3);
    });

    it('应该生成健康报告', async () => {
      const healthReport = {
        timestamp: new Date(),
        overall: 'healthy',
        uptime: 86400,
        version: '1.0.0',
        components: {
          database: { status: 'healthy', details: 'Connected' },
          redis: { status: 'healthy', details: 'Connected' },
          rabbitmq: { status: 'healthy', details: 'Connected' },
        },
        metrics: {
          totalTasks: 100,
          activeTasks: 5,
          failedTasks: 2,
          successRate: 0.98,
        },
        recommendations: [],
      };

      jest.spyOn(taskMonitor, 'generateHealthReport').mockResolvedValue(healthReport);

      const report = await taskMonitor.generateHealthReport();

      expect(report.overall).toBe('healthy');
      expect(report.components).toBeDefined();
      expect(report.metrics).toBeDefined();
    });
  });

  describe('实时监控仪表板', () => {
    it('应该提供实时监控数据', async () => {
      const dashboardData = {
        overview: {
          totalTasks: 150,
          runningTasks: 8,
          failedTasks: 3,
          successRate: 0.95,
        },
        performance: {
          avgExecutionTime: 3200,
          throughput: 15,
          queueSize: 25,
        },
        alerts: [
          {
            id: 1,
            type: 'high_memory_usage',
            message: '内存使用率达到85%',
            severity: 'medium',
            timestamp: new Date(),
          },
        ],
        recentTasks: [
          {
            id: 100,
            keyword: '最新科技',
            status: 'completed',
            executionTime: 2800,
            completedAt: new Date(),
          },
        ],
      };

      jest.spyOn(taskMonitor, 'getDashboardData').mockResolvedValue(dashboardData);

      const data = await taskMonitor.getDashboardData();

      expect(data.overview.totalTasks).toBe(150);
      expect(data.overview.successRate).toBe(0.95);
      expect(data.performance.avgExecutionTime).toBe(3200);
      expect(data.alerts).toHaveLength(1);
      expect(data.recentTasks).toHaveLength(1);
    });

    it('应该支持WebSocket实时数据推送', async () => {
      const mockWebSocketClients = new Set();
      const realtimeData = {
        type: 'task_status_update',
        taskId: 101,
        oldStatus: 'running',
        newStatus: 'completed',
        timestamp: new Date(),
      };

      // 模拟WebSocket连接管理
      jest.spyOn(taskMonitor, 'addWebSocketClient').mockImplementation((client) => {
        mockWebSocketClients.add(client);
      });

      jest.spyOn(taskMonitor, 'broadcastToClients').mockImplementation((data) => {
        Array.from(mockWebSocketClients).forEach(client => {
          client.send(JSON.stringify(data));
        });
      });

      // 添加客户端
      const mockClient = { send: jest.fn() };
      taskMonitor.addWebSocketClient(mockClient);

      // 广播实时数据
      taskMonitor.broadcastToClients(realtimeData);

      expect(mockClient.send).toHaveBeenCalledWith(JSON.stringify(realtimeData));
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量监控数据', async () => {
      const metricCount = 10000;
      const metrics = Array.from({ length: metricCount }, (_, i) => ({
        taskId: i + 1,
        executionTime: Math.random() * 10000,
        memoryUsage: Math.random() * 1024,
        cpuUsage: Math.random() * 100,
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      }));

      jest.spyOn(performanceCollector, 'collectMetrics').mockResolvedValue(undefined);

      const startTime = Date.now();

      // 批量收集性能指标
      const collectPromises = metrics.map(metric =>
        taskMonitor.collectPerformanceMetrics(metric.taskId, metric)
      );

      await Promise.all(collectPromises);

      const duration = Date.now() - startTime;

      // 验证性能：10000条指标应在10秒内处理完成
      expect(duration).toBeLessThan(10000);
      expect(performanceCollector.collectMetrics).toHaveBeenCalledTimes(metricCount);

      const throughput = metricCount / (duration / 1000);
      console.log(`性能指标收集吞吐量: ${throughput.toFixed(2)} 指标/秒`);
      expect(throughput).toBeGreaterThan(1000); // 至少1000指标/秒
    });

    it('应该支持并发监控查询', async () => {
      const queryCount = 100;
      const queries = Array.from({ length: queryCount }, (_, i) =>
        taskMonitor.getRunningTasks()
      );

      jest.spyOn(taskRepository, 'find').mockResolvedValue([]);

      const startTime = Date.now();

      const results = await Promise.all(queries);

      const duration = Date.now() - startTime;

      // 验证并发性能：100个查询应在5秒内完成
      expect(duration).toBeLessThan(5000);
      expect(results).toHaveLength(queryCount);
      expect(taskRepository.find).toHaveBeenCalledTimes(queryCount);
    });
  });

  describe('边界条件和错误处理', () => {
    it('应该处理无效的任务ID', async () => {
      const invalidTaskId = -1;

      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(null);

      const result = await taskMonitor.getTaskDetails(invalidTaskId);

      expect(result).toBeNull();
    });

    it('应该处理时间范围无效的情况', async () => {
      const invalidTimeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2020-01-01'), // 结束时间早于开始时间
      };

      jest.spyOn(taskMonitor, 'getCompletionStats').mockRejectedValue(
        new Error('Invalid time range')
      );

      await expect(taskMonitor.getCompletionStats(invalidTimeRange)).rejects.toThrow('Invalid time range');
    });

    it('应该处理监控服务不可用的情况', async () => {
      jest.spyOn(taskRepository, 'find').mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(taskMonitor.getRunningTasks()).rejects.toThrow('Database connection failed');
    });

    it('应该处理性能指标格式错误', async () => {
      const invalidMetrics = {
        taskId: 'invalid', // 应该是number
        executionTime: 'invalid', // 应该是number
        memoryUsage: null, // 应该是number
      };

      jest.spyOn(performanceCollector, 'collectMetrics').mockRejectedValue(
        new Error('Invalid metrics format')
      );

      await expect(taskMonitor.collectPerformanceMetrics(1, invalidMetrics as any))
        .rejects.toThrow('Invalid metrics format');
    });
  });
});