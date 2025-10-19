/**
 * 任务扫描调度集成测试
 * 验证任务调度器的核心功能和边界条件
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';

// 导入要测试的服务
import { TaskScannerScheduler } from '../../src/weibo/task-scanner-scheduler.service';
import { EnhancedTaskStateTracker } from '../../src/weibo/enhanced-task-state-tracker.service';
import { IntelligentRetryManager } from '../../src/weibo/intelligent-retry-manager.service';
import { TaskPerformanceCollector } from '../../src/weibo/task-performance-collector.service';
import { TaskPriorityDependencyManager } from '../../src/weibo/task-priority-dependency-manager.service';
import { RabbitMQConfigService } from '../../src/rabbitmq/rabbitmq-config.service';

// 导入测试配置
import {
  testDatabaseConfig,
  createMockPinoLogger,
  createMockRedisClient,
  createMockRabbitMQService,
  createTestTask,
  TestUtils,
  TEST_CONSTANTS,
} from './test.config';

/**
 * 任务扫描调度集成测试套件
 * 验证任务发现、调度决策、状态管理等核心功能
 */
describe('TaskScannerIntegration', () => {
  let module: TestingModule;
  let taskScanner: TaskScannerScheduler;
  let taskRepository: Repository<WeiboSearchTaskEntity>;
  let rabbitMQService: jest.Mocked<RabbitMQConfigService>;
  let stateTracker: jest.Mocked<EnhancedTaskStateTracker>;
  let retryManager: jest.Mocked<IntelligentRetryManager>;
  let performanceCollector: jest.Mocked<TaskPerformanceCollector>;
  let priorityManager: jest.Mocked<TaskPriorityDependencyManager>;

  beforeAll(async () => {
    // 创建测试模块
    module = await Test.createTestingModule({
      providers: [
        TaskScannerScheduler,
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
          provide: EnhancedTaskStateTracker,
          useValue: {
            recordStateTransition: jest.fn(),
            recordTaskPhase: jest.fn(),
          },
        },
        {
          provide: IntelligentRetryManager,
          useValue: {
            executeRetry: jest.fn(),
            analyzeFailureType: jest.fn(),
            makeRetryDecision: jest.fn(),
          },
        },
        {
          provide: TaskPerformanceCollector,
          useValue: {
            collectMetrics: jest.fn(),
          },
        },
        {
          provide: TaskPriorityDependencyManager,
          useValue: {
            canScheduleTask: jest.fn(),
            calculateTaskPriority: jest.fn(),
            setTaskPriority: jest.fn(),
            reserveResources: jest.fn(),
            releaseResources: jest.fn(),
            releaseSchedulingLock: jest.fn(),
          },
        },
      ],
    }).compile();

    // 获取服务实例
    taskScanner = module.get<TaskScannerScheduler>(TaskScannerScheduler);
    taskRepository = module.get<Repository<WeiboSearchTaskEntity>>(
      getRepositoryToken(WeiboSearchTaskEntity)
    );
    rabbitMQService = module.get(RabbitMQConfigService) as jest.Mocked<RabbitMQConfigService>;
    stateTracker = module.get(EnhancedTaskStateTracker) as jest.Mocked<EnhancedTaskStateTracker>;
    retryManager = module.get(IntelligentRetryManager) as jest.Mocked<IntelligentRetryManager>;
    performanceCollector = module.get(TaskPerformanceCollector) as jest.Mocked<TaskPerformanceCollector>;
    priorityManager = module.get(TaskPriorityDependencyManager) as jest.Mocked<TaskPriorityDependencyManager>;
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    // 重置所有模拟函数
    jest.clearAllMocks();
  });

  describe('任务扫描功能', () => {
    it('应该能够发现待执行的任务', async () => {
      // 准备测试数据
      const pendingTask = createTestTask({
        id: 1,
        status: WeiboSearchTaskStatus.PENDING,
        nextRunAt: new Date(Date.now() - 1000), // 已过期
        enabled: true,
      });

      const tasks = [pendingTask];

      // 模拟数据库查询
      jest.spyOn(taskRepository, 'find').mockResolvedValue(tasks);
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
        resourceAllocation: { memory: 256, cpu: 0.5 },
      });

      // 模拟乐观锁更新成功
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      // 模拟消息发布成功
      rabbitMQService.publishSubTask.mockResolvedValue(true);

      // 执行扫描
      await taskScanner.scanTasks();

      // 验证查询条件
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: {
          enabled: true,
          status: WeiboSearchTaskStatus.PENDING,
          nextRunAt: expect.any(LessThanOrEqual),
        },
        order: {
          nextRunAt: 'ASC',
        },
      });

      // 验证调度决策检查
      expect(priorityManager.canScheduleTask).toHaveBeenCalledWith(1);

      // 验证状态更新
      expect(taskRepository.update).toHaveBeenCalledWith(
        {
          id: 1,
          status: WeiboSearchTaskStatus.PENDING,
          updatedAt: expect.any(Date),
        },
        {
          status: WeiboSearchTaskStatus.RUNNING,
          errorMessage: null,
        }
      );

      // 验证消息发布
      expect(rabbitMQService.publishSubTask).toHaveBeenCalled();
    });

    it('应该跳过未到执行时间的任务', async () => {
      // 准备测试数据
      const futureTask = createTestTask({
        id: 1,
        nextRunAt: new Date(Date.now() + 60 * 60 * 1000), // 1小时后
      });

      // 模拟查询返回未来任务
      jest.spyOn(taskRepository, 'find').mockResolvedValue([futureTask]);

      // 执行扫描
      await taskScanner.scanTasks();

      // 验证没有调用调度逻辑
      expect(priorityManager.canScheduleTask).not.toHaveBeenCalled();
      expect(taskRepository.update).not.toHaveBeenCalled();
      expect(rabbitMQService.publishSubTask).not.toHaveBeenCalled();
    });

    it('应该跳过已禁用的任务', async () => {
      // 准备测试数据
      const disabledTask = createTestTask({
        id: 1,
        enabled: false,
        nextRunAt: new Date(Date.now() - 1000),
      });

      // 模拟查询返回禁用任务
      jest.spyOn(taskRepository, 'find').mockResolvedValue([disabledTask]);

      // 执行扫描
      await taskScanner.scanTasks();

      // 验证没有调用调度逻辑
      expect(priorityManager.canScheduleTask).not.toHaveBeenCalled();
      expect(taskRepository.update).not.toHaveBeenCalled();
      expect(rabbitMQService.publishSubTask).not.toHaveBeenCalled();
    });

    it('应该处理并发任务扫描', async () => {
      // 准备多个任务
      const tasks = Array.from({ length: 8 }, (_, i) =>
        createTestTask({
          id: i + 1,
          keyword: `关键词${i + 1}`,
        })
      );

      // 模拟数据库查询
      jest.spyOn(taskRepository, 'find').mockResolvedValue(tasks);

      // 模拟调度决策
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
        resourceAllocation: { memory: 256, cpu: 0.5 },
      });

      // 模拟乐观锁更新
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      // 模拟消息发布
      rabbitMQService.publishSubTask.mockResolvedValue(true);

      // 执行扫描
      const startTime = Date.now();
      await taskScanner.scanTasks();
      const duration = Date.now() - startTime;

      // 验证所有任务都被处理
      expect(priorityManager.canScheduleTask).toHaveBeenCalledTimes(8);
      expect(taskRepository.update).toHaveBeenCalledTimes(8);
      expect(rabbitMQService.publishSubTask).toHaveBeenCalledTimes(8);

      // 验证并行处理（应该比串行处理快）
      expect(duration).toBeLessThan(1000); // 1秒内完成
    });

    it('应该记录性能指标', async () => {
      const task = createTestTask();

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
        resourceAllocation: { memory: 256, cpu: 0.5 },
      });
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);
      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      // 验证性能指标收集
      expect(performanceCollector.collectMetrics).toHaveBeenCalledWith(1, {
        startTime: expect.any(Date),
        queueTime: expect.any(Number),
        memoryUsage: 0,
        cpuUsage: 0,
      });

      expect(performanceCollector.collectMetrics).toHaveBeenCalledWith(1, {
        lockAcquisitionTime: expect.any(Number),
      });

      expect(performanceCollector.collectMetrics).toHaveBeenCalledWith(1, {
        endTime: expect.any(Date),
        executionTime: expect.any(Number),
        phase: expect.any(String),
        subTaskGenerated: true,
      });
    });
  });

  describe('优先级调度', () => {
    it('应该根据优先级管理器的决策调度任务', async () => {
      const highPriorityTask = createTestTask({ id: 1 });
      const lowPriorityTask = createTestTask({ id: 2 });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([lowPriorityTask, highPriorityTask]);

      // 模拟优先级决策
      jest.spyOn(priorityManager, 'canScheduleTask')
        .mockResolvedValueOnce({ shouldSchedule: false, reason: '资源不足' }) // 低优先级任务跳过
        .mockResolvedValueOnce({ shouldSchedule: true, priority: 1 }); // 高优先级任务执行

      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);
      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      // 验证只有高优先级任务被调度
      expect(priorityManager.canScheduleTask).toHaveBeenCalledTimes(2);
      expect(taskRepository.update).toHaveBeenCalledTimes(1);
      expect(taskRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2 }),
        expect.any(Object)
      );
    });

    it('应该处理调度资源不足的情况', async () => {
      const task = createTestTask();

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);

      // 模拟资源不足
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: false,
        reason: '系统负载过高',
        estimatedWaitTime: 30000,
      });

      await taskScanner.scanTasks();

      // 验证任务被跳过
      expect(taskRepository.update).not.toHaveBeenCalled();
      expect(rabbitMQService.publishSubTask).not.toHaveBeenCalled();
    });
  });

  describe('乐观锁机制', () => {
    it('应该处理乐观锁冲突', async () => {
      const task = createTestTask();
      const updatedTask = { ...task, status: WeiboSearchTaskStatus.RUNNING };

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      // 模拟乐观锁冲突（affected: 0）
      jest.spyOn(taskRepository, 'update').mockResolvedValueOnce({ affected: 0 } as any);

      // 模拟重新查询任务
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(updatedTask);

      await taskScanner.scanTasks();

      // 验证乐观锁冲突处理
      expect(taskRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(taskRepository.update).toHaveBeenCalledTimes(2); // 一次失败，一次重新调度
    });

    it('应该处理任务已被删除的情况', async () => {
      const task = createTestTask();

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      // 模拟乐观锁冲突
      jest.spyOn(taskRepository, 'update').mockResolvedValueOnce({ affected: 0 } as any);

      // 模拟任务已被删除
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(null);

      await taskScanner.scanTasks();

      // 验证任务删除处理
      expect(stateTracker.recordStateTransition).toHaveBeenCalledWith(
        1,
        WeiboSearchTaskStatus.RUNNING,
        WeiboSearchTaskStatus.FAILED,
        '任务在调度过程中被删除'
      );
    });
  });

  describe('消息发布失败处理', () => {
    it('应该处理消息发布失败', async () => {
      const task = createTestTask();

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      // 模拟消息发布失败
      rabbitMQService.publishSubTask.mockRejectedValue(new Error('RabbitMQ连接失败'));

      await taskScanner.scanTasks();

      // 验证任务状态回滚
      expect(taskRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: WeiboSearchTaskStatus.PENDING,
          errorMessage: expect.stringContaining('消息发布失败'),
          nextRunAt: expect.any(Date),
        })
      );
    });

    it('应该处理消息发布返回false的情况', async () => {
      const task = createTestTask();

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      // 模拟消息发布返回false
      rabbitMQService.publishSubTask.mockResolvedValue(false);

      await taskScanner.scanTasks();

      // 验证任务状态回滚
      expect(taskRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: WeiboSearchTaskStatus.PENDING,
          errorMessage: expect.stringContaining('消息发布返回false'),
        })
      );
    });
  });

  describe('任务时间处理', () => {
    it('应该正确计算首次抓取时间范围', async () => {
      const task = createTestTask({
        needsInitialCrawl: true,
        startDate: new Date('2024-01-01'),
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);
      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      // 验证子任务消息
      const subTaskMessage = rabbitMQService.publishSubTask.mock.calls[0][0];
      expect(subTaskMessage).toMatchObject({
        taskId: 1,
        keyword: '测试关键词',
        isInitialCrawl: true,
        weiboAccountId: 1,
        enableAccountRotation: false,
      });

      // 验证时间范围合理性
      expect(subTaskMessage.start).toBeInstanceOf(Date);
      expect(subTaskMessage.end).toBeInstanceOf(Date);
      expect(subTaskMessage.start.getTime()).toBeLessThanOrEqual(subTaskMessage.end.getTime());

      // 验证时间精度（分钟级）
      expect(TestUtils.validateMinutePrecision(subTaskMessage.start)).toBe(true);
      expect(TestUtils.validateMinutePrecision(subTaskMessage.end)).toBe(true);
    });

    it('应该正确计算增量更新时间范围', async () => {
      const now = new Date();
      const lastCrawlTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2小时前

      const task = createTestTask({
        needsInitialCrawl: false,
        isHistoricalCrawlCompleted: true,
        latestCrawlTime: lastCrawlTime,
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);
      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      // 验证子任务消息
      const subTaskMessage = rabbitMQService.publishSubTask.mock.calls[0][0];
      expect(subTaskMessage).toMatchObject({
        taskId: 1,
        keyword: '测试关键词',
        isInitialCrawl: false,
      });

      // 验证时间范围
      expect(subTaskMessage.start.getTime()).toBeCloseTo(lastCrawlTime.getTime(), -3); // 秒级精度
      expect(subTaskMessage.end.getTime()).toBeLessThanOrEqual(now.getTime());
    });

    it('应该处理大时间跨度的分片', async () => {
      const task = createTestTask({
        needsInitialCrawl: true,
        startDate: new Date('2020-01-01'), // 很久以前
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);
      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      // 验证时间分片（首次抓取限制7天）
      const subTaskMessage = rabbitMQService.publishSubTask.mock.calls[0][0];
      const maxTimeSpan = 7 * 24 * 60 * 60 * 1000; // 7天
      const actualTimeSpan = subTaskMessage.end.getTime() - subTaskMessage.start.getTime();

      expect(actualTimeSpan).toBeLessThanOrEqual(maxTimeSpan);
    });
  });

  describe('错误处理和重试', () => {
    it('应该处理数据库连接错误', async () => {
      // 模拟数据库错误
      jest.spyOn(taskRepository, 'find').mockRejectedValue(new Error('数据库连接失败'));

      // 执行扫描不应抛出异常
      await expect(taskScanner.scanTasks()).resolves.not.toThrow();

      // 验证错误被记录
      expect(createMockPinoLogger().error).toHaveBeenCalled();
    });

    it('应该使用智能重试管理器处理调度失败', async () => {
      const task = createTestTask();

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      // 模拟调度过程中的错误
      jest.spyOn(taskRepository, 'update').mockRejectedValue(new Error('调度失败'));

      // 模拟智能重试
      retryManager.executeRetry.mockResolvedValue(true);

      await taskScanner.scanTasks();

      // 验证智能重试被调用
      expect(retryManager.executeRetry).toHaveBeenCalledWith(task, '调度失败');
    });

    it('应该在智能重试失败时使用传统重试逻辑', async () => {
      const task = createTestTask({ retryCount: 1 });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      // 模拟调度失败
      jest.spyOn(taskRepository, 'update').mockRejectedValue(new Error('调度失败'));

      // 模拟智能重试失败
      retryManager.executeRetry.mockResolvedValue(false);

      // 模拟传统重试更新
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      await taskScanner.scanTasks();

      // 验证传统重试逻辑
      expect(taskRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: WeiboSearchTaskStatus.FAILED,
          retryCount: 2, // 增加重试次数
          nextRunAt: expect.any(Date),
        })
      );
    });
  });

  describe('统计和报告功能', () => {
    it('应该正确计算待执行任务数量', async () => {
      jest.spyOn(taskRepository, 'count').mockResolvedValue(5);

      const count = await taskScanner.getPendingTasksCount();

      expect(count).toBe(5);
      expect(taskRepository.count).toHaveBeenCalledWith({
        where: {
          enabled: true,
          status: WeiboSearchTaskStatus.PENDING,
          nextRunAt: expect.any(LessThanOrEqual),
        },
      });
    });

    it('应该生成完整的任务统计报告', async () => {
      // 模拟各种统计查询
      jest.spyOn(taskRepository, 'count')
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(8)   // enabled
        .mockResolvedValueOnce(2)   // disabled
        .mockResolvedValueOnce(1)   // running
        .mockResolvedValueOnce(1)   // failed
        .mockResolvedValueOnce(6)   // pending
        .mockResolvedValueOnce(2);  // overdue

      // 模拟最近完成任务查询
      jest.spyOn(taskRepository, 'find').mockResolvedValue([]);

      const stats = await taskScanner.getTaskStats();

      expect(stats).toMatchObject({
        total: 10,
        enabled: 8,
        disabled: 2,
        running: 1,
        failed: 1,
        pending: 6,
        overdue: 2,
        recentlyCompleted: 0,
        averageExecutionTime: expect.any(Number),
      });
    });

    it('应该识别长时间运行的任务', async () => {
      const longRunningTask = createTestTask({
        id: 1,
        status: WeiboSearchTaskStatus.RUNNING,
        updatedAt: new Date(Date.now() - 45 * 60 * 1000), // 45分钟前
      });

      jest.spyOn(taskRepository, 'count').mockResolvedValue(1);
      jest.spyOn(taskRepository, 'find').mockResolvedValue([longRunningTask]);

      const report = await taskScanner.getTaskExecutionReport();

      expect(report.longRunningTasks).toHaveLength(1);
      expect(report.longRunningTasks[0]).toMatchObject({
        id: 1,
        runningTimeMinutes: expect.any(Number),
        lastUpdate: expect.any(String),
      });
      expect(report.longRunningTasks[0].runningTimeMinutes).toBeGreaterThanOrEqual(30);
    });
  });

  describe('边界条件和异常情况', () => {
    it('应该处理空的任务列表', async () => {
      jest.spyOn(taskRepository, 'find').mockResolvedValue([]);

      await taskScanner.scanTasks();

      expect(priorityManager.canScheduleTask).not.toHaveBeenCalled();
    });

    it('应该处理异常大量的待执行任务', async () => {
      // 创建超过阈值的任务数量
      const tasks = Array.from({ length: 15 }, (_, i) => createTestTask({ id: i + 1 }));

      jest.spyOn(taskRepository, 'find').mockResolvedValue(tasks);
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);
      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      // 验证警告被记录
      expect(createMockPinoLogger().warn).toHaveBeenCalledWith(
        expect.stringContaining('待执行任务数量异常多')
      );
    });

    it('应该处理任务状态异常', async () => {
      const task = createTestTask({
        needsInitialCrawl: false,
        isHistoricalCrawlCompleted: false, // 异常状态
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      await taskScanner.scanTasks();

      // 验证异常状态处理
      expect(taskRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: WeiboSearchTaskStatus.FAILED,
          errorMessage: expect.stringContaining('任务状态异常'),
        })
      );
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量任务', async () => {
      const tasks = Array.from({ length: 100 }, (_, i) =>
        createTestTask({
          id: i + 1,
          keyword: `性能测试关键词${i + 1}`,
        })
      );

      jest.spyOn(taskRepository, 'find').mockResolvedValue(tasks);
      jest.spyOn(priorityManager, 'canScheduleTask').mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);
      rabbitMQService.publishSubTask.mockResolvedValue(true);

      const startTime = Date.now();
      await taskScanner.scanTasks();
      const duration = Date.now() - startTime;

      // 验证性能：100个任务应在5秒内完成
      expect(duration).toBeLessThan(5000);
      expect(priorityManager.canScheduleTask).toHaveBeenCalledTimes(100);
      expect(rabbitMQService.publishSubTask).toHaveBeenCalledTimes(100);
    });
  });
});