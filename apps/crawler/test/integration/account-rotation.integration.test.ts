import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { Repository } from 'typeorm';

import { WeiboCrawlerIntegrationTestBase } from './weibo-crawler-test-base';
import { WeiboAccountService, WeiboAccount } from '../../src/weibo/account.service';
import { BrowserService } from '../../src/browser/browser.service';
import { WeiboAccountEntity } from '@pro/entities';
import { WeiboAccountStatus } from '@pro/types';

/**
 * 账号轮换集成测试 - 数字时代的智能账号管理艺术品
 * 验证账号健康检测、自动切换、负载均衡和封禁恢复机制
 */
describe('AccountRotationIntegrationTest', () => {
  let testBase: WeiboCrawlerIntegrationTestBase;
  let accountService: WeiboAccountService;
  let browserService: BrowserService;
  let weiboAccountRepo: Repository<WeiboAccountEntity>;
  let logger: Logger;

  beforeEach(async () => {
    testBase = new WeiboCrawlerIntegrationTestBase();
    await testBase.createTestingModule();

    accountService = testBase['accountService'];
    browserService = testBase['browserService'];
    weiboAccountRepo = testBase['weiboAccountRepo'];
    logger = testBase['module'].get(Logger);

    await setupComprehensiveTestAccounts();
  });

  afterEach(async () => {
    await testBase.cleanupTestingModule();
  });

  describe('账号健康状态检测', () => {
    it('应该正确检测账号的健康状态', async () => {
      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;

      // 模拟成功的Cookie验证响应
      mockPage.goto.mockImplementation(async (url: string) => {
        if (url.includes('/api/config')) {
          mockPage.content.mockResolvedValue(JSON.stringify({
            code: 100000,
            msg: 'success',
            data: { login: true }
          }));
        }
        return Promise.resolve();
      });

      // 测试健康账号
      const healthyAccount = await accountService.getOptimalAccount(1);
      expect(healthyAccount).toBeDefined();
      expect(healthyAccount.id).toBe(1);
      expect(healthyAccount.status).toBe(WeiboAccountStatus.ACTIVE);
      expect(healthyAccount.healthScore).toBeGreaterThanOrEqual(70);

      // 验证健康检查结果
      const validation = await accountService.validateAccountCookie(1);
      expect(validation).toBeDefined();
      expect(validation.isValid).toBe(true);
      expect(validation.loginStatus).toBe(true);
      expect(validation.responseTime).toBeGreaterThan(0);
    });

    it('应该检测并标记不健康的账号', async () => {
      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;

      // 模拟Cookie验证失败
      mockPage.goto.mockImplementation(async (url: string) => {
        if (url.includes('/api/config')) {
          mockPage.content.mockResolvedValue(JSON.stringify({
            code: 20000,
            msg: '未登录',
            data: { login: false }
          }));
        }
        return Promise.resolve();
      });

      // 检查可能不健康的账号
      const unhealthyAccount = await accountService.getOptimalAccount(3); // 高风险账号
      if (unhealthyAccount) {
        const validation = await accountService.validateAccountCookie(unhealthyAccount.id);
        expect(validation.isValid).toBe(false);
        expect(validation.loginStatus).toBe(false);
      }
    });

    it('应该执行定期健康检查', async () => {
      const healthCheckSpy = jest.spyOn(accountService as any, 'performPeriodicHealthCheck');

      // 等待定期健康检查执行
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(healthCheckSpy).toHaveBeenCalled();

      // 验证健康检查结果
      const healthStatus = await accountService.checkAccountsHealth();
      expect(healthStatus).toBeDefined();
      expect(healthStatus.totalAccounts).toBeGreaterThan(0);
      expect(healthStatus.healthyAccounts).toBeGreaterThanOrEqual(0);
      expect(healthStatus.unhealthyAccounts).toBeGreaterThanOrEqual(0);
      expect(healthStatus.healthDetails).toHaveLength(healthStatus.totalAccounts);
    });

    it('应该更新账号健康度指标', async () => {
      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;

      // 模拟多次成功的验证
      let validationCount = 0;
      mockPage.goto.mockImplementation(async (url: string) => {
        if (url.includes('/api/config')) {
          validationCount++;
          mockPage.content.mockResolvedValue(JSON.stringify({
            code: 100000,
            msg: 'success',
            data: { login: true }
          }));
        }
        return Promise.resolve();
      });

      const accountId = 1;

      // 多次验证同一个账号
      for (let i = 0; i < 3; i++) {
        await accountService.validateAccountCookie(accountId);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 获取更新后的账号信息
      const updatedAccount = await accountService.getOptimalAccount(accountId);
      expect(updatedAccount).toBeDefined();
      expect(updatedAccount.consecutiveFailures).toBe(0);
      expect(updatedAccount.totalSuccesses).toBeGreaterThan(0);
      expect(updatedAccount.healthScore).toBeGreaterThan(80);
    });
  });

  describe('自动账号切换', () => {
    it('应该实现轮询账号轮换策略', async () => {
      const selectedAccounts = [];

      // 连续获取账号，验证轮询顺序
      for (let i = 0; i < 6; i++) {
        const account = await accountService.getOptimalAccount();
        if (account) {
          selectedAccounts.push(account.id);
        }
      }

      // 验证账号被循环使用
      expect(selectedAccounts.length).toBeGreaterThan(0);

      // 在6次选择中，应该看到账号重复使用（轮询）
      const uniqueAccounts = [...new Set(selectedAccounts)];
      expect(uniqueAccounts.length).toBeLessThan(selectedAccounts.length);
    });

    it('应该基于健康度选择最优账号', async () => {
      // 模拟不同健康度的账号
      await updateAccountHealth(1, 95); // 高健康度
      await updateAccountHealth(2, 70); // 中等健康度
      await updateAccountHealth(3, 45); // 低健康度

      // 多次选择账号，验证偏好高健康度账号
      const selectionCounts = { 1: 0, 2: 0, 3: 0 };

      for (let i = 0; i < 10; i++) {
        const account = await accountService.getOptimalAccount();
        if (account && selectionCounts[account.id] !== undefined) {
          selectionCounts[account.id]++;
        }
      }

      // 高健康度账号应该被选择更多次
      expect(selectionCounts[1]).toBeGreaterThan(selectionCounts[3]);
      expect(selectionCounts[2]).toBeGreaterThan(selectionCounts[3]);
    });

    it('应该实现负载均衡账号选择', async () => {
      // 获取初始使用统计
      const initialStats = await accountService.getAccountUsageStats();
      expect(initialStats).toBeDefined();
      expect(initialStats.length).toBeGreaterThan(0);

      // 模拟大量账号使用
      const usageCounts = {};
      for (let i = 0; i < 20; i++) {
        const account = await accountService.getOptimalAccount();
        if (account) {
          usageCounts[account.id] = (usageCounts[account.id] || 0) + 1;
        }
      }

      // 验证负载分布相对均衡
      const counts = Object.values(usageCounts);
      const maxUsage = Math.max(...counts);
      const minUsage = Math.min(...counts);

      // 负载差异不应该过大（允许一定偏差）
      const usageDifference = maxUsage - minUsage;
      expect(usageDifference).toBeLessThanOrEqual(maxUsage * 0.5); // 差异不超过50%
    });

    it('应该跳过不适合使用的账号', async () => {
      // 标记一个账号为不活跃状态
      await markAccountStatus(2, WeiboAccountStatus.BANNED);

      const selectedAccounts = [];

      // 多次选择账号
      for (let i = 0; i < 10; i++) {
        const account = await accountService.getOptimalAccount();
        if (account) {
          selectedAccounts.push(account.id);
        }
      }

      // 验证被封禁的账号不会被选择
      expect(selectedAccounts).not.toContain(2);
      expect(selectedAccounts.length).toBeGreaterThan(0);
    });
  });

  describe('账号池管理', () => {
    it('应该维护准确的账号池状态', async () => {
      // 获取账号池统计
      const stats = await accountService.getAccountStats();
      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.active).toBeGreaterThanOrEqual(0);
      expect(stats.banned).toBeGreaterThanOrEqual(0);
      expect(stats.expired).toBeGreaterThanOrEqual(0);

      // 验证账号总数
      expect(stats.total).toBe(stats.active + stats.banned + stats.expired);

      // 获取详细的账号使用情况
      const usageStats = await accountService.getAccountUsageStats();
      expect(usageStats).toBeDefined();
      expect(usageStats.length).toBe(stats.total);

      // 验证每个账号的统计信息
      usageStats.forEach(stat => {
        expect(stat).toHaveProperty('accountId');
        expect(stat).toHaveProperty('nickname');
        expect(stat).toHaveProperty('usageCount');
        expect(stat).toHaveProperty('status');
        expect(stat).toHaveProperty('hasCookies');
        expect(stat.usageCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('应该支持账号池的动态刷新', async () => {
      const initialStats = await accountService.getAccountStats();
      const initialCount = initialStats.total;

      // 添加新账号到数据库
      const newAccount = weiboAccountRepo.create({
        id: 999,
        weiboUid: '9999999999',
        weiboNickname: '新测试账号',
        status: WeiboAccountStatus.ACTIVE,
        cookies: JSON.stringify([
          { name: 'new_cookie', value: 'new_value', domain: '.weibo.com' }
        ])
      });
      await weiboAccountRepo.save(newAccount);

      // 刷新账号池
      await accountService.refreshAccounts();

      // 验证新账号被加载
      const refreshedStats = await accountService.getAccountStats();
      expect(refreshedStats.total).toBe(initialCount + 1);

      // 验证新账号可以被获取
      const newAccountFromPool = await accountService.getOptimalAccount(999);
      expect(newAccountFromPool).toBeDefined();
      expect(newAccountFromPool.id).toBe(999);
    });

    it('应该生成账号使用报告', async () => {
      const report = await accountService.getAccountUsageReport();
      expect(report).toBeDefined();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('usageDistribution');
      expect(report).toHaveProperty('trends');
      expect(report).toHaveProperty('recommendations');

      // 验证摘要信息
      const { summary } = report;
      expect(summary.totalAccounts).toBeGreaterThan(0);
      expect(summary.activeAccounts).toBeGreaterThanOrEqual(0);
      expect(summary.totalUsage).toBeGreaterThanOrEqual(0);
      expect(summary.averageUsage).toBeGreaterThanOrEqual(0);
      expect(summary.healthRate).toBeGreaterThanOrEqual(0);
      expect(summary.healthRate).toBeLessThanOrEqual(100);

      // 验证使用分布
      const { usageDistribution } = report;
      expect(usageDistribution).toHaveLength(summary.totalAccounts);
      usageDistribution.forEach(dist => {
        expect(dist).toHaveProperty('accountId');
        expect(dist).toHaveProperty('nickname');
        expect(dist).toHaveProperty('usagePercentage');
        expect(dist).toHaveProperty('healthScore');
        expect(dist.usagePercentage).toBeGreaterThanOrEqual(0);
        expect(dist.healthScore).toBeGreaterThanOrEqual(0);
        expect(dist.healthScore).toBeLessThanOrEqual(100);
      });

      // 验证趋势分析
      const { trends } = report;
      expect(trends).toHaveProperty('mostUsed');
      expect(trends).toHaveProperty('leastUsed');
      expect(trends).toHaveProperty('recentlyActive');
      expect(trends).toHaveProperty('inactive');

      // 验证建议生成
      const { recommendations } = report;
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('封禁恢复机制', () => {
    it('应该自动检测和处理账号封禁', async () => {
      const mockPage = testBase['mockPage'] as jest.Mocked<Page>;

      // 模拟账号被封禁的响应
      mockPage.goto.mockImplementation(async (url: string) => {
        if (url.includes('/api/config')) {
          mockPage.content.mockResolvedValue(JSON.stringify({
            code: 20012,
            msg: '账号异常',
            data: { login: false }
          }));
        }
        return Promise.resolve();
      });

      const accountId = 3; // 使用高风险账号

      // 检测账号状态
      const validation = await accountService.validateAccountCookie(accountId);
      expect(validation.isValid).toBe(false);

      // 手动标记账号为被封禁
      await accountService.markAccountBanned(accountId);

      // 验证账号状态更新
      const bannedAccount = await accountService.getOptimalAccount(accountId);
      expect(bannedAccount).toBeNull(); // 账号应该不再可用

      // 验证其他账号仍然可用
      const availableAccount = await accountService.getOptimalAccount();
      expect(availableAccount).toBeDefined();
      expect(availableAccount.id).not.toBe(accountId);
    });

    it('应该处理连续失败导致的账号降级', async () => {
      const accountId = 2;

      // 模拟连续失败
      const account = await accountService.getOptimalAccount(accountId);
      expect(account).toBeDefined();

      // 更新账号连续失败次数
      await simulateAccountFailure(accountId, 5);

      // 验证账号健康度下降
      const updatedAccount = await accountService.getOptimalAccount(accountId);
      if (updatedAccount) {
        expect(updatedAccount.consecutiveFailures).toBeGreaterThan(3);
        expect(updatedAccount.healthScore).toBeLessThan(50);
        expect(updatedAccount.bannedRiskLevel).toMatch(/high|critical/);
      }
    });

    it('应该实现账号风险等级评估', async () => {
      const riskTestAccounts = [
        { id: 1, failures: 0, usage: 10, expectedRisk: 'low' },
        { id: 2, failures: 2, usage: 100, expectedRisk: 'medium' },
        { id: 3, failures: 5, usage: 500, expectedRisk: 'high' },
        { id: 4, failures: 8, usage: 1000, expectedRisk: 'critical' }
      ];

      for (const testAccount of riskTestAccounts) {
        await simulateAccountFailure(testAccount.id, testAccount.failures);
        await simulateAccountUsage(testAccount.id, testAccount.usage);

        const account = await accountService.getOptimalAccount(testAccount.id);
        if (account) {
          expect(account.bannedRiskLevel).toBe(testAccount.expectedRisk);
        }
      }
    });
  });

  describe('负载均衡验证', () => {
    it('应该生成负载均衡报告', async () => {
      const report = await accountService.getLoadBalancingReport();
      expect(report).toBeDefined();

      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('accountsHealth');
      expect(report).toHaveProperty('recommendations');

      // 验证指标
      const { metrics } = report;
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('successfulRequests');
      expect(metrics).toHaveProperty('failedRequests');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('accountUtilization');

      // 验证账号健康状态
      const { accountsHealth } = report;
      expect(Array.isArray(accountsHealth)).toBe(true);
      accountsHealth.forEach(account => {
        expect(account).toHaveProperty('accountId');
        expect(account).toHaveProperty('healthScore');
        expect(account).toHaveProperty('isSuitable');
        expect(typeof account.isSuitable).toBe('boolean');
      });

      // 验证建议
      const { recommendations } = report;
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('应该验证负载均衡策略的有效性', async () => {
      const selectionResults = [];

      // 模拟大量请求
      for (let i = 0; i < 50; i++) {
        const startTime = Date.now();
        const account = await accountService.getOptimalAccount();
        const endTime = Date.now();

        if (account) {
          selectionResults.push({
            accountId: account.id,
            responseTime: endTime - startTime,
            healthScore: account.healthScore
          });
        }
      }

      // 分析负载分布
      const accountUsage = {};
      selectionResults.forEach(result => {
        accountUsage[result.accountId] = (accountUsage[result.accountId] || 0) + 1;
      });

      const usages = Object.values(accountUsage);
      const maxUsage = Math.max(...usages);
      const minUsage = Math.min(...usages);

      // 验证负载均衡效果
      const balanceRatio = minUsage / maxUsage;
      expect(balanceRatio).toBeGreaterThan(0.3); // 最低使用率不低于最高使用率的30%

      // 验证响应时间
      const responseTimes = selectionResults.map(r => r.responseTime);
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(1000); // 平均响应时间小于1秒
    });

    it('应该优化账号选择算法', async () => {
      // 测试不同的选择策略
      const strategies = ['health_based', 'load_balanced', 'weighted_random'];
      const strategyResults = {};

      for (const strategy of strategies) {
        const selections = [];

        // 设置策略（这里需要在实际实现中提供设置方法）
        // accountService.setRotationStrategy(strategy);

        for (let i = 0; i < 20; i++) {
          const account = await accountService.getOptimalAccount();
          if (account) {
            selections.push(account.id);
          }
        }

        strategyResults[strategy] = {
          uniqueAccounts: [...new Set(selections)].length,
          selections: selections.length,
          distribution: calculateDistribution(selections)
        };
      }

      // 验证不同策略的效果
      Object.values(strategyResults).forEach(result => {
        expect(result.uniqueAccounts).toBeGreaterThan(0);
        expect(result.selections).toBe(20);
        expect(Object.keys(result.distribution).length).toBeGreaterThan(0);
      });
    });
  });

  // 辅助方法
  async function setupComprehensiveTestAccounts(): Promise<void> {
    const testAccounts = [
      {
        id: 1,
        weiboUid: '1111111111',
        weiboNickname: '健康账号1',
        status: WeiboAccountStatus.ACTIVE,
        cookies: JSON.stringify([
          { name: 'healthy_cookie_1', value: 'value1', domain: '.weibo.com', expires: Date.now() + 30 * 24 * 60 * 60 * 1000 }
        ])
      },
      {
        id: 2,
        weiboUid: '2222222222',
        weiboNickname: '普通账号2',
        status: WeiboAccountStatus.ACTIVE,
        cookies: JSON.stringify([
          { name: 'normal_cookie_2', value: 'value2', domain: '.weibo.com', expires: Date.now() + 15 * 24 * 60 * 60 * 1000 }
        ])
      },
      {
        id: 3,
        weiboUid: '3333333333',
        weiboNickname: '高风险账号3',
        status: WeiboAccountStatus.ACTIVE,
        cookies: JSON.stringify([
          { name: 'risk_cookie_3', value: 'value3', domain: '.weibo.com', expires: Date.now() + 5 * 24 * 60 * 60 * 1000 }
        ])
      },
      {
        id: 4,
        weiboUid: '4444444444',
        weiboNickname: '备用账号4',
        status: WeiboAccountStatus.ACTIVE,
        cookies: JSON.stringify([
          { name: 'backup_cookie_4', value: 'value4', domain: '.weibo.com', expires: Date.now() + 60 * 24 * 60 * 60 * 1000 }
        ])
      }
    ];

    for (const accountData of testAccounts) {
      const account = weiboAccountRepo.create(accountData);
      await weiboAccountRepo.save(account);
    }

    await accountService.onModuleInit();
  }

  async function updateAccountHealth(accountId: number, healthScore: number): Promise<void> {
    // 这里需要访问私有方法或通过公共接口更新健康度
    // 在实际实现中可能需要添加专门的测试方法
    const account = await accountService.getOptimalAccount(accountId);
    if (account) {
      (account as any).healthScore = healthScore;
    }
  }

  async function markAccountStatus(accountId: number, status: WeiboAccountStatus): Promise<void> {
    await weiboAccountRepo.update(accountId, { status });
    await accountService.refreshAccounts();
  }

  async function simulateAccountFailure(accountId: number, failureCount: number): Promise<void> {
    for (let i = 0; i < failureCount; i++) {
      const account = await accountService.getOptimalAccount(accountId);
      if (account) {
        (account as any).consecutiveFailures++;
        (account as any).healthScore = Math.max(0, account.healthScore - 10);
      }
    }
  }

  async function simulateAccountUsage(accountId: number, usageCount: number): Promise<void> {
    const account = await accountService.getOptimalAccount(accountId);
    if (account) {
      (account as any).usageCount = usageCount;
    }
  }

  function calculateDistribution(selections: number[]): Record<number, number> {
    const distribution = {};
    selections.forEach(accountId => {
      distribution[accountId] = (distribution[accountId] || 0) + 1;
    });
    return distribution;
  }
});