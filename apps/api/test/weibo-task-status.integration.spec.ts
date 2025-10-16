import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { join } from 'path';
import { WeiboModule } from '../src/weibo/weibo.module';
import { WeiboSearchTaskEntity } from '@pro/entities';
import { WeiboTaskStatusConsumer } from '../src/weibo/weibo-task-status.consumer';
import { WeiboRabbitMQConfigService } from '../src/weibo/weibo-rabbitmq-config.service';
import { WeiboSearchTaskService } from '../src/weibo/weibo-search-task.service';
import { WeiboTaskStatusMessage } from '../src/weibo/interfaces/weibo-task-status.interface';

describe('WeiboTaskStatus Integration Tests', () => {
  let module: TestingModule;
  let consumer: WeiboTaskStatusConsumer;
  let rabbitMQConfig: WeiboRabbitMQConfigService;
  let taskService: WeiboSearchTaskService;
  let mockRabbitMQClient: any;

  beforeAll(async () => {
    // Mock RabbitMQ client for testing
    mockRabbitMQClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      consume: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
      cancel: jest.fn(),
      publish: jest.fn(),
    };

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'test',
          password: 'test',
          database: 'pro_test',
          entities: [WeiboSearchTaskEntity],
          synchronize: false,
          logging: false,
        }),
        TypeOrmModule.forFeature([WeiboSearchTaskEntity]),
        GraphQLModule.forRootAsync({
          driver: ApolloDriver,
          useFactory: () => ({
            autoSchemaFile: join(process.cwd(), 'apps', 'api', 'test-schema.graphql'),
            sortSchema: true,
            path: '/graphql-test',
            graphiql: true,
          }),
        }),
        WeiboModule,
      ],
    })
    .overrideProvider(WeiboRabbitMQConfigService)
    .useFactory({
      factory: () => {
        const configService = {
          get: jest.fn((key: string, defaultValue?: string) => {
            if (key === 'RABBITMQ_URL') return 'amqp://localhost:5672';
            return defaultValue;
          }),
        } as any;

        const rabbitMQConfig = new WeiboRabbitMQConfigService(configService);
        rabbitMQConfig['rabbitMQClient'] = mockRabbitMQClient;
        return rabbitMQConfig;
      },
    })
    .compile();

    consumer = module.get<WeiboTaskStatusConsumer>(WeiboTaskStatusConsumer);
    rabbitMQConfig = module.get<WeiboRabbitMQConfigService>(WeiboRabbitMQConfigService);
    taskService = module.get<WeiboSearchTaskService>(WeiboSearchTaskService);

    // Initialize the consumer
    await consumer.onModuleInit();
  });

  afterAll(async () => {
    await consumer.onModuleDestroy();
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    consumer.resetStats();
  });

  describe('End-to-End Status Update Flow', () => {
    it('should process status update message from Crawler to Database', async () => {
      // Create a test task in the database
      const testTask = await taskService.create({
        keyword: 'test keyword',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
      });

      const statusMessage: WeiboTaskStatusMessage = {
        taskId: testTask.id,
        status: 'running',
        currentCrawlTime: new Date('2023-01-15'),
        latestCrawlTime: new Date('2023-01-14'),
        progress: 25,
        updatedAt: new Date(),
      };

      // Mock the message handler callback
      let messageHandler: any;
      mockRabbitMQClient.consume.mockImplementation((queue, handler) => {
        messageHandler = handler;
      });

      // Simulate receiving a message from RabbitMQ
      const mockMessage = {
        content: Buffer.from(JSON.stringify(statusMessage)),
        fields: { deliveryTag: 1 },
      };

      // Process the message
      await messageHandler(mockMessage);

      // Verify the message was acknowledged
      expect(mockRabbitMQClient.ack).toHaveBeenCalledWith(mockMessage);

      // Verify the task status was updated in database
      const updatedTask = await taskService.findById(testTask.id);
      expect(updatedTask.status).toBe('running');
      expect(updatedTask.currentCrawlTime).toEqual(statusMessage.currentCrawlTime);
      expect(updatedTask.latestCrawlTime).toEqual(statusMessage.latestCrawlTime);
      expect(updatedTask.progress).toBe(25);

      // Verify stats were updated
      const stats = consumer.getStats();
      expect(stats.totalMessages).toBe(1);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
    });

    it('should handle failed status with error message', async () => {
      // Create a test task
      const testTask = await taskService.create({
        keyword: 'test error',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
      });

      const failedStatusMessage: WeiboTaskStatusMessage = {
        taskId: testTask.id,
        status: 'failed',
        errorMessage: 'Connection timeout after 30 seconds',
        updatedAt: new Date(),
      };

      let messageHandler: any;
      mockRabbitMQClient.consume.mockImplementation((queue, handler) => {
        messageHandler = handler;
      });

      const mockMessage = {
        content: Buffer.from(JSON.stringify(failedStatusMessage)),
        fields: { deliveryTag: 2 },
      };

      await messageHandler(mockMessage);

      // Verify the task status was updated
      const updatedTask = await taskService.findById(testTask.id);
      expect(updatedTask.status).toBe('failed');
      expect(updatedTask.errorMessage).toBe('Connection timeout after 30 seconds');

      expect(mockRabbitMQClient.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle invalid message format', async () => {
      const invalidMessage = {
        taskId: 'invalid',
        status: 'running',
        // Missing required fields
      };

      let messageHandler: any;
      mockRabbitMQClient.consume.mockImplementation((queue, handler) => {
        messageHandler = handler;
      });

      const mockMessage = {
        content: Buffer.from(JSON.stringify(invalidMessage)),
        fields: { deliveryTag: 3 },
      };

      await messageHandler(mockMessage);

      // Verify invalid message was rejected without requeue
      expect(mockRabbitMQClient.nack).toHaveBeenCalledWith(mockMessage, false, false);

      // Verify stats show failure
      const stats = consumer.getStats();
      expect(stats.totalMessages).toBe(1);
      expect(stats.failureCount).toBe(1);
    });

    it('should handle database errors and retry', async () => {
      const statusMessage: WeiboTaskStatusMessage = {
        taskId: 999, // Non-existent task ID
        status: 'running',
        updatedAt: new Date(),
      };

      let messageHandler: any;
      mockRabbitMQClient.consume.mockImplementation((queue, handler) => {
        messageHandler = handler;
      });

      const mockMessage = {
        content: Buffer.from(JSON.stringify(statusMessage)),
        fields: { deliveryTag: 4 },
      };

      await messageHandler(mockMessage);

      // Verify the message was rejected for retry
      expect(mockRabbitMQClient.nack).toHaveBeenCalledWith(mockMessage, false, true);

      // Verify stats show retry
      const stats = consumer.getStats();
      expect(stats.totalMessages).toBe(1);
      expect(stats.retryCount).toBe(1);
    });
  });

  describe('Message Validation Integration', () => {
    it('should validate all required fields', async () => {
      const testCases = [
        {
          message: { taskId: 1, status: 'running' }, // Missing updatedAt
          shouldSucceed: false,
        },
        {
          message: { taskId: -1, status: 'running', updatedAt: new Date() }, // Invalid taskId
          shouldSucceed: false,
        },
        {
          message: { taskId: 1, status: 'invalid', updatedAt: new Date() }, // Invalid status
          shouldSucceed: false,
        },
        {
          message: { taskId: 1, status: 'running', updatedAt: 'invalid' }, // Invalid date
          shouldSucceed: false,
        },
        {
          message: { taskId: 1, status: 'running', updatedAt: new Date() }, // Valid
          shouldSucceed: true,
        },
      ];

      for (const testCase of testCases) {
        const isValid = rabbitMQConfig.validateStatusMessage(testCase.message);
        expect(isValid).toBe(testCase.shouldSucceed);
      }
    });

    it('should parse date fields correctly', async () => {
      const rawMessage = {
        taskId: 1,
        status: 'running',
        currentCrawlTime: '2023-01-01T00:00:00.000Z',
        latestCrawlTime: '2023-01-02T00:00:00.000Z',
        nextRunAt: '2023-01-03T00:00:00.000Z',
        updatedAt: '2023-01-01T12:00:00.000Z',
        progress: 50,
      };

      const parsedMessage = rabbitMQConfig.parseStatusMessage(rawMessage);

      expect(parsedMessage).toBeTruthy();
      expect(parsedMessage.currentCrawlTime).toBeInstanceOf(Date);
      expect(parsedMessage.latestCrawlTime).toBeInstanceOf(Date);
      expect(parsedMessage.nextRunAt).toBeInstanceOf(Date);
      expect(parsedMessage.updatedAt).toBeInstanceOf(Date);
      expect(parsedMessage.taskId).toBe(1);
      expect(parsedMessage.status).toBe('running');
      expect(parsedMessage.progress).toBe(50);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent messages', async () => {
      const messages: WeiboTaskStatusMessage[] = Array.from({ length: 10 }, (_, i) => ({
        taskId: i + 1,
        status: 'running' as const,
        updatedAt: new Date(),
        progress: i * 10,
      }));

      // Create tasks for each message
      for (const message of messages) {
        await taskService.create({
          keyword: `test ${message.taskId}`,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31'),
        });
      }

      let messageHandler: any;
      mockRabbitMQClient.consume.mockImplementation((queue, handler) => {
        messageHandler = handler;
      });

      // Process all messages concurrently
      const promises = messages.map((message, index) => {
        const mockMessage = {
          content: Buffer.from(JSON.stringify(message)),
          fields: { deliveryTag: index + 10 },
        };
        return messageHandler(mockMessage);
      });

      await Promise.all(promises);

      // Verify all messages were processed
      const stats = consumer.getStats();
      expect(stats.totalMessages).toBe(10);
      expect(stats.successCount).toBe(10);
      expect(stats.avgProcessingTime).toBeGreaterThan(0);
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      const messageCount = 50;

      for (let i = 0; i < messageCount; i++) {
        await taskService.create({
          keyword: `load test ${i}`,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31'),
        });
      }

      let messageHandler: any;
      mockRabbitMQClient.consume.mockImplementation((queue, handler) => {
        messageHandler = handler;
      });

      // Process messages sequentially
      for (let i = 0; i < messageCount; i++) {
        const message: WeiboTaskStatusMessage = {
          taskId: i + 1,
          status: 'running',
          updatedAt: new Date(),
          progress: Math.floor(Math.random() * 100),
        };

        const mockMessage = {
          content: Buffer.from(JSON.stringify(message)),
          fields: { deliveryTag: i + 100 },
        };

        await messageHandler(mockMessage);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerMessage = totalTime / messageCount;

      // Performance assertions
      expect(avgTimePerMessage).toBeLessThan(100); // Less than 100ms per message
      expect(totalTime).toBeLessThan(5000); // Less than 5 seconds total

      const stats = consumer.getStats();
      expect(stats.totalMessages).toBe(messageCount);
      expect(stats.successCount).toBe(messageCount);
    });
  });
});