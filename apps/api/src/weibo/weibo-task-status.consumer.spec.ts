import { Test, TestingModule } from '@nestjs/testing';
import { WeiboSearchTaskService } from './weibo-search-task.service';
import { WeiboTaskStatusConsumer } from './weibo-task-status.consumer';
import { WeiboRabbitMQConfigService } from './weibo-rabbitmq-config.service';
import { WeiboStatsRedisService } from './weibo-stats-redis.service';
import { WeiboTaskStatusMessage, MessageProcessResult, ConsumerStats } from './interfaces/weibo-task-status.interface';
import { WeiboSearchTaskStatus } from '@pro/entities';

describe('WeiboTaskStatusConsumer', () => {
  let consumer: WeiboTaskStatusConsumer;
  let rabbitMQConfig: WeiboRabbitMQConfigService;
  let taskService: WeiboSearchTaskService;
  let statsService: WeiboStatsRedisService;
  let mockRabbitMQClient: any;
  let mockRabbitMQConfig: any;
  let mockTaskService: any;
  let mockStatsService: any;

  beforeEach(async () => {
    mockRabbitMQClient = {
      consume: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
      cancel: jest.fn(),
    };

    mockRabbitMQConfig = {
      getRabbitMQClient: () => mockRabbitMQClient,
      getConsumerConfig: () => ({
        queueName: 'weibo_task_status_queue',
        consumerTag: 'test-consumer',
        prefetchCount: 5,
        retryConfig: {
          maxRetries: 3,
          retryDelayBase: 5000,
        },
      }),
      parseStatusMessage: jest.fn(),
    };

    mockTaskService = {
      updateTaskStatus: jest.fn(),
      updateTaskProgress: jest.fn(),
    };

    mockStatsService = {
      getStats: jest.fn(),
      resetStats: jest.fn(),
      updateStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeiboTaskStatusConsumer,
        {
          provide: WeiboRabbitMQConfigService,
          useValue: mockRabbitMQConfig,
        },
        {
          provide: WeiboSearchTaskService,
          useValue: mockTaskService,
        },
        {
          provide: WeiboStatsRedisService,
          useValue: mockStatsService,
        },
      ],
    }).compile();

    consumer = module.get<WeiboTaskStatusConsumer>(WeiboTaskStatusConsumer);
    rabbitMQConfig = module.get<WeiboRabbitMQConfigService>(WeiboRabbitMQConfigService);
    taskService = module.get<WeiboSearchTaskService>(WeiboSearchTaskService);
    statsService = module.get<WeiboStatsRedisService>(WeiboStatsRedisService);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should start consumer successfully', async () => {
      await consumer.onModuleInit();
      expect(mockRabbitMQClient.consume).toHaveBeenCalledWith(
        'weibo_task_status_queue',
        expect.any(Function),
        {
          consumerTag: 'test-consumer',
          noAck: false,
          prefetchCount: 5,
        }
      );
    });

    it('should throw error when consumer fails to start', async () => {
      mockRabbitMQClient.consume.mockRejectedValue(new Error('Connection failed'));
      await expect(consumer.onModuleInit()).rejects.toThrow('Connection failed');
    });
  });

  describe('processStatusUpdate', () => {
    const validStatusMessage: WeiboTaskStatusMessage = {
      taskId: 1,
      status: 'running',
      currentCrawlTime: new Date(),
      latestCrawlTime: new Date(),
      progress: 50,
      updatedAt: new Date(),
    };

    it('should process valid running status message successfully', async () => {
      mockTaskService.updateTaskStatus.mockResolvedValue(undefined);
      mockTaskService.updateTaskProgress.mockResolvedValue(undefined);

      const result = await consumer['processStatusUpdate'](validStatusMessage);

      expect(result).toBe(MessageProcessResult.SUCCESS);
      expect(mockTaskService.updateTaskStatus).toHaveBeenCalledWith(
        1,
        WeiboSearchTaskStatus.RUNNING,
        undefined
      );
      expect(mockTaskService.updateTaskProgress).toHaveBeenCalledWith(1, {
        currentCrawlTime: validStatusMessage.currentCrawlTime,
        latestCrawlTime: validStatusMessage.latestCrawlTime,
        nextRunAt: undefined,
        progress: 50,
      });
    });

    it('should process failed status with error message', async () => {
      const failedMessage: WeiboTaskStatusMessage = {
        taskId: 2,
        status: 'failed',
        errorMessage: 'Connection timeout',
        updatedAt: new Date(),
      };

      mockTaskService.updateTaskStatus.mockResolvedValue(undefined);

      const result = await consumer['processStatusUpdate'](failedMessage);

      expect(result).toBe(MessageProcessResult.SUCCESS);
      expect(mockTaskService.updateTaskStatus).toHaveBeenCalledWith(
        2,
        WeiboSearchTaskStatus.FAILED,
        'Connection timeout'
      );
      expect(mockTaskService.updateTaskProgress).not.toHaveBeenCalled();
    });

    it('should return failed for unknown status', async () => {
      const invalidMessage: WeiboTaskStatusMessage = {
        taskId: 3,
        status: 'unknown' as any,
        updatedAt: new Date(),
      };

      const result = await consumer['processStatusUpdate'](invalidMessage);

      expect(result).toBe(MessageProcessResult.FAILED);
      expect(mockTaskService.updateTaskStatus).not.toHaveBeenCalled();
    });

    it('should return retry for retryable errors', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.message = 'connection timeout';

      mockTaskService.updateTaskStatus.mockRejectedValue(connectionError);

      const result = await consumer['processStatusUpdate'](validStatusMessage);

      expect(result).toBe(MessageProcessResult.RETRY);
    });

    it('should return failed for non-retryable errors', async () => {
      const validationError = new Error('Invalid task ID');
      validationError.message = 'validation error';

      mockTaskService.updateTaskStatus.mockRejectedValue(validationError);

      const result = await consumer['processStatusUpdate'](validStatusMessage);

      expect(result).toBe(MessageProcessResult.FAILED);
    });
  });

  describe('mapStatus', () => {
    it('should map message status to entity status correctly', () => {
      expect(consumer['mapStatus']('running')).toBe(WeiboSearchTaskStatus.RUNNING);
      expect(consumer['mapStatus']('completed')).toBe(WeiboSearchTaskStatus.RUNNING);
      expect(consumer['mapStatus']('failed')).toBe(WeiboSearchTaskStatus.FAILED);
      expect(consumer['mapStatus']('timeout')).toBe(WeiboSearchTaskStatus.TIMEOUT);
      expect(consumer['mapStatus']('unknown')).toBeNull();
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      const retryableErrors = [
        new Error('Connection lost'),
        new Error('Request timeout'),
        new Error('Network error'),
        new Error('ECONNRESET'),
        new Error('ETIMEDOUT'),
      ];

      retryableErrors.forEach(error => {
        const errorObj = new Error(error.message);
        errorObj.message = error.message;
        expect(consumer['isRetryableError'](errorObj)).toBe(true);
      });
    });

    it('should identify non-retryable errors', () => {
      const nonRetryableErrors = [
        new Error('Validation failed'),
        new Error('Invalid data'),
        new Error('Access denied'),
      ];

      nonRetryableErrors.forEach(error => {
        expect(consumer['isRetryableError'](error)).toBe(false);
      });
    });
  });

  describe('stats tracking (with Redis)', () => {
    it('should get stats from Redis service', async () => {
      const mockStats: ConsumerStats = {
        totalMessages: 100,
        successCount: 90,
        failureCount: 5,
        retryCount: 5,
        avgProcessingTime: 25.5,
        lastProcessedAt: new Date(),
      };

      mockStatsService.getStats.mockResolvedValue(mockStats);

      const stats = await consumer.getStats();

      expect(stats).toEqual(mockStats);
      expect(mockStatsService.getStats).toHaveBeenCalled();
    });

    it('should return default stats when Redis fails', async () => {
      mockStatsService.getStats.mockRejectedValue(new Error('Redis error'));

      const stats = await consumer.getStats();

      expect(stats).toEqual({
        totalMessages: 0,
        successCount: 0,
        failureCount: 0,
        retryCount: 0,
        avgProcessingTime: 0,
      });
    });

    it('should reset stats using Redis service', async () => {
      await consumer.resetStats();

      expect(mockStatsService.resetStats).toHaveBeenCalled();
    });

    it('should update stats using Redis service', async () => {
      // 测试私有方法 updateStats
      const startTime = Date.now() - 100;
      await consumer['updateStats'](startTime, MessageProcessResult.SUCCESS);

      expect(mockStatsService.updateStats).toHaveBeenCalledWith('success', expect.any(Number));
    });

    it('should handle updateStats errors gracefully', async () => {
      mockStatsService.updateStats.mockRejectedValue(new Error('Redis error'));

      // 这不应该抛出错误，只是记录日志
      await expect(consumer['updateStats'](Date.now(), MessageProcessResult.SUCCESS)).resolves.toBeUndefined();
    });
  });

  describe('onModuleDestroy', () => {
    it('should cancel consumer on destroy', async () => {
      await consumer.onModuleInit();
      await consumer.onModuleDestroy();
      expect(mockRabbitMQClient.cancel).toHaveBeenCalledWith('test-consumer');
    });
  });
});

// Mock objects
const mockRabbitMQConfig: any = {};
const mockTaskService: any = {};