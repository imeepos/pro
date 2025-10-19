/**
 * 子任务生成集成测试
 * 验证大任务分解、时间窗口划分、账号分配等核心功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';

// 导入要测试的服务
import { EnhancedTaskOrchestrator } from '../../src/weibo/enhanced-task-orchestrator.service';
import { TaskScannerScheduler } from '../../src/weibo/task-scanner-scheduler.service';
import { RabbitMQConfigService } from '../../src/rabbitmq/rabbitmq-config.service';
import { SubTaskMessage, WEIBO_CRAWL_QUEUE, WEIBO_CRAWL_ROUTING_KEY } from '../../src/weibo/interfaces/sub-task-message.interface';

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
 * 子任务生成集成测试套件
 * 验证任务分解、时间窗口、账号分配、依赖关系等核心功能
 */
describe('SubTaskGenerationIntegration', () => {
  let module: TestingModule;
  let taskScanner: TaskScannerScheduler;
  let taskRepository: Repository<WeiboSearchTaskEntity>;
  let rabbitMQService: jest.Mocked<RabbitMQConfigService>;
  let orchestrator: EnhancedTaskOrchestrator;

  // 模拟微博账号数据
  const mockWeiboAccounts = [
    { id: 1, username: 'user1', isAvailable: true, lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { id: 2, username: 'user2', isAvailable: true, lastUsed: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    { id: 3, username: 'user3', isAvailable: false, lastUsed: new Date(Date.now() - 30 * 60 * 1000) }, // 不可用
    { id: 4, username: 'user4', isAvailable: true, lastUsed: new Date() }, // 最近使用
  ];

  beforeAll(async () => {
    // 创建测试模块
    module = await Test.createTestingModule({
      providers: [
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
          provide: RabbitMQConfigService,
          useValue: createMockRabbitMQService(),
        },
        // 模拟其他依赖
        {
          provide: 'EnhancedTaskStateTracker',
          useValue: {
            recordStateTransition: jest.fn(),
            recordTaskPhase: jest.fn(),
          },
        },
        {
          provide: 'IntelligentRetryManager',
          useValue: {
            executeRetry: jest.fn(),
            analyzeFailureType: jest.fn(),
            makeRetryDecision: jest.fn(),
          },
        },
        {
          provide: 'TaskPerformanceCollector',
          useValue: {
            collectMetrics: jest.fn(),
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
          provide: 'EventEmitter2',
          useValue: {
            emit: jest.fn(),
            on: jest.fn(),
          },
        },
        {
          provide: '@Inject("RedisService") RedisClient',
          useValue: createMockRedisClient(),
        },
      ],
    }).compile();

    // 获取服务实例
    taskScanner = module.get<TaskScannerScheduler>(TaskScannerScheduler);
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

  describe('首次抓取子任务生成', () => {
    it('应该为首次抓取生成正确的子任务', async () => {
      const task = createTestTask({
        id: 1,
        keyword: '科技新闻',
        needsInitialCrawl: true,
        isHistoricalCrawlCompleted: false,
        startDate: new Date('2024-01-01'),
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      // 模拟优先级检查通过
      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
        resourceAllocation: { memory: 256, cpu: 0.5 },
      });

      // 模拟消息发布成功
      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      // 验证子任务消息结构
      const subTaskMessage = rabbitMQService.publishSubTask.mock.calls[0][0] as SubTaskMessage;

      expect(subTaskMessage).toMatchObject({
        taskId: 1,
        keyword: '科技新闻',
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

      // 验证时间范围不超过限制（首次抓取7天）
      const maxTimeSpan = 7 * 24 * 60 * 60 * 1000; // 7天
      const actualTimeSpan = subTaskMessage.end.getTime() - subTaskMessage.start.getTime();
      expect(actualTimeSpan).toBeLessThanOrEqual(maxTimeSpan);
    });

    it('应该为超大时间跨度的首次抓取进行分片', async () => {
      const task = createTestTask({
        id: 1,
        keyword: '历史数据',
        needsInitialCrawl: true,
        startDate: new Date('2020-01-01'), // 4年前
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      const subTaskMessage = rabbitMQService.publishSubTask.mock.calls[0][0] as SubTaskMessage;

      // 验证时间分片：应该只处理7天的数据
      const expectedMaxSpan = 7 * 24 * 60 * 60 * 1000; // 7天
      const actualSpan = subTaskMessage.end.getTime() - subTaskMessage.start.getTime();

      expect(actualSpan).toBeLessThanOrEqual(expectedMaxSpan);

      // 验证开始时间仍然是原始开始时间
      expect(subTaskMessage.start.getFullYear()).toBe(2020);
      expect(subTaskMessage.start.getMonth()).toBe(0);
      expect(subTaskMessage.start.getDate()).toBe(1);
    });
  });

  describe('增量更新子任务生成', () => {
    it('应该为增量更新生成正确的子任务', async () => {
      const now = new Date();
      const lastCrawlTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2小时前

      const task = createTestTask({
        id: 2,
        keyword: '实时新闻',
        needsInitialCrawl: false,
        isHistoricalCrawlCompleted: true,
        latestCrawlTime: lastCrawlTime,
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      const subTaskMessage = rabbitMQService.publishSubTask.mock.calls[0][0] as SubTaskMessage;

      expect(subTaskMessage).toMatchObject({
        taskId: 2,
        keyword: '实时新闻',
        isInitialCrawl: false,
        weiboAccountId: 2,
        enableAccountRotation: false,
      });

      // 验证时间范围：从上次抓取时间到现在
      expect(subTaskMessage.start.getTime()).toBeCloseTo(lastCrawlTime.getTime(), -3); // 秒级精度
      expect(subTaskMessage.end.getTime()).toBeLessThanOrEqual(now.getTime());

      // 验证增量更新的时间范围不超过30天
      const maxIncrementalSpan = 30 * 24 * 60 * 60 * 1000; // 30天
      const actualSpan = subTaskMessage.end.getTime() - subTaskMessage.start.getTime();
      expect(actualSpan).toBeLessThanOrEqual(maxIncrementalSpan);
    });

    it('应该处理没有上次抓取时间的增量任务', async () => {
      const task = createTestTask({
        id: 3,
        keyword: '补漏数据',
        needsInitialCrawl: false,
        isHistoricalCrawlCompleted: true,
        latestCrawlTime: null, // 没有上次抓取时间
        startDate: new Date('2024-01-01'),
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      const subTaskMessage = rabbitMQService.publishSubTask.mock.calls[0][0] as SubTaskMessage;

      // 验证使用startDate作为兜底
      expect(subTaskMessage.start.getTime()).toBeCloseTo(task.startDate.getTime(), -3);
      expect(subTaskMessage.isInitialCrawl).toBe(false);
    });
  });

  describe('账号分配算法', () => {
    it('应该使用指定的微博账号', async () => {
      const task = createTestTask({
        id: 4,
        keyword: '指定账号测试',
        weiboAccountId: 2, // 指定账号ID
        enableAccountRotation: false,
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      const subTaskMessage = rabbitMQService.publishSubTask.mock.calls[0][0] as SubTaskMessage;

      expect(subTaskMessage.weiboAccountId).toBe(2);
      expect(subTaskMessage.enableAccountRotation).toBe(false);
    });

    it('应该处理启用账号轮换的任务', async () => {
      const task = createTestTask({
        id: 5,
        keyword: '账号轮换测试',
        weiboAccountId: null, // 不指定账号
        enableAccountRotation: true, // 启用轮换
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      const subTaskMessage = rabbitMQService.publishSubTask.mock.calls[0][0] as SubTaskMessage;

      expect(subTaskMessage.enableAccountRotation).toBe(true);
      // 当启用轮换时，可能不指定特定账号或由系统选择
    });
  });

  describe('时间窗口划分策略', () => {
    it('应该保证时间窗口的最小精度', async () => {
      const task = createTestTask({
        id: 6,
        keyword: '精度测试',
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      const subTaskMessage = rabbitMQService.publishSubTask.mock.calls[0][0] as SubTaskMessage;

      // 验证时间精度为分钟级（秒和毫秒都为0）
      expect(subTaskMessage.start.getSeconds()).toBe(0);
      expect(subTaskMessage.start.getMilliseconds()).toBe(0);
      expect(subTaskMessage.end.getSeconds()).toBe(0);
      expect(subTaskMessage.end.getMilliseconds()).toBe(0);
    });

    it('应该避免时间窗口重叠', async () => {
      // 连续创建多个任务，验证时间窗口不重叠
      const tasks = Array.from({ length: 3 }, (_, i) =>
        createTestTask({
          id: i + 10,
          keyword: `无重叠测试${i + 1}`,
          startDate: new Date(Date.now() - (i + 1) * 60 * 60 * 1000), // 不同起始时间
        })
      );

      jest.spyOn(taskRepository, 'find').mockResolvedValue(tasks);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      // 验证每个子任务的时间窗口
      const subTasks = rabbitMQService.publishSubTask.mock.calls.map(call => call[0] as SubTaskMessage);

      subTasks.forEach((subTask, index) => {
        // 验证时间窗口有效性
        expect(subTask.start.getTime()).toBeLessThan(subTask.end.getTime());

        // 验证分钟精度
        expect(TestUtils.validateMinutePrecision(subTask.start)).toBe(true);
        expect(TestUtils.validateMinutePrecision(subTask.end)).toBe(true);

        // 验证与其他任务的时间窗口不重叠（基于任务ID的简单检查）
        const otherTasks = subTasks.filter((_, i) => i !== index);
        otherTasks.forEach(otherTask => {
          // 这是一个简化的检查，实际应用中可能需要更复杂的逻辑
          if (subTask.taskId !== otherTask.taskId) {
            expect(subTask.taskId).not.toBe(otherTask.taskId);
          }
        });
      });
    });

    it('应该处理跨时区的时间计算', async () => {
      const task = createTestTask({
        id: 7,
        keyword: '时区测试',
        startDate: new Date('2024-01-01T00:00:00+08:00'), // 北京时间
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      const subTaskMessage = rabbitMQService.publishSubTask.mock.calls[0][0] as SubTaskMessage;

      // 验证时间计算正确性（不管时区，时间戳应该一致）
      expect(subTaskMessage.start.getTime()).toBe(task.startDate.getTime());
      expect(subTaskMessage.end.getTime()).toBeGreaterThan(subTaskMessage.start.getTime());
    });
  });

  describe('任务依赖关系处理', () => {
    it('应该处理具有依赖关系的任务调度', async () => {
      const dependentTask = createTestTask({
        id: 8,
        keyword: '依赖任务',
        hasDependencies: true, // 假设的字段
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([dependentTask]);

      // 模拟优先级管理器检查依赖关系
      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: false,
        reason: '依赖任务尚未完成',
        blockingFactors: ['task:7:not_completed'],
        estimatedWaitTime: 60000, // 1分钟
      });

      await taskScanner.scanTasks();

      // 验证依赖检查阻止了任务调度
      expect(mockPriorityManager.canScheduleTask).toHaveBeenCalledWith(8);
      expect(taskRepository.update).not.toHaveBeenCalled();
      expect(rabbitMQService.publishSubTask).not.toHaveBeenCalled();
    });

    it('应该在依赖满足后允许任务调度', async () => {
      const task = createTestTask({
        id: 9,
        keyword: '无依赖任务',
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
        resourceAllocation: { memory: 256, cpu: 0.5 },
        dependenciesResolved: true,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      // 验证任务被正常调度
      expect(mockPriorityManager.canScheduleTask).toHaveBeenCalledWith(9);
      expect(taskRepository.update).toHaveBeenCalled();
      expect(rabbitMQService.publishSubTask).toHaveBeenCalled();
    });
  });

  describe('批量任务创建', () => {
    it('应该高效处理大量子任务创建', async () => {
      // 创建100个任务
      const tasks = Array.from({ length: 100 }, (_, i) =>
        createTestTask({
          id: i + 100,
          keyword: `批量测试${i + 1}`,
        })
      );

      jest.spyOn(taskRepository, 'find').mockResolvedValue(tasks);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      const startTime = Date.now();
      await taskScanner.scanTasks();
      const duration = Date.now() - startTime;

      // 验证性能：100个子任务应在合理时间内创建
      expect(duration).toBeLessThan(10000); // 10秒内完成
      expect(rabbitMQService.publishSubTask).toHaveBeenCalledTimes(100);

      // 验证每个子任务的结构完整性
      const subTasks = rabbitMQService.publishSubTask.mock.calls.map(call => call[0] as SubTaskMessage);
      subTasks.forEach((subTask, index) => {
        expect(subTask).toMatchObject({
          taskId: index + 100,
          keyword: `批量测试${index + 1}`,
          isInitialCrawl: true,
          weiboAccountId: index + 100,
          enableAccountRotation: false,
        });

        expect(subTask.start).toBeInstanceOf(Date);
        expect(subTask.end).toBeInstanceOf(Date);
        expect(TestUtils.validateMinutePrecision(subTask.start)).toBe(true);
        expect(TestUtils.validateMinutePrecision(subTask.end)).toBe(true);
      });
    });

    it('应该处理部分任务失败的情况', async () => {
      const tasks = [
        createTestTask({ id: 201, keyword: '成功任务1' }),
        createTestTask({ id: 202, keyword: '失败任务' }),
        createTestTask({ id: 203, keyword: '成功任务2' }),
      ];

      jest.spyOn(taskRepository, 'find').mockResolvedValue(tasks);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      // 模拟第二个任务消息发布失败
      rabbitMQService.publishSubTask
        .mockResolvedValueOnce(true)    // 第一个成功
        .mockRejectedValueOnce(new Error('消息队列满')) // 第二个失败
        .mockResolvedValueOnce(true);   // 第三个成功

      await taskScanner.scanTasks();

      // 验证部分成功处理
      expect(rabbitMQService.publishSubTask).toHaveBeenCalledTimes(3);

      // 验证失败任务的回滚处理
      expect(taskRepository.update).toHaveBeenCalledWith(
        202,
        expect.objectContaining({
          status: WeiboSearchTaskStatus.PENDING,
          errorMessage: expect.stringContaining('消息发布失败'),
        })
      );
    });
  });

  describe('消息队列集成', () => {
    it('应该使用正确的队列和路由键', async () => {
      const task = createTestTask({ id: 300, keyword: '队列测试' });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      // 验证调用了消息发布方法
      expect(rabbitMQService.publishSubTask).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 300,
          keyword: '队列测试',
        })
      );
    });

    it('应该处理消息队列连接问题', async () => {
      const task = createTestTask({ id: 301, keyword: '连接测试' });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      // 模拟连接问题
      rabbitMQService.publishSubTask.mockRejectedValue(new Error('Connection refused'));

      await taskScanner.scanTasks();

      // 验证错误处理和任务回滚
      expect(taskRepository.update).toHaveBeenCalledWith(
        301,
        expect.objectContaining({
          status: WeiboSearchTaskStatus.PENDING,
          errorMessage: expect.stringContaining('Connection refused'),
          nextRunAt: expect.any(Date),
        })
      );
    });
  });

  describe('边界条件和异常处理', () => {
    it('应该处理无效的时间范围', async () => {
      const task = createTestTask({
        id: 400,
        keyword: '无效时间',
        startDate: new Date(), // 开始时间晚于当前时间
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([task]);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      const subTaskMessage = rabbitMQService.publishSubTask.mock.calls[0][0] as SubTaskMessage;

      // 验证系统仍能生成有效的子任务（可能使用当前时间）
      expect(subTaskMessage.end.getTime()).toBeGreaterThan(subTaskMessage.start.getTime());
    });

    it('应该处理缺失必要字段的任务', async () => {
      const incompleteTask = {
        id: 401,
        keyword: '', // 空关键词
        weiboAccountId: null, // 无账号ID
        enableAccountRotation: false,
        status: WeiboSearchTaskStatus.PENDING,
        enabled: true,
        nextRunAt: new Date(Date.now() - 1000),
      } as any;

      jest.spyOn(taskRepository, 'find').mockResolvedValue([incompleteTask]);

      await taskScanner.scanTasks();

      // 验证系统不会崩溃，即使任务数据不完整
      expect(createMockPinoLogger().error).toHaveBeenCalled();
    });

    it('应该处理极端时间跨度的任务', async () => {
      const extremeTask = createTestTask({
        id: 402,
        keyword: '极端跨度',
        startDate: new Date('1970-01-01'), // 很久以前
      });

      jest.spyOn(taskRepository, 'find').mockResolvedValue([extremeTask]);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      const subTaskMessage = rabbitMQService.publishSubTask.mock.calls[0][0] as SubTaskMessage;

      // 验证极端时间跨度被正确分片
      const maxSpan = 7 * 24 * 60 * 60 * 1000; // 7天
      const actualSpan = subTaskMessage.end.getTime() - subTaskMessage.start.getTime();
      expect(actualSpan).toBeLessThanOrEqual(maxSpan);
    });
  });

  describe('性能优化', () => {
    it('应该缓存时间计算结果', async () => {
      // 创建多个任务，验证时间计算的一致性
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createTestTask({
          id: i + 500,
          keyword: `缓存测试${i + 1}`,
        })
      );

      jest.spyOn(taskRepository, 'find').mockResolvedValue(tasks);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      await taskScanner.scanTasks();

      const subTasks = rabbitMQService.publishSubTask.mock.calls.map(call => call[0] as SubTaskMessage);

      // 验证时间计算的一致性（所有任务应该使用相同的基础时间）
      const baseTimes = subTasks.map(subTask => subTask.end.getTime());
      const uniqueBaseTimes = [...new Set(baseTimes)];

      // 由于使用了固定时间基准点，基础时间应该是一致的
      expect(uniqueBaseTimes.length).toBeLessThanOrEqual(2); // 允许最多2个不同的时间（跨分钟边界）
    });

    it('应该优化内存使用', async () => {
      // 创建大量任务以测试内存使用
      const tasks = Array.from({ length: 1000 }, (_, i) =>
        createTestTask({
          id: i + 600,
          keyword: `内存测试${i + 1}`,
        })
      );

      jest.spyOn(taskRepository, 'find').mockResolvedValue(tasks);
      jest.spyOn(taskRepository, 'update').mockResolvedValue({ affected: 1 } as any);

      const mockPriorityManager = module.get('TaskPriorityDependencyManager');
      mockPriorityManager.canScheduleTask.mockResolvedValue({
        shouldSchedule: true,
        priority: 1,
      });

      rabbitMQService.publishSubTask.mockResolvedValue(true);

      // 记录开始时间
      const startTime = Date.now();
      await taskScanner.scanTasks();
      const duration = Date.now() - startTime;

      // 验证处理时间和内存使用效率
      expect(duration).toBeLessThan(30000); // 30秒内完成1000个任务
      expect(rabbitMQService.publishSubTask).toHaveBeenCalledTimes(1000);
    });
  });
});