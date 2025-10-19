/**
 * 测试工具类集合
 * 统一导出所有测试工具，提供一站式测试解决方案
 */
import { DatabaseCleaner } from './database-cleaner.js';
import { TimeController } from './time-controller.js';
import { TestAssertionExtensions } from './assertion-extensions.js';
import { MockResponseGenerator } from './mock-response-generator.js';
import { TestUtils } from '../types/test-types.js';

/**
 * 测试工具集合 - 数字化测试工具的瑞士军刀
 * 每一个工具都精心设计，每一个功能都有其不可替代的价值
 */
export class TestUtils implements TestUtils {
  public readonly cleanup: DatabaseCleaner;
  public readonly time: TimeController;
  public readonly assertions: TestAssertionExtensions;
  public readonly mocks: MockResponseGenerator;

  constructor(database: any) {
    this.cleanup = new DatabaseCleaner(database);
    this.time = new TimeController();
    this.assertions = new TestAssertionExtensions();
    this.mocks = new MockResponseGenerator();
  }

  /**
   * 重置所有工具状态
   */
  async reset(): Promise<void> {
    this.time.reset();
    // 其他工具不需要重置
  }

  /**
   * 清理所有资源
   */
  async dispose(): Promise<void> {
    this.time.reset();
    // 其他工具没有需要清理的资源
  }
}

// 导出各个工具类
export { DatabaseCleaner } from './database-cleaner.js';
export { TimeController, timeControl } from './time-controller.js';
export { TestAssertionExtensions, assertions, expectEventually } from './assertion-extensions.js';
export { MockResponseGenerator, mockGenerator, mock } from './mock-response-generator.js';