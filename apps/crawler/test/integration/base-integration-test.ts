/**
 * 集成测试基类
 * 为所有集成测试提供统一的基础设施和生命周期管理
 */
import { DataSource } from 'typeorm';
import { TestEnvironmentManager } from './config/test-environment-manager.js';
import { WeiboTestDataFactory } from './factories/weibo-test-data-factory.js';
import { TestUtils } from './utils/test-utils.js';
import {
  TestEnvironmentConfig,
  TestContext,
  TestEnvironmentError,
  TestCleanupError,
} from './types/test-types.js';

/**
 * 集成测试基类 - 数字化测试世界的建筑师
 * 每一个测试都有其坚实的基础，每一个方法都有其存在的意义
 */
export abstract class BaseIntegrationTest {
  protected environment: TestEnvironmentManager;
  protected context: TestContext;
  protected utils: TestUtils;
  protected factory: WeiboTestDataFactory;
  protected database: DataSource;

  constructor(config?: Partial<TestEnvironmentConfig>) {
    const defaultConfig: TestEnvironmentConfig = this.getDefaultConfig();
    const finalConfig = { ...defaultConfig, ...config };

    this.environment = new TestEnvironmentManager(finalConfig);
    this.database = this.environment.getDatabase();
    this.utils = new TestUtils(this.database);
    this.factory = new WeiboTestDataFactory(this.database);

    this.context = {
      testId: this.generateTestId(),
      startTime: new Date(),
      environment: this.environment.getState(),
      database: this.database,
      redis: this.environment.getRedis(),
      rabbitmq: this.environment.getRabbitMQ(),
      mongodb: this.environment.getMongoDB(),
      utils: this.utils,
    };
  }

  /**
   * 获取默认配置
   * 子类可以重写此方法提供自定义配置
   */
  protected getDefaultConfig(): TestEnvironmentConfig {
    return {
      docker: {
        enabled: true,
        composeFile: 'docker-compose.test.yml',
        services: ['postgres', 'redis', 'rabbitmq', 'mongodb', 'minio'],
      },
      database: {
        host: process.env.TEST_DB_HOST || 'localhost',
        port: parseInt(process.env.TEST_DB_PORT || '5432'),
        username: process.env.TEST_DB_USER || 'test',
        password: process.env.TEST_DB_PASSWORD || 'test',
        database: process.env.TEST_DB_NAME || 'weibo_crawler_test',
        timeout: 30000,
      },
      redis: {
        host: process.env.TEST_REDIS_HOST || 'localhost',
        port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
        db: parseInt(process.env.TEST_REDIS_DB || '1'),
      },
      rabbitmq: {
        url: process.env.TEST_RABBITMQ_URL || 'amqp://localhost:5672',
        exchanges: ['weibo.crawl', 'weibo.clean', 'weibo.analyze'],
        queues: ['crawl.tasks', 'clean.tasks', 'analyze.tasks'],
      },
      mongodb: {
        uri: process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017',
        database: process.env.TEST_MONGODB_NAME || 'weibo_raw_test',
      },
      minio: {
        endpoint: process.env.TEST_MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.TEST_MINIO_PORT || '9000'),
        accessKey: process.env.TEST_MINIO_ACCESS_KEY || 'test',
        secretKey: process.env.TEST_MINIO_SECRET_KEY || 'testtest',
        useSSL: false,
      },
    };
  }

  /**
   * 测试套件设置
   * 在所有测试执行前运行一次
   */
  async beforeAll(): Promise<void> {
    try {
      await this.environment.initialize();
      await this.setupTestSuite();
      this.log('info', '测试套件初始化完成');
    } catch (error) {
      this.log('error', `测试套件初始化失败: ${(error as Error).message}`);
      throw new TestEnvironmentError('测试套件初始化失败', error as Error);
    }
  }

  /**
   * 测试套件清理
   * 在所有测试执行后运行一次
   */
  async afterAll(): Promise<void> {
    try {
      await this.cleanupTestSuite();
      await this.environment.cleanup();
      this.log('info', '测试套件清理完成');
    } catch (error) {
      this.log('error', `测试套件清理失败: ${(error as Error).message}`);
      throw new TestCleanupError('测试套件清理失败', 'afterAll');
    }
  }

  /**
   * 每个测试前的设置
   */
  async beforeEach(): Promise<void> {
    try {
      // 更新测试上下文
      this.context.testId = this.generateTestId();
      this.context.startTime = new Date();

      // 清理数据库
      await this.utils.cleanup.resetDatabase();

      // 重置时间控制器
      await this.utils.time.reset();

      // 运行子类自定义设置
      await this.setupTest();

      this.log('debug', `测试 ${this.context.testId} 设置完成`);
    } catch (error) {
      this.log('error', `测试设置失败: ${(error as Error).message}`);
      throw new TestEnvironmentError('测试设置失败', error as Error);
    }
  }

  /**
   * 每个测试后的清理
   */
  async afterEach(): Promise<void> {
    try {
      // 运行子类自定义清理
      await this.cleanupTest();

      // 清理可能残留的数据
      await this.utils.cleanup.resetDatabase();

      // 重置时间控制器
      await this.utils.time.reset();

      this.log('debug', `测试 ${this.context.testId} 清理完成`);
    } catch (error) {
      this.log('error', `测试清理失败: ${(error as Error).message}`);
      throw new TestCleanupError('测试清理失败', 'afterEach');
    }
  }

  /**
   * 设置测试套件
   * 子类可以重写此方法进行自定义设置
   */
  protected async setupTestSuite(): Promise<void> {
    // 默认实现为空，子类可以重写
  }

  /**
   * 清理测试套件
   * 子类可以重写此方法进行自定义清理
   */
  protected async cleanupTestSuite(): Promise<void> {
    // 默认实现为空，子类可以重写
  }

  /**
   * 设置单个测试
   * 子类可以重写此方法进行测试特定的设置
   */
  protected async setupTest(): Promise<void> {
    // 默认实现为空，子类可以重写
  }

  /**
   * 清理单个测试
   * 子类可以重写此方法进行测试特定的清理
   */
  protected async cleanupTest(): Promise<void> {
    // 默认实现为空，子类可以重写
  }

  /**
   * 生成测试ID
   */
  private generateTestId(): string {
    const className = this.constructor.name;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${className}_${timestamp}_${random}`;
  }

  /**
   * 记录日志
   */
  protected log(level: 'info' | 'warn' | 'error' | 'debug', message: string): void {
    const timestamp = new Date().toISOString();
    const testId = this.context.testId;
    console.log(`[${timestamp}] [${testId}] [${level.toUpperCase()}] ${message}`);
  }

  /**
   * 等待条件满足
   */
  protected async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    await this.utils.assertions.eventuallyCondition(condition, undefined, timeout);
  }

  /**
   * 睡眠指定时间
   */
  protected async sleep(milliseconds: number): Promise<void> {
    await this.utils.time.sleep(milliseconds);
  }

  /**
   * 冻结时间
   */
  protected freezeTime(at?: Date): void {
    this.utils.time.freeze(at);
  }

  /**
   * 解冻时间
   */
  protected unfreezeTime(): void {
    this.utils.time.unfreeze();
  }

  /**
   * 时间旅行
   */
  protected travelTo(targetTime: Date): void {
    this.utils.time.travelTo(targetTime);
  }

  /**
   * 时间旅行指定毫秒数
   */
  protected travelBy(milliseconds: number): void {
    this.utils.time.travelBy(milliseconds);
  }

  /**
   * 获取当前测试上下文
   */
  protected getTestContext(): Readonly<TestContext> {
    return { ...this.context };
  }

  /**
   * 创建数据库事务
   */
  protected async createTransaction(): Promise<any> {
    return this.database.createQueryRunner();
  }

  /**
   * 执行数据库查询
   */
  protected async query(sql: string, parameters?: any[]): Promise<any> {
    return this.database.query(sql, parameters);
  }

  /**
   * 验证数据库状态
   */
  protected async assertDatabaseState(assertions: Record<string, any>): Promise<void> {
    for (const [table, expectedCount] of Object.entries(assertions)) {
      const actualCount = await this.utils.cleanup.getRecordCount(table);
      if (actualCount !== expectedCount) {
        throw new Error(`数据库状态验证失败: 表 ${table} 期望 ${expectedCount} 条记录，实际 ${actualCount} 条`);
      }
    }
  }

  /**
   * 验证Redis状态
   */
  protected async assertRedisState(assertions: Record<string, any>): Promise<void> {
    const redis = this.environment.getRedis();
    for (const [key, expectedValue] of Object.entries(assertions)) {
      const actualValue = await redis.get(key);
      if (actualValue !== expectedValue) {
        throw new Error(`Redis状态验证失败: 键 ${key} 期望 ${expectedValue}，实际 ${actualValue}`);
      }
    }
  }

  /**
   * 创建测试快照
   */
  protected async createSnapshot(): Promise<TestSnapshot> {
    return {
      database: await this.captureDatabaseSnapshot(),
      redis: await this.captureRedisSnapshot(),
      time: this.utils.time.createSnapshot(),
      timestamp: new Date(),
    };
  }

  /**
   * 恢复测试快照
   */
  protected async restoreSnapshot(snapshot: TestSnapshot): Promise<void> {
    await this.restoreDatabaseSnapshot(snapshot.database);
    await this.restoreRedisSnapshot(snapshot.redis);
    this.utils.time.restoreSnapshot(snapshot.time);
  }

  /**
   * 捕获数据库快照
   */
  private async captureDatabaseSnapshot(): Promise<any> {
    const tables = ['weibo_accounts', 'weibo_search_tasks', 'users'];
    const snapshot: any = {};

    for (const table of tables) {
      try {
        const records = await this.query(`SELECT * FROM ${table}`);
        snapshot[table] = records;
      } catch (error) {
        snapshot[table] = [];
      }
    }

    return snapshot;
  }

  /**
   * 恢复数据库快照
   */
  private async restoreDatabaseSnapshot(snapshot: any): Promise<void> {
    await this.utils.cleanup.resetDatabase();

    for (const [table, records] of Object.entries(snapshot)) {
      if (Array.isArray(records) && records.length > 0) {
        for (const record of records) {
          // 移除自增ID，让数据库重新生成
          const { id, ...cleanRecord } = record;
          await this.query(`INSERT INTO ${table} (${Object.keys(cleanRecord).join(', ')}) VALUES (${Object.keys(cleanRecord).map((_, i) => `$${i + 1}`).join(', ')})`, Object.values(cleanRecord));
        }
      }
    }
  }

  /**
   * 捕获Redis快照
   */
  private async captureRedisSnapshot(): Promise<Record<string, string>> {
    const redis = this.environment.getRedis();
    const keys = await redis.keys('*');
    const snapshot: Record<string, string> = {};

    for (const key of keys) {
      const value = await redis.get(key);
      if (value !== null) {
        snapshot[key] = value;
      }
    }

    return snapshot;
  }

  /**
   * 恢复Redis快照
   */
  private async restoreRedisSnapshot(snapshot: Record<string, string>): Promise<void> {
    const redis = this.environment.getRedis();

    // 清空当前数据库
    await redis.flushdb();

    // 恢复快照数据
    for (const [key, value] of Object.entries(snapshot)) {
      await redis.set(key, value);
    }
  }
}

/**
 * 测试快照接口
 */
export interface TestSnapshot {
  database: any;
  redis: Record<string, string>;
  time: any;
  timestamp: Date;
}

/**
 * 测试装饰器 - 自动处理测试生命周期
 */
export function integrationTest(config?: Partial<TestEnvironmentConfig>) {
  return function<T extends BaseIntegrationTest>(constructor: new (...args: any[]) => T) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(config);
      }
    };
  };
}