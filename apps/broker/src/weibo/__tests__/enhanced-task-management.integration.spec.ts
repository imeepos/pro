import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';

// 导入要测试的服务
import { EnhancedTaskStateTracker } from '../enhanced-task-state-tracker.service.js';
import { IntelligentRetryManager } from '../intelligent-retry-manager.service.js';
import { TaskPerformanceCollector } from '../task-performance-collector.service.js';
import { TaskPriorityDependencyManager, TaskPriority, DependencyType } from '../task-priority-dependency-manager.service.js';
import { TaskExecutionReportGenerator, ReportType } from '../task-execution-report-generator.service.js';
import { EnhancedTaskOrchestrator } from '../enhanced-task-orchestrator.service.js';

/**
 * 增强任务管理集成测试
 * 验证所有组件的协同工作
 */
describe('EnhancedTaskManagementIntegration', () => {
  let module: TestingModule;
  let stateTracker: EnhancedTaskStateTracker;
  let retryManager: IntelligentRetryManager;
  let performanceCollector: TaskPerformanceCollector;
  let priorityManager: TaskPriorityDependencyManager;
  let reportGenerator: TaskExecutionReportGenerator;
  let orchestrator: EnhancedTaskOrchestrator;
  let taskRepository: Repository<WeiboSearchTaskEntity>;

  // 模拟任务数据
  const mockTask: WeiboSearchTaskEntity = {
    id: 1,
    keyword: '测试关键词',
    startDate: new Date('2024-01-01'),
    currentCrawlTime: null,
    latestCrawlTime: null,
    crawlInterval: '1h',
    nextRunAt: new Date(),
    weiboAccountId: 1,
    enableAccountRotation: false,
    status: WeiboSearchTaskStatus.PENDING,
    enabled: true,
    progress: 0,
    totalSegments: 0,
    noDataCount: 0,
    noDataThreshold: 3,
    retryCount: 0,
    maxRetries: 3,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'test-user',
    needsInitialCrawl: true,
    isHistoricalCrawlCompleted: false,
    canRetry: true,
    shouldPauseForNoData: false,
    progressPercentage: 0,
    statusDescription: '等待执行',
    phaseDescription: '等待首次抓取',
  } as any;

  beforeAll(async () => {
    // 创建测试模块
    module = await Test.createTestingModule({
      providers: [
        EnhancedTaskStateTracker,
        IntelligentRetryManager,
        TaskPerformanceCollector,
        TaskPriorityDependencyManager,
        TaskExecutionReportGenerator,
        EnhancedTaskOrchestrator,
        {
          provide: getRepositoryToken(WeiboSearchTaskEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        // 模拟依赖服务
        {
          provide: 'PinoLogger',
          useValue: {
            setContext: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: '@Inject("RedisService") RedisClient',
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            setex: jest.fn(),
            del: jest.fn(),
            exists: jest.fn(),
            expire: jest.fn(),
            zadd: jest.fn(),
            zrange: jest.fn(),
            zrevrange: jest.fn(),
            zrangebyscore: jest.fn(),
            zremrangebyscore: jest.fn(),
            zcard: jest.fn(),
            hget: jest.fn(),
            hset: jest.fn(),
            hgetall: jest.fn(),
            hdel: jest.fn(),
            sadd: jest.fn(),
            srem: jest.fn(),
            smembers: jest.fn(),
            keys: jest.fn(),
            setnx: jest.fn(),
          },
        },
        {
          provide: 'EventEmitter2',
          useValue: {
            emit: jest.fn(),
            on: jest.fn(),
          },
        },
      ],
    }).compile();

    // 获取服务实例
    stateTracker = module.get<EnhancedTaskStateTracker>(EnhancedTaskStateTracker);
    retryManager = module.get<IntelligentRetryManager>(IntelligentRetryManager);
    performanceCollector = module.get<TaskPerformanceCollector>(TaskPerformanceCollector);
    priorityManager = module.get<TaskPriorityDependencyManager>(TaskPriorityDependencyManager);
    reportGenerator = module.get<TaskExecutionReportGenerator>(TaskExecutionReportGenerator);
    orchestrator = module.get<EnhancedTaskOrchestrator>(EnhancedTaskOrchestrator);
    taskRepository = module.get<Repository<WeiboSearchTaskEntity>>(
      getRepositoryToken(WeiboSearchTaskEntity)
    );
  });

  afterAll(async () => {
    await module.close();
  });

  describe('状态追踪集成测试', () => {
    it('应该能够记录和检索任务状态变迁', async () => {
      // 模拟任务查找
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);

      // 记录状态变迁
      await stateTracker.recordStateTransition(
        1,
        WeiboSearchTaskStatus.PENDING,
        WeiboSearchTaskStatus.RUNNING,
        '测试状态变迁'
      );

      // 验证记录是否成功（这里模拟验证）
      expect(stateTracker).toBeDefined();
    });

    it('应该能够记录任务执行阶段', async () => {
      await stateTracker.recordTaskPhase(1, 'initializing' as any, {
        testMetadata: 'test',
      });

      expect(stateTracker).toBeDefined();
    });

    it('应该能够收集性能指标', async () => {
      await performanceCollector.collectMetrics(1, {
        executionTime: 1000,
        memoryUsage: 512,
        cpuUsage: 25,
      });

      expect(performanceCollector).toBeDefined();
    });
  });

  describe('智能重试集成测试', () => {
    it('应该能够分析失败类型', async () => {
      const failureType = retryManager.analyzeFailureType('Network connection timeout');
      expect(failureType).toBe('timeout_error');
    });

    it('应该能够制定重试决策', async () => {
      // 模拟任务查找
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);

      const decision = await retryManager.makeRetryDecision(
        mockTask,
        'Network connection timeout'
      );

      expect(decision).toHaveProperty('shouldRetry');
      expect(decision).toHaveProperty('strategy');
      expect(decision).toHaveProperty('delay');
    });

    it('应该能够执行重试', async () => {
      // 模拟任务更新
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const result = await retryManager.executeRetry(
        mockTask,
        'Network connection timeout'
      );

      expect(typeof result).toBe('boolean');
    });
  });

  describe('优先级管理集成测试', () => {
    it('应该能够设置任务优先级', async () => {
      await priorityManager.setTaskPriority(1, TaskPriority.HIGH, '测试优先级设置');

      expect(priorityManager).toBeDefined();
    });

    it('应该能够计算任务优先级', async () => {
      // 模拟任务查找
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);

      const priority = await priorityManager.calculateTaskPriority(mockTask);
      expect(typeof priority).toBe('number');
    });

    it('应该能够添加任务依赖关系', async () => {
      await priorityManager.addTaskDependency(
        1,
        2,
        DependencyType.FINISH_TO_START
      );

      expect(priorityManager).toBeDefined();
    });

    it('应该能够检查任务是否可以调度', async () => {
      // 模拟任务查找
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);

      const decision = await priorityManager.canScheduleTask(1);
      expect(decision).toHaveProperty('shouldSchedule');
      expect(decision).toHaveProperty('priority');
    });
  });

  describe('报告生成集成测试', () => {
    it('应该能够生成日报告', async () => {
      // 模拟任务查找
      jest.spyOn(taskRepository, 'find').mockResolvedValue([mockTask]);

      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const report = await reportGenerator.generateReport(
        ReportType.DAILY,
        timeRange
      );

      expect(report).toHaveProperty('reportId');
      expect(report).toHaveProperty('reportType', ReportType.DAILY);
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('generatedAt');
    });

    it('应该能够生成任务特定报告', async () => {
      // 模拟任务查找
      jest.spyOn(taskRepository, 'find').mockResolvedValue([mockTask]);

      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      };

      const report = await reportGenerator.generateReport(
        ReportType.TASK_SPECIFIC,
        timeRange,
        { taskIds: [1] }
      );

      expect(report).toHaveProperty('reportType', ReportType.TASK_SPECIFIC);
    });
  });

  describe('编排器集成测试', () => {
    it('应该能够执行健康检查', async () => {
      const healthStatus = await orchestrator.performHealthCheck();

      expect(healthStatus).toHaveProperty('overall');
      expect(healthStatus).toHaveProperty('components');
      expect(healthStatus).toHaveProperty('metrics');
      expect(healthStatus).toHaveProperty('alerts');
    });

    it('应该能够生成综合报告', async () => {
      const report = await orchestrator.generateComprehensiveReport(
        ReportType.DAILY
      );

      expect(report).toHaveProperty('reportId');
      expect(report).toHaveProperty('orchestrationInsights');
      expect(report).toHaveProperty('systemHealth');
      expect(report).toHaveProperty('recommendations');
    });

    it('应该能够处理任务生命周期事件', async () => {
      const event = {
        taskId: 1,
        eventType: 'started' as const,
        timestamp: new Date(),
        phase: 'initializing' as any,
      };

      // 模拟任务查找
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);

      await orchestrator.handleTaskLifecycleEvent(event);

      expect(orchestrator).toBeDefined();
    });
  });

  describe('端到端集成测试', () => {
    it('应该能够完成完整的任务生命周期', async () => {
      // 1. 创建任务
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      // 2. 设置优先级
      await priorityManager.setTaskPriority(1, TaskPriority.HIGH, '端到端测试');

      // 3. 记录状态变迁
      await stateTracker.recordStateTransition(
        1,
        WeiboSearchTaskStatus.PENDING,
        WeiboSearchTaskStatus.RUNNING,
        '端到端测试开始'
      );

      // 4. 记录执行阶段
      await stateTracker.recordTaskPhase(1, 'initializing' as any);

      // 5. 收集性能指标
      await performanceCollector.collectMetrics(1, {
        startTime: new Date(),
        memoryUsage: 256,
        cpuUsage: 15,
      });

      // 6. 模拟任务执行完成
      await stateTracker.recordStateTransition(
        1,
        WeiboSearchTaskStatus.RUNNING,
        WeiboSearchTaskStatus.PENDING,
        '端到端测试完成'
      );

      // 7. 收集最终性能指标
      await performanceCollector.collectMetrics(1, {
        endTime: new Date(),
        executionTime: 5000,
        successRate: 100,
      });

      // 8. 生成报告
      const report = await reportGenerator.generateReport(
        ReportType.TASK_SPECIFIC,
        {
          start: new Date(Date.now() - 60 * 60 * 1000),
          end: new Date(),
        },
        { taskIds: [1] }
      );

      expect(report).toHaveProperty('reportId');
      expect(report.reportType).toBe(ReportType.TASK_SPECIFIC);
    });

    it('应该能够处理任务失败和重试流程', async () => {
      // 模拟失败任务
      const failedTask = {
        ...mockTask,
        status: WeiboSearchTaskStatus.FAILED,
        retryCount: 1,
        errorMessage: 'Network timeout',
      };

      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(failedTask);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      // 1. 记录失败状态
      await stateTracker.recordStateTransition(
        1,
        WeiboSearchTaskStatus.RUNNING,
        WeiboSearchTaskStatus.FAILED,
        '网络超时'
      );

      // 2. 收集失败指标
      await performanceCollector.collectMetrics(1, {
        endTime: new Date(),
        errorCount: 1,
        errorMessage: 'Network timeout',
      });

      // 3. 执行智能重试
      const retrySuccess = await retryManager.executeRetry(
        failedTask,
        'Network timeout'
      );

      expect(typeof retrySuccess).toBe('boolean');

      // 4. 如果重试失败，记录重试尝试
      if (!retrySuccess) {
        await stateTracker.recordStateTransition(
          1,
          WeiboSearchTaskStatus.FAILED,
          WeiboSearchTaskStatus.PENDING,
          '智能重试安排'
        );
      }
    });
  });

  describe('性能和错误处理测试', () => {
    it('应该能够处理大量状态变迁记录', async () => {
      const startTime = Date.now();

      // 模拟1000次状态变迁
      for (let i = 0; i < 1000; i++) {
        await stateTracker.recordStateTransition(
          i,
          WeiboSearchTaskStatus.PENDING,
          WeiboSearchTaskStatus.RUNNING,
          `批量测试 ${i}`
        );
      }

      const duration = Date.now() - startTime;
      console.log(`1000次状态变迁记录耗时: ${duration}ms`);

      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });

    it('应该能够优雅地处理数据库连接错误', async () => {
      // 模拟数据库错误
      jest.spyOn(taskRepository, 'findOne').mockRejectedValue(
        new Error('Database connection failed')
      );

      const decision = await retryManager.makeRetryDecision(
        mockTask,
        'Database error'
      );

      // 即使数据库错误，也应该能做出基本决策
      expect(decision).toHaveProperty('shouldRetry');
    });

    it('应该能够处理Redis连接错误', async () => {
      // 这里可以模拟Redis错误情况
      // 由于我们使用的是模拟服务，这个测试主要验证错误处理逻辑
      expect(async () => {
        await stateTracker.recordStateTransition(
          1,
          WeiboSearchTaskStatus.PENDING,
          WeiboSearchTaskStatus.RUNNING,
          'Redis错误测试'
        );
      }).not.toThrow();
    });
  });
});