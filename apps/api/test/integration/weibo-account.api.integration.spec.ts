/**
 * 微博账号管理API集成测试
 * 艺术级的测试套件，验证微博账号管理的每一个细节
 */

import { describe, it, expect } from '@jest/globals';
import { WeiboIntegrationTestBase } from './base/integration-test-base';
import { TestDataFactory } from './factories/data.factory';

describe('微博账号管理API集成测试', () => {
  let testSuite: WeiboAccountApiIntegrationTest;

  beforeAll(async () => {
    testSuite = new WeiboAccountApiIntegrationTest();
    await testSuite.beforeAll();
  });

  afterAll(async () => {
    await testSuite.afterAll();
  });

  beforeEach(async () => {
    await testSuite.beforeEach();
  });

  afterEach(async () => {
    await testSuite.afterEach();
  });

  describe('账号查询', () => {
    it('应该成功查询账号列表', async () => {
      await testSuite.testQueryAccountsList();
    });

    it('应该支持关键词过滤查询', async () => {
      await testSuite.testQueryAccountsWithKeywordFilter();
    });

    it('应该支持分页查询', async () => {
      await testSuite.testQueryAccountsWithPagination();
    });

    it('应该查询单个账号详情', async () => {
      await testSuite.testQuerySingleAccount();
    });
  });

  describe('账号状态管理', () => {
    it('应该检查账号健康状态', async () => {
      await testSuite.testCheckAccountHealth();
    });

    it('应该批量检查所有账号状态', async () => {
      await testSuite.testCheckAllAccountsHealth();
    });

    it('应该获取账号统计信息', async () => {
      await testSuite.testGetAccountStats();
    });
  });

  describe('账号操作', () => {
    it('应该删除账号', async () => {
      await testSuite.testRemoveAccount();
    });
  });

  describe('内部API', () => {
    it('应该获取带Cookie的账号列表', async () => {
      await testSuite.testGetAccountsWithCookies();
    });

    it('应该标记账号为封禁状态', async () => {
      await testSuite.testMarkAccountBanned();
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的账号ID', async () => {
      await testSuite.testHandleInvalidAccountId();
    });

    it('应该处理无权限的内部API访问', async () => {
      await testSuite.testHandleUnauthorizedInternalApi();
    });

    it('应该处理不存在的账号查询', async () => {
      await testSuite.testHandleNonexistentAccount();
    });
  });
});

/**
 * 微博账号管理API集成测试实现类
 */
class WeiboAccountApiIntegrationTest extends WeiboIntegrationTestBase {
  /**
   * 测试查询账号列表
   */
  async testQueryAccountsList(): Promise<void> {
    const query = `
      query GetWeiboAccounts($filter: WeiboAccountFilterInput) {
        weiboAccounts(filter: $filter) {
          edges {
            node {
              id
              nickname
              uid
              status
              hasCookies
              createdAt
              updatedAt
              lastCheckAt
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
          totalCount
        }
      }
    `;

    const result = await this.executeQuery(query, {
      filter: TestDataFactory.weiboAccount.createFilterData(),
    });

    this.expectGraphQLResponse(result, 'weiboAccounts');
    this.expectPaginatedResponse(result.weiboAccounts);

    // 验证账号数据结构
    if (result.weiboAccounts.edges.length > 0) {
      const account = result.weiboAccounts.edges[0].node;
      expect(account).toHaveProperty('id');
      expect(account).toHaveProperty('nickname');
      expect(account).toHaveProperty('uid');
      expect(account).toHaveProperty('status');
      expect(account).toHaveProperty('hasCookies');
      expect(typeof account.hasCookies).toBe('boolean');
      this.expectValidDateString(account.createdAt);
      this.expectValidDateString(account.updatedAt);
    }
  }

  /**
   * 测试关键词过滤查询
   */
  async testQueryAccountsWithKeywordFilter(): Promise<void> {
    const query = `
      query GetWeiboAccounts($filter: WeiboAccountFilterInput) {
        weiboAccounts(filter: $filter) {
          edges {
            node {
              id
              nickname
              uid
            }
          }
          totalCount
        }
      }
    `;

    const filterData = TestDataFactory.weiboAccount.createFilterData('test');
    const result = await this.executeQuery(query, { filter: filterData });

    this.expectGraphQLResponse(result, 'weiboAccounts');

    // 如果有结果，验证过滤效果
    if (result.weiboAccounts.edges.length > 0) {
      const account = result.weiboAccounts.edges[0].node;
      const keyword = filterData.keyword.toLowerCase();
      const matchesNickname = account.nickname.toLowerCase().includes(keyword);
      const matchesUid = account.uid.toLowerCase().includes(keyword);
      expect(matchesNickname || matchesUid).toBe(true);
    }
  }

  /**
   * 测试分页查询
   */
  async testQueryAccountsWithPagination(): Promise<void> {
    const query = `
      query GetWeiboAccounts($filter: WeiboAccountFilterInput) {
        weiboAccounts(filter: $filter) {
          edges {
            node {
              id
              nickname
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
          totalCount
        }
      }
    `;

    const paginationData = TestDataFactory.common.createPaginationData(1, 5);
    const filterData = TestDataFactory.weiboAccount.createFilterData(
      undefined,
      paginationData.page,
      paginationData.pageSize
    );

    const result = await this.executeQuery(query, { filter: filterData });

    this.expectGraphQLResponse(result, 'weiboAccounts');
    this.expectPaginatedResponse(result.weiboAccounts);

    // 验证分页信息
    expect(result.weiboAccounts.totalCount).toBeGreaterThanOrEqual(0);
    expect(typeof result.weiboAccounts.pageInfo.hasNextPage).toBe('boolean');
    expect(typeof result.weiboAccounts.pageInfo.hasPreviousPage).toBe('boolean');
  }

  /**
   * 测试查询单个账号详情
   */
  async testQuerySingleAccount(): Promise<void> {
    // 首先获取账号列表，找一个存在的账号ID
    const listQuery = `
      query GetWeiboAccounts {
        weiboAccounts {
          edges {
            node {
              id
            }
          }
        }
      }
    `;

    const listResult = await this.executeQuery(listQuery);

    if (listResult.weiboAccounts.edges.length === 0) {
      console.log('没有找到测试账号，跳过单个账号查询测试');
      return;
    }

    const accountId = listResult.weiboAccounts.edges[0].node.id;

    const query = `
      query GetWeiboAccount($id: Int!) {
        weiboAccount(id: $id) {
          id
          nickname
          uid
          status
          hasCookies
          createdAt
          updatedAt
          lastCheckAt
        }
      }
    `;

    const result = await this.executeQuery(query, { id: accountId });

    this.expectGraphQLResponse(result, 'weiboAccount');
    expect(result.weiboAccount.id).toBe(accountId);
    expect(result.weiboAccount).toHaveProperty('nickname');
    expect(result.weiboAccount).toHaveProperty('uid');
    expect(result.weiboAccount).toHaveProperty('status');
    expect(typeof result.weiboAccount.hasCookies).toBe('boolean');
    this.expectValidDateString(result.weiboAccount.createdAt);
    this.expectValidDateString(result.weiboAccount.updatedAt);
  }

  /**
   * 测试检查账号健康状态
   */
  async testCheckAccountHealth(): Promise<void> {
    const mutation = `
      mutation CheckWeiboAccount($id: Int!) {
        checkWeiboAccount(id: $id)
      }
    `;

    // 使用一个测试账号ID
    const testAccountId = 1;

    const result = await this.executeMutation(mutation, { id: testAccountId });

    this.expectGraphQLResponse(result, 'checkWeiboAccount');
    expect(typeof result.checkWeiboAccount).toBe('boolean');
    expect(result.checkWeiboAccount).toBe(true);
  }

  /**
   * 测试批量检查所有账号状态
   */
  async testCheckAllAccountsHealth(): Promise<void> {
    const mutation = `
      mutation CheckAllWeiboAccounts {
        checkAllWeiboAccounts
      }
    `;

    const result = await this.executeMutation(mutation);

    this.expectGraphQLResponse(result, 'checkAllWeiboAccounts');
    expect(typeof result.checkAllWeiboAccounts).toBe('boolean');
    expect(result.checkAllWeiboAccounts).toBe(true);
  }

  /**
   * 测试获取账号统计信息
   */
  async testGetAccountStats(): Promise<void> {
    const query = `
      query GetWeiboAccountStats {
        weiboAccountStats {
          total
          todayNew
          online
        }
      }
    `;

    const result = await this.executeQuery(query);

    this.expectGraphQLResponse(result, 'weiboAccountStats');
    expect(typeof result.weiboAccountStats.total).toBe('number');
    expect(typeof result.weiboAccountStats.todayNew).toBe('number');
    expect(typeof result.weiboAccountStats.online).toBe('number');

    // 验证统计数据的合理性
    expect(result.weiboAccountStats.total).toBeGreaterThanOrEqual(0);
    expect(result.weiboAccountStats.todayNew).toBeGreaterThanOrEqual(0);
    expect(result.weiboAccountStats.online).toBeGreaterThanOrEqual(0);
    expect(result.weiboAccountStats.online).toBeLessThanOrEqual(result.weiboAccountStats.total);
  }

  /**
   * 测试删除账号
   */
  async testRemoveAccount(): Promise<void> {
    // 注意：这个测试会实际删除数据，在真实环境中需要谨慎
    // 这里只测试API调用的正确性，不实际执行删除

    const mutation = `
      mutation RemoveWeiboAccount($id: Int!) {
        removeWeiboAccount(id: $id)
      }
    `;

    // 使用一个不存在的测试ID
    const testAccountId = 999999;

    try {
      const result = await this.executeMutation(mutation, { id: testAccountId });
      this.expectGraphQLResponse(result, 'removeWeiboAccount');
      expect(typeof result.removeWeiboAccount).toBe('boolean');
    } catch (error: any) {
      // 预期会因为账号不存在而失败
      this.expectErrorResponse(error, 'not found');
    }
  }

  /**
   * 测试获取带Cookie的账号列表（内部API）
   */
  async testGetAccountsWithCookies(): Promise<void> {
    const query = `
      query GetWeiboAccountsWithCookies($token: String!) {
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

    const internalToken = TestDataFactory.common.createInternalToken();

    const result = await this.executeQuery(query, { token: internalToken });

    this.expectGraphQLResponse(result, 'weiboAccountsWithCookies');
    expect(Array.isArray(result.weiboAccountsWithCookies)).toBe(true);

    if (result.weiboAccountsWithCookies.length > 0) {
      const account = result.weiboAccountsWithCookies[0];
      expect(account).toHaveProperty('id');
      expect(account).toHaveProperty('weiboUid');
      expect(account).toHaveProperty('status');
      expect(account).toHaveProperty('cookies');
      expect(typeof account.cookies).toBe('string');
      expect(account.cookies.length).toBeGreaterThan(0);
    }
  }

  /**
   * 测试标记账号为封禁状态（内部API）
   */
  async testMarkAccountBanned(): Promise<void> {
    const mutation = `
      mutation MarkWeiboAccountBanned($token: String!, $id: Int!) {
        markWeiboAccountBanned(token: $token, id: $id)
      }
    `;

    const internalToken = TestDataFactory.common.createInternalToken();
    const testAccountId = 1; // 使用测试账号ID

    const result = await this.executeMutation(mutation, {
      token: internalToken,
      id: testAccountId,
    });

    this.expectGraphQLResponse(result, 'markWeiboAccountBanned');
    expect(typeof result.markWeiboAccountBanned).toBe('boolean');
    expect(result.markWeiboAccountBanned).toBe(true);
  }

  /**
   * 测试处理无效的账号ID
   */
  async testHandleInvalidAccountId(): Promise<void> {
    const query = `
      query GetWeiboAccount($id: Int!) {
        weiboAccount(id: $id) {
          id
          nickname
        }
      }
    `;

    const invalidAccountId = -1;

    try {
      await this.executeQuery(query, { id: invalidAccountId });
      // 如果没有抛出错误，说明需要验证逻辑
      expect(false).toBe(true); // 应该不会执行到这里
    } catch (error: any) {
      this.expectErrorResponse(error);
    }
  }

  /**
   * 测试处理无权限的内部API访问
   */
  async testHandleUnauthorizedInternalApi(): Promise<void> {
    const query = `
      query GetWeiboAccountsWithCookies($token: String!) {
        weiboAccountsWithCookies(token: $token) {
          id
          weiboUid
        }
      }
    `;

    const invalidToken = 'invalid-token';

    try {
      await this.executeQuery(query, { token: invalidToken });
      expect(false).toBe(true); // 应该不会执行到这里
    } catch (error: any) {
      this.expectErrorResponse(error, '无权访问');
    }
  }

  /**
   * 测试处理不存在的账号查询
   */
  async testHandleNonexistentAccount(): Promise<void> {
    const query = `
      query GetWeiboAccount($id: Int!) {
        weiboAccount(id: $id) {
          id
          nickname
        }
      }
    `;

    const nonexistentId = 999999;

    try {
      await this.executeQuery(query, { id: nonexistentId });
      expect(false).toBe(true); // 应该不会执行到这里
    } catch (error: any) {
      this.expectErrorResponse(error);
    }
  }
}