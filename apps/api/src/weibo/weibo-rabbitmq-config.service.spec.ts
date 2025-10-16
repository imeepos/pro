import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WeiboRabbitMQConfigService } from './weibo-rabbitmq-config.service';
import { WeiboTaskStatusMessage } from './interfaces/weibo-task-status.interface';

describe('WeiboRabbitMQConfigService', () => {
  let service: WeiboRabbitMQConfigService;
  let configService: ConfigService;
  let mockRabbitMQClient: any;

  beforeEach(async () => {
    mockRabbitMQClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'RABBITMQ_URL') return 'amqp://localhost:5672';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeiboRabbitMQConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    })
    .overrideProvider(WeiboRabbitMQConfigService)
    .useFactory({
      factory: () => {
        const service = new WeiboRabbitMQConfigService(mockConfigService);
        service['rabbitMQClient'] = mockRabbitMQClient;
        return service;
      },
    })
    .compile();

    service = module.get<WeiboRabbitMQConfigService>(WeiboRabbitMQConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to RabbitMQ successfully', async () => {
      mockRabbitMQClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();
      expect(mockRabbitMQClient.connect).toHaveBeenCalled();
    });

    it('should throw error when connection fails', async () => {
      mockRabbitMQClient.connect.mockRejectedValue(new Error('Connection failed'));
      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from RabbitMQ successfully', async () => {
      mockRabbitMQClient.disconnect.mockResolvedValue(undefined);
      await service.onModuleDestroy();
      expect(mockRabbitMQClient.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect error gracefully', async () => {
      mockRabbitMQClient.disconnect.mockRejectedValue(new Error('Disconnect failed'));
      await service.onModuleDestroy(); // Should not throw
    });
  });

  describe('getConsumerConfig', () => {
    it('should return valid consumer configuration', () => {
      const config = service.getConsumerConfig();
      expect(config).toEqual({
        queueName: 'weibo_task_status_queue',
        consumerTag: expect.stringContaining('weibo-task-status-consumer-'),
        prefetchCount: 5,
        retryConfig: {
          maxRetries: 3,
          retryDelayBase: 5000,
        },
      });
    });
  });

  describe('validateStatusMessage', () => {
    const validMessage: WeiboTaskStatusMessage = {
      taskId: 1,
      status: 'running',
      currentCrawlTime: new Date(),
      latestCrawlTime: new Date(),
      progress: 50,
      updatedAt: new Date(),
    };

    it('should validate correct message', () => {
      expect(service.validateStatusMessage(validMessage)).toBe(true);
    });

    it('should reject null or undefined message', () => {
      expect(service.validateStatusMessage(null)).toBe(false);
      expect(service.validateStatusMessage(undefined)).toBe(false);
      expect(service.validateStatusMessage('string')).toBe(false);
      expect(service.validateStatusMessage(123)).toBe(false);
    });

    it('should reject message with missing required fields', () => {
      const invalidMessage1 = { taskId: 1, status: 'running' }; // missing updatedAt
      const invalidMessage2 = { taskId: 1, updatedAt: new Date() }; // missing status
      const invalidMessage3 = { status: 'running', updatedAt: new Date() }; // missing taskId

      expect(service.validateStatusMessage(invalidMessage1)).toBe(false);
      expect(service.validateStatusMessage(invalidMessage2)).toBe(false);
      expect(service.validateStatusMessage(invalidMessage3)).toBe(false);
    });

    it('should reject message with invalid taskId', () => {
      const invalidMessage1 = { ...validMessage, taskId: -1 };
      const invalidMessage2 = { ...validMessage, taskId: 0 };
      const invalidMessage3 = { ...validMessage, taskId: 'string' };

      expect(service.validateStatusMessage(invalidMessage1)).toBe(false);
      expect(service.validateStatusMessage(invalidMessage2)).toBe(false);
      expect(service.validateStatusMessage(invalidMessage3)).toBe(false);
    });

    it('should reject message with invalid status', () => {
      const invalidMessage = { ...validMessage, status: 'invalid' };
      expect(service.validateStatusMessage(invalidMessage)).toBe(false);
    });

    it('should reject message with invalid updatedAt', () => {
      const invalidMessage1 = { ...validMessage, updatedAt: 'invalid-date' };
      const invalidMessage2 = { ...validMessage, updatedAt: null };
      const invalidMessage3 = { ...validMessage, updatedAt: '' };

      expect(service.validateStatusMessage(invalidMessage1)).toBe(false);
      expect(service.validateStatusMessage(invalidMessage2)).toBe(false);
      expect(service.validateStatusMessage(invalidMessage3)).toBe(false);
    });

    it('should accept valid status values', () => {
      const validStatuses = ['running', 'completed', 'failed', 'timeout'];
      validStatuses.forEach(status => {
        const message = { ...validMessage, status };
        expect(service.validateStatusMessage(message)).toBe(true);
      });
    });
  });

  describe('parseStatusMessage', () => {
    const rawMessage = {
      taskId: 1,
      status: 'running',
      currentCrawlTime: '2023-01-01T00:00:00.000Z',
      latestCrawlTime: '2023-01-02T00:00:00.000Z',
      nextRunAt: '2023-01-03T00:00:00.000Z',
      updatedAt: '2023-01-01T12:00:00.000Z',
      progress: 50,
    };

    it('should parse valid raw message correctly', () => {
      const result = service.parseStatusMessage(rawMessage);
      expect(result).toEqual({
        taskId: 1,
        status: 'running',
        currentCrawlTime: new Date('2023-01-01T00:00:00.000Z'),
        latestCrawlTime: new Date('2023-01-02T00:00:00.000Z'),
        nextRunAt: new Date('2023-01-03T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T12:00:00.000Z'),
        progress: 50,
      });
    });

    it('should return null for invalid message', () => {
      const invalidMessage = { taskId: 'invalid', status: 'running' };
      const result = service.parseStatusMessage(invalidMessage);
      expect(result).toBeNull();
    });

    it('should handle message with missing optional date fields', () => {
      const messageWithoutOptionalDates = {
        taskId: 1,
        status: 'failed',
        updatedAt: '2023-01-01T12:00:00.000Z',
        errorMessage: 'Some error',
      };

      const result = service.parseStatusMessage(messageWithoutOptionalDates);
      expect(result).toEqual({
        taskId: 1,
        status: 'failed',
        updatedAt: new Date('2023-01-01T12:00:00.000Z'),
        errorMessage: 'Some error',
        currentCrawlTime: undefined,
        latestCrawlTime: undefined,
        nextRunAt: undefined,
      });
    });

    it('should handle parsing errors gracefully', () => {
      const malformedMessage = {
        taskId: 1,
        status: 'running',
        updatedAt: { invalid: 'date object' },
      };

      const result = service.parseStatusMessage(malformedMessage);
      expect(result).toBeNull();
    });
  });

  describe('getRabbitMQClient', () => {
    it('should return the RabbitMQ client instance', () => {
      const client = service.getRabbitMQClient();
      expect(client).toBeDefined();
    });
  });
});