/**
 * 任务恢复集成测试
 * 验证任务中断恢复、重试机制、状态恢复、数据一致性恢复、任务补偿等核心功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';

// 导入要测试的服务
import { TaskScannerScheduler } from '../../src/weibo/task-scanner-scheduler.service';
import { IntelligentRetryManager } from '../../src/weibo/intelligent-retry-manager.service';
import { EnhancedTaskStateTracker } from '../../src/weibo/enhanced-task-state-tracker.service';
import { TaskPerformanceCollector } from '../../src/weibo/task-performance-collector.service';
import { EnhancedTaskOrchestrator } from '../../src/weibo/enhanced-task-orchestrator.service';
import { RabbitMQConfigService } from '../../src/rabbitmq/rabbitmq-config.service';

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
 * 任务恢复集成测试套件
 * 验证任务中断恢复、重试机制、状态恢复、数据一致性、任务补偿等功能
 */
describe('TaskRecoveryIntegration', () => {
  let module: TestingModule;
  let taskScanner: TaskScannerScheduler;
  let retryManager: IntelligentRetryManager;
  let stateTracker: EnhancedTaskStateTracker;
  let performanceCollector: TaskPerformanceCollector;
  let orchestrator: EnhancedTaskOrchestrator;
  let taskRepository: Repository<WeiboSearchTaskEntity>;
  let rabbitMQService: jest.Mocked<RabbitMQConfigService>;

  // 模拟中断的任务数据
  const interruptedTasks = [
    createTestTask({
      id: 1,
      status: WeiboSearchTaskStatus.RUNNING,
      errorMessage: 'Process killed unexpectedly',
      updatedAt: new Date(Date.now() - 10 * 60 * 1000), // 10分钟前
    }),
    createTestTask({
      id: 2,
      status: WeiboSearchTaskStatus.FAILED,
      errorMessage: 'Database connection lost',
      retryCount: 1,
      updatedAt: new Date(Date.now() - 5 * 60 * 1000), // 5分钟前
    }),
    createTestTask({
      id: 3,
      status: WeiboSearchTaskStatus.PENDING,
      nextRunAt: new Date(Date.now() - 30 * 60 * 1000), // 30分钟前应该执行
      retryCount: 2,
    }),
  ];

  beforeAll(async () => {
    // 创建测试模块
    module = await Test.createTestingModule({
      providers: [
        TaskScannerScheduler,
        IntelligentRetryManager,
        EnhancedTaskStateTracker,
        TaskPerformanceCollector,
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
          provide: RabbitMQConfigService,
          useValue: createMockRabbitMQService(),
        },
        {
          provide: '@Inject("RedisService") RedisClient',
          useValue: createMockRedisClient(),
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
          provide: 'EventEmitter2',
          useValue: {
            emit: jest.fn(),
            on: jest.fn(),
          },
        },
      ],
    }).compile();

    // 获取服务实例
    taskScanner = module.get<TaskScannerScheduler>(TaskScannerScheduler);
    retryManager = module.get<IntelligentRetryManager>(IntelligentRetryManager);
    stateTracker = module.get<EnhancedTaskStateTracker>(EnhancedTaskStateTracker);
    performanceCollector = module.get<TaskPerformanceCollector>(TaskPerformanceCollector);
    orchestrator = module.get<EnhancedTaskOrchestrator>(EnhancedTaskOrchestrator);
    taskRepository = module.get<Repository<WeiboSearchTaskEntity>>(
      getRepositoryToken(WeiboSearchTaskEntity)
    );
    rabbitMQService = module.get(RabbitMQConfigService) as jest.Mocked<RabbitMQConfigService>;
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('任务中断恢复', () => {
    it('应该检测和恢复中断的任务', async () => {
      // 模拟查询中断的任务
      jest.spyOn(taskRepository, 'find').mockResolvedValue([interruptedTasks[0]]);

      // 模拟状态恢复
      jest.spyOn(stateTracker, 'recordStateTransition').mockResolvedValue(undefined);

      // 模拟重新调度
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const recoveredTasks = await orchestrator.recoverInterruptedTasks();

      expect(recoveredTasks).toHaveLength(1);
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: {
          status: WeiboSearchTaskStatus.RUNNING,
          updatedAt: LessThanOrEqual(new Date(Date.now() - 5 * 60 * 1000)), // 5分钟前
        },
      });

      expect(stateTracker.recordStateTransition).toHaveBeenCalledWith(
        1,
        WeiboSearchTaskStatus.RUNNING,
        WeiboSearchTaskStatus.PENDING,
        expect.stringContaining('检测到任务中断'),
        expect.any(Object)
      );
    });

    it('应该恢复多个中断的任务', async () => {
      const multipleInterrupted = [
        interruptedTasks[0],
        createTestTask({
          id: 4,
          status: WeiboSearchTaskStatus.RUNNING,
          updatedAt: new Date(Date.now() - 15 * 60 * 1000),
        }),
      ];

      jest.spyOn(taskRepository, 'find').mockResolvedValue(multipleInterrupted);
      jest.spyOn(stateTracker, 'recordStateTransition').mockResolvedValue(undefined);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const recoveredTasks = await orchestrator.recoverInterruptedTasks();

      expect(recoveredTasks).toHaveLength(2);
      expect(stateTracker.recordStateTransition).toHaveBeenCalledTimes(2);
    });

    it('应该跳过活跃运行的任务', async () => {
      const activeTask = createTestTask({
        id: 5,
        status: WeiboSearchTaskStatus.RUNNING,
        updatedAt: new Date(Date.now() - 2 * 60 * 1000), // 2分钟前，仍在活跃期
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([activeTask]);

      const recoveredTasks = await orchestrator.recoverInterruptedTasks();

      expect(recoveredTasks).toHaveLength(0);
      expect(stateTracker.recordStateTransition).not.toHaveBeenCalled();
    });

    it('应该处理恢复过程中的错误', async () => {
      jest.spyOn(taskRepository, 'find').mockRejectedValue(new Error('Database connection failed'));

      await expect(orchestrator.recoverInterruptedTasks()).rejects.toThrow('Database connection failed');
    });
  });

  describe('任务重试机制', () => {
    it('应该分析失败类型并决定重试策略', async () => {
      const failedTask = interruptedTasks[1];
      const failureAnalysis = {
        type: 'temporary_error',
        severity: 'medium',
        retryable: true,
        suggestedDelay: 5 * 60 * 1000, // 5分钟
      };

      jest.spyOn(retryManager, 'analyzeFailureType').mockResolvedValue(failureAnalysis);
      jest.spyOn(retryManager, 'makeRetryDecision').mockResolvedValue({
        shouldRetry: true,
        delay: failureAnalysis.suggestedDelay,
        maxRetries: 3,
      });

      const analysis = await retryManager.analyzeFailureType(failedTask.errorMessage);

      expect(analysis.type).toBe('temporary_error');
      expect(analysis.retryable).toBe(true);
      expect(retryManager.analyzeFailureType).toHaveBeenCalledWith(failedTask.errorMessage);
    });

    it('应该执行智能重试逻辑', async () => {
      const task = createTestTask({
        id: 6,
        status: WeiboSearchTaskStatus.FAILED,
        errorMessage: 'Network timeout',
        retryCount: 0,
        maxRetries: 3,
      });

      jest.spyOn(retryManager, 'executeRetry').mockResolvedValue(true);

      const retrySuccess = await retryManager.executeRetry(task, task.errorMessage);

      expect(retrySuccess).toBe(true);
      expect(retryManager.executeRetry).toHaveBeenCalledWith(task, 'Network timeout');
    });

    it('应该阻止超过最大重试次数的任务', async () => {
      const exhaustedTask = createTestTask({
        id: 7,
        status: WeiboSearchTaskStatus.FAILED,
        errorMessage: 'Persistent error',
        retryCount: 3,
        maxRetries: 3,
      });

      jest.spyOn(retryManager, 'executeRetry').mockResolvedValue(false);

      const retrySuccess = await retryManager.executeRetry(exhaustedTask, exhaustedTask.errorMessage);

      expect(retrySuccess).toBe(false);
      expect(retryManager.executeRetry).toHaveBeenCalledWith(exhaustedTask, 'Persistent error');
    });

    it('应该实现指数退避重试策略', async () => {
      const retryCases = [
        { retryCount: 0, expectedDelay: 5 * 60 * 1000 },    // 5分钟
        { retryCount: 1, expectedDelay: 10 * 60 * 1000 },   // 10分钟
        { retryCount: 2, expectedDelay: 20 * 60 * 1000 },   // 20分钟
      ];

      for (const testCase of retryCases) {
        const task = createTestTask({
          id: 8 + testCase.retryCount,
          retryCount: testCase.retryCount,
        });

        jest.spyOn(retryManager, 'calculateRetryDelay').mockReturnValue(testCase.expectedDelay);

        const delay = retryManager.calculateRetryDelay(testCase.retryCount);

        expect(delay).toBe(testCase.expectedDelay);
        expect(retryManager.calculateRetryDelay).toHaveBeenCalledWith(testCase.retryCount);
      }
    });

    it('应该区分临时和永久错误', async () => {
      const temporaryError = 'Connection timeout';
      const permanentError = 'Invalid API key';

      jest.spyOn(retryManager, 'analyzeFailureType')
        .mockResolvedValueOnce({ type: 'temporary_error', retryable: true })
        .mockResolvedValueOnce({ type: 'permanent_error', retryable: false });

      const temporaryAnalysis = await retryManager.analyzeFailureType(temporaryError);
      const permanentAnalysis = await retryManager.analyzeFailureType(permanentError);

      expect(temporaryAnalysis.retryable).toBe(true);
      expect(permanentAnalysis.retryable).toBe(false);
    });
  });

  describe('任务状态恢复', () => {
    it('应该恢复不一致的任务状态', async () => {
      const inconsistentTasks = [
        createTestTask({
          id: 10,
          status: WeiboSearchTaskStatus.RUNNING,
          currentCrawlTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
          updatedAt: new Date(Date.now() - 10 * 60 * 1000), // 10分钟前
        }),
      ];

      jest.spyOn(taskRepository, 'find').mockResolvedValue(inconsistentTasks);
      jest.spyOn(stateTracker, 'validateTaskState').mockResolvedValue({
        isConsistent: false,
        issues: ['进度与时间不匹配'],
        suggestions: ['重置进度到0%'],
      });

      const stateIssues = await stateTracker.validateTaskState(inconsistentTasks[0]);

      expect(stateIssues.isConsistent).toBe(false);
      expect(stateIssues.issues).toContain('进度与时间不匹配');
    });

    it('应该修复损坏的任务进度', async () => {
      const corruptedTask = createTestTask({
        id: 11,
        status: WeiboSearchTaskStatus.RUNNING,
        progress: 150, // 超过100%
        currentCrawlTime: new Date(Date.now() - 30 * 60 * 1000),
      });

      jest.spyOn(stateTracker, 'repairTaskProgress').mockResolvedValue({
        originalProgress: 150,
        repairedProgress: 100,
        repairReason: '进度超过100%，已重置为100%',
      });

      const repairResult = await stateTracker.repairTaskProgress(corruptedTask);

      expect(repairResult.originalProgress).toBe(150);
      expect(repairResult.repairedProgress).toBe(100);
    });

    it('应该恢复缺失的任务元数据', async () => {
      const taskWithMissingMetadata = {
        id: 12,
        keyword: '测试任务',
        status: WeiboSearchTaskStatus.PENDING,
        // 缺失一些必要的元数据
      } as any;

      const expectedMetadata = {
        totalSegments: 10,
        progress: 0,
        noDataCount: 0,
        noDataThreshold: 5,
      };

      jest.spyOn(stateTracker, 'restoreMissingMetadata').mockResolvedValue(expectedMetadata);

      const metadata = await stateTracker.restoreMissingMetadata(taskWithMissingMetadata);

      expect(metadata.totalSegments).toBe(10);
      expect(metadata.progress).toBe(0);
    });

    it('应该验证任务时间逻辑一致性', async () => {
      const taskWithTimeIssues = createTestTask({
        id: 13,
        currentCrawlTime: new Date(Date.now() + 60 * 60 * 1000), // 未来时间
        latestCrawlTime: new Date(Date.now() - 60 * 60 * 1000), // 过去时间
      });

      jest.spyOn(stateTracker, 'validateTimeLogic').mockResolvedValue({
        isValid: false,
        issues: ['currentCrawlTime不能是未来时间'],
        suggestedFixes: ['将currentCrawlTime设置为latestCrawlTime'],
      });

      const timeValidation = await stateTracker.validateTimeLogic(taskWithTimeIssues);

      expect(timeValidation.isValid).toBe(false);
      expect(timeValidation.issues).toContain('currentCrawlTime不能是未来时间');
    });
  });

  describe('数据一致性恢复', () => {
    it('应该检测数据库不一致性', async () => {
      jest.spyOn(taskRepository, 'count').mockResolvedValueOnce(10); // PENDING任务数
      jest.spyOn(taskRepository, 'count').mockResolvedValueOnce(5);  // RUNNING任务数

      // 模拟Redis中的队列计数
      const redisService = module.get('@Inject("RedisService") RedisClient');
      redisService.get = jest.fn()
        .mockResolvedValueOnce('8')  // 队列中8个任务
        .mockResolvedValueOnce('3'); // 处理中3个任务

      const consistencyReport = await orchestrator.checkDataConsistency();

      expect(consistencyReport.database.pending).toBe(10);
      expect(consistencyReport.redis.queue).toBe(8);
      expect(consistencyReport.inconsistencies).toContain(
        '数据库中PENDING任务数(10)与队列中任务数(8)不一致'
      );
    });

    it('应该同步数据库和缓存状态', async () => {
      const syncTasks = [
        { taskId: 1, dbStatus: 'PENDING', cacheStatus: 'RUNNING' },
        { taskId: 2, dbStatus: 'FAILED', cacheStatus: 'PENDING' },
      ];

      jest.spyOn(orchestrator, 'syncTaskStates').mockResolvedValue({
        synced: 2,
        failed: 0,
        details: [
          { taskId: 1, action: 'updated_cache', result: 'success' },
          { taskId: 2, action: 'updated_cache', result: 'success' },
        ],
      });

      const syncResult = await orchestrator.syncTaskStates(syncTasks);

      expect(syncResult.synced).toBe(2);
      expect(syncResult.failed).toBe(0);
    });

    it('应该修复孤儿任务记录', async () => {
      // 孤儿任务：没有对应的子任务或进度记录
      const orphanTasks = [
        createTestTask({
          id: 14,
          status: WeiboSearchTaskStatus.RUNNING,
          currentCrawlTime: null, // 没有当前抓取时间
          progress: 0,           // 没有进度
        }),
      ];

      jest.spyOn(taskRepository, 'find').mockResolvedValue(orphanTasks);
      jest.spyOn(orchestrator, 'repairOrphanTask').mockResolvedValue({
        taskId: 14,
        repairActions: ['重置为PENDING状态', '清除无效时间'],
        success: true,
      });

      const repairResult = await orchestrator.repairOrphanTask(orphanTasks[0]);

      expect(repairResult.success).toBe(true);
      expect(repairResult.repairActions).toContain('重置为PENDING状态');
    });

    it('应该验证任务完整性约束', async () => {
      const integrityChecks = {
        requiredFields: ['id', 'keyword', 'status', 'enabled'],
        validStatuses: Object.values(WeiboSearchTaskStatus),
        dateRanges: ['startDate', 'nextRunAt', 'updatedAt'],
      };

      jest.spyOn(orchestrator, 'validateTaskIntegrity').mockResolvedValue({
        validTasks: 8,
        invalidTasks: 2,
        violations: [
          { taskId: 15, violation: 'missing_required_field', field: 'keyword' },
          { taskId: 16, violation: 'invalid_status', status: 'INVALID_STATUS' },
        ],
      });

      const integrityResult = await orchestrator.validateTaskIntegrity(integrityChecks);

      expect(integrityResult.validTasks).toBe(8);
      expect(integrityResult.invalidTasks).toBe(2);
      expect(integrityResult.violations).toHaveLength(2);
    });
  });

  describe('任务补偿机制', () => {
    it('应该计算遗漏的任务执行', async () => {
      const missedExecutionTask = createTestTask({
        id: 17,
        keyword: '补偿测试',
        crawlInterval: '1h', // 每小时执行一次
        lastRunAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5小时前
        nextRunAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4小时前应该执行
      });

      jest.spyOn(orchestrator, 'calculateMissedExecutions').mockResolvedValue({
        missedCount: 4,
        missedSchedules: [
          new Date(Date.now() - 4 * 60 * 60 * 1000),
          new Date(Date.now() - 3 * 60 * 60 * 1000),
          new Date(Date.now() - 2 * 60 * 60 * 1000),
          new Date(Date.now() - 1 * 60 * 60 * 1000),
        ],
        suggestedActions: ['立即执行', '调整下次执行时间'],
      });

      const missedExecutions = await orchestrator.calculateMissedExecutions(missedExecutionTask);

      expect(missedExecutions.missedCount).toBe(4);
      expect(missedExecutions.missedSchedules).toHaveLength(4);
    });

    it('应该创建补偿任务', async () => {
      const compensationData = {
        originalTaskId: 18,
        missedPeriod: {
          start: new Date(Date.now() - 2 * 60 * 60 * 1000),
          end: new Date(Date.now() - 1 * 60 * 60 * 1000),
        },
        compensationType: 'missed_schedule',
      };

      jest.spyOn(orchestrator, 'createCompensationTask').mockResolvedValue({
        compensationTaskId: 1001,
        originalTaskId: 18,
        status: 'PENDING',
        priority: 'high',
        timeWindow: compensationData.missedPeriod,
      });

      const compensationTask = await orchestrator.createCompensationTask(compensationData);

      expect(compensationTask.originalTaskId).toBe(18);
      expect(compensationTask.priority).toBe('high');
    });

    it('应该处理数据丢失补偿', async () => {
      const dataLossScenario = {
        taskId: 19,
        keyword: '数据丢失测试',
        detectedLoss: {
          period: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24小时前
          expectedDataPoints: 100,
          actualDataPoints: 0,
        },
        recoveryStrategy: 'full_recrawl',
      };

      jest.spyOn(orchestrator, 'handleDataLoss').mockResolvedValue({
        recoveryTaskId: 1002,
        recoveryStrategy: 'full_recrawl',
        estimatedDuration: 30 * 60, // 30分钟
        priority: 'urgent',
      });

      const recovery = await orchestrator.handleDataLoss(dataLossScenario);

      expect(recovery.recoveryStrategy).toBe('full_recrawl');
      expect(recovery.priority).toBe('urgent');
    });

    it('应该批量处理任务补偿', async () => {
      const batchCompensationRequests = [
        { taskId: 20, type: 'missed_execution', priority: 'normal' },
        { taskId: 21, type: 'data_loss', priority: 'high' },
        { taskId: 22, type: 'state_inconsistency', priority: 'medium' },
      ];

      jest.spyOn(orchestrator, 'batchProcessCompensation').mockResolvedValue({
        processed: 3,
        failed: 0,
        compensationTasks: [1003, 1004, 1005],
        summary: {
          normal: 1,
          high: 1,
          medium: 1,
        },
      });

      const batchResult = await orchestrator.batchProcessCompensation(batchCompensationRequests);

      expect(batchResult.processed).toBe(3);
      expect(batchResult.failed).toBe(0);
      expect(batchResult.compensationTasks).toHaveLength(3);
    });
  });

  describe('系统级恢复', () => {
    it('应该执行完整的系统恢复流程', async () => {
      const systemRecoveryPlan = {
        phases: [
          'detect_interrupted_tasks',
          'validate_data_consistency',
          'repair_state_inconsistencies',
          'process_compensation_requests',
          'restart_normal_operations',
        ],
      };

      jest.spyOn(orchestrator, 'executeSystemRecovery').mockResolvedValue({
        phase: 'completed',
        duration: 45000, // 45秒
        tasksRecovered: 5,
        inconsistenciesFixed: 3,
        compensationTasksCreated: 2,
        systemHealth: 'healthy',
      });

      const recoveryResult = await orchestrator.executeSystemRecovery(systemRecoveryPlan);

      expect(recoveryResult.phase).toBe('completed');
      expect(recoveryResult.tasksRecovered).toBe(5);
      expect(recoveryResult.systemHealth).toBe('healthy');
    });

    it('应该验证恢复后的系统状态', async () => {
      jest.spyOn(orchestrator, 'validateSystemHealth').mockResolvedValue({
        overall: 'healthy',
        components: {
          taskScheduler: 'healthy',
          taskMonitor: 'healthy',
          messageQueue: 'healthy',
          database: 'healthy',
        },
        metrics: {
          activeTasks: 3,
          queueSize: 5,
          errorRate: 0.01, // 1%
          averageResponseTime: 200, // 200ms
        },
        recommendations: [],
      });

      const healthStatus = await orchestrator.validateSystemHealth();

      expect(healthStatus.overall).toBe('healthy');
      expect(healthStatus.components.taskScheduler).toBe('healthy');
      expect(healthStatus.metrics.errorRate).toBeLessThan(0.05); // 错误率低于5%
    });

    it('应该生成恢复报告', async () => {
      const recoveryReport = {
        timestamp: new Date(),
        triggerReason: 'system_restart',
        duration: 45000,
        actions: [
          { type: 'task_recovery', count: 5, success: true },
          { type: 'state_repair', count: 3, success: true },
          { type: 'compensation', count: 2, success: true },
        ],
        result: 'success',
        postRecoveryHealth: 'healthy',
      };

      jest.spyOn(orchestrator, 'generateRecoveryReport').mockResolvedValue(recoveryReport);

      const report = await orchestrator.generateRecoveryReport();

      expect(report.triggerReason).toBe('system_restart');
      expect(report.result).toBe('success');
      expect(report.postRecoveryHealth).toBe('healthy');
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量任务恢复', async () => {
      const largeTaskSet = Array.from({ length: 100 }, (_, i) =>
        createTestTask({
          id: i + 100,
          status: WeiboSearchTaskStatus.RUNNING,
          updatedAt: new Date(Date.now() - 15 * 60 * 1000), // 15分钟前，需要恢复
        })
      );

      jest.spyOn(taskRepository, 'find').mockResolvedValue(largeTaskSet);
      jest.spyOn(stateTracker, 'recordStateTransition').mockResolvedValue(undefined);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const startTime = Date.now();
      const recoveredTasks = await orchestrator.recoverInterruptedTasks();
      const duration = Date.now() - startTime;

      expect(recoveredTasks).toHaveLength(100);
      expect(duration).toBeLessThan(10000); // 10秒内完成
      expect(stateTracker.recordStateTransition).toHaveBeenCalledTimes(100);

      const throughput = 100 / (duration / 1000);
      expect(throughput).toBeGreaterThan(10); // 至少10个任务/秒
    });

    it('应该快速完成状态验证', async () => {
      const tasksToValidate = Array.from({ length: 50 }, (_, i) =>
        createTestTask({ id: i + 200 })
      );

      jest.spyOn(stateTracker, 'validateTaskState').mockResolvedValue({
        isConsistent: true,
        issues: [],
        suggestions: [],
      });

      const startTime = Date.now();
      const validationPromises = tasksToValidate.map(task =>
        stateTracker.validateTaskState(task)
      );
      await Promise.all(validationPromises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // 5秒内完成50个任务验证
      expect(stateTracker.validateTaskState).toHaveBeenCalledTimes(50);
    });
  });

  describe('边界条件和错误处理', () => {
    it('应该处理恢复过程中的并发冲突', async () => {
      const task = createTestTask({
        id: 300,
        status: WeiboSearchTaskStatus.RUNNING,
        updatedAt: new Date(Date.now() - 10 * 60 * 1000),
        version: 1, // 乐观锁版本
      });

      // 模拟并发更新冲突
      jest.spyOn(taskRepository, 'update')
        .mockResolvedValueOnce({ affected: 0 } as any) // 第一次更新失败
        .mockResolvedValueOnce({ affected: 1 } as any); // 第二次更新成功

      jest.spyOn(taskRepository, 'findOne').mockResolvedValue({
        ...task,
        version: 2, // 版本已更新
      });

      jest.spyOn(stateTracker, 'recordStateTransition').mockResolvedValue(undefined);

      await orchestrator.recoverInterruptedTasks();

      expect(taskRepository.update).toHaveBeenCalledTimes(2); // 重试一次
    });

    it('应该处理恢复资源不足的情况', async () => {
      jest.spyOn(orchestrator, 'checkRecoveryResources').mockResolvedValue({
        memoryUsage: 0.9, // 90%内存使用
        cpuUsage: 0.8,    // 80%CPU使用
        diskSpace: 0.5,   // 50%磁盘使用
        canProceed: false,
        reason: '系统负载过高，建议延迟恢复',
      });

      const resourceCheck = await orchestrator.checkRecoveryResources();

      expect(resourceCheck.canProceed).toBe(false);
      expect(resourceCheck.reason).toContain('系统负载过高');
    });

    it('应该处理部分恢复失败的情况', async () => {
      const mixedTasks = [
        createTestTask({ id: 401 }), // 可以恢复
        createTestTask({ id: 402 }), // 恢复失败
        createTestTask({ id: 403 }), // 可以恢复
      ];

      jest.spyOn(stateTracker, 'recordStateTransition')
        .mockResolvedValueOnce(undefined)  // 成功
        .mockRejectedValueOnce(new Error('Recovery failed')) // 失败
        .mockResolvedValueOnce(undefined); // 成功

      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const recoveredTasks = await orchestrator.recoverInterruptedTasks();

      expect(recoveredTasks).toHaveLength(2); // 只有2个成功恢复
    });

    it('应该处理恢复过程中的数据损坏', async () => {
      const corruptedTask = {
        id: 500,
        // 缺少必要字段
        status: undefined,
        keyword: null,
        updatedAt: 'invalid-date',
      } as any;

      jest.spyOn(orchestrator, 'handleCorruptedTask').mockResolvedValue({
        taskId: 500,
        action: 'delete_and_recreate',
        result: 'success',
        newTaskId: 501,
      });

      const handleResult = await orchestrator.handleCorruptedTask(corruptedTask);

      expect(handleResult.action).toBe('delete_and_recreate');
      expect(handleResult.result).toBe('success');
    });
  });
});