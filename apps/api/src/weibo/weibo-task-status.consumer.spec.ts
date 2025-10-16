import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@pro/logger';
import { WeiboSearchTaskService } from './weibo-search-task.service';
import { WeiboTaskStatusConsumer } from './weibo-task-status.consumer';
import { WeiboRabbitMQConfigService } from './weibo-rabbitmq-config.service';
import { WeiboTaskStatusMessage, MessageProcessResult } from './interfaces/weibo-task-status.interface';
import { WeiboSearchTaskStatus } from '@pro/entities';

describe('WeiboTaskStatusConsumer', () => {
  let consumer: WeiboTaskStatusConsumer;
  let rabbitMQConfig: WeiboRabbitMQConfigService;
  let taskService: WeiboSearchTaskService;
  let mockRabbitMQClient: any;

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
      ],
    }).compile();

    consumer = module.get<WeiboTaskStatusConsumer>(WeiboTaskStatusConsumer);
    rabbitMQConfig = module.get<WeiboRabbitMQConfigService>(WeiboRabbitMQConfigService);
    taskService = module.get<WeiboSearchTaskService>(WeiboSearchTaskService);
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
        expect(consumer['isRetryableError'](error)).toBe(true);
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

  describe('stats tracking', () => {
    it('should track stats correctly', () => {
      const initialStats = consumer.getStats();
      expect(initialStats.totalMessages).toBe(0);
      expect(initialStats.successCount).toBe(0);
      expect(initialStats.failureCount).toBe(0);
      expect(initialStats.retryCount).toBe(0);
    });

    it('should reset stats correctly', () => {
      consumer['updateStats'](100, MessageProcessResult.SUCCESS);
      consumer['updateStats'](150, MessageProcessResult.FAILED);

      expect(consumer.getStats().totalMessages).toBe(2);
      expect(consumer.getStats().successCount).toBe(1);
      expect(consumer.getStats().failureCount).toBe(1);

      consumer.resetStats();

      const resetStats = consumer.getStats();
      expect(resetStats.totalMessages).toBe(0);
      expect(resetStats.successCount).toBe(0);
      expect(resetStats.failureCount).toBe(0);
      expect(resetStats.retryCount).toBe(0);
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