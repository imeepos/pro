/**
 * 数据工厂 - 创造优雅的测试数据
 * 每个方法都是一个艺术品的模板，为测试提供有意义的数据
 */

import { faker } from '@faker-js/faker/locale/zh_CN';
import { WeiboAccountStatus, WeiboSearchTaskStatus } from '@pro/entities';

/**
 * 用户数据工厂
 */
export class UserDataFactory {
  /**
   * 创造用户注册数据
   */
  static createRegistrationData() {
    const timestamp = Date.now();
    return {
      username: `testuser_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      password: 'SecurePassword123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };
  }

  /**
   * 创造用户登录数据
   */
  static createLoginData(userData: ReturnType<typeof UserDataFactory.createRegistrationData>) {
    return {
      username: userData.username,
      password: userData.password,
    };
  }
}

/**
 * 微博账号数据工厂
 */
export class WeiboAccountDataFactory {
  /**
   * 创造微博账号数据
   */
  static createAccountData() {
    return {
      weiboUid: faker.string.alphanumeric({ length: 10 }).toUpperCase(),
      weiboNickname: faker.person.fullName(),
      weiboAvatar: faker.internet.url(),
      cookies: faker.string.alphanumeric({ length: 200 }),
      status: faker.helpers.arrayElement(Object.values(WeiboAccountStatus)),
    };
  }

  /**
   * 创造多个微博账号数据
   */
  static createMultipleAccounts(count: number = 3) {
    return Array.from({ length: count }, () => this.createAccountData());
  }

  /**
   * 创造账号过滤器数据
   */
  static createFilterData(keyword?: string, page?: number, pageSize?: number) {
    return {
      keyword: keyword || faker.lorem.word(),
      page: page || faker.number.int({ min: 1, max: 5 }),
      pageSize: pageSize || faker.number.int({ min: 5, max: 20 }),
    };
  }
}

/**
 * 微博搜索任务数据工厂
 */
export class WeiboSearchTaskDataFactory {
  /**
   * 创造搜索任务数据
   */
  static createTaskData() {
    const startDate = faker.date.past({ years: 1 });
    const crawlIntervals = ['30m', '1h', '2h', '6h', '12h', '1d'];

    return {
      keyword: faker.lorem.words({ min: 1, max: 3 }),
      startDate: startDate.toISOString().split('T')[0],
      crawlInterval: faker.helpers.arrayElement(crawlIntervals),
      weiboAccountId: faker.number.int({ min: 1, max: 100 }),
      enableAccountRotation: faker.datatype.boolean(),
      noDataThreshold: faker.number.int({ min: 1, max: 10 }),
      maxRetries: faker.number.int({ min: 0, max: 5 }),
      longitude: faker.location.longitude({ min: -180, max: 180 }),
      latitude: faker.location.latitude({ min: -90, max: 90 }),
      locationAddress: faker.location.streetAddress(),
      locationName: faker.location.city(),
    };
  }

  /**
   * 创造更新任务数据
   */
  static createUpdateTaskData() {
    return {
      keyword: faker.lorem.words({ min: 1, max: 3 }),
      crawlInterval: faker.helpers.arrayElement(['1h', '2h', '6h', '12h']),
      enabled: faker.datatype.boolean(),
      status: faker.helpers.arrayElement(Object.values(WeiboSearchTaskStatus)),
      noDataThreshold: faker.number.int({ min: 1, max: 10 }),
      maxRetries: faker.number.int({ min: 0, max: 5 }),
      resetRetryCount: faker.datatype.boolean(),
      resetNoDataCount: faker.datatype.boolean(),
      longitude: faker.location.longitude({ min: -180, max: 180 }),
      latitude: faker.location.latitude({ min: -90, max: 90 }),
      locationAddress: faker.location.streetAddress(),
      locationName: faker.location.city(),
    };
  }

  /**
   * 创造多个搜索任务数据
   */
  static createMultipleTasks(count: number = 3) {
    return Array.from({ length: count }, () => this.createTaskData());
  }

  /**
   * 创造任务查询过滤器数据
   */
  static createQueryFilterData() {
    return {
      page: faker.number.int({ min: 1, max: 5 }),
      limit: faker.number.int({ min: 5, max: 20 }),
      keyword: faker.lorem.word(),
      status: faker.helpers.arrayElement(Object.values(WeiboSearchTaskStatus)),
      enabled: faker.datatype.boolean(),
      sortBy: faker.helpers.arrayElement(['createdAt', 'updatedAt', 'startDate', 'nextRunAt']),
      sortOrder: faker.helpers.arrayElement(['ASC', 'DESC']),
    };
  }

  /**
   * 创造任务操作数据
   */
  static createTaskOperationData() {
    return {
      reason: faker.lorem.sentence({ min: 5, max: 10 }),
    };
  }
}

/**
 * 通用数据工厂
 */
export class CommonDataFactory {
  /**
   * 创造内部令牌
   */
  static createInternalToken(): string {
    return 'internal-token';
  }

  /**
   * 创造分页参数
   */
  static createPaginationData(page: number = 1, pageSize: number = 10) {
    return {
      page,
      pageSize,
    };
  }

  /**
   * 创造搜索关键词
   */
  static createSearchKeyword(): string {
    return faker.lorem.words({ min: 1, max: 3 });
  }
}

/**
 * 集成测试数据工厂组合
 */
export class TestDataFactory {
  static readonly user = UserDataFactory;
  static readonly weiboAccount = WeiboAccountDataFactory;
  static readonly searchTask = WeiboSearchTaskDataFactory;
  static readonly common = CommonDataFactory;

  /**
   * 创造完整的测试数据集
   */
  static createCompleteDataSet() {
    const user = this.user.createRegistrationData();
    const accounts = this.weiboAccount.createMultipleAccounts(2);
    const tasks = this.searchTask.createMultipleTasks(3);

    return {
      user,
      accounts,
      tasks,
      internalToken: this.common.createInternalToken(),
    };
  }

  /**
   * 创造GraphQL查询变量
   */
  static createGraphQLVariables(data: Record<string, any>) {
    return {
      input: data,
    };
  }
}