/**
 * 测试环境配置管理器
 * 负责Docker测试环境的生命周期管理和资源配置
 */
import { execSync, spawn } from 'child_process';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import amqp from 'amqplib';
import { MongoClient } from 'mongodb';
import {
  TestEnvironmentConfig,
  TestEnvironmentState,
  TestEnvironmentError,
  TestCleanupError,
  TestLogLevel,
} from '../types/test-types.js';

/**
 * 测试环境配置管理器 - 数字化测试环境的建筑师
 * 每一个配置都有其存在的意义，每一个连接都有其存在的价值
 */
export class TestEnvironmentManager {
  private readonly state: TestEnvironmentState = {
    isInitialized: false,
    dockerContainers: [],
    databaseConnection: false,
    redisConnection: false,
    rabbitmqConnection: false,
    mongodbConnection: false,
    startTime: new Date(),
    cleanupCallbacks: [],
  };

  private database?: DataSource;
  private redis?: Redis;
  private rabbitmq?: amqp.Connection;
  private mongodb?: MongoClient;
  private logLevel: TestLogLevel = TestLogLevel.INFO;

  constructor(private readonly config: TestEnvironmentConfig) {}

  /**
   * 初始化测试环境
   * 营造一个隔离、纯净、可重复的测试空间
   */
  async initialize(): Promise<void> {
    if (this.state.isInitialized) {
      this.log('warn', '测试环境已初始化，跳过重复初始化');
      return;
    }

    try {
      this.log('info', '开始初始化测试环境');

      if (this.config.docker.enabled) {
        await this.startDockerServices();
      }

      await Promise.all([
        this.initializeDatabase(),
        this.initializeRedis(),
        this.initializeRabbitMQ(),
        this.initializeMongoDB(),
      ]);

      this.state.isInitialized = true;
      this.log('info', '测试环境初始化完成');
    } catch (error) {
      await this.cleanup();
      throw new TestEnvironmentError('测试环境初始化失败', error as Error);
    }
  }

  /**
   * 启动Docker服务
   * 使用容器编排技术构建测试基础设施
   */
  private async startDockerServices(): Promise<void> {
    try {
      this.log('info', `启动Docker服务: ${this.config.docker.services.join(', ')}`);

      const composeCommand = `docker-compose -f ${this.config.docker.composeFile}`;

      execSync(`${composeCommand} up -d ${this.config.docker.services.join(' ')}`, {
        stdio: this.logLevel === TestLogLevel.DEBUG ? 'inherit' : 'pipe',
        timeout: 60000,
      });

      // 等待服务就绪
      await this.waitForServices();

      // 记录启动的容器
      const containers = execSync('docker-compose ps -q', {
        cwd: process.cwd(),
        encoding: 'utf8',
      }).trim().split('\n').filter(Boolean);

      this.state.dockerContainers = containers;
      this.log('info', `成功启动 ${containers.length} 个Docker容器`);
    } catch (error) {
      throw new TestEnvironmentError('Docker服务启动失败', error as Error);
    }
  }

  /**
   * 等待服务就绪
   * 确保所有依赖服务都已准备就绪
   */
  private async waitForServices(): Promise<void> {
    const maxRetries = 30;
    const retryInterval = 2000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await Promise.all([
          this.checkDatabaseHealth(),
          this.checkRedisHealth(),
          this.checkRabbitMQHealth(),
          this.checkMongoDBHealth(),
        ]);
        this.log('info', '所有服务已就绪');
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new TestEnvironmentError('服务等待超时', error as Error);
        }
        this.log('debug', `等待服务就绪... (${i + 1}/${maxRetries})`);
        await this.sleep(retryInterval);
      }
    }
  }

  /**
   * 初始化数据库连接
   */
  private async initializeDatabase(): Promise<void> {
    try {
      this.database = new DataSource({
        type: 'postgres',
        host: this.config.database.host,
        port: this.config.database.port,
        username: this.config.database.username,
        password: this.config.database.password,
        database: this.config.database.database,
        synchronize: false,
        logging: this.logLevel === TestLogLevel.DEBUG,
        entities: ['../src/**/*.entity{.ts,.js}'],
      });

      await this.database.initialize();
      this.state.databaseConnection = true;
      this.log('info', '数据库连接已建立');

      // 注册清理回调
      this.addCleanupCallback(async () => {
        if (this.database?.isInitialized) {
          await this.database.destroy();
        }
      });
    } catch (error) {
      throw new TestEnvironmentError('数据库初始化失败', error as Error);
    }
  }

  /**
   * 初始化Redis连接
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redis = new Redis({
        host: this.config.redis.host,
        port: this.config.redis.port,
        db: this.config.redis.db,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      });

      await this.redis.ping();
      this.state.redisConnection = true;
      this.log('info', 'Redis连接已建立');

      // 注册清理回调
      this.addCleanupCallback(async () => {
        if (this.redis && this.redis.status === 'ready') {
          await this.redis.quit();
        }
      });
    } catch (error) {
      throw new TestEnvironmentError('Redis初始化失败', error as Error);
    }
  }

  /**
   * 初始化RabbitMQ连接
   */
  private async initializeRabbitMQ(): Promise<void> {
    try {
      this.rabbitmq = await amqp.connect(this.config.rabbitmq.url);
      this.state.rabbitmqConnection = true;
      this.log('info', 'RabbitMQ连接已建立');

      // 注册清理回调
      this.addCleanupCallback(async () => {
        if (this.rabbitmq) {
          await this.rabbitmq.close();
        }
      });
    } catch (error) {
      throw new TestEnvironmentError('RabbitMQ初始化失败', error as Error);
    }
  }

  /**
   * 初始化MongoDB连接
   */
  private async initializeMongoDB(): Promise<void> {
    try {
      this.mongodb = new MongoClient(this.config.mongodb.uri);
      await this.mongodb.connect();
      await this.mongodb.db().admin().ping();
      this.state.mongodbConnection = true;
      this.log('info', 'MongoDB连接已建立');

      // 注册清理回调
      this.addCleanupCallback(async () => {
        if (this.mongodb) {
          await this.mongodb.close();
        }
      });
    } catch (error) {
      throw new TestEnvironmentError('MongoDB初始化失败', error as Error);
    }
  }

  /**
   * 健康检查 - 数据库
   */
  private async checkDatabaseHealth(): Promise<void> {
    if (!this.database || !this.database.isInitialized) {
      throw new Error('数据库未初始化');
    }
    await this.database.query('SELECT 1');
  }

  /**
   * 健康检查 - Redis
   */
  private async checkRedisHealth(): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis未初始化');
    }
    await this.redis.ping();
  }

  /**
   * 健康检查 - RabbitMQ
   */
  private async checkRabbitMQHealth(): Promise<void> {
    const connection = await amqp.connect(this.config.rabbitmq.url);
    await connection.close();
  }

  /**
   * 健康检查 - MongoDB
   */
  private async checkMongoDBHealth(): Promise<void> {
    const client = new MongoClient(this.config.mongodb.uri);
    await client.db().admin().ping();
    await client.close();
  }

  /**
   * 清理测试环境
   * 优雅地关闭所有连接和服务
   */
  async cleanup(): Promise<void> {
    this.log('info', '开始清理测试环境');

    const cleanupErrors: Error[] = [];

    // 执行注册的清理回调
    for (const callback of this.state.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        cleanupErrors.push(error as Error);
        this.log('error', `清理回调执行失败: ${(error as Error).message}`);
      }
    }

    // 清理Docker容器
    if (this.config.docker.enabled && this.state.dockerContainers.length > 0) {
      try {
        execSync(`docker-compose -f ${this.config.docker.composeFile} down -v`, {
          stdio: this.logLevel === TestLogLevel.DEBUG ? 'inherit' : 'pipe',
          timeout: 30000,
        });
        this.log('info', 'Docker容器已停止');
      } catch (error) {
        cleanupErrors.push(error as Error);
      }
    }

    // 重置状态
    this.state.isInitialized = false;
    this.state.dockerContainers = [];
    this.state.databaseConnection = false;
    this.state.redisConnection = false;
    this.state.rabbitmqConnection = false;
    this.state.mongodbConnection = false;
    this.state.cleanupCallbacks = [];

    if (cleanupErrors.length > 0) {
      throw new TestCleanupError('测试环境清理过程中发生错误', 'cleanup');
    }

    this.log('info', '测试环境清理完成');
  }

  /**
   * 获取数据库实例
   */
  getDatabase(): DataSource {
    if (!this.database || !this.database.isInitialized) {
      throw new TestEnvironmentError('数据库未初始化');
    }
    return this.database;
  }

  /**
   * 获取Redis实例
   */
  getRedis(): Redis {
    if (!this.redis) {
      throw new TestEnvironmentError('Redis未初始化');
    }
    return this.redis;
  }

  /**
   * 获取RabbitMQ实例
   */
  getRabbitMQ(): amqp.Connection {
    if (!this.rabbitmq) {
      throw new TestEnvironmentError('RabbitMQ未初始化');
    }
    return this.rabbitmq;
  }

  /**
   * 获取MongoDB实例
   */
  getMongoDB(): MongoClient {
    if (!this.mongodb) {
      throw new TestEnvironmentError('MongoDB未初始化');
    }
    return this.mongodb;
  }

  /**
   * 获取环境状态
   */
  getState(): Readonly<TestEnvironmentState> {
    return { ...this.state };
  }

  /**
   * 设置日志级别
   */
  setLogLevel(level: TestLogLevel): void {
    this.logLevel = level;
  }

  /**
   * 添加清理回调
   */
  addCleanupCallback(callback: () => Promise<void>): void {
    this.state.cleanupCallbacks.push(callback);
  }

  /**
   * 记录日志
   */
  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string): void {
    const shouldLog = this.logLevel === TestLogLevel.DEBUG ||
                     (this.logLevel === TestLogLevel.INFO && level !== 'debug') ||
                     (this.logLevel === TestLogLevel.WARN && ['warn', 'error'].includes(level)) ||
                     (this.logLevel === TestLogLevel.ERROR && level === 'error');

    if (shouldLog) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [TestEnvironmentManager] [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * 睡眠工具
   */
  private sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }
}