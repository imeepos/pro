/**
 * 测试环境配置
 * 提供集成测试所需的基础设施配置
 */

import { TypeOrmModule } from '@nestjs/typeorm';
import { WeiboSearchTaskEntity } from '@pro/entities';
import { PinoLogger } from '@pro/logger';
import { RedisClient } from '@pro/redis';
import { RabbitMQConfigService } from '../../src/rabbitmq/rabbitmq-config.service';

/**
 * 测试数据库配置
 */
export const testDatabaseConfig = {
  type: 'postgres' as const,
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  username: process.env.TEST_DB_USERNAME || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
  database: process.env.TEST_DB_NAME || 'pro_broker_test',
  entities: [WeiboSearchTaskEntity],
  synchronize: false, // 测试环境不自动同步
  logging: false,
  dropSchema: true, // 测试前清理数据库
};

/**
 * 测试Redis配置
 */
export const testRedisConfig = {
  host: process.env.TEST_REDIS_HOST || 'localhost',
  port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
  db: parseInt(process.env.TEST_REDIS_DB || '1'), // 使用独立的数据库
  password: process.env.TEST_REDIS_PASSWORD,
  connectTimeout: 5000,
  lazyConnect: true,
};

/**
 * 测试RabbitMQ配置
 */
export const testRabbitMQConfig = {
  host: process.env.TEST_RABBITMQ_HOST || 'localhost',
  port: parseInt(process.env.TEST_RABBITMQ_PORT || '5672'),
  username: process.env.TEST_RABBITMQ_USERNAME || 'guest',
  password: process.env.TEST_RABBITMQ_PASSWORD || 'guest',
  vhost: process.env.TEST_RABBITMQ_VHOST || '/test', // 使用独立的虚拟主机
  prefetchCount: 1,
  heartbeat: 60,
  connectionTimeout: 10000,
};

/**
 * 创建测试数据库模块
 */
export const createTestDatabaseModule = () =>
  TypeOrmModule.forRoot(testDatabaseConfig);

/**
 * 创建模拟PinoLogger
 */
export const createMockPinoLogger = () => ({
  setContext: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
});

/**
 * 创建模拟Redis客户端
 */
export const createMockRedisClient = (): Partial<RedisClient> => ({
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  zrevrange: jest.fn(),
  zrangebyscore: jest.fn(),
  zremrangebyscore: jest.fn(),
  zcard: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hgetall: jest.fn(),
  hdel: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  keys: jest.fn(),
  setnx: jest.fn(),
  incr: jest.fn(),
  incrby: jest.fn(),
  decr: jest.fn(),
  decrby: jest.fn(),
  flushdb: jest.fn(),
});

/**
 * 创建模拟RabbitMQ服务
 */
export const createMockRabbitMQService = () => ({
  publishSubTask: jest.fn(),
  consumeTaskResults: jest.fn(),
  ack: jest.fn(),
  nack: jest.fn(),
  close: jest.fn(),
  isConnected: jest.fn().mockResolvedValue(true),
  getChannel: jest.fn(),
});

/**
 * 创建测试任务数据
 */
export const createTestTask = (overrides: Partial<WeiboSearchTaskEntity> = {}): WeiboSearchTaskEntity => {
  const now = new Date();
  return {
    id: 1,
    keyword: '测试关键词',
    startDate: new Date('2024-01-01'),
    latestCrawlTime: null,
    crawlInterval: '1h',
    nextRunAt: now,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as WeiboSearchTaskEntity;
};

/**
 * 测试工具函数
 */
export class TestUtils {
  /**
   * 等待指定时间
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 创建时间范围
   */
  static createTimeRange(hoursAgo: number): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end.getTime() - hoursAgo * 60 * 60 * 1000);
    return { start, end };
  }

  /**
   * 生成随机任务ID
   */
  static generateTaskId(): number {
    return Math.floor(Math.random() * 1000000) + 1;
  }

  /**
   * 生成随机关键词
   */
  static generateKeyword(): string {
    const keywords = ['科技', '新闻', '娱乐', '体育', '财经', '时尚', '美食', '旅游'];
    return keywords[Math.floor(Math.random() * keywords.length)] + Math.floor(Math.random() * 1000);
  }

  /**
   * 清理测试数据
   */
  static async cleanupTestData(taskRepository: any): Promise<void> {
    try {
      await taskRepository.delete({});
    } catch (error) {
      console.warn('清理测试数据失败:', error);
    }
  }

  /**
   * 验证时间精度（分钟级）
   */
  static validateMinutePrecision(date: Date): boolean {
    return date.getSeconds() === 0 && date.getMilliseconds() === 0;
  }

  /**
   * 比较两个日期的分钟级差值
   */
  static getMinuteDifference(date1: Date, date2: Date): number {
    return Math.floor(Math.abs(date1.getTime() - date2.getTime()) / (60 * 1000));
  }
}

/**
 * 测试常量
 */
export const TEST_CONSTANTS = {
  TIMEOUT: 30000, // 30秒超时
  RETRY_DELAY: 1000, // 1秒重试延迟
  BATCH_SIZE: 5, // 批处理大小
  MAX_RETRIES: 3, // 最大重试次数
  HEALTH_CHECK_TIMEOUT: 5000, // 健康检查超时
  PERFORMANCE_THRESHOLD: 1000, // 性能阈值（毫秒）
};
