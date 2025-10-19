/**
 * 集成测试基类 - 优雅测试的基石
 * 提供统一的测试环境配置和工具方法
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { GraphQLTestSetup, TEST_API_KEY } from '../../graphql-test-client';
import { TestDataFactory } from '../factories/data.factory';

/**
 * 集成测试基类
 * 封装通用的测试设置和清理逻辑
 */
export abstract class IntegrationTestBase {
  protected testSetup: GraphQLTestSetup;
  protected client: any;
  protected authenticatedClient: any;
  protected currentUser: any;
  protected authToken: string;

  constructor() {
    this.testSetup = new GraphQLTestSetup();
  }

  /**
   * 测试套件初始化
   */
  beforeAll(async () => {
    await this.testSetup.createTestApp();
    await this.setupTestEnvironment();
  });

  /**
   * 测试套件清理
   */
  afterAll(async () => {
    await this.cleanupTestEnvironment();
    await this.testSetup.cleanup();
  });

  /**
   * 每个测试前的准备
   */
  beforeEach(async () => {
    await this.setupTestClient();
  });

  /**
   * 每个测试后的清理
   */
  afterEach(async () => {
    await this.cleanupTestData();
  });

  /**
   * 设置测试环境 - 子类可重写
   */
  protected async setupTestEnvironment(): Promise<void> {
    // 默认实现，子类可重写以添加特定环境设置
  }

  /**
   * 清理测试环境 - 子类可重写
   */
  protected async cleanupTestEnvironment(): Promise<void> {
    // 默认实现，子类可重写以添加特定环境清理
  }

  /**
   * 设置测试客户端
   */
  protected async setupTestClient(): Promise<void> {
    this.client = this.testSetup.createTestClient();
    this.authenticatedClient = this.testSetup.createTestClient(TEST_API_KEY);
  }

  /**
   * 创建并认证用户
   */
  protected async createAndAuthenticateUser(): Promise<void> {
    const userData = TestDataFactory.user.createRegistrationData();

    // 注册用户
    const registerMutation = `
      mutation Register($input: RegisterDto!) {
        register(input: $input) {
          user {
            id
            username
            email
          }
          accessToken
          refreshToken
        }
      }
    `;

    const registerResult = await this.client.mutate(registerMutation, {
      input: userData,
    });

    this.currentUser = registerResult.register.user;
    this.authToken = registerResult.register.accessToken;
  }

  /**
   * 清理测试数据
   */
  protected async cleanupTestData(): Promise<void> {
    // 清理可能存在的测试数据
    // 这里可以添加数据库清理逻辑
  }

  /**
   * 执行GraphQL查询的优雅包装
   */
  protected async executeQuery(query: string, variables?: any): Promise<any> {
    try {
      const result = await this.authenticatedClient.query(query, variables);
      return result;
    } catch (error: any) {
      throw new Error(`查询执行失败: ${error.message}`);
    }
  }

  /**
   * 执行GraphQL变更的优雅包装
   */
  protected async executeMutation(mutation: string, variables?: any): Promise<any> {
    try {
      const result = await this.authenticatedClient.mutate(mutation, variables);
      return result;
    } catch (error: any) {
      throw new Error(`变更执行失败: ${error.message}`);
    }
  }

  /**
   * 验证GraphQL响应结构
   */
  protected expectGraphQLResponse(response: any, expectedField: string): void {
    expect(response).toBeDefined();
    expect(response).toHaveProperty(expectedField);
  }

  /**
   * 验证分页响应结构
   */
  protected expectPaginatedResponse(response: any): void {
    expect(response).toHaveProperty('edges');
    expect(response).toHaveProperty('pageInfo');
    expect(response).toHaveProperty('totalCount');
    expect(Array.isArray(response.edges)).toBe(true);
    expect(response.pageInfo).toHaveProperty('hasNextPage');
    expect(response.pageInfo).toHaveProperty('hasPreviousPage');
  }

  /**
   * 验证错误响应
   */
  protected expectErrorResponse(error: any, expectedMessage?: string): void {
    expect(error).toBeDefined();
    expect(error.message).toBeDefined();
    if (expectedMessage) {
      expect(error.message).toContain(expectedMessage);
    }
  }

  /**
   * 等待异步操作完成
   */
  protected async waitAsync(ms: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证日期格式
   */
  protected expectValidDateString(dateString: string): void {
    const date = new Date(dateString);
    expect(date.getTime()).not.toBeNaN();
  }

  /**
   * 验证UUID格式
   */
  protected expectValidUUID(uuid: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  }
}

/**
 * 微博API集成测试基类
 */
export abstract class WeiboIntegrationTestBase extends IntegrationTestBase {
  protected weiboAccount: any;
  protected searchTask: any;

  /**
   * 创建测试微博账号
   */
  protected async createTestWeiboAccount(): Promise<any> {
    const accountData = TestDataFactory.weiboAccount.createAccountData();

    // 这里需要通过实际的API创建账号
    // 由于WeiboAccountResolver没有创建账号的mutation，可能需要直接通过服务层创建
    return accountData;
  }

  /**
   * 创建测试搜索任务
   */
  protected async createTestSearchTask(accountId?: number): Promise<any> {
    const taskData = TestDataFactory.searchTask.createTaskData();
    if (accountId) {
      taskData.weiboAccountId = accountId;
    }

    const mutation = `
      mutation CreateWeiboSearchTask($input: CreateWeiboSearchTaskDto!) {
        createWeiboSearchTask(input: $input) {
          id
          keyword
          startDate
          status
          enabled
          createdAt
        }
      }
    `;

    const result = await this.executeMutation(mutation, {
      input: taskData,
    });

    return result.createWeiboSearchTask;
  }
}

/**
 * 认证API集成测试基类
 */
export abstract class AuthIntegrationTestBase extends IntegrationTestBase {
  /**
   * 执行注册
   */
  protected async registerUser(userData: any): Promise<any> {
    const mutation = `
      mutation Register($input: RegisterDto!) {
        register(input: $input) {
          user {
            id
            username
            email
          }
          accessToken
          refreshToken
        }
      }
    `;

    return await this.client.mutate(mutation, { input: userData });
  }

  /**
   * 执行登录
   */
  protected async loginUser(loginData: any): Promise<any> {
    const mutation = `
      mutation Login($input: LoginDto!) {
        login(input: $input) {
          user {
            id
            username
            email
          }
          accessToken
          refreshToken
        }
      }
    `;

    return await this.client.mutate(mutation, { input: loginData });
  }

  /**
   * 执行登出
   */
  protected async logoutUser(): Promise<any> {
    const mutation = `
      mutation Logout {
        logout
      }
    `;

    return await this.authenticatedClient.mutate(mutation);
  }

  /**
   * 获取当前用户信息
   */
  protected async getCurrentUser(): Promise<any> {
    const query = `
      query Me {
        me {
          id
          username
          email
        }
      }
    `;

    return await this.authenticatedClient.query(query);
  }
}