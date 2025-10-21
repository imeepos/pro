/**
 * 集成测试配置文件
 *
 * 这个配置文件定义了所有集成测试的配置参数和环境设置
 * 确保测试的一致性和可重复性
 */

import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * 测试数据库配置
 */
export const testDatabaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'test',
  password: 'test',
  database: 'test_integration',
  entities: ['../src/**/*.entity{.ts,.js}'],
  synchronize: false,
  logging: false,
  dropSchema: true, // 每次测试后清理数据库
  migrationsRun: true,
};

/**
 * Redis测试配置
 */
export const testRedisConfig = {
  host: 'localhost',
  port: 6379,
  db: 1, // 使用专门的测试数据库
};

/**
 * RabbitMQ测试配置
 */
export const testRabbitMQConfig = {
  url: 'amqp://localhost:5672',
  exchange: 'test_integration_exchange',
  queues: {
    weiboTasks: 'test_weibo_tasks',
    taskStatus: 'test_task_status',
  },
};

/**
 * JWT测试配置
 */
export const testJWTConfig = {
  secret: 'test-jwt-secret-key-for-integration-testing',
  expiresIn: '1h',
  refreshExpiresIn: '7d',
};

/**
 * API密钥测试配置
 */
export const testApiKeyConfig = {
  defaultRateLimit: 1000,
  testRateLimit: 100,
  prefix: 'ak_test',
};

/**
 * 性能测试配置
 */
export const performanceTestConfig = {
  timeouts: {
    default: 30000,      // 默认超时30秒
    slow: 60000,         // 慢速测试60秒
    load: 120000,        // 负载测试2分钟
  },
  thresholds: {
    responseTime: {
      fast: 200,         // 快速查询200ms
      normal: 500,       // 正常查询500ms
      slow: 2000,        // 慢速查询2s
    },
    successRate: {
      normal: 0.95,      // 正常情况95%成功率
      stress: 0.8,       // 压力测试80%成功率
      extreme: 0.6,      // 极端压力60%成功率
    },
    throughput: {
      minimum: 5,        // 最小5 RPS
      target: 20,        // 目标20 RPS
      maximum: 100,      // 最大100 RPS
    },
    memory: {
      warning: 500 * 1024 * 1024,   // 500MB警告
      critical: 1024 * 1024 * 1024, // 1GB危险
    },
  },
  concurrency: {
    light: 5,            // 轻量级并发5个
    normal: 20,          // 正常并发20个
    heavy: 50,           // 重度并发50个
    extreme: 100,        // 极限并发100个
  },
};

/**
 * 测试用户配置
 */
export const testUserConfig = {
  defaultPassword: 'TestPassword123!',
  testUser: {
    username: 'test_user',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  },
  adminUser: {
    username: 'admin_user',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
  },
};

/**
 * 微博测试数据配置
 */
export const testWeiboConfig = {
  defaultAccount: {
    weiboUid: 'TEST123456',
    weiboNickname: '测试用户',
    cookies: 'test-cookies-data',
    status: 'ACTIVE',
  },
  defaultTask: {
    keyword: '测试关键词',
    startDate: '2023-01-01',
    crawlInterval: '1h',
  },
};

/**
 * 测试环境变量
 */
export const testEnvironment = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',           // 减少测试时的日志输出
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test_integration',
  REDIS_URL: 'redis://localhost:6379/1',
  RABBITMQ_URL: 'amqp://localhost:5672',
  JWT_SECRET: 'test-jwt-secret-key-for-integration-testing',
  INTERNAL_API_TOKEN: 'test-internal-token',
  MINIO_ENDPOINT: 'localhost',
  MINIO_PORT: '9000',
  MINIO_ACCESS_KEY: 'testkey',
  MINIO_SECRET_KEY: 'testsecret',
};

/**
 * 测试类别配置
 */
export const testCategories = {
  unit: 'unit',
  integration: 'integration',
  performance: 'performance',
  security: 'security',
  e2e: 'e2e',
};

/**
 * 测试标签配置
 */
export const testTags = {
  fast: 'fast',
  slow: 'slow',
  database: 'database',
  cache: 'cache',
  queue: 'queue',
  auth: 'auth',
  api: 'api',
  graphql: 'graphql',
  rest: 'rest',
  weibo: 'weibo',
  search: 'search',
  crawl: 'crawl',
};

/**
 * Jest测试配置
 */
export const jestTestConfig = {
  testEnvironment: 'node',
  testTimeout: performanceTestConfig.timeouts.default,
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup.ts'],
  testMatch: [
    '<rootDir>/test/integration/**/*.test.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/test/**',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  reporters: ['default', 'jest-junit'],
  maxWorkers: 1, // 集成测试使用单线程避免数据库冲突
  forceExit: true,
  detectOpenHandles: true,
  verbose: true,
};

/**
 * 测试工具配置
 */
export const testUtilsConfig = {
  factories: {
    user: './factories/user.factory',
    weiboAccount: './factories/weibo-account.factory',
    searchTask: './factories/search-task.factory',
    rawData: './factories/raw-data.factory',
  },
  helpers: {
    database: './helpers/database.helper',
    redis: './helpers/redis.helper',
    rabbitmq: './helpers/rabbitmq.helper',
    auth: './helpers/auth.helper',
    graphql: './helpers/graphql.helper',
  },
  mocks: {
    externalApis: './mocks/external-apis.mock',
    services: './mocks/services.mock',
  },
};

/**
 * 导出默认配置
 */
export default {
  database: testDatabaseConfig,
  redis: testRedisConfig,
  rabbitmq: testRabbitMQConfig,
  jwt: testJWTConfig,
  apiKey: testApiKeyConfig,
  performance: performanceTestConfig,
  user: testUserConfig,
  weibo: testWeiboConfig,
  environment: testEnvironment,
  categories: testCategories,
  tags: testTags,
  jest: jestTestConfig,
  utils: testUtilsConfig,
};
