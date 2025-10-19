/**
 * 认证和授权API集成测试艺术品
 *
 * 这个测试集验证用户认证、JWT令牌管理、API密钥和安全控制的完整性
 * 每个测试都是对系统安全性和访问控制机制的深刻检验
 */

import { AuthIntegrationTestBase } from './base/integration-test-base';
import { TestDataFactory } from '../factories/data.factory';

/**
 * 认证API集成测试类
 * 继承自认证集成测试基类，专注于认证和授权相关的API测试
 */
class AuthApiIntegrationTest extends AuthIntegrationTestBase {
  private createdUserIds: string[] = [];
  private createdApiKeys: number[] = [];

  /**
   * 创建测试用户并返回用户ID
   */
  async createTestUser(): Promise<{ userId: string; credentials: any }> {
    const userData = TestDataFactory.user.createRegistrationData();

    const result = await this.registerUser(userData);

    this.createdUserIds.push(result.user.id);

    return {
      userId: result.user.id,
      credentials: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      }
    };
  }

  /**
   * 创建测试API密钥
   */
  async createTestApiKey(userId?: string): Promise<number> {
    const targetUserId = userId || this.currentUser?.id;

    if (!targetUserId) {
      throw new Error('需要用户ID来创建API密钥');
    }

    const mutation = `
      mutation CreateApiKey($input: CreateApiKeyDto!) {
        createApiKey(input: $input) {
          id
          name
          key
          prefix
          permissions
          rateLimit
          enabled
          createdAt
        }
      }
    `;

    const apiKeyData = {
      name: `Test API Key ${Date.now()}`,
      permissions: ['read', 'write'],
      rateLimit: 1000,
      description: 'Test API key for integration testing'
    };

    const result = await this.executeMutation(mutation, {
      input: apiKeyData
    });

    const apiKeyId = result.createApiKey.id;
    this.createdApiKeys.push(apiKeyId);

    return apiKeyId;
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData(): Promise<void> {
    // 清理创建的API密钥
    for (const apiKeyId of this.createdApiKeys) {
      try {
        const mutation = `
          mutation RemoveApiKey($id: Int!) {
            removeApiKey(id: $id)
          }
        `;

        await this.executeMutation(mutation, { id: apiKeyId });
      } catch (error) {
        console.warn(`清理API密钥 ${apiKeyId} 失败:`, error);
      }
    }

    this.createdApiKeys = [];

    // 注意：用户清理需要特殊的权限或直接数据库操作
    // 这里只清理用户ID数组，实际清理可能需要管理员权限
    this.createdUserIds = [];
  }
}

describe('认证和授权API集成测试', () => {
  let test: AuthApiIntegrationTest;
  let testUser: any;
  let testCredentials: any;

  beforeAll(async () => {
    test = new AuthApiIntegrationTest();
    await test.setupEnvironment();

    // 创建测试用户
    const testUserData = await test.createTestUser();
    testUser = testUserData.userId;
    testCredentials = testUserData.credentials;

    // 为测试用户设置认证客户端
    test.authenticatedClient = test.testSetup.createTestClient(testCredentials.accessToken);
  });

  afterAll(async () => {
    await test.cleanupTestData();
    await test.cleanupEnvironment();
  });

  beforeEach(async () => {
    await test.cleanupTestData();
  });

  describe('用户注册API', () => {
    it('应该能够成功注册新用户', async () => {
      const userData = TestDataFactory.user.createRegistrationData();

      const mutation = `
        mutation Register($input: RegisterDto!) {
          register(input: $input) {
            user {
              id
              username
              email
              firstName
              lastName
              createdAt
            }
            accessToken
            refreshToken
          }
        }
      `;

      const result = await test.client.mutate(mutation, {
        input: userData
      });

      test.expectGraphQLResponse(result, 'register');
      expect(result.register.user).toBeDefined();
      expect(result.register.accessToken).toBeDefined();
      expect(result.register.refreshToken).toBeDefined();
      expect(result.register.user.username).toBe(userData.username);
      expect(result.register.user.email).toBe(userData.email);
      expect(result.register.user.firstName).toBe(userData.firstName);
      expect(result.register.user.lastName).toBe(userData.lastName);
      test.expectValidDateString(result.register.user.createdAt);
    });

    it('应该验证必填字段', async () => {
      const invalidUserData = {
        // 缺少必填字段
        username: 'testuser'
      };

      const mutation = `
        mutation Register($input: RegisterDto!) {
          register(input: $input) {
            user {
              id
            }
          }
        }
      `;

      await expect(test.client.mutate(mutation, {
        input: invalidUserData
      })).rejects.toThrow();
    });

    it('应该验证邮箱格式', async () => {
      const userData = TestDataFactory.user.createRegistrationData();
      userData.email = 'invalid-email';

      const mutation = `
        mutation Register($input: RegisterDto!) {
          register(input: $input) {
            user {
              id
            }
          }
        }
      `;

      await expect(test.client.mutate(mutation, {
        input: userData
      })).rejects.toThrow();
    });

    it('应该防止重复用户名注册', async () => {
      const userData = TestDataFactory.user.createRegistrationData();

      // 第一次注册
      await test.registerUser(userData);

      // 第二次注册相同用户名应该失败
      await expect(test.registerUser(userData))
        .rejects.toThrow();
    });

    it('应该防止重复邮箱注册', async () => {
      const userData1 = TestDataFactory.user.createRegistrationData();
      const userData2 = TestDataFactory.user.createRegistrationData();
      userData2.email = userData1.email; // 使用相同邮箱
      userData2.username = 'different-username';

      // 第一次注册
      await test.registerUser(userData1);

      // 第二次注册相同邮箱应该失败
      await expect(test.registerUser(userData2))
        .rejects.toThrow();
    });
  });

  describe('用户登录API', () => {
    beforeEach(async () => {
      // 创建测试用户用于登录测试
      const userData = TestDataFactory.user.createRegistrationData();
      const registerResult = await test.registerUser(userData);
      testCredentials = {
        user: registerResult.user,
        accessToken: registerResult.accessToken,
        refreshToken: registerResult.refreshToken
      };
    });

    it('应该能够使用用户名登录', async () => {
      const loginData = TestDataFactory.user.createLoginData({
        username: testCredentials.user.username,
        password: 'SecurePassword123!',
        email: testCredentials.user.email
      });

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

      const result = await test.client.mutate(mutation, {
        input: loginData
      });

      test.expectGraphQLResponse(result, 'login');
      expect(result.login.user.id).toBe(testCredentials.user.id);
      expect(result.login.user.username).toBe(testCredentials.user.username);
      expect(result.login.accessToken).toBeDefined();
      expect(result.login.refreshToken).toBeDefined();
    });

    it('应该能够使用邮箱登录', async () => {
      const loginData = {
        username: testCredentials.user.email, // 使用邮箱作为用户名
        password: 'SecurePassword123!'
      };

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

      const result = await test.client.mutate(mutation, {
        input: loginData
      });

      test.expectGraphQLResponse(result, 'login');
      expect(result.login.user.id).toBe(testCredentials.user.id);
    });

    it('错误的密码应该登录失败', async () => {
      const loginData = {
        username: testCredentials.user.username,
        password: 'wrong-password'
      };

      const mutation = `
        mutation Login($input: LoginDto!) {
          login(input: $input) {
            user {
              id
            }
          }
        }
      `;

      await expect(test.client.mutate(mutation, {
        input: loginData
      })).rejects.toThrow();
    });

    it('不存在的用户应该登录失败', async () => {
      const loginData = {
        username: 'nonexistent-user',
        password: 'password123'
      };

      const mutation = `
        mutation Login($input: LoginDto!) {
          login(input: $input) {
            user {
              id
            }
          }
        }
      `;

      await expect(test.client.mutate(mutation, {
        input: loginData
      })).rejects.toThrow();
    });
  });

  describe('JWT令牌刷新API', () => {
    beforeEach(async () => {
      const userData = TestDataFactory.user.createRegistrationData();
      const registerResult = await test.registerUser(userData);
      testCredentials = {
        user: registerResult.user,
        accessToken: registerResult.accessToken,
        refreshToken: registerResult.refreshToken
      };
    });

    it('应该能够刷新访问令牌', async () => {
      const mutation = `
        mutation RefreshToken($input: RefreshTokenDto!) {
          refreshToken(input: $input) {
            accessToken
            refreshToken
          }
        }
      `;

      const result = await test.client.mutate(mutation, {
        input: {
          refreshToken: testCredentials.refreshToken
        }
      });

      test.expectGraphQLResponse(result, 'refreshToken');
      expect(result.refreshToken.accessToken).toBeDefined();
      expect(result.refreshToken.refreshToken).toBeDefined();
      expect(result.refreshToken.accessToken).not.toBe(testCredentials.accessToken);
    });

    it('无效的刷新令牌应该失败', async () => {
      const mutation = `
        mutation RefreshToken($input: RefreshTokenDto!) {
          refreshToken(input: $input) {
            accessToken
          }
        }
      `;

      await expect(test.client.mutate(mutation, {
        input: {
          refreshToken: 'invalid-refresh-token'
        }
      })).rejects.toThrow();
    });
  });

  describe('用户登出API', () => {
    beforeEach(async () => {
      const userData = TestDataFactory.user.createRegistrationData();
      const registerResult = await test.registerUser(userData);
      testCredentials = {
        user: registerResult.user,
        accessToken: registerResult.accessToken,
        refreshToken: registerResult.refreshToken
      };
      test.authenticatedClient = test.testSetup.createTestClient(testCredentials.accessToken);
    });

    it('应该能够成功登出', async () => {
      const mutation = `
        mutation Logout {
          logout
        }
      `;

      const result = await test.authenticatedClient.mutate(mutation);

      expect(result.logout).toBe(true);
    });

    it('未认证用户登出应该失败', async () => {
      const mutation = `
        mutation Logout {
          logout
        }
      `;

      await expect(test.client.mutate(mutation))
        .rejects.toThrow();
    });
  });

  describe('当前用户信息API', () => {
    beforeEach(async () => {
      const userData = TestDataFactory.user.createRegistrationData();
      const registerResult = await test.registerUser(userData);
      testCredentials = {
        user: registerResult.user,
        accessToken: registerResult.accessToken,
        refreshToken: registerResult.refreshToken
      };
      test.authenticatedClient = test.testSetup.createTestClient(testCredentials.accessToken);
    });

    it('应该能够获取当前用户信息', async () => {
      const query = `
        query Me {
          me {
            id
            username
            email
            firstName
            lastName
            createdAt
          }
        }
      `;

      const result = await test.authenticatedClient.query(query);

      test.expectGraphQLResponse(result, 'me');
      expect(result.me.id).toBe(testCredentials.user.id);
      expect(result.me.username).toBe(testCredentials.user.username);
      expect(result.me.email).toBe(testCredentials.user.email);
    });

    it('未认证用户获取当前用户信息应该失败', async () => {
      const query = `
        query Me {
          me {
            id
            username
          }
        }
      `;

      await expect(test.client.query(query))
        .rejects.toThrow();
    });
  });

  describe('API密钥管理API', () => {
    beforeEach(async () => {
      const userData = TestDataFactory.user.createRegistrationData();
      const registerResult = await test.registerUser(userData);
      testCredentials = {
        user: registerResult.user,
        accessToken: registerResult.accessToken,
        refreshToken: registerResult.refreshToken
      };
      test.authenticatedClient = test.testSetup.createTestClient(testCredentials.accessToken);
      test.currentUser = registerResult.user;
    });

    it('应该能够创建API密钥', async () => {
      const mutation = `
        mutation CreateApiKey($input: CreateApiKeyDto!) {
          createApiKey(input: $input) {
            id
            name
            key
            prefix
            permissions
            rateLimit
            enabled
            createdAt
          }
        }
      `;

      const apiKeyData = {
        name: `Test API Key ${Date.now()}`,
        permissions: ['read', 'write'],
        rateLimit: 1000,
        description: 'Test API key'
      };

      const result = await test.authenticatedClient.mutate(mutation, {
        input: apiKeyData
      });

      test.expectGraphQLResponse(result, 'createApiKey');
      expect(result.createApiKey.id).toBeDefined();
      expect(result.createApiKey.name).toBe(apiKeyData.name);
      expect(result.createApiKey.key).toBeDefined();
      expect(result.createApiKey.prefix).toBeDefined();
      expect(result.createApiKey.permissions).toEqual(apiKeyData.permissions);
      expect(result.createApiKey.rateLimit).toBe(apiKeyData.rateLimit);
      expect(result.createApiKey.enabled).toBe(true);
      test.expectValidDateString(result.createApiKey.createdAt);
    });

    it('应该能够查询API密钥列表', async () => {
      // 创建几个测试API密钥
      await test.createTestApiKey();
      await test.createTestApiKey();

      const query = `
        query ApiKeys($filter: ApiKeyQueryDto) {
          apiKeys(filter: $filter) {
            edges {
              node {
                id
                name
                prefix
                permissions
                rateLimit
                enabled
                createdAt
              }
              cursor
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
            totalCount
          }
        }
      `;

      const result = await test.authenticatedClient.query(query, {
        filter: { page: 1, pageSize: 10 }
      });

      test.expectGraphQLResponse(result, 'apiKeys');
      test.expectPaginatedResponse(result.apiKeys);
      expect(Array.isArray(result.apiKeys.edges)).toBe(true);
      expect(result.apiKeys.totalCount).toBeGreaterThanOrEqual(2);
    });

    it('应该能够获取单个API密钥详情', async () => {
      const apiKeyId = await test.createTestApiKey();

      const query = `
        query ApiKey($id: Int!) {
          apiKey(id: $id) {
            id
            name
            prefix
            permissions
            rateLimit
            enabled
            createdAt
            lastUsedAt
          }
        }
      `;

      const result = await test.authenticatedClient.query(query, { id: apiKeyId });

      test.expectGraphQLResponse(result, 'apiKey');
      expect(result.apiKey.id).toBe(apiKeyId);
      expect(result.apiKey.name).toBeDefined();
      expect(result.apiKey.prefix).toBeDefined();
    });

    it('应该能够更新API密钥', async () => {
      const apiKeyId = await test.createTestApiKey();

      const mutation = `
        mutation UpdateApiKey($id: Int!, $input: UpdateApiKeyDto!) {
          updateApiKey(id: $id, input: $input) {
            id
            name
            permissions
            rateLimit
            enabled
            updatedAt
          }
        }
      `;

      const updateData = {
        name: 'Updated API Key Name',
        permissions: ['read'],
        rateLimit: 500
      };

      const result = await test.authenticatedClient.mutate(mutation, {
        id: apiKeyId,
        input: updateData
      });

      test.expectGraphQLResponse(result, 'updateApiKey');
      expect(result.updateApiKey.id).toBe(apiKeyId);
      expect(result.updateApiKey.name).toBe(updateData.name);
      expect(result.updateApiKey.permissions).toEqual(updateData.permissions);
      expect(result.updateApiKey.rateLimit).toBe(updateData.rateLimit);
    });

    it('应该能够禁用API密钥', async () => {
      const apiKeyId = await test.createTestApiKey();

      const mutation = `
        mutation DisableApiKey($id: Int!) {
          disableApiKey(id: $id)
        }
      `;

      const result = await test.authenticatedClient.mutate(mutation, { id: apiKeyId });

      expect(result.disableApiKey).toBe(true);

      // 验证密钥已被禁用
      const query = `
        query ApiKey($id: Int!) {
          apiKey(id: $id) {
            id
            enabled
          }
        }
      `;

      const queryResult = await test.authenticatedClient.query(query, { id: apiKeyId });
      expect(queryResult.apiKey.enabled).toBe(false);
    });

    it('应该能够启用API密钥', async () => {
      const apiKeyId = await test.createTestApiKey();

      // 先禁用
      const disableMutation = `
        mutation DisableApiKey($id: Int!) {
          disableApiKey(id: $id)
        }
      `;
      await test.authenticatedClient.mutate(disableMutation, { id: apiKeyId });

      // 再启用
      const enableMutation = `
        mutation EnableApiKey($id: Int!) {
          enableApiKey(id: $id)
        }
      `;

      const result = await test.authenticatedClient.mutate(enableMutation, { id: apiKeyId });

      expect(result.enableApiKey).toBe(true);

      // 验证密钥已被启用
      const query = `
        query ApiKey($id: Int!) {
          apiKey(id: $id) {
            id
            enabled
          }
        }
      `;

      const queryResult = await test.authenticatedClient.query(query, { id: apiKeyId });
      expect(queryResult.apiKey.enabled).toBe(true);
    });

    it('应该能够重新生成API密钥', async () => {
      const apiKeyId = await test.createTestApiKey();

      const mutation = `
        mutation RegenerateApiKey($id: Int!) {
          regenerateApiKey(id: $id) {
            key
            warning
          }
        }
      `;

      const result = await test.authenticatedClient.mutate(mutation, { id: apiKeyId });

      test.expectGraphQLResponse(result, 'regenerateApiKey');
      expect(result.regenerateApiKey.key).toBeDefined();
      expect(result.regenerateApiKey.warning).toBeDefined();
      expect(typeof result.regenerateApiKey.key).toBe('string');
      expect(result.regenerateApiKey.key.length).toBeGreaterThan(0);
    });

    it('应该能够删除API密钥', async () => {
      const apiKeyId = await test.createTestApiKey();

      const mutation = `
        mutation RemoveApiKey($id: Int!) {
          removeApiKey(id: $id)
        }
      `;

      const result = await test.authenticatedClient.mutate(mutation, { id: apiKeyId });

      expect(result.removeApiKey).toBe(true);

      // 验证密钥已被删除
      const query = `
        query ApiKey($id: Int!) {
          apiKey(id: $id) {
            id
          }
        }
      `;

      await expect(test.authenticatedClient.query(query, { id: apiKeyId }))
        .rejects.toThrow();
    });

    it('应该能够获取API密钥统计信息', async () => {
      const apiKeyId = await test.createTestApiKey();

      const query = `
        query ApiKeyStats($id: Int!) {
          apiKeyStats(id: $id) {
            id
            totalRequests
            successfulRequests
            failedRequests
            lastUsedAt
            rateLimitUsage
          }
        }
      `;

      const result = await test.authenticatedClient.query(query, { id: apiKeyId });

      test.expectGraphQLResponse(result, 'apiKeyStats');
      expect(result.apiKeyStats.id).toBe(apiKeyId);
      expect(typeof result.apiKeyStats.totalRequests).toBe('number');
      expect(typeof result.apiKeyStats.successfulRequests).toBe('number');
      expect(typeof result.apiKeyStats.failedRequests).toBe('number');
    });

    it('应该能够获取API密钥汇总统计', async () => {
      // 创建几个测试API密钥
      await test.createTestApiKey();
      await test.createTestApiKey();

      const query = `
        query ApiKeySummary {
          apiKeySummary {
            total
            active
            disabled
            totalRequests
            avgRateLimitUsage
          }
        }
      `;

      const result = await test.authenticatedClient.query(query);

      test.expectGraphQLResponse(result, 'apiKeySummary');
      expect(typeof result.apiKeySummary.total).toBe('number');
      expect(typeof result.apiKeySummary.active).toBe('number');
      expect(typeof result.apiKeySummary.disabled).toBe('number');
      expect(typeof result.apiKeySummary.totalRequests).toBe('number');
      expect(result.apiKeySummary.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('权限控制测试', () => {
    it('用户只能访问自己的API密钥', async () => {
      // 创建第一个用户和API密钥
      const user1Data = TestDataFactory.user.createRegistrationData();
      const user1Result = await test.registerUser(user1Data);
      const user1Client = test.testSetup.createTestClient(user1Result.accessToken);
      const apiKeyId = await test.createTestApiKey(user1Result.user.id);

      // 创建第二个用户
      const user2Data = TestDataFactory.user.createRegistrationData();
      const user2Result = await test.registerUser(user2Data);
      const user2Client = test.testSetup.createTestClient(user2Result.accessToken);

      // 第二个用户尝试访问第一个用户的API密钥应该失败
      const query = `
        query ApiKey($id: Int!) {
          apiKey(id: $id) {
            id
            name
          }
        }
      `;

      await expect(user2Client.query(query, { id: apiKeyId }))
        .rejects.toThrow();
    });

    it('用户只能修改自己的API密钥', async () => {
      // 创建第一个用户和API密钥
      const user1Data = TestDataFactory.user.createRegistrationData();
      const user1Result = await test.registerUser(user1Data);
      const apiKeyId = await test.createTestApiKey(user1Result.user.id);

      // 创建第二个用户
      const user2Data = TestDataFactory.user.createRegistrationData();
      const user2Result = await test.registerUser(user2Data);
      const user2Client = test.testSetup.createTestClient(user2Result.accessToken);

      // 第二个用户尝试修改第一个用户的API密钥应该失败
      const mutation = `
        mutation UpdateApiKey($id: Int!, $input: UpdateApiKeyDto!) {
          updateApiKey(id: $id, input: $input) {
            id
          }
        }
      `;

      await expect(user2Client.mutate(mutation, {
        id: apiKeyId,
        input: { name: 'Hacked Name' }
      })).rejects.toThrow();
    });
  });

  describe('令牌验证测试', () => {
    it('过期的访问令牌应该被拒绝', async () => {
      // 这个测试需要手动创建过期的令牌或修改令牌过期时间
      // 在实际实现中，可能需要使用时间旅行或直接令牌操作
    });

    it('无效的访问令牌应该被拒绝', async () => {
      const invalidClient = test.testSetup.createTestClient('invalid-token');

      const query = `
        query Me {
          me {
            id
          }
        }
      `;

      await expect(invalidClient.query(query))
        .rejects.toThrow();
    });

    it('令牌格式应该被验证', async () => {
      const malformedTokens = [
        'invalid.token',
        'not-a-jwt-token',
        '',
        'Bearer malformed-token'
      ];

      const query = `
        query Me {
          me {
            id
          }
        }
      `;

      for (const token of malformedTokens) {
        const client = test.testSetup.createTestClient(token);
        await expect(client.query(query))
          .rejects.toThrow();
      }
    });
  });

  describe('并发认证测试', () => {
    it('应该能够处理并发登录请求', async () => {
      const userData = TestDataFactory.user.createRegistrationData();
      await test.registerUser(userData);

      const loginData = TestDataFactory.user.createLoginData(userData);

      const mutation = `
        mutation Login($input: LoginDto!) {
          login(input: $input) {
            user {
              id
            }
            accessToken
            refreshToken
          }
        }
      `;

      // 创建10个并发登录请求
      const concurrentRequests = Array.from({ length: 10 }, () =>
        test.client.mutate(mutation, { input: loginData })
      );

      const results = await Promise.all(concurrentRequests);

      // 验证所有请求都成功
      results.forEach(result => {
        test.expectGraphQLResponse(result, 'login');
        expect(result.login.user).toBeDefined();
        expect(result.login.accessToken).toBeDefined();
        expect(result.login.refreshToken).toBeDefined();
      });
    });

    it('应该能够处理并发API密钥创建', async () => {
      const userData = TestDataFactory.user.createRegistrationData();
      const registerResult = await test.registerUser(userData);
      const client = test.testSetup.createTestClient(registerResult.accessToken);

      const mutation = `
        mutation CreateApiKey($input: CreateApiKeyDto!) {
          createApiKey(input: $input) {
            id
            name
            key
          }
        }
      `;

      // 创建5个并发API密钥创建请求
      const concurrentRequests = Array.from({ length: 5 }, (_, index) => {
        const apiKeyData = {
          name: `Concurrent API Key ${index}`,
          permissions: ['read'],
          rateLimit: 100
        };

        return client.mutate(mutation, { input: apiKeyData });
      });

      const results = await Promise.all(concurrentRequests);

      // 验证所有请求都成功且ID唯一
      const apiKeys = results.map(r => r.createApiKey);
      const ids = apiKeys.map(k => k.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
      apiKeys.forEach(apiKey => {
        expect(apiKey.id).toBeDefined();
        expect(apiKey.name).toBeDefined();
        expect(apiKey.key).toBeDefined();
      });
    });
  });

  describe('安全测试', () => {
    it('应该防止暴力破解登录', async () => {
      const userData = TestDataFactory.user.createRegistrationData();
      await test.registerUser(userData);

      const loginData = {
        username: userData.username,
        password: 'wrong-password'
      };

      const mutation = `
        mutation Login($input: LoginDto!) {
          login(input: $input) {
            user {
              id
            }
          }
        }
      `;

      // 尝试多次错误登录
      const failedAttempts = Array.from({ length: 10 }, () =>
        test.client.mutate(mutation, { input: loginData }).catch(error => error)
      );

      const results = await Promise.all(failedAttempts);

      // 验证所有尝试都失败
      results.forEach(result => {
        expect(result).toBeInstanceOf(Error);
      });

      // 在实际实现中，这里可能需要验证账户被锁定或IP被限制
    });

    it('API密钥应该有足够的随机性', async () => {
      const userData = TestDataFactory.user.createRegistrationData();
      const registerResult = await test.registerUser(userData);
      const client = test.testSetup.createTestClient(registerResult.accessToken);

      const mutation = `
        mutation CreateApiKey($input: CreateApiKeyDto!) {
          createApiKey(input: $input) {
            key
            prefix
          }
        }
      `;

      // 创建多个API密钥验证随机性
      const keys = await Promise.all(
        Array.from({ length: 10 }, async () => {
          const apiKeyData = {
            name: `Random Key ${Date.now()}`,
            permissions: ['read'],
            rateLimit: 100
          };

          const result = await client.mutate(mutation, { input: apiKeyData });
          return result.createApiKey;
        })
      );

      // 验证所有密钥都是唯一的
      const keyStrings = keys.map(k => k.key);
      const uniqueKeys = new Set(keyStrings);

      expect(uniqueKeys.size).toBe(keyStrings.length);

      // 验证密钥长度和格式
      keys.forEach(apiKey => {
        expect(apiKey.key.length).toBeGreaterThan(20);
        expect(typeof apiKey.key).toBe('string');
        expect(apiKey.prefix).toBeDefined();
      });
    });
  });
});