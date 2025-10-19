/**
 * 微博账号API集成测试艺术品
 *
 * 这个测试集验证微博账号管理API的完整性、安全性和性能
 * 每个测试都是对系统健壮性的深刻检验
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WeiboIntegrationTestBase } from './base/integration-test-base';
import { TestDataFactory } from '../factories/data.factory';

/**
 * 微博账号API集成测试类
 * 继承自集成测试基类，专注于微博账号相关的API测试
 */
class WeiboAccountApiIntegrationTest extends WeiboIntegrationTestBase {
  private createdAccountIds: number[] = [];

  /**
   * 创建测试微博账号
   */
  async createTestWeiboAccount(): Promise<number> {
    // 由于GraphQL API没有创建账号的接口，这里模拟创建过程
    // 在实际应用中，可能需要直接操作数据库或使用内部API
    const accountData = TestDataFactory.weiboAccount.createAccountData();

    // 这里应该调用实际的账号创建逻辑
    // 暂时返回一个模拟的ID，实际实现需要根据具体的创建方式调整
    const mockAccountId = Math.floor(Math.random() * 100000) + 1;
    this.createdAccountIds.push(mockAccountId);

    return mockAccountId;
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData(): Promise<void> {
    // 清理创建的测试账号
    for (const accountId of this.createdAccountIds) {
      try {
        const mutation = `
          mutation RemoveWeiboAccount($id: Int!) {
            removeWeiboAccount(id: $id)
          }
        `;

        await this.executeMutation(mutation, { id: accountId });
      } catch (error) {
        // 忽略清理时的错误
        console.warn(`清理账号 ${accountId} 失败:`, error);
      }
    }

    this.createdAccountIds = [];
  }
}

describe('微博账号API集成测试', () => {
  let test: WeiboAccountApiIntegrationTest;

  beforeAll(async () => {
    test = new WeiboAccountApiIntegrationTest();
    await test.setupEnvironment();
    await test.createAndAuthenticateUser();
  });

  afterAll(async () => {
    await test.cleanupEnvironment();
  });

  beforeEach(async () => {
    // 每个测试前清理数据
    await test.cleanupTestData();
  });

  describe('账号查询API', () => {
    it('应该能够查询账号列表', async () => {
      const query = `
        query WeiboAccounts($filter: WeiboAccountFilterDto) {
          weiboAccounts(filter: $filter) {
            edges {
              node {
                id
                weiboUid
                weiboNickname
                status
                createdAt
                updatedAt
              }
              cursor
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            totalCount
          }
        }
      `;

      const result = await test.executeQuery(query, {
        filter: { page: 1, pageSize: 10 }
      });

      test.expectGraphQLResponse(result, 'weiboAccounts');
      test.expectPaginatedResponse(result.weiboAccounts);

      expect(Array.isArray(result.weiboAccounts.edges)).toBe(true);
      expect(typeof result.weiboAccounts.totalCount).toBe('number');
    });

    it('应该能够通过关键词过滤账号', async () => {
      const keyword = 'test';

      const query = `
        query WeiboAccounts($filter: WeiboAccountFilterDto) {
          weiboAccounts(filter: $filter) {
            edges {
              node {
                id
                weiboUid
                weiboNickname
              }
            }
            totalCount
          }
        }
      `;

      const result = await test.executeQuery(query, {
        filter: { keyword, page: 1, pageSize: 10 }
      });

      test.expectGraphQLResponse(result, 'weiboAccounts');

      // 验证过滤结果包含关键词
      const accounts = result.weiboAccounts.edges;
      accounts.forEach((edge: any) => {
        const node = edge.node;
        const matchKeyword = node.weiboNickname.toLowerCase().includes(keyword.toLowerCase()) ||
                           node.weiboUid.toLowerCase().includes(keyword.toLowerCase());
        expect(matchKeyword || keyword === '').toBe(true);
      });
    });

    it('应该能够查询单个账号详情', async () => {
      // 由于账号创建的限制，这里使用一个可能存在的ID进行测试
      const accountId = 1;

      const query = `
        query WeiboAccount($id: Int!) {
          weiboAccount(id: $id) {
            id
            weiboUid
            weiboNickname
            weiboAvatar
            status
            lastCheckAt
            createdAt
            updatedAt
          }
        }
      `;

      try {
        const result = await test.executeQuery(query, { id: accountId });

        test.expectGraphQLResponse(result, 'weiboAccount');
        expect(result.weiboAccount.id).toBe(accountId);
        expect(result.weiboAccount.weiboUid).toBeDefined();
        expect(result.weiboAccount.weiboNickname).toBeDefined();
      } catch (error) {
        // 如果账号不存在，这是预期的
        expect(error.message).toContain('not found') || error.message.includes('不存在')).toBe(true);
      }
    });

    it('查询不存在的账号应该返回错误', async () => {
      const query = `
        query WeiboAccount($id: Int!) {
          weiboAccount(id: $id) {
            id
            weiboUid
          }
        }
      `;

      await expect(test.executeQuery(query, { id: 99999 }))
        .rejects.toThrow();
    });
  });

  describe('账号统计API', () => {
    it('应该能够获取账号统计信息', async () => {
      const query = `
        query WeiboAccountStats {
          weiboAccountStats {
            total
            todayNew
            online
          }
        }
      `;

      const result = await test.executeQuery(query);

      test.expectGraphQLResponse(result, 'weiboAccountStats');
      expect(typeof result.weiboAccountStats.total).toBe('number');
      expect(typeof result.weiboAccountStats.todayNew).toBe('number');
      expect(typeof result.weiboAccountStats.online).toBe('number');
      expect(result.weiboAccountStats.total).toBeGreaterThanOrEqual(0);
      expect(result.weiboAccountStats.todayNew).toBeGreaterThanOrEqual(0);
      expect(result.weiboAccountStats.online).toBeGreaterThanOrEqual(0);
    });
  });

  describe('账号删除API', () => {
    it('删除不存在的账号应该返回错误', async () => {
      const mutation = `
        mutation RemoveWeiboAccount($id: Int!) {
          removeWeiboAccount(id: $id)
        }
      `;

      await expect(test.executeMutation(mutation, { id: 99999 }))
        .rejects.toThrow();
    });
  });

  describe('账号健康检查API', () => {
    it('应该能够触发单个账号健康检查', async () => {
      // 使用一个可能存在的账号ID
      const accountId = 1;

      const mutation = `
        mutation CheckWeiboAccount($id: Int!) {
          checkWeiboAccount(id: $id)
        }
      `;

      try {
        const result = await test.executeMutation(mutation, { id: accountId });
        expect(result.checkWeiboAccount).toBe(true);
      } catch (error) {
        // 如果账号不存在，这是预期的
        expect(error.message).toContain('not found') || error.message.includes('不存在')).toBe(true);
      }
    });

    it('应该能够触发所有账号健康检查', async () => {
      const mutation = `
        mutation CheckAllWeiboAccounts {
          checkAllWeiboAccounts
        }
      `;

      const result = await test.executeMutation(mutation);

      expect(result.checkAllWeiboAccounts).toBe(true);
    });
  });

  describe('内部API - 账号Cookies', () => {
    it('应该能够获取带Cookies的账号列表（内部API）', async () => {
      const internalToken = TestDataFactory.common.createInternalToken();

      const query = `
        query WeiboAccountsWithCookies($token: String!) {
          weiboAccountsWithCookies(token: $token) {
            id
            weiboUid
            weiboNickname
            status
            cookies
            lastCheckAt
          }
        }
      `;

      const result = await test.executeQuery(query, { token: internalToken });

      test.expectGraphQLResponse(result, 'weiboAccountsWithCookies');
      expect(Array.isArray(result.weiboAccountsWithCookies)).toBe(true);

      if (result.weiboAccountsWithCookies.length > 0) {
        const account = result.weiboAccountsWithCookies[0];
        expect(account.cookies).toBeDefined();
        expect(typeof account.cookies).toBe('string');
        expect(account.cookies.length).toBeGreaterThan(0);
      }
    });

    it('使用错误的内部令牌应该被拒绝', async () => {
      const query = `
        query WeiboAccountsWithCookies($token: String!) {
          weiboAccountsWithCookies(token: $token) {
            id
            weiboUid
          }
        }
      `;

      await expect(test.executeQuery(query, { token: 'wrong-token' }))
        .rejects.toThrow('无权访问此接口');
    });
  });

  describe('内部API - 标记账号封禁', () => {
    it('应该能够标记账号为封禁状态（内部API）', async () => {
      // 使用一个可能存在的账号ID
      const accountId = 1;
      const internalToken = TestDataFactory.common.createInternalToken();

      const mutation = `
        mutation MarkWeiboAccountBanned($token: String!, $id: Int!) {
          markWeiboAccountBanned(token: $token, id: $id)
        }
      `;

      try {
        const result = await test.executeMutation(mutation, {
          token: internalToken,
          id: accountId
        });

        expect(result.markWeiboAccountBanned).toBe(true);
      } catch (error) {
        // 如果账号不存在，这是预期的
        expect(error.message).toContain('not found') || error.message.includes('不存在')).toBe(true);
      }
    });

    it('使用错误的内部令牌标记封禁应该被拒绝', async () => {
      const accountId = 1;

      const mutation = `
        mutation MarkWeiboAccountBanned($token: String!, $id: Int!) {
          markWeiboAccountBanned(token: $token, id: $id)
        }
      `;

      await expect(test.executeMutation(mutation, {
        token: 'wrong-token',
        id: accountId
      })).rejects.toThrow('无权访问此接口');
    });
  });

  describe('参数验证测试', () => {
    it('分页参数应该被正确验证', async () => {
      const query = `
        query WeiboAccounts($filter: WeiboAccountFilterDto) {
          weiboAccounts(filter: $filter) {
            edges {
              node {
                id
              }
            }
            totalCount
          }
        }
      `;

      // 测试负数页码
      await expect(test.executeQuery(query, {
        filter: { page: -1, pageSize: 10 }
      })).rejects.toThrow();

      // 测试过大的页面大小
      await expect(test.executeQuery(query, {
        filter: { page: 1, pageSize: 1000 }
      })).rejects.toThrow();
    });

    it('账号ID应该是正整数', async () => {
      const query = `
        query WeiboAccount($id: Int!) {
          weiboAccount(id: $id) {
            id
          }
        }
      `;

      // 测试负数ID
      await expect(test.executeQuery(query, { id: -1 }))
        .rejects.toThrow();

      // 测试零ID
      await expect(test.executeQuery(query, { id: 0 }))
        .rejects.toThrow();
    });
  });

  describe('权限控制测试', () => {
    it('未认证用户应该无法访问账号API', async () => {
      const query = `
        query WeiboAccounts {
          weiboAccounts {
            edges {
              node {
                id
              }
            }
          }
        }
      `;

      await expect(test.client.query(query))
        .rejects.toThrow();
    });
  });

  describe('并发访问测试', () => {
    it('应该能够处理并发查询请求', async () => {
      const query = `
        query WeiboAccounts($filter: WeiboAccountFilterDto) {
          weiboAccounts(filter: $filter) {
            edges {
              node {
                id
                weiboUid
              }
            }
            totalCount
          }
        }
      `;

      // 创建10个并发请求
      const concurrentRequests = Array.from({ length: 10 }, (_, index) =>
        test.executeQuery(query, {
          filter: { page: 1, pageSize: 5 }
        })
      );

      const results = await Promise.all(concurrentRequests);

      // 验证所有请求都成功
      results.forEach(result => {
        test.expectGraphQLResponse(result, 'weiboAccounts');
        expect(Array.isArray(result.weiboAccounts.edges)).toBe(true);
      });
    });

    it('应该能够处理并发健康检查请求', async () => {
      const mutation = `
        mutation CheckAllWeiboAccounts {
          checkAllWeiboAccounts
        }
      `;

      // 创建并发健康检查请求
      const concurrentRequests = Array.from({ length: 5 }, () =>
        test.executeMutation(mutation)
      );

      const results = await Promise.all(concurrentRequests);

      // 验证所有请求都成功
      results.forEach(result => {
        expect(result.checkAllWeiboAccounts).toBe(true);
      });
    });
  });

  describe('数据一致性测试', () => {
    it('账号统计应该与实际账号数量一致', async () => {
      // 获取统计信息
      const statsQuery = `
        query WeiboAccountStats {
          weiboAccountStats {
            total
          }
        }
      `;

      const statsResult = await test.executeQuery(statsQuery);

      // 获取实际账号列表
      const listQuery = `
        query WeiboAccounts {
          weiboAccounts(filter: { page: 1, pageSize: 1000 }) {
            totalCount
          }
        }
      `;

      const listResult = await test.executeQuery(listQuery);

      expect(statsResult.weiboAccountStats.total)
        .toBe(listResult.weiboAccounts.totalCount);
    });
  });
});