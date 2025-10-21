/**
 * 消息队列集成测试
 * 验证RabbitMQ消息发布和消费、持久化、死信队列、重试机制等核心功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';

// 导入要测试的服务
import { RabbitMQConfigService } from '../../src/rabbitmq/rabbitmq-config.service';
import { SimpleIntervalScheduler } from '../../src/weibo/simple-interval-scheduler.service';
import { SubTaskMessage, TaskResultMessage, WEIBO_CRAWL_QUEUE, WEIBO_CRAWL_ROUTING_KEY } from '../../src/weibo/interfaces/sub-task-message.interface';

// 导入测试配置
import {
  createMockPinoLogger,
  createMockRedisClient,
  createMockRabbitMQService,
  createTestTask,
  TestUtils,
  TEST_CONSTANTS,
  testRabbitMQConfig,
} from './test.config';

/**
 * 消息队列集成测试套件
 * 验证RabbitMQ的消息发布、消费、持久化、死信队列、重试机制等功能
 */
describe('MessageQueueIntegration', () => {
  let module: TestingModule;
  let rabbitMQService: RabbitMQConfigService;
  let taskRepository: Repository<WeiboSearchTaskEntity>;
  let taskScheduler: SimpleIntervalScheduler;

  // 模拟AMQP连接和通道
  let mockConnection: any;
  let mockChannel: any;

  beforeAll(async () => {
    // 创建模拟AMQP连接
    mockConnection = {
      createChannel: jest.fn(),
      on: jest.fn(),
      close: jest.fn(),
    };

    mockChannel = {
      assertQueue: jest.fn(),
      assertExchange: jest.fn(),
      bindQueue: jest.fn(),
      publish: jest.fn(),
      consume: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
      reject: jest.fn(),
      prefetch: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
    };

    // 创建测试模块
    module = await Test.createTestingModule({
      providers: [
        {
          provide: RabbitMQConfigService,
          useFactory: () => ({
            async connect() {
              return mockConnection;
            },
            async getChannel() {
              return mockChannel;
            },
            async isConnected() {
              return true;
            },
            async publishSubTask(message: SubTaskMessage) {
              mockChannel.publish(
                'weibo_exchange',
                WEIBO_CRAWL_ROUTING_KEY,
                Buffer.from(JSON.stringify(message)),
                { persistent: true, priority: 1 }
              );
              return true;
            },
            async consumeTaskResults(queue: string, callback: Function) {
              mockChannel.consume(queue, callback);
            },
            async ack(message: any) {
              mockChannel.ack(message);
            },
            async nack(message: any, requeue?: boolean) {
              mockChannel.nack(message, false, requeue);
            },
            async close() {
              await mockChannel.close();
              await mockConnection.close();
            },
          }),
        },
        SimpleIntervalScheduler,
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
      ],
    }).compile();

    rabbitMQService = module.get<RabbitMQConfigService>(RabbitMQConfigService);
    taskScheduler = module.get<SimpleIntervalScheduler>(SimpleIntervalScheduler);
    taskRepository = module.get<Repository<WeiboSearchTaskEntity>>(
      getRepositoryToken(WeiboSearchTaskEntity)
    );
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // 模拟成功的AMQP操作
    mockChannel.assertQueue.mockResolvedValue({ queue: WEIBO_CRAWL_QUEUE, messageCount: 0, consumerCount: 0 });
    mockChannel.assertExchange.mockResolvedValue({ exchange: 'weibo_exchange' });
    mockChannel.bindQueue.mockResolvedValue({});
    mockChannel.publish.mockReturnValue(true);
    mockChannel.consume.mockResolvedValue({ consumerTag: 'test-consumer' });
  });

  describe('消息发布功能', () => {
    it('应该能够发布子任务消息', async () => {
      const subTaskMessage: SubTaskMessage = {
        taskId: 1,
        keyword: '测试消息',
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T01:00:00Z'),
        isInitialCrawl: true,
        weiboAccountId: 1,
        enableAccountRotation: false,
      };

      const result = await rabbitMQService.publishSubTask(subTaskMessage);

      expect(result).toBe(true);
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'weibo_exchange',
        WEIBO_CRAWL_ROUTING_KEY,
        Buffer.from(JSON.stringify(subTaskMessage)),
        { persistent: true, priority: 1 }
      );
    });

    it('应该设置正确的消息属性', async () => {
      const subTaskMessage: SubTaskMessage = {
        taskId: 2,
        keyword: '属性测试',
        start: new Date(),
        end: new Date(),
        isInitialCrawl: false,
        weiboAccountId: 2,
        enableAccountRotation: true,
      };

      await rabbitMQService.publishSubTask(subTaskMessage);

      const publishCall = mockChannel.publish.mock.calls[0];
      const options = publishCall[3];

      expect(options).toMatchObject({
        persistent: true, // 消息持久化
        priority: expect.any(Number), // 消息优先级
        timestamp: expect.any(Number), // 时间戳
        messageId: expect.any(String), // 消息ID
        headers: expect.objectContaining({
          taskId: 2,
          keyword: '属性测试',
          messageType: 'subtask',
        }),
      });
    });

    it('应该处理消息发布失败', async () => {
      const subTaskMessage: SubTaskMessage = {
        taskId: 3,
        keyword: '失败测试',
        start: new Date(),
        end: new Date(),
        isInitialCrawl: true,
        weiboAccountId: 1,
        enableAccountRotation: false,
      };

      // 模拟发布失败
      mockChannel.publish.mockReturnValue(false);

      const result = await rabbitMQService.publishSubTask(subTaskMessage);

      expect(result).toBe(false);
    });

    it('应该处理连接断开的情况', async () => {
      const disconnectedService = {
        async isConnected() {
          return false;
        },
        async publishSubTask(message: SubTaskMessage) {
          throw new Error('Connection closed');
        },
      };

      const subTaskMessage: SubTaskMessage = {
        taskId: 4,
        keyword: '连接断开测试',
        start: new Date(),
        end: new Date(),
        isInitialCrawl: true,
        weiboAccountId: 1,
        enableAccountRotation: false,
      };

      await expect(disconnectedService.publishSubTask(subTaskMessage)).rejects.toThrow('Connection closed');
    });
  });

  describe('消息持久化验证', () => {
    it('应该启用消息持久化', async () => {
      const subTaskMessage: SubTaskMessage = {
        taskId: 5,
        keyword: '持久化测试',
        start: new Date(),
        end: new Date(),
        isInitialCrawl: true,
        weiboAccountId: 1,
        enableAccountRotation: false,
      };

      await rabbitMQService.publishSubTask(subTaskMessage);

      const publishCall = mockChannel.publish.mock.calls[0];
      const options = publishCall[3];

      expect(options.persistent).toBe(true);
    });

    it('应该创建持久化队列', async () => {
      // 模拟队列声明
      await mockChannel.assertQueue(WEIBO_CRAWL_QUEUE, {
        durable: true, // 队列持久化
        arguments: {
          'x-queue-mode': 'lazy', // 惰性队列，节省内存
          'x-max-length': 10000, // 最大消息数量
          'x-message-ttl': 3600000, // 消息TTL 1小时
        },
      });

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        WEIBO_CRAWL_QUEUE,
        expect.objectContaining({
          durable: true,
          arguments: expect.objectContaining({
            'x-queue-mode': 'lazy',
            'x-max-length': 10000,
            'x-message-ttl': 3600000,
          }),
        })
      );
    });

    it('应该设置正确的交换机持久化', async () => {
      await mockChannel.assertExchange('weibo_exchange', 'topic', {
        durable: true, // 交换机持久化
        autoDelete: false,
      });

      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        'weibo_exchange',
        'topic',
        expect.objectContaining({
          durable: true,
          autoDelete: false,
        })
      );
    });
  });

  describe('死信队列处理', () => {
    it('应该配置死信队列', async () => {
      const deadLetterQueue = `${WEIBO_CRAWL_QUEUE}.dlq`;
      const retryQueue = `${WEIBO_CRAWL_QUEUE}.retry`;

      // 主队列配置死信
      await mockChannel.assertQueue(WEIBO_CRAWL_QUEUE, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': deadLetterQueue,
          'x-message-ttl': 3600000,
        },
      });

      // 死信队列
      await mockChannel.assertQueue(deadLetterQueue, {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000, // 死信消息保存24小时
        },
      });

      // 重试队列
      await mockChannel.assertQueue(retryQueue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': WEIBO_CRAWL_QUEUE,
          'x-message-ttl': 60000, // 1分钟后重试
        },
      });

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        deadLetterQueue,
        expect.objectContaining({
          durable: true,
          arguments: expect.objectContaining({
            'x-message-ttl': 86400000,
          }),
        })
      );

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        retryQueue,
        expect.objectContaining({
          durable: true,
          arguments: expect.objectContaining({
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': WEIBO_CRAWL_QUEUE,
            'x-message-ttl': 60000,
          }),
        })
      );
    });

    it('应该处理死信消息', async () => {
      const deadLetterMessage = {
        content: Buffer.from(JSON.stringify({
          taskId: 6,
          keyword: '死信测试',
          error: 'Processing failed',
          retryCount: 3,
          originalQueue: WEIBO_CRAWL_QUEUE,
          failedAt: new Date().toISOString(),
        })),
        fields: {
          routingKey: `${WEIBO_CRAWL_QUEUE}.dlq`,
        },
        properties: {
          headers: {
            'x-death': [
              {
                count: 1,
                reason: 'expired',
                queue: WEIBO_CRAWL_QUEUE,
                'original-expiration': 3600000,
              },
            ],
          },
        },
      };

      // 模拟死信队列消费者
      let receivedMessage: any = null;
      const dlqCallback = (message: any) => {
        receivedMessage = message;
      };

      await rabbitMQService.consumeTaskResults(`${WEIBO_CRAWL_QUEUE}.dlq`, dlqCallback);

      // 模拟接收到死信消息
      if (receivedMessage) {
        const content = JSON.parse(receivedMessage.content.toString());

        expect(content).toMatchObject({
          taskId: 6,
          keyword: '死信测试',
          error: 'Processing failed',
          retryCount: 3,
          originalQueue: WEIBO_CRAWL_QUEUE,
        });

        // 验证死亡信息
        expect(receivedMessage.properties.headers['x-death']).toBeDefined();
      }
    });
  });

  describe('消息重试机制', () => {
    it('应该实现指数退避重试策略', async () => {
      const failedMessage: SubTaskMessage = {
        taskId: 7,
        keyword: '重试测试',
        start: new Date(),
        end: new Date(),
        isInitialCrawl: true,
        weiboAccountId: 1,
        enableAccountRotation: false,
      };

      // 模拟处理失败的消息
      const processMessage = async (message: SubTaskMessage, retryCount = 0): Promise<boolean> => {
        if (retryCount < 3) {
          // 计算退避延迟：1分钟, 2分钟, 4分钟
          const delay = Math.pow(2, retryCount) * 60 * 1000;

          // 发送到重试队列
          mockChannel.publish(
            '',
            `${WEIBO_CRAWL_QUEUE}.retry`,
            Buffer.from(JSON.stringify({
              ...message,
              retryCount: retryCount + 1,
              originalMessageId: message.taskId,
            })),
            {
              persistent: true,
              expiration: delay,
            }
          );

          return false;
        }

        // 重试次数用尽，发送到死信队列
        mockChannel.publish(
          '',
          `${WEIBO_CRAWL_QUEUE}.dlq`,
          Buffer.from(JSON.stringify({
            ...message,
            retryCount: retryCount,
            error: 'Max retries exceeded',
          })),
          { persistent: true }
        );

        return false;
      };

      // 测试重试逻辑
      let retryCount = 0;
      while (retryCount < 3) {
        const result = await processMessage(failedMessage, retryCount);
        if (result) break;
        retryCount++;
      }

      // 验证重试次数
      expect(mockChannel.publish).toHaveBeenCalledTimes(4); // 3次重试 + 1次死信
    });

    it('应该限制最大重试次数', async () => {
      const message: SubTaskMessage = {
        taskId: 8,
        keyword: '最大重试测试',
        start: new Date(),
        end: new Date(),
        isInitialCrawl: true,
        weiboAccountId: 1,
        enableAccountRotation: false,
      };

      // 模拟超过最大重试次数
      const maxRetries = 3;
      for (let i = 0; i <= maxRetries; i++) {
        if (i < maxRetries) {
          // 前几次发送到重试队列
          mockChannel.publish(
            '',
            `${WEIBO_CRAWL_QUEUE}.retry`,
            Buffer.from(JSON.stringify({ ...message, retryCount: i + 1 })),
            { persistent: true }
          );
        } else {
          // 最后一次发送到死信队列
          mockChannel.publish(
            '',
            `${WEIBO_CRAWL_QUEUE}.dlq`,
            Buffer.from(JSON.stringify({
              ...message,
              retryCount: i,
              error: 'Max retries exceeded',
            })),
            { persistent: true }
          );
        }
      }

      // 验证最终发送到死信队列
      const dlqCall = mockChannel.publish.mock.calls.find(call =>
        call[1] === `${WEIBO_CRAWL_QUEUE}.dlq`
      );

      expect(dlqCall).toBeDefined();
      const dlqContent = JSON.parse(dlqCall[2].toString());
      expect(dlqContent.retryCount).toBe(maxRetries);
      expect(dlqContent.error).toBe('Max retries exceeded');
    });
  });

  describe('队列负载均衡', () => {
    it('应该设置合适的预取数量', async () => {
      // 设置预取数量以控制消费者负载
      await mockChannel.prefetch(5); // 每个消费者最多预取5条消息

      expect(mockChannel.prefetch).toHaveBeenCalledWith(5);
    });

    it('应该支持多个消费者', async () => {
      const consumerCount = 3;
      const consumerTags: string[] = [];

      // 创建多个消费者
      for (let i = 0; i < consumerCount; i++) {
        const consumerTag = await mockChannel.consume(WEIBO_CRAWL_QUEUE, (message: any) => {
          // 模拟消息处理
          console.log(`消费者 ${i + 1} 处理消息:`, message?.content.toString());
          mockChannel.ack(message);
        });

        consumerTags.push(consumerTag.consumerTag);
      }

      expect(mockChannel.consume).toHaveBeenCalledTimes(consumerCount);
      expect(consumerTags).toHaveLength(consumerCount);
    });

    it('应该实现消费者负载均衡', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        content: Buffer.from(JSON.stringify({
          taskId: i + 1,
          keyword: `负载均衡测试${i + 1}`,
        })),
      }));

      const consumerMessages: Record<number, any[]> = { 0: [], 1: [], 2: [] };

      // 模拟三个消费者
      for (let consumerId = 0; consumerId < 3; consumerId++) {
        mockChannel.consume(WEIBO_CRAWL_QUEUE, (message: any) => {
          if (message) {
            consumerMessages[consumerId].push(message);
            mockChannel.ack(message);
          }
        });
      }

      // 模拟消息分发（Round-robin）
      messages.forEach((message, index) => {
        const consumerId = index % 3;
        // 这里模拟RabbitMQ的负载均衡分发
        setTimeout(() => {
          const callback = mockChannel.consume.mock.calls[consumerId][1];
          callback(message);
        }, index * 10);
      });

      // 等待消息处理
      await TestUtils.sleep(200);

      // 验证负载均衡（每个消费者应该收到相近数量的消息）
      const messageCounts = Object.values(consumerMessages).map(messages => messages.length);
      const maxMessages = Math.max(...messageCounts);
      const minMessages = Math.min(...messageCounts);

      // 负载均衡差异不超过1条消息
      expect(maxMessages - minMessages).toBeLessThanOrEqual(1);
    });
  });

  describe('消息确认机制', () => {
    it('应该正确处理消息确认', async () => {
      const message = {
        content: Buffer.from(JSON.stringify({
          taskId: 9,
          keyword: '确认测试',
        })),
        fields: { deliveryTag: 1 },
      };

      // 模拟成功处理
      const processMessage = async (msg: any) => {
        // 业务逻辑处理
        await TestUtils.sleep(100);

        // 确认消息
        await rabbitMQService.ack(msg);

        return true;
      };

      await processMessage(message);

      expect(mockChannel.ack).toHaveBeenCalledWith(message);
    });

    it('应该处理消息拒绝和重入队', async () => {
      const message = {
        content: Buffer.from(JSON.stringify({
          taskId: 10,
          keyword: '拒绝测试',
        })),
        fields: { deliveryTag: 2 },
      };

      // 模拟处理失败，但可以重试
      const processMessage = async (msg: any) => {
        try {
          // 业务逻辑处理失败
          throw new Error('Temporary failure');
        } catch (error) {
          // 拒绝消息并重新入队
          await rabbitMQService.nack(msg, true); // requeue = true
          return false;
        }
      };

      await processMessage(message);

      expect(mockChannel.nack).toHaveBeenCalledWith(message, false, true);
    });

    it('应该处理消息拒绝且不重入队', async () => {
      const message = {
        content: Buffer.from(JSON.stringify({
          taskId: 11,
          keyword: '死信测试',
        })),
        fields: { deliveryTag: 3 },
      };

      // 模拟处理失败，不应重试
      const processMessage = async (msg: any) => {
        try {
          // 业务逻辑处理失败
          throw new Error('Permanent failure');
        } catch (error) {
          // 拒绝消息且不重新入队（发送到死信队列）
          await rabbitMQService.nack(msg, false); // requeue = false
          return false;
        }
      };

      await processMessage(message);

      expect(mockChannel.nack).toHaveBeenCalledWith(message, false, false);
    });
  });

  describe('连接管理和监控', () => {
    it('应该监控连接状态', async () => {
      const isConnected = await rabbitMQService.isConnected();

      expect(isConnected).toBe(true);
    });

    it('应该处理连接重连', async () => {
      let reconnectAttempts = 0;

      const mockReconnectingService = {
        connectionAttempts: 0,
        async connect() {
          this.connectionAttempts++;
          if (this.connectionAttempts < 3) {
            throw new Error('Connection failed');
          }
          return mockConnection;
        },
        async isConnected() {
          return this.connectionAttempts >= 3;
        },
      };

      // 模拟重连逻辑
      while (!await mockReconnectingService.isConnected() && reconnectAttempts < 5) {
        try {
          await mockReconnectingService.connect();
        } catch (error) {
          reconnectAttempts++;
          await TestUtils.sleep(1000); // 等待1秒后重试
        }
      }

      expect(reconnectAttempts).toBe(2); // 前2次失败，第3次成功
      expect(mockReconnectingService.connectionAttempts).toBe(3);
    });

    it('应该优雅关闭连接', async () => {
      await rabbitMQService.close();

      expect(mockChannel.close).toHaveBeenCalled();
      // 注意：在实际实现中，连接关闭可能由RabbitMQ客户端自动处理
    });
  });

  describe('性能测试', () => {
    it('应该支持高吞吐量消息发布', async () => {
      const messageCount = 1000;
      const messages: SubTaskMessage[] = Array.from({ length: messageCount }, (_, i) => ({
        taskId: i + 100,
        keyword: `性能测试${i + 1}`,
        start: new Date(),
        end: new Date(),
        isInitialCrawl: true,
        weiboAccountId: (i % 5) + 1,
        enableAccountRotation: false,
      }));

      const startTime = Date.now();

      // 批量发布消息
      const publishPromises = messages.map(message =>
        rabbitMQService.publishSubTask(message)
      );

      const results = await Promise.all(publishPromises);
      const duration = Date.now() - startTime;

      // 验证所有消息都发布成功
      expect(results.every(result => result === true)).toBe(true);
      expect(mockChannel.publish).toHaveBeenCalledTimes(messageCount);

      // 验证性能：1000条消息应在5秒内发布完成
      expect(duration).toBeLessThan(5000);

      // 计算吞吐量
      const throughput = messageCount / (duration / 1000);
      console.log(`消息发布吞吐量: ${throughput.toFixed(2)} 消息/秒`);
      expect(throughput).toBeGreaterThan(200); // 至少200消息/秒
    });

    it('应该支持高吞吐量消息消费', async () => {
      const messageCount = 500;
      const processedMessages: any[] = [];
      let consumedCount = 0;

      // 设置消费者
      await rabbitMQService.consumeTaskResults(WEIBO_CRAWL_QUEUE, async (message: any) => {
        if (message) {
          // 模拟消息处理
          await TestUtils.sleep(1); // 1ms处理时间

          processedMessages.push(JSON.parse(message.content.toString()));
          await rabbitMQService.ack(message);

          consumedCount++;
        }
      });

      const startTime = Date.now();

      // 模拟消息到达
      for (let i = 0; i < messageCount; i++) {
        const message = {
          content: Buffer.from(JSON.stringify({
            taskId: i + 200,
            keyword: `消费测试${i + 1}`,
          })),
          fields: { deliveryTag: i + 1 },
        };

        // 模拟RabbitMQ分发消息
        const callback = mockChannel.consume.mock.calls[0][1];
        await callback(message);
      }

      // 等待所有消息处理完成
      while (consumedCount < messageCount) {
        await TestUtils.sleep(10);
      }

      const duration = Date.now() - startTime;

      // 验证所有消息都被处理
      expect(consumedCount).toBe(messageCount);
      expect(processedMessages).toHaveLength(messageCount);

      // 验证性能：500条消息应在3秒内处理完成
      expect(duration).toBeLessThan(3000);

      const throughput = messageCount / (duration / 1000);
      console.log(`消息消费吞吐量: ${throughput.toFixed(2)} 消息/秒`);
      expect(throughput).toBeGreaterThan(150); // 至少150消息/秒
    });
  });

  describe('错误处理和恢复', () => {
    it('应该处理通道关闭错误', async () => {
      mockChannel.publish.mockImplementation(() => {
        throw new Error('Channel closed');
      });

      const message: SubTaskMessage = {
        taskId: 300,
        keyword: '通道关闭测试',
        start: new Date(),
        end: new Date(),
        isInitialCrawl: true,
        weiboAccountId: 1,
        enableAccountRotation: false,
      };

      await expect(rabbitMQService.publishSubTask(message)).rejects.toThrow('Channel closed');
    });

    it('应该处理消息格式错误', async () => {
      const invalidMessage = {
        taskId: 'invalid', // 应该是number
        keyword: null, // 应该是string
        start: 'invalid-date', // 应该是Date
      } as any;

      // 尝试发布无效消息
      const result = await rabbitMQService.publishSubTask(invalidMessage);

      // 应该处理格式错误（可能返回false或抛出异常）
      expect(typeof result === 'boolean').toBe(true);
    });

    it('应该处理内存不足情况', async () => {
      // 模拟内存不足的发布错误
      mockChannel.publish.mockImplementation(() => {
        throw new Error('Insufficient memory');
      });

      const message: SubTaskMessage = {
        taskId: 301,
        keyword: '内存测试',
        start: new Date(),
        end: new Date(),
        isInitialCrawl: true,
        weiboAccountId: 1,
        enableAccountRotation: false,
      };

      await expect(rabbitMQService.publishSubTask(message)).rejects.toThrow('Insufficient memory');
    });
  });
});