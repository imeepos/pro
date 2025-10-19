/**
 * 断言扩展
 * 提供强大的异步断言能力，支持重试和超时机制
 */
import { AssertionConfig, AssertionExtensions } from '../types/test-types.js';

/**
 * 断言扩展 - 测试验证的数字哲学家
 * 每一个断言都是对真理的追求，每一次重试都是对确定性的执着
 */
export class TestAssertionExtensions implements AssertionExtensions {
  private readonly defaultConfig: AssertionConfig = {
    timeout: 5000,
    retryInterval: 100,
    maxRetries: 50,
  };

  constructor(private readonly config: Partial<AssertionConfig> = {}) {}

  /**
   * 最终匹配 - 断言最终会匹配指定的值
   */
  async eventuallyMatch<T>(actual: T | (() => T | Promise<T>), expected: T, timeout?: number): Promise<void> {
    const config = { ...this.defaultConfig, ...this.config, timeout };
    const startTime = Date.now();

    while (Date.now() - startTime < config.timeout!) {
      try {
        const actualValue = typeof actual === 'function' ? await (actual as () => T | Promise<T>)() : actual;

        if (this.deepEqual(actualValue, expected)) {
          return;
        }
      } catch (error) {
        // 如果获取值时出错，继续重试
      }

      await this.sleep(config.retryInterval!);
    }

    const finalActual = typeof actual === 'function' ? await (actual as () => T | Promise<T>)() : actual;
    throw new Error(
      `最终匹配失败。期望: ${JSON.stringify(expected)}, 实际: ${JSON.stringify(finalActual)}`
    );
  }

  /**
   * 最终存在 - 断言值最终会存在
   */
  async eventuallyExist<T>(value: T | (() => T | Promise<T>), timeout?: number): Promise<void> {
    const config = { ...this.defaultConfig, ...this.config, timeout };
    const startTime = Date.now();

    while (Date.now() - startTime < config.timeout!) {
      try {
        const actualValue = typeof value === 'function' ? await (value as () => T | Promise<T>)() : value;

        if (actualValue !== null && actualValue !== undefined) {
          if (Array.isArray(actualValue)) {
            if (actualValue.length > 0) {
              return;
            }
          } else if (typeof actualValue === 'object') {
            if (Object.keys(actualValue as object).length > 0) {
              return;
            }
          } else {
            return;
          }
        }
      } catch (error) {
        // 如果获取值时出错，继续重试
      }

      await this.sleep(config.retryInterval!);
    }

    throw new Error('最终存在断言失败: 值仍然为空');
  }

  /**
   * 最终解析 - 断言Promise最终会成功解析
   */
  async eventuallyResolve<T>(promise: Promise<T>, timeout?: number): Promise<T> {
    const config = { ...this.defaultConfig, ...this.config, timeout };
    const startTime = Date.now();

    while (Date.now() - startTime < config.timeout!) {
      try {
        return await Promise.race([
          promise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Promise解析超时')), config.retryInterval)
          )
        ]);
      } catch (error) {
        if ((error as Error).message === 'Promise解析超时') {
          // 继续等待
          await this.sleep(config.retryInterval!);
        } else {
          // 如果Promise被拒绝，重新创建Promise（如果可能）
          throw error;
        }
      }
    }

    throw new Error('Promise在指定时间内未能解析');
  }

  /**
   * 最终拒绝 - 断言Promise最终会被拒绝
   */
  async eventuallyReject<T>(promise: Promise<T>, timeout?: number): Promise<Error> {
    const config = { ...this.defaultConfig, ...this.config, timeout };
    const startTime = Date.now();

    while (Date.now() - startTime < config.timeout!) {
      try {
        await Promise.race([
          promise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Promise拒绝超时')), config.retryInterval)
          )
        ]);

        // 如果Promise解析成功，继续等待拒绝
        await this.sleep(config.retryInterval!);
      } catch (error) {
        if ((error as Error).message === 'Promise拒绝超时') {
          // 继续等待
          await this.sleep(config.retryInterval!);
        } else {
          // Promise被拒绝，返回错误
          return error as Error;
        }
      }
    }

    throw new Error('Promise在指定时间内未被拒绝');
  }

  /**
   * 最终数量匹配 - 断言数组或集合最终会达到指定数量
   */
  async eventuallyCount<T>(
    collection: T[] | (() => T[] | Promise<T[]>),
    expectedCount: number,
    timeout?: number
  ): Promise<void> {
    await this.eventuallyMatch(
      async () => {
        const actualCollection = typeof collection === 'function'
          ? await (collection as () => T[] | Promise<T[]>)()
          : collection;
        return actualCollection.length;
      },
      expectedCount,
      timeout
    );
  }

  /**
   * 最终包含 - 断言数组最终会包含指定元素
   */
  async eventuallyContains<T>(
    array: T[] | (() => T[] | Promise<T[]>),
    element: T,
    timeout?: number
  ): Promise<void> {
    await this.eventuallyMatch(
      async () => {
        const actualArray = typeof array === 'function'
          ? await (array as () => T[] | Promise<T[]>)()
          : array;
        return actualArray.some(item => this.deepEqual(item, element));
      },
      true,
      timeout
    );
  }

  /**
   * 最终不包含 - 断言数组最终不会包含指定元素
   */
  async eventuallyNotContains<T>(
    array: T[] | (() => T[] | Promise<T[]>),
    element: T,
    timeout?: number
  ): Promise<void> {
    await this.eventuallyMatch(
      async () => {
        const actualArray = typeof array === 'function'
          ? await (array as () => T[] | Promise<T[]>)()
          : array;
        return !actualArray.some(item => this.deepEqual(item, element));
      },
      true,
      timeout
    );
  }

  /**
   * 最终属性匹配 - 断言对象最终会有指定的属性值
   */
  async eventuallyProperty<T>(
    object: T | (() => T | Promise<T>),
    property: keyof T,
    expectedValue: any,
    timeout?: number
  ): Promise<void> {
    await this.eventuallyMatch(
      async () => {
        const actualObject = typeof object === 'function'
          ? await (object as () => T | Promise<T>)()
          : object;
        return (actualObject as any)[property];
      },
      expectedValue,
      timeout
    );
  }

  /**
   * 最终状态匹配 - 断言状态机最终会达到指定状态
   */
  async eventuallyState<T>(
    getState: () => T | Promise<T>,
    expectedState: T,
    timeout?: number
  ): Promise<void> {
    await this.eventuallyMatch(getState, expectedState, timeout);
  }

  /**
   * 最终条件满足 - 断言自定义条件最终会满足
   */
  async eventuallyCondition(
    condition: () => boolean | Promise<boolean>,
    message?: string,
    timeout?: number
  ): Promise<void> {
    const config = { ...this.defaultConfig, ...this.config, timeout };
    const startTime = Date.now();

    while (Date.now() - startTime < config.timeout!) {
      try {
        if (await condition()) {
          return;
        }
      } catch (error) {
        // 如果条件检查出错，继续重试
      }

      await this.sleep(config.retryInterval!);
    }

    throw new Error(message || '条件在指定时间内未能满足');
  }

  /**
   * 深度比较两个值
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;

    if (a === null || b === null) return a === b;

    if (typeof a !== typeof b) return false;

    if (typeof a !== 'object') return a === b;

    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.deepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  /**
   * 睡眠工具
   */
  private sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }
}

/**
 * 便捷的断言扩展实例
 */
export const assertions = new TestAssertionExtensions();

/**
 * 全局断言扩展函数
 */
export const expectEventually = {
  match: <T>(actual: T | (() => T | Promise<T>), expected: T, timeout?: number) =>
    assertions.eventuallyMatch(actual, expected, timeout),

  exist: <T>(value: T | (() => T | Promise<T>), timeout?: number) =>
    assertions.eventuallyExist(value, timeout),

  resolve: <T>(promise: Promise<T>, timeout?: number) =>
    assertions.eventuallyResolve(promise, timeout),

  reject: <T>(promise: Promise<T>, timeout?: number) =>
    assertions.eventuallyReject(promise, timeout),

  count: <T>(collection: T[] | (() => T[] | Promise<T[]>), expectedCount: number, timeout?: number) =>
    assertions.eventuallyCount(collection, expectedCount, timeout),

  contain: <T>(array: T[] | (() => T[] | Promise<T[]>), element: T, timeout?: number) =>
    assertions.eventuallyContains(array, element, timeout),

  notContain: <T>(array: T[] | (() => T[] | Promise<T[]>), element: T, timeout?: number) =>
    assertions.eventuallyNotContains(array, element, timeout),

  property: <T>(object: T | (() => T | Promise<T>), property: keyof T, expectedValue: any, timeout?: number) =>
    assertions.eventuallyProperty(object, property, expectedValue, timeout),

  state: <T>(getState: () => T | Promise<T>, expectedState: T, timeout?: number) =>
    assertions.eventuallyState(getState, expectedState, timeout),

  condition: (condition: () => boolean | Promise<boolean>, message?: string, timeout?: number) =>
    assertions.eventuallyCondition(condition, message, timeout),
};