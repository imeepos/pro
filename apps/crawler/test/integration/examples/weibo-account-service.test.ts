/**
 * 微博账号服务集成测试示例
 * 展示如何使用集成测试框架进行优雅的测试
 */
import { BaseIntegrationTest } from '../base-integration-test.js';
import { WeiboTestDataFactory } from '../factories/weibo-test-data-factory.js';
import { WeiboAccountEntity } from '@pro/entities';
import { WeiboAccountStatus } from '@pro/types';

/**
 * 微博账号服务集成测试
 * 演示集成测试框架的优雅用法
 */
describe('微博账号服务集成测试', () => {
  let testInstance: WeiboAccountServiceTest;

  beforeAll(async () => {
    testInstance = new WeiboAccountServiceTest();
    await testInstance.beforeAll();
  });

  afterAll(async () => {
    await testInstance.afterAll();
  });

  beforeEach(async () => {
    await testInstance.beforeEach();
  });

  afterEach(async () => {
    await testInstance.afterEach();
  });

  describe('账号创建', () => {
    it('应该能够创建新的微博账号', async () => {
      // Arrange
      const accountData = testInstance.factory.createWeiboAccount({
        save: false,
        status: WeiboAccountStatus.ACTIVE,
        withCookies: true
      });

      // Act
      const createdAccount = await testInstance.createWeiboAccount(accountData);

      // Assert
      expect(createdAccount.id).toBeDefined();
      expect(createdAccount.weiboUid).toBe(accountData.weiboUid);
      expect(createdAccount.status).toBe(WeiboAccountStatus.ACTIVE);
      expect(createdAccount.cookies).toBeDefined();

      // 验证数据库状态
      await testInstance.assertDatabaseState({
        weibo_accounts: 1
      });
    });

    it('应该拒绝重复的微博账号', async () => {
      // Arrange
      const existingAccount = await testInstance.factory.createWeiboAccount({
        save: true,
        status: WeiboAccountStatus.ACTIVE
      });

      const duplicateAccount = testInstance.factory.createWeiboAccount({
        save: false,
        override: {
          weiboUid: existingAccount.weiboUid,
          userId: existingAccount.userId
        }
      });

      // Act & Assert
      await expect(testInstance.createWeiboAccount(duplicateAccount))
        .rejects.toThrow('微博账号已存在');

      // 验证数据库状态
      await testInstance.assertDatabaseState({
        weibo_accounts: 1
      });
    });
  });

  describe('账号状态管理', () => {
    it('应该能够更新账号状态', async () => {
      // Arrange
      const account = await testInstance.factory.createWeiboAccount({
        save: true,
        status: WeiboAccountStatus.ACTIVE
      });

      // Act
      await testInstance.updateAccountStatus(account.id, WeiboAccountStatus.SUSPENDED);

      // Assert
      const updatedAccount = await testInstance.getAccountById(account.id);
      expect(updatedAccount.status).toBe(WeiboAccountStatus.SUSPENDED);
    });

    it('应该能够批量更新账号状态', async () => {
      // Arrange
      const accounts = await testInstance.factory.createWeiboAccounts(3, {
        save: true,
        status: WeiboAccountStatus.ACTIVE
      });

      const accountIds = accounts.map(account => account.id);

      // Act
      await testInstance.batchUpdateAccountStatus(accountIds, WeiboAccountStatus.INACTIVE);

      // Assert
      await testInstance.utils.assertions.eventuallyMatch(
        async () => {
          const updatedAccounts = await testInstance.getAccountsByIds(accountIds);
          return updatedAccounts.every(account => account.status === WeiboAccountStatus.INACTIVE);
        },
        true
      );
    });
  });

  describe('账号健康检查', () => {
    it('应该能够检测账号健康状态', async () => {
      // Arrange
      const healthyAccount = await testInstance.factory.createWeiboAccount({
        save: true,
        status: WeiboAccountStatus.ACTIVE,
        isHealthy: true,
        errorCount: 0
      });

      const unhealthyAccount = await testInstance.factory.createWeiboAccount({
        save: true,
        status: WeiboAccountStatus.ACTIVE,
        isHealthy: false,
        errorCount: 5,
        override: {
          lastCheckAt: new Date()
        }
      });

      // Act
      const healthStatuses = await testInstance.checkAccountsHealth([
        healthyAccount.id,
        unhealthyAccount.id
      ]);

      // Assert
      expect(healthStatuses).toHaveLength(2);
      expect(healthStatuses[0].accountId).toBe(healthyAccount.id);
      expect(healthStatuses[0].isHealthy).toBe(true);
      expect(healthStatuses[1].accountId).toBe(unhealthyAccount.id);
      expect(healthStatuses[1].isHealthy).toBe(false);
    });
  });

  describe('时间相关功能', () => {
    it('应该能够基于时间过滤账号', async () => {
      // Arrange - 冻结时间到特定时刻
      testInstance.freezeTime(new Date('2024-01-01T00:00:00Z'));

      // 创建不同时间的账号
      const oldAccount = testInstance.factory.createWeiboAccount({
        save: false,
        override: {
          createdAt: new Date('2023-01-01T00:00:00Z'),
          updatedAt: new Date('2023-12-01T00:00:00Z')
        }
      });

      const recentAccount = testInstance.factory.createWeiboAccount({
        save: false,
        override: {
          createdAt: new Date('2023-12-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z')
        }
      });

      await testInstance.database.getRepository(WeiboAccountEntity).save([oldAccount, recentAccount]);

      // Act
      const recentAccounts = await testInstance.getAccountsUpdatedAfter(
        new Date('2023-12-15T00:00:00Z')
      );

      // Assert
      expect(recentAccounts).toHaveLength(1);
      expect(recentAccounts[0].id).toBe(recentAccount.id);

      // Cleanup
      testInstance.unfreezeTime();
    });

    it('应该能够处理账号过期', async () => {
      // Arrange
      const expiredAccount = await testInstance.factory.createWeiboAccount({
        save: true,
        status: WeiboAccountStatus.ACTIVE,
        override: {
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 昨天
        }
      });

      // 时间旅行到明天
      testInstance.travelTo(new Date(Date.now() + 24 * 60 * 60 * 1000));

      // Act
      await testInstance.processExpiredAccounts();

      // Assert
      const updatedAccount = await testInstance.getAccountById(expiredAccount.id);
      expect(updatedAccount.status).toBe(WeiboAccountStatus.EXPIRED);

      // 恢复时间
      testInstance.unfreezeTime();
    });
  });

  describe('异步操作测试', () => {
    it('应该能够等待异步操作完成', async () => {
      // Arrange
      const account = await testInstance.factory.createWeiboAccount({
        save: true,
        status: WeiboAccountStatus.ACTIVE
      });

      // Act - 启动异步操作
      const asyncOperation = testInstance.performAsyncAccountValidation(account.id);

      // Assert - 等待操作完成
      await testInstance.utils.assertions.eventuallyCondition(
        async () => {
          const currentAccount = await testInstance.getAccountById(account.id);
          return currentAccount.lastCheckAt !== null;
        },
        '账号验证应该在5秒内完成',
        5000
      );

      const result = await asyncOperation;
      expect(result.success).toBe(true);
    });
  });
});

/**
 * 具体的测试类实现
 */
class WeiboAccountServiceTest extends BaseIntegrationTest {
  /**
   * 创建微博账号
   */
  async createWeiboAccount(accountData: Partial<WeiboAccountEntity>): Promise<WeiboAccountEntity> {
    const repository = this.database.getRepository(WeiboAccountEntity);
    const account = repository.create(accountData);
    return await repository.save(account);
  }

  /**
   * 根据ID获取账号
   */
  async getAccountById(id: number): Promise<WeiboAccountEntity> {
    const repository = this.database.getRepository(WeiboAccountEntity);
    return await repository.findOneByOrFail({ id });
  }

  /**
   * 根据ID列表获取账号
   */
  async getAccountsByIds(ids: number[]): Promise<WeiboAccountEntity[]> {
    const repository = this.database.getRepository(WeiboAccountEntity);
    return await repository.findBy({ id: { $in: ids } } as any);
  }

  /**
   * 更新账号状态
   */
  async updateAccountStatus(id: number, status: WeiboAccountStatus): Promise<void> {
    const repository = this.database.getRepository(WeiboAccountEntity);
    await repository.update(id, { status });
  }

  /**
   * 批量更新账号状态
   */
  async batchUpdateAccountStatus(ids: number[], status: WeiboAccountStatus): Promise<void> {
    const repository = this.database.getRepository(WeiboAccountEntity);
    await repository.update(ids, { status });
  }

  /**
   * 检查账号健康状态
   */
  async checkAccountsHealth(accountIds: number[]): Promise<Array<{ accountId: number; isHealthy: boolean }>> {
    const repository = this.database.getRepository(WeiboAccountEntity);
    const accounts = await repository.findBy({ id: { $in: accountIds } } as any);

    return accounts.map(account => ({
      accountId: account.id,
      isHealthy: this.evaluateAccountHealth(account)
    }));
  }

  /**
   * 获取指定时间后更新的账号
   */
  async getAccountsUpdatedAfter(date: Date): Promise<WeiboAccountEntity[]> {
    const repository = this.database.getRepository(WeiboAccountEntity);
    return await repository
      .createQueryBuilder('account')
      .where('account.updatedAt > :date', { date })
      .getMany();
  }

  /**
   * 处理过期账号
   */
  async processExpiredAccounts(): Promise<void> {
    const repository = this.database.getRepository(WeiboAccountEntity);
    const now = new Date();

    await repository
      .createQueryBuilder()
      .update(WeiboAccountEntity)
      .set({ status: WeiboAccountStatus.EXPIRED })
      .where('expiresAt < :now', { now })
      .andWhere('status != :expired', { expired: WeiboAccountStatus.EXPIRED })
      .execute();
  }

  /**
   * 执行异步账号验证
   */
  async performAsyncAccountValidation(accountId: number): Promise<{ success: boolean }> {
    // 模拟异步验证过程
    await this.sleep(1000);

    const repository = this.database.getRepository(WeiboAccountEntity);
    await repository.update(accountId, {
      lastCheckAt: new Date(),
      errorCount: 0
    });

    return { success: true };
  }

  /**
   * 评估账号健康状态
   */
  private evaluateAccountHealth(account: WeiboAccountEntity): boolean {
    if (account.status !== WeiboAccountStatus.ACTIVE) {
      return false;
    }

    if (account.errorCount > 3) {
      return false;
    }

    if (account.expiresAt && account.expiresAt < new Date()) {
      return false;
    }

    return true;
  }
}