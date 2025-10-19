/**
 * 端到端业务流程集成测试基类
 * 提供完整的系统测试基础设施，模拟真实的生产环境
 */
import { DataSource } from 'typeorm';
import { BaseIntegrationTest } from '../base-integration-test.js';
import { TestEnvironmentConfig, TestContext, E2ETestFlow } from '../types/test-types.js';
import { RabbitMQClient } from '@pro/rabbitmq';
import { Redis } from 'ioredis';
import { MongoClient } from 'mongodb';

/**
 * 端到端测试基类 - 数字时代业务流程的守护者
 * 每一个流程都经过精心设计，每一个测试都追求完美的真实性
 */
export abstract class E2EBusinessFlowTestBase extends BaseIntegrationTest {
  protected rabbitmqClient: RabbitMQClient;
  protected redis: Redis;
  protected mongodb: MongoClient;

  // 业务流程监控
  protected flowMonitor: E2ETestFlowMonitor;
  protected messageTracker: MessageTracker;
  protected dataFlowValidator: DataFlowValidator;

  constructor(config?: Partial<TestEnvironmentConfig>) {
    super(config);
    this.initializeE2EComponents();
  }

  /**
   * 获取端到端测试的默认配置
   * 更严格的环境要求和更完整的配置
   */
  protected getDefaultConfig(): TestEnvironmentConfig {
    const baseConfig = super.getDefaultConfig();

    return {
      ...baseConfig,
      docker: {
        enabled: true,
        composeFile: 'docker-compose.e2e.yml',
        services: ['postgres', 'redis', 'rabbitmq', 'mongodb', 'minio', 'elasticsearch'],
      },
      database: {
        ...baseConfig.database,
        timeout: 60000, // E2E测试需要更长的超时时间
      },
      rabbitmq: {
        ...baseConfig.rabbitmq,
        exchanges: ['weibo.crawl', 'weibo.clean', 'weibo.analyze', 'weibo.monitor'],
        queues: [
          'crawl.tasks', 'clean.tasks', 'analyze.tasks',
          'crawl.status', 'clean.status', 'analyze.status',
          'monitor.alerts', 'monitor.metrics'
        ],
      },
    };
  }

  /**
   * 初始化端到端测试组件
   */
  private initializeE2EComponents(): void {
    this.rabbitmqClient = new RabbitMQClient(this.config.rabbitmq);
    this.redis = this.environment.getRedis();
    this.mongodb = this.environment.getMongoDB();

    this.flowMonitor = new E2ETestFlowMonitor(this.context);
    this.messageTracker = new MessageTracker(this.rabbitmqClient);
    this.dataFlowValidator = new DataFlowValidator(this.database, this.mongodb);
  }

  /**
   * 设置测试套件 - 端到端测试的特殊需求
   */
  protected async setupTestSuite(): Promise<void> {
    await super.setupTestSuite();

    // 建立消息队列连接
    await this.rabbitmqClient.connect();

    // 初始化业务流程监控
    await this.flowMonitor.initialize();
    await this.messageTracker.initialize();

    // 设置消息监听器
    await this.setupMessageListeners();

    this.log('info', '端到端测试套件初始化完成');
  }

  /**
   * 清理测试套件
   */
  protected async cleanupTestSuite(): Promise<void> {
    try {
      // 停止监控
      await this.flowMonitor.cleanup();
      await this.messageTracker.cleanup();

      // 关闭消息队列连接
      if (this.rabbitmqClient) {
        await this.rabbitmqClient.close();
      }

      await super.cleanupTestSuite();
      this.log('info', '端到端测试套件清理完成');
    } catch (error) {
      this.log('error', `端到端测试套件清理失败: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 设置消息监听器 - 监控整个业务流程的消息流
   */
  private async setupMessageListeners(): Promise<void> {
    // 监听爬取任务消息
    await this.messageTracker.subscribe('crawl.tasks', async (message) => {
      await this.flowMonitor.recordEvent('task_created', message);
      this.log('debug', `爬取任务创建: ${JSON.stringify(message)}`);
    });

    // 监听爬取状态消息
    await this.messageTracker.subscribe('crawl.status', async (message) => {
      await this.flowMonitor.recordEvent('crawl_status', message);
      this.log('debug', `爬取状态更新: ${JSON.stringify(message)}`);
    });

    // 监听清洗任务消息
    await this.messageTracker.subscribe('clean.tasks', async (message) => {
      await this.flowMonitor.recordEvent('clean_task_created', message);
      this.log('debug', `清洗任务创建: ${JSON.stringify(message)}`);
    });

    // 监听清洗状态消息
    await this.messageTracker.subscribe('clean.status', async (message) => {
      await this.flowMonitor.recordEvent('clean_status', message);
      this.log('debug', `清洗状态更新: ${JSON.stringify(message)}`);
    });

    // 监听监控告警
    await this.messageTracker.subscribe('monitor.alerts', async (message) => {
      await this.flowMonitor.recordEvent('alert', message);
      this.log('warn', `监控告警: ${JSON.stringify(message)}`);
    });
  }

  /**
   * 创建端到端测试流程
   * 定义一个完整的业务流程测试
   */
  protected createE2ETestFlow(name: string): E2ETestFlow {
    return {
      name,
      startTime: new Date(),
      endTime: null,
      status: 'pending',
      steps: [],
      currentStep: 0,
      context: this.getTestContext(),
    };
  }

  /**
   * 执行端到端测试流程
   * 按步骤执行完整的业务流程
   */
  protected async executeE2EFlow(flow: E2ETestFlow): Promise<void> {
    flow.status = 'running';
    flow.startTime = new Date();

    this.log('info', `开始执行端到端测试流程: ${flow.name}`);

    try {
      for (let i = 0; i < flow.steps.length; i++) {
        flow.currentStep = i;
        const step = flow.steps[i];

        this.log('info', `执行流程步骤 ${i + 1}/${flow.steps.length}: ${step.name}`);
        step.status = 'running';
        step.startTime = new Date();

        try {
          await step.execute();
          step.status = 'completed';
          step.endTime = new Date();

          this.log('info', `流程步骤完成: ${step.name}`);
        } catch (error) {
          step.status = 'failed';
          step.error = error as Error;
          step.endTime = new Date();

          this.log('error', `流程步骤失败: ${step.name} - ${(error as Error).message}`);
          throw error;
        }
      }

      flow.status = 'completed';
      flow.endTime = new Date();

      this.log('info', `端到端测试流程完成: ${flow.name}`);
    } catch (error) {
      flow.status = 'failed';
      flow.error = error as Error;
      flow.endTime = new Date();

      this.log('error', `端到端测试流程失败: ${flow.name} - ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 验证端到端测试结果
   * 验证整个流程的数据一致性和业务逻辑正确性
   */
  protected async validateE2EResults(flow: E2ETestFlow): Promise<E2ETestValidationResult> {
    const validator = this.dataFlowValidator;
    const result: E2ETestValidationResult = {
      flowName: flow.name,
      isValid: true,
      errors: [],
      warnings: [],
      metrics: {
        totalTime: flow.endTime!.getTime() - flow.startTime.getTime(),
        completedSteps: flow.steps.filter(s => s.status === 'completed').length,
        failedSteps: flow.steps.filter(s => s.status === 'failed').length,
        messageCount: await this.messageTracker.getMessageCount(),
        dataConsistencyScore: 0,
      },
    };

    try {
      // 验证消息流完整性
      const messageFlowValid = await this.validateMessageFlow(flow);
      if (!messageFlowValid.isValid) {
        result.isValid = false;
        result.errors.push(...messageFlowValid.errors);
      }

      // 验证数据一致性
      const dataConsistency = await validator.validateDataConsistency();
      result.metrics.dataConsistencyScore = dataConsistency.score;

      if (dataConsistency.score < 0.95) {
        result.warnings.push(`数据一致性分数较低: ${dataConsistency.score}`);
        if (dataConsistency.score < 0.8) {
          result.isValid = false;
          result.errors.push(...dataConsistency.inconsistencies);
        }
      }

      // 验证业务逻辑
      const businessLogicValid = await this.validateBusinessLogic(flow);
      if (!businessLogicValid.isValid) {
        result.isValid = false;
        result.errors.push(...businessLogicValid.errors);
      }

      this.log('info', `端到端测试验证完成: ${flow.name} - ${result.isValid ? '通过' : '失败'}`);

    } catch (error) {
      result.isValid = false;
      result.errors.push(`验证过程出错: ${(error as Error).message}`);
      this.log('error', `端到端测试验证失败: ${(error as Error).message}`);
    }

    return result;
  }

  /**
   * 验证消息流完整性
   */
  private async validateMessageFlow(flow: E2ETestFlow): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const events = await this.flowMonitor.getEvents();

    // 验证必要的消息是否都已发送和接收
    const expectedMessageTypes = ['task_created', 'crawl_status', 'clean_task_created', 'clean_status'];

    for (const messageType of expectedMessageTypes) {
      const messageEvents = events.filter(e => e.type === messageType);
      if (messageEvents.length === 0) {
        errors.push(`缺少必要的消息类型: ${messageType}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证业务逻辑正确性
   * 子类可以重写此方法实现特定的业务逻辑验证
   */
  protected async validateBusinessLogic(flow: E2ETestFlow): Promise<{ isValid: boolean; errors: string[] }> {
    return { isValid: true, errors: [] };
  }

  /**
   * 等待业务流程完成
   */
  protected async waitForFlowCompletion(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 300000, // 5分钟默认超时
    interval: number = 5000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await this.sleep(interval);
    }

    throw new Error(`等待业务流程完成超时 (${timeout}ms)`);
  }

  /**
   * 创建测试数据快照
   */
  protected async createBusinessDataSnapshot(): Promise<BusinessDataSnapshot> {
    return {
      timestamp: new Date(),
      database: await this.captureDatabaseSnapshot(),
      mongodb: await this.captureMongoDBSnapshot(),
      redis: await this.captureRedisSnapshot(),
      messageFlow: await this.flowMonitor.getEvents(),
      systemMetrics: await this.captureSystemMetrics(),
    };
  }

  /**
   * 捕获MongoDB快照
   */
  private async captureMongoDBSnapshot(): Promise<any> {
    const db = this.mongodb.db();
    const collections = ['raw_weibo_data', 'processed_weibo_data', 'crawl_logs'];
    const snapshot: any = {};

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        snapshot[collectionName] = documents;
      } catch (error) {
        snapshot[collectionName] = [];
      }
    }

    return snapshot;
  }

  /**
   * 捕获系统指标
   */
  private async captureSystemMetrics(): Promise<SystemMetrics> {
    return {
      timestamp: new Date(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeConnections: {
        database: this.state.databaseConnection,
        redis: this.state.redisConnection,
        rabbitmq: this.state.rabbitmqConnection,
        mongodb: this.state.mongodbConnection,
      },
      queueStatus: {
        crawlTasks: await this.getQueueSize('crawl.tasks'),
        cleanTasks: await this.getQueueSize('clean.tasks'),
      },
    };
  }

  /**
   * 获取队列大小
   */
  private async getQueueSize(queueName: string): Promise<number> {
    try {
      // 这里需要根据具体的RabbitMQ客户端API实现
      return 0; // 占位实现
    } catch (error) {
      return 0;
    }
  }
}

/**
 * 端到端测试流程监控器
 */
class E2ETestFlowMonitor {
  private events: FlowEvent[] = [];

  constructor(private context: TestContext) {}

  async initialize(): Promise<void> {
    this.events = [];
  }

  async recordEvent(type: string, data: any): Promise<void> {
    this.events.push({
      type,
      data,
      timestamp: new Date(),
      testId: this.context.testId,
    });
  }

  async getEvents(): Promise<FlowEvent[]> {
    return [...this.events];
  }

  async cleanup(): Promise<void> {
    this.events = [];
  }
}

/**
 * 消息跟踪器
 */
class MessageTracker {
  private subscriptions: any[] = [];
  private messageCount = 0;

  constructor(private rabbitmqClient: RabbitMQClient) {}

  async initialize(): Promise<void> {
    this.messageCount = 0;
  }

  async subscribe(queue: string, handler: (message: any) => Promise<void>): Promise<void> {
    // 这里需要根据具体的RabbitMQ客户端API实现
    // const subscription = await this.rabbitmqClient.subscribe(queue, handler);
    // this.subscriptions.push(subscription);
  }

  async getMessageCount(): Promise<number> {
    return this.messageCount;
  }

  async cleanup(): Promise<void> {
    for (const subscription of this.subscriptions) {
      // await subscription.unsubscribe();
    }
    this.subscriptions = [];
  }
}

/**
 * 数据流验证器
 */
class DataFlowValidator {
  constructor(
    private database: DataSource,
    private mongodb: MongoClient
  ) {}

  async validateDataConsistency(): Promise<{ score: number; inconsistencies: string[] }> {
    const inconsistencies: string[] = [];
    let score = 1.0;

    try {
      // 验证PostgreSQL中的数据
      const pgData = await this.database.query(`
        SELECT COUNT(*) as count FROM weibo_search_tasks
        WHERE status = 'completed'
      `);

      // 验证MongoDB中的数据
      const mongoData = await this.mongodb.db()
        .collection('processed_weibo_data')
        .countDocuments();

      // 比较数据一致性
      const pgCount = parseInt(pgData[0]?.count || '0');
      if (pgCount !== mongoData) {
        inconsistencies.push(
          `数据不一致: PostgreSQL(${pgCount}) vs MongoDB(${mongoData})`
        );
        score = Math.max(0, score - 0.2);
      }

    } catch (error) {
      inconsistencies.push(`数据一致性检查失败: ${(error as Error).message}`);
      score = 0;
    }

    return { score, inconsistencies };
  }
}

// 类型定义
export interface E2ETestValidationResult {
  flowName: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    totalTime: number;
    completedSteps: number;
    failedSteps: number;
    messageCount: number;
    dataConsistencyScore: number;
  };
}

export interface BusinessDataSnapshot {
  timestamp: Date;
  database: any;
  mongodb: any;
  redis: Record<string, string>;
  messageFlow: FlowEvent[];
  systemMetrics: SystemMetrics;
}

export interface SystemMetrics {
  timestamp: Date;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeConnections: {
    database: boolean;
    redis: boolean;
    rabbitmq: boolean;
    mongodb: boolean;
  };
  queueStatus: {
    crawlTasks: number;
    cleanTasks: number;
  };
}

export interface FlowEvent {
  type: string;
  data: any;
  timestamp: Date;
  testId: string;
}