/**
 * 微博爬虫系统API集成测试套件
 * 数字时代的优雅测试艺术品集合
 *
 * 这个测试套件提供了对微博爬虫系统API层的全面测试覆盖，
 * 包括微博账号管理、搜索任务管理和用户认证等核心功能。
 *
 * 测试设计原则：
 * - 存在即合理：每个测试都有其存在的必要性
 * - 优雅即简约：测试代码清晰、简洁、自文档化
 * - 性能即艺术：测试执行高效且有意义
 * - 错误处理如哲学：优雅处理各种异常情况
 * - 日志是思想的表达：提供有意义的测试反馈
 */

// 导出所有测试工厂和基类
export * from './factories/data.factory';
export * from './base/integration-test-base';

// 导出所有集成测试
export * from './weibo-account.api.integration.spec';
export * from './weibo-search-task.api.integration.spec';
export * from './authentication.api.integration.spec';

/**
 * 测试套件信息
 */
export const TEST_SUITE_INFO = {
  name: '微博爬虫系统API集成测试套件',
  version: '1.0.0',
  description: '为微博爬虫系统API层提供全面的集成测试覆盖',
  features: [
    '微博账号管理API测试',
    '搜索任务管理API测试',
    '用户认证API测试',
    '优雅的错误处理验证',
    '完整的数据生命周期测试',
    '安全性测试覆盖',
  ],
  testPatterns: {
    weiboAccount: 'weibo-account.api.integration.spec.ts',
    searchTask: 'weibo-search-task.api.integration.spec.ts',
    authentication: 'authentication.api.integration.spec.ts',
  },
};

/**
 * 测试配置常量
 */
export const TEST_CONFIG = {
  // 测试环境配置
  ENVIRONMENT: 'test',

  // 测试数据库配置
  DATABASE: {
    host: 'localhost',
    port: 5432,
    name: 'pro_test',
  },

  // 测试Redis配置
  REDIS: {
    host: 'localhost',
    port: 6379,
  },

  // 测试超时配置
  TIMEOUTS: {
    default: 30000,
    mutation: 10000,
    query: 5000,
    setup: 60000,
    cleanup: 30000,
  },

  // 测试数据配置
  DATA: {
    maxTestUsers: 10,
    maxTestAccounts: 20,
    maxTestTasks: 50,
    cleanupBatchSize: 100,
  },

  // API测试配置
  API: {
    defaultPageSize: 10,
    maxPageSize: 100,
    testApiKey: 'ak_21e04cb9c23b1256dc2debf99c211c4b',
    internalToken: 'internal-token',
  },
};

/**
 * 测试工具函数
 */
export class TestUtils {
  /**
   * 生成测试用例的唯一标识
   */
  static generateTestId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 创建测试标记
   */
  static createTestMarker(name: string, description?: string): string {
    const timestamp = new Date().toISOString();
    const desc = description ? ` - ${description}` : '';
    return `[${timestamp}] ${name}${desc}`;
  }

  /**
   * 验证测试环境
   */
  static validateTestEnvironment(): boolean {
    return (
      process.env.NODE_ENV === 'test' &&
      process.env.DB_HOST &&
      process.env.REDIS_HOST
    );
  }

  /**
   * 格式化测试错误消息
   */
  static formatTestError(testName: string, error: any): string {
    return `测试失败: ${testName}\n错误: ${error.message}\n堆栈: ${error.stack}`;
  }

  /**
   * 检查测试是否应该跳过
   */
  static shouldSkipTest(condition: boolean, reason: string): boolean {
    if (condition) {
      console.log(`跳过测试: ${reason}`);
      return true;
    }
    return false;
  }
}

/**
 * 测试断言辅助函数
 */
export class TestAssertions {
  /**
   * 验证GraphQL响应结构
   */
  static expectGraphQLResponse(response: any, expectedField: string): void {
    if (!response || typeof response !== 'object') {
      throw new Error('响应不是有效的对象');
    }

    if (!response.hasOwnProperty(expectedField)) {
      throw new Error(`响应缺少预期字段: ${expectedField}`);
    }
  }

  /**
   * 验证分页响应结构
   */
  static expectPaginatedResponse(response: any): void {
    const requiredFields = ['edges', 'pageInfo', 'totalCount'];

    for (const field of requiredFields) {
      if (!response.hasOwnProperty(field)) {
        throw new Error(`分页响应缺少必需字段: ${field}`);
      }
    }

    if (!Array.isArray(response.edges)) {
      throw new Error('分页响应的edges字段必须是数组');
    }

    if (typeof response.pageInfo !== 'object' || response.pageInfo === null) {
      throw new Error('分页响应的pageInfo字段必须是对象');
    }
  }

  /**
   * 验证日期字符串格式
   */
  static expectValidDateString(dateString: string): void {
    if (typeof dateString !== 'string') {
      throw new Error('日期必须是字符串');
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`无效的日期格式: ${dateString}`);
    }
  }

  /**
   * 验证UUID格式
   */
  static expectValidUUID(uuid: string): void {
    if (typeof uuid !== 'string') {
      throw new Error('UUID必须是字符串');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      throw new Error(`无效的UUID格式: ${uuid}`);
    }
  }

  /**
   * 验证错误响应
   */
  static expectErrorResponse(error: any, expectedMessage?: string): void {
    if (!error) {
      throw new Error('期望有错误但未收到错误');
    }

    if (!error.message) {
      throw new Error('错误对象缺少message字段');
    }

    if (expectedMessage && typeof error.message === 'string') {
      if (!error.message.toLowerCase().includes(expectedMessage.toLowerCase())) {
        throw new Error(`错误消息不包含预期文本。期望: "${expectedMessage}", 实际: "${error.message}"`);
      }
    }
  }
}

/**
 * 测试环境设置和清理工具
 */
export class TestEnvironment {
  /**
   * 设置测试环境变量
   */
  static setupEnvironmentVariables(): void {
    process.env.NODE_ENV = TEST_CONFIG.ENVIRONMENT;
    process.env.DB_HOST = TEST_CONFIG.DATABASE.host;
    process.env.DB_PORT = TEST_CONFIG.DATABASE.port.toString();
    process.env.DB_NAME = TEST_CONFIG.DATABASE.name;
    process.env.REDIS_HOST = TEST_CONFIG.REDIS.host;
    process.env.REDIS_PORT = TEST_CONFIG.REDIS.port.toString();
  }

  /**
   * 清理测试环境变量
   */
  static cleanupEnvironmentVariables(): void {
    delete process.env.NODE_ENV;
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_NAME;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
  }

  /**
   * 验证测试环境
   */
  static async validateEnvironment(): Promise<boolean> {
    try {
      // 这里可以添加环境验证逻辑
      // 例如检查数据库连接、Redis连接等

      return TestUtils.validateTestEnvironment();
    } catch (error) {
      console.error('测试环境验证失败:', error);
      return false;
    }
  }
}

/**
 * 默认导出测试套件主要功能
 */
export default {
  TEST_SUITE_INFO,
  TEST_CONFIG,
  TestUtils,
  TestAssertions,
  TestEnvironment,
};