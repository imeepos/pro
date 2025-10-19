/**
 * 集成测试框架统一导出
 * 为微博爬虫系统提供优雅的集成测试基础设施
 */

// 核心类型
export * from './types/test-types.js';

// 测试环境管理
export { TestEnvironmentManager } from './config/test-environment-manager.js';

// 测试数据工厂
export { WeiboTestDataFactory } from './factories/weibo-test-data-factory.js';

// 测试工具类
export {
  TestUtils,
  DatabaseCleaner,
  TimeController,
  timeControl,
  TestAssertionExtensions,
  assertions,
  expectEventually,
  MockResponseGenerator,
  mockGenerator,
  mock,
} from './utils/test-utils.js';

// 集成测试基类
export { BaseIntegrationTest, integrationTest, TestSnapshot } from './base-integration-test.js';

/**
 * 快速创建集成测试的便捷函数
 */
export function createIntegrationTest(config?: Partial<TestEnvironmentConfig>) {
  return BaseIntegrationTest;
}

/**
 * 默认测试配置
 */
export const defaultTestConfig: TestEnvironmentConfig = {
  docker: {
    enabled: true,
    composeFile: 'docker-compose.test.yml',
    services: ['postgres', 'redis', 'rabbitmq', 'mongodb', 'minio'],
  },
  database: {
    host: 'localhost',
    port: 5432,
    username: 'test',
    password: 'test',
    database: 'weibo_crawler_test',
    timeout: 30000,
  },
  redis: {
    host: 'localhost',
    port: 6379,
    db: 1,
  },
  rabbitmq: {
    url: 'amqp://localhost:5672',
    exchanges: ['weibo.crawl', 'weibo.clean', 'weibo.analyze'],
    queues: ['crawl.tasks', 'clean.tasks', 'analyze.tasks'],
  },
  mongodb: {
    uri: 'mongodb://localhost:27017',
    database: 'weibo_raw_test',
  },
  minio: {
    endpoint: 'localhost',
    port: 9000,
    accessKey: 'test',
    secretKey: 'testtest',
    useSSL: false,
  },
};