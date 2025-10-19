/**
 * 集成测试类型定义
 * 为测试框架提供类型安全的数字艺术品
 */

import { WeiboAccountEntity } from '@pro/entities';
import { WeiboAccount, WeiboSearchTask, WeiboAccountStatus, WeiboSearchTaskStatus } from '@pro/types';

// 测试环境配置接口
export interface TestEnvironmentConfig {
  docker: {
    enabled: boolean;
    composeFile: string;
    services: string[];
  };
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    timeout: number;
  };
  redis: {
    host: string;
    port: number;
    db: number;
  };
  rabbitmq: {
    url: string;
    exchanges: string[];
    queues: string[];
  };
  mongodb: {
    uri: string;
    database: string;
  };
  minio: {
    endpoint: string;
    port: number;
    accessKey: string;
    secretKey: string;
    useSSL: boolean;
  };
}

// 测试数据创建选项
export interface TestDataOptions {
  override?: Partial<any>;
  count?: number;
  relations?: boolean;
  save?: boolean;
}

// 微博账号测试数据选项
export interface WeiboAccountTestDataOptions extends TestDataOptions {
  status?: WeiboAccountStatus;
  withCookies?: boolean;
  isHealthy?: boolean;
  errorCount?: number;
}

// 搜索任务测试数据选项
export interface WeiboSearchTaskTestDataOptions extends TestDataOptions {
  status?: WeiboSearchTaskStatus;
  enabled?: boolean;
  withAccount?: boolean;
  withLocation?: boolean;
}

// 测试环境状态
export interface TestEnvironmentState {
  isInitialized: boolean;
  dockerContainers: string[];
  databaseConnection: boolean;
  redisConnection: boolean;
  rabbitmqConnection: boolean;
  mongodbConnection: boolean;
  startTime: Date;
  cleanupCallbacks: (() => Promise<void>)[];
}

// Mock响应配置
export interface MockResponseConfig {
  status: number;
  data: any;
  headers?: Record<string, string>;
  delay?: number;
}

// 数据库清理选项
export interface DatabaseCleanupOptions {
  tables: string[];
  truncate?: boolean;
  cascade?: boolean;
  resetSequences?: boolean;
}

// 时间控制选项
export interface TimeControlOptions {
  freeze?: boolean;
  offset?: number;
  speed?: number;
}

// 断言扩展配置
export interface AssertionConfig {
  timeout: number;
  retryInterval: number;
  maxRetries: number;
}

// 测试上下文
export interface TestContext {
  testId: string;
  startTime: Date;
  environment: TestEnvironmentState;
  database: any;
  redis: any;
  rabbitmq: any;
  mongodb: any;
  utils: TestUtils;
}

// 测试工具类接口
export interface TestUtils {
  cleanup: DatabaseCleaner;
  time: TimeController;
  assertions: AssertionExtensions;
  mocks: MockResponseGenerator;
}

// 数据库清理器接口
export interface DatabaseCleaner {
  cleanup(options?: DatabaseCleanupOptions): Promise<void>;
  cleanupTable(tableName: string): Promise<void>;
  resetDatabase(): Promise<void>;
}

// 时间控制器接口
export interface TimeController {
  freeze(): void;
  unfreeze(): void;
  travelTo(date: Date): void;
  travelBy(milliseconds: number): void;
  getCurrentTime(): Date;
  setSpeed(speed: number): void;
}

// 断言扩展接口
export interface AssertionExtensions {
  eventuallyMatch<T>(actual: T, expected: T, timeout?: number): Promise<void>;
  eventuallyExist<T>(value: T | null | undefined, timeout?: number): Promise<void>;
  eventuallyResolve<T>(promise: Promise<T>, timeout?: number): Promise<T>;
  eventuallyReject<T>(promise: Promise<T>, timeout?: number): Promise<Error>;
}

// Mock响应生成器接口
export interface MockResponseGenerator {
  generateWeiboAccount(overrides?: Partial<WeiboAccount>): WeiboAccount;
  generateWeiboSearchTask(overrides?: Partial<WeiboSearchTask>): WeiboSearchTask;
  generateWeiboNoteDetail(overrides?: any): any;
  generateWeiboComment(overrides?: any): any;
  generateApiResponse<T>(data: T, config?: Partial<MockResponseConfig>): MockResponseConfig;
}

// 测试错误类型
export class TestEnvironmentError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'TestEnvironmentError';
  }
}

export class TestDataError extends Error {
  constructor(message: string, public readonly data?: any) {
    super(message);
    this.name = 'TestDataError';
  }
}

export class TestCleanupError extends Error {
  constructor(message: string, public readonly operation?: string) {
    super(message);
    this.name = 'TestCleanupError';
  }
}

// 测试日志级别
export enum TestLogLevel {
  SILENT = 'silent',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

// 测试配置选项
export interface TestConfig {
  logLevel: TestLogLevel;
  timeout: number;
  retries: number;
  parallel: boolean;
  cleanup: boolean;
  coverage: boolean;
}