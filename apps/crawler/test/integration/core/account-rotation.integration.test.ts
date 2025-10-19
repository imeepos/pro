import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';

import { WeiboCrawlerIntegrationTestBase } from '../weibo-crawler-test-base';
import { WeiboAccountService } from '../../../src/weibo/account.service';
import { BrowserService } from '../../../src/browser/browser.service';
import { RawDataService } from '../../../src/raw-data/raw-data.service';

import { WeiboAccountEntity } from '@pro/entities';
import { WeiboAccountStatus } from '@pro/types';

/**
 * 账号管理和轮换集成测试 - 数字时代的账号生命周期守护者
 *
 * 这个测试类验证账号管理的各个方面，确保每一个账号都能在其生命周期中
 * 发挥最大价值，每一次轮换都是经过深思熟虑的决策。
 *
 * 测试覆盖：
 * - 账号池的动态管理
 * - 账号健康度的智能检测
 * - 基于策略的账号轮换
 * - Cookie状态的管理和验证
 * - 故障账号的恢复机制
 */
describe('AccountRotationIntegrationTest', () => {
  let testSuite: WeiboCrawlerIntegrationTestBase;
  let accountService: WeiboAccountService;
  let browserService: BrowserService;
  let rawDataService: RawDataService;
  let weiboAccountRepo: Repository<WeiboAccountEntity>;

  beforeAll(async () => {
    testSuite = new WeiboCrawlerIntegrationTestBase();
    await testSuite.createTestingModule();

    accountService = testSuite['accountService'];
    browserService = testSuite['browserService'];
    rawDataService = testSuite['rawDataService'];
    weiboAccountRepo = testSuite['weiboAccountRepo'];

    await testSuite.setupTestAccounts();
  });

  afterAll(async () => {
    await testSuite.cleanupTestingModule();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('账号池管理测试', () => {
    it('应该能够正确初始化账号池', async () => {
      await accountService.onModuleInit();

      const availableAccounts = await accountService.getAvailableAccounts();
      expect(availableAccounts).toBeDefined();
      expect(availableAccounts.length).toBeGreaterThan(0);

      availableAccounts.forEach(account => {
        expect(account.status).toBe(WeiboAccountStatus.ACTIVE);
        expect(account.cookies).toBeTruthy();
        expect(account.weiboUid).toBeTruthy();
        expect(account.weiboNickname).toBeTruthy();
      });
    });

    it('应该能够添加新账号到池中', async () => {
      const newAccount = {
        weiboUid: '9876543210',
        weiboNickname: '新测试账号',
        status: WeiboAccountStatus.ACTIVE,
        cookies: JSON.stringify([
          { name: 'new_test_cookie', value: 'new_value', domain: '.weibo.com' }
        ])
      };

      const createdAccount = await accountService.addAccount(newAccount);
      expect(createdAccount).toBeDefined();
      expect(createdAccount.weiboUid).toBe(newAccount.weiboUid);
      expect(createdAccount.weiboNickname).toBe(newAccount.weiboNickname);

      const allAccounts = await weiboAccountRepo.find();
      expect(allAccounts.some(acc => acc.weiboUid === newAccount.weiboUid)).toBe(true);
    });

    it('应该能够从池中移除账号', async () => {
      const accounts = await weiboAccountRepo.find();
      const accountToRemove = accounts[0];

      await accountService.removeAccount(accountToRemove.id);

      const remainingAccounts = await weiboAccountRepo.find();
      expect(remainingAccounts.some(acc => acc.id === accountToRemove.id)).toBe(false);
    });

    it('应该能够按状态筛选账号', async () => {
      // 添加不同状态的账号
      const statuses = [WeiboAccountStatus.ACTIVE, WeiboAccountStatus.INACTIVE, WeiboAccountStatus.BLOCKED];

      for (let i = 0; i < statuses.length; i++) {
        await accountService.addAccount({
          weiboUid: `status_test_${i}_${Date.now()}`,
          weiboNickname: `状态测试账号${i}`,
          status: statuses[i],
          cookies: JSON.stringify([{ name: `status_cookie_${i}`, value: 'value', domain: '.weibo.com' }])
        });
      }

      const activeAccounts = await accountService.getAccountsByStatus(WeiboAccountStatus.ACTIVE);
      const inactiveAccounts = await accountService.getAccountsByStatus(WeiboAccountStatus.INACTIVE);
      const blockedAccounts = await accountService.getAccountsByStatus(WeiboAccountStatus.BLOCKED);

      expect(activeAccounts.length).toBeGreaterThan(0);
      expect(inactiveAccounts.length).toBeGreaterThan(0);
      expect(blockedAccounts.length).toBeGreaterThan(0);

      activeAccounts.forEach(acc => expect(acc.status).toBe(WeiboAccountStatus.ACTIVE));
      inactiveAccounts.forEach(acc => expect(acc.status).toBe(WeiboAccountStatus.INACTIVE));
      blockedAccounts.forEach(acc => expect(acc.status).toBe(WeiboAccountStatus.BLOCKED));
    });

    it('应该能够更新账号信息', async () => {
      const accounts = await weiboAccountRepo.find();
      const accountToUpdate = accounts[0];

      const updatedData = {
        weiboNickname: '更新后的昵称',
        cookies: JSON.stringify([
          { name: 'updated_cookie', value: 'updated_value', domain: '.weibo.com' }
        ])
      };

      const updatedAccount = await accountService.updateAccount(accountToUpdate.id, updatedData);
      expect(updatedAccount.weiboNickname).toBe(updatedData.weiboNickname);
      expect(updatedAccount.cookies).toBe(updatedData.cookies);
    });
  });

  describe('账号健康度检测', () => {
    it('应该能够检测账号的健康状态', async () => {
      const accounts = await accountService.getAvailableAccounts();
      const testAccount = accounts[0];

      // Mock successful health check
      const mockPage = testSuite['mockPage'];
      mockPage.content.mockResolvedValue(`
        <html>
          <body>
            <div class="WB_nav">登录成功</div>
          </body>
        </html>
      `);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const healthStatus = await accountService.checkAccountHealth(testAccount.id);
      expect(healthStatus).toBeDefined();
      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.lastCheckAt).toBeInstanceOf(Date);
    });

    it('应该能够检测到失效的Cookie', async () => {
      const accounts = await accountService.getAvailableAccounts();
      const testAccount = accounts[0];

      // Mock failed login due to invalid cookies
      const mockPage = testSuite['mockPage'];
      mockPage.content.mockResolvedValue(`
        <html>
          <body>
            <div class="WB_login">登录失效</div>
          </body>
        </html>
      `);
      mockPage.waitForSelector.mockResolvedValue(false as any);

      const healthStatus = await accountService.checkAccountHealth(testAccount.id);
      expect(healthStatus.isHealthy).toBe(false);
      expect(healthStatus.errorType).toBe('invalid_cookies');
    });

    it('应该能够检测到被限制的账号', async () => {
      const accounts = await accountService.getAvailableAccounts();
      const testAccount = accounts[0];

      // Mock account restriction
      const mockPage = testSuite['mockPage'];
      mockPage.content.mockResolvedValue(`
        <html>
          <body>
            <div class="WB_error">账号已被限制</div>
          </body>
        </html>
      `);
      mockPage.waitForSelector.mockResolvedValue(false as any);

      const healthStatus = await accountService.checkAccountHealth(testAccount.id);
      expect(healthStatus.isHealthy).toBe(false);
      expect(healthStatus.errorType).toBe('account_restricted');
    });

    it('应该能够跟踪账号的错误计数', async () => {
      const accounts = await accountService.getAvailableAccounts();
      const testAccount = accounts[0];

      // Simulate multiple failed attempts
      for (let i = 0; i < 3; i++) {
        const mockPage = testSuite['mockPage'];
        mockPage.content.mockResolvedValue(`
          <html>
            <body>
              <div class="WB_error">请求失败</div>
            </body>
          </html>
        `);
        mockPage.waitForSelector.mockResolvedValue(false as any);

        await accountService.checkAccountHealth(testAccount.id);
      }

      const updatedAccount = await weiboAccountRepo.findOne({ where: { id: testAccount.id } });
      expect(updatedAccount.errorCount).toBe(3);
      expect(updatedAccount.lastError).toContain('请求失败');
    });

    it('应该能够自动禁用错误次数过多的账号', async () => {
      const testAccount = await accountService.addAccount({
        weiboUid: 'high_error_account',
        weiboNickname: '高错误账号',
        status: WeiboAccountStatus.ACTIVE,
        cookies: JSON.stringify([{ name: 'test_cookie', value: 'value', domain: '.weibo.com' }]),
        errorCount: 10,
        lastError: '连续错误'
      });

      // Check if account should be disabled
      const shouldDisable = await accountService.shouldDisableAccount(testAccount.id);
      expect(shouldDisable).toBe(true);

      await accountService.disableAccount(testAccount.id, '错误次数过多');

      const disabledAccount = await weiboAccountRepo.findOne({ where: { id: testAccount.id } });
      expect(disabledAccount.status).toBe(WeiboAccountStatus.DISABLED);
    });

    it('应该能够定期检查所有账号的健康状态', async () => {
      const mockPage = testSuite['mockPage'];
      mockPage.content.mockResolvedValue(`
        <html>
          <body>
            <div class="WB_nav">登录成功</div>
          </body>
        </html>
      `);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const healthCheckResults = await accountService.checkAllAccountsHealth();
      expect(healthCheckResults).toBeDefined();
      expect(healthCheckResults.length).toBeGreaterThan(0);

      healthCheckResults.forEach(result => {
        expect(result).toHaveProperty('accountId');
        expect(result).toHaveProperty('isHealthy');
        expect(result).toHaveProperty('checkedAt');
      });
    });
  });

  describe('智能账号切换', () => {
    it('应该能够选择最优的账号进行轮换', async () => {
      // 创建具有不同健康度的账号
      const healthyAccount = await accountService.addAccount({
        weiboUid: 'healthy_123',
        weiboNickname: '健康账号',
        status: WeiboAccountStatus.ACTIVE,
        cookies: JSON.stringify([{ name: 'healthy_cookie', value: 'value', domain: '.weibo.com' }]),
        isHealthy: true,
        errorCount: 0,
        lastLoginAt: new Date(Date.now() - 1000 * 60 * 30) // 30分钟前
      });

      const unhealthyAccount = await accountService.addAccount({
        weiboUid: 'unhealthy_456',
        weiboNickname: '不健康账号',
        status: WeiboAccountStatus.ACTIVE,
        cookies: JSON.stringify([{ name: 'unhealthy_cookie', value: 'value', domain: '.weibo.com' }]),
        isHealthy: false,
        errorCount: 5,
        lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2小时前
      });

      const selectedAccount = await accountService.selectBestAccount();
      expect(selectedAccount).toBeDefined();
      expect(selectedAccount.id).toBe(healthyAccount.id);
      expect(selectedAccount.isHealthy).toBe(true);
      expect(selectedAccount.errorCount).toBeLessThan(unhealthyAccount.errorCount);
    });

    it('应该能够基于使用频率进行轮换', async () => {
      const accounts = await accountService.getAvailableAccounts();

      // Simulate usage tracking
      for (let i = 0; i < 5; i++) {
        await accountService.recordAccountUsage(accounts[0].id);
      }

      const selectedAccount = await accountService.selectBestAccount({
        considerUsageFrequency: true
      });

      // Should select an account with lower usage frequency
      expect(selectedAccount.id).not.toBe(accounts[0].id);
    });

    it('应该能够处理无可用账号的情况', async () => {
      // Disable all accounts
      const accounts = await weiboAccountRepo.find();
      for (const account of accounts) {
        await accountService.disableAccount(account.id, '测试禁用');
      }

      const selectedAccount = await accountService.selectBestAccount();
      expect(selectedAccount).toBeNull();
    });

    it('应该能够执行平滑的账号切换', async () => {
      const currentAccount = await accountService.getCurrentAccount();
      const nextAccount = await accountService.selectBestAccount();

      expect(currentAccount).toBeDefined();
      expect(nextAccount).toBeDefined();

      // Mock browser context switching
      const mockCloseContext = jest.spyOn(browserService, 'closeContext').mockResolvedValue();
      const mockCreateContext = jest.spyOn(browserService, 'createContext').mockResolvedValue({} as any);

      const switched = await accountService.switchToNextAccount();
      expect(switched).toBe(true);
      expect(mockCloseContext).toHaveBeenCalled();
      expect(mockCreateContext).toHaveBeenCalled();

      const newCurrentAccount = await accountService.getCurrentAccount();
      expect(newCurrentAccount.id).not.toBe(currentAccount.id);
    });

    it('应该能够在账号切换失败时回退', async () => {
      const currentAccount = await accountService.getCurrentAccount();

      // Mock switching failure
      jest.spyOn(browserService, 'createContext').mockRejectedValue(new Error('Context creation failed'));

      const switched = await accountService.switchToNextAccount();
      expect(switched).toBe(false);

      const fallbackAccount = await accountService.getCurrentAccount();
      expect(fallbackAccount.id).toBe(currentAccount.id);
    });

    it('应该能够记录账号切换历史', async () => {
      await accountService.switchToNextAccount();
      await accountService.switchToNextAccount();

      const switchHistory = await accountService.getAccountSwitchHistory();
      expect(switchHistory).toBeDefined();
      expect(switchHistory.length).toBeGreaterThanOrEqual(2);

      switchHistory.forEach(record => {
        expect(record).toHaveProperty('fromAccountId');
        expect(record).toHaveProperty('toAccountId');
        expect(record).toHaveProperty('switchedAt');
        expect(record).toHaveProperty('reason');
      });
    });
  });

  describe('Cookie管理测试', () => {
    it('应该能够验证Cookie的有效性', async () => {
      const accounts = await accountService.getAvailableAccounts();
      const testAccount = accounts[0];

      const mockPage = testSuite['mockPage'];
      mockPage.content.mockResolvedValue(`
        <html>
          <body>
            <div class="WB_global_nav">微博首页</div>
          </body>
        </html>
      `);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const isValid = await accountService.validateCookies(testAccount.id);
      expect(isValid).toBe(true);
    });

    it('应该能够检测过期的Cookie', async () => {
      const accounts = await accountService.getAvailableAccounts();
      const testAccount = accounts[0];

      const mockPage = testSuite['mockPage'];
      mockPage.content.mockResolvedValue(`
        <html>
          <body>
            <div class="WB_login">请先登录</div>
          </body>
        </html>
      `);
      mockPage.waitForSelector.mockResolvedValue(false as any);

      const isValid = await accountService.validateCookies(testAccount.id);
      expect(isValid).toBe(false);
    });

    it('应该能够更新Cookie信息', async () => {
      const accounts = await accountService.getAvailableAccounts();
      const testAccount = accounts[0];

      const newCookies = [
        { name: 'SUB', value: 'new_sub_value', domain: '.weibo.com', expires: Date.now() + 86400000 },
        { name: 'SUE', value: 'new_sue_value', domain: '.weibo.com', expires: Date.now() + 86400000 }
      ];

      await accountService.updateAccountCookies(testAccount.id, newCookies);

      const updatedAccount = await weiboAccountRepo.findOne({ where: { id: testAccount.id } });
      const parsedCookies = JSON.parse(updatedAccount.cookies);
      expect(parsedCookies.some(cookie => cookie.value === 'new_sub_value')).toBe(true);
      expect(parsedCookies.some(cookie => cookie.value === 'new_sue_value')).toBe(true);
    });

    it('应该能够清理无效的Cookie', async () => {
      const accounts = await accountService.getAvailableAccounts();
      const testAccount = accounts[0];

      const mixedCookies = [
        { name: 'valid_cookie', value: 'valid_value', domain: '.weibo.com', expires: Date.now() + 86400000 },
        { name: 'expired_cookie', value: 'expired_value', domain: '.weibo.com', expires: Date.now() - 86400000 },
        { name: 'invalid_domain', value: 'invalid_value', domain: 'other.com', expires: Date.now() + 86400000 }
      ];

      await accountService.updateAccountCookies(testAccount.id, mixedCookies);
      await accountService.cleanupInvalidCookies(testAccount.id);

      const updatedAccount = await weiboAccountRepo.findOne({ where: { id: testAccount.id } });
      const parsedCookies = JSON.parse(updatedAccount.cookies);

      expect(parsedCookies.length).toBe(1);
      expect(parsedCookies[0].name).toBe('valid_cookie');
    });

    it('应该能够自动刷新即将过期的Cookie', async () => {
      const accounts = await accountService.getAvailableAccounts();
      const testAccount = accounts[0];

      const expiringCookies = [
        { name: 'expiring_soon', value: 'value', domain: '.weibo.com', expires: Date.now() + 3600000 } // 1小时后过期
      ];

      await accountService.updateAccountCookies(testAccount.id, expiringCookies);

      // Mock cookie refresh
      const mockRefreshCookies = jest.fn().mockResolvedValue([
        { name: 'expiring_soon', value: 'refreshed_value', domain: '.weibo.com', expires: Date.now() + 86400000 * 30 }
      ]);
      jest.spyOn(accountService, 'refreshCookies').mockImplementation(mockRefreshCookies);

      await accountService.checkAndRefreshExpiringCookies();

      expect(mockRefreshCookies).toHaveBeenCalledWith(testAccount.id);
    });
  });

  describe('账号恢复机制', () => {
    it('应该能够自动恢复临时受限的账号', async () => {
      const restrictedAccount = await accountService.addAccount({
        weiboUid: 'temp_restricted_123',
        weiboNickname: '临时受限账号',
        status: WeiboAccountStatus.RESTRICTED,
        cookies: JSON.stringify([{ name: 'restricted_cookie', value: 'value', domain: '.weibo.com' }]),
        restrictedUntil: new Date(Date.now() - 1000 * 60 * 30), // 30分钟前解除限制
        restrictionReason: '临时访问限制'
      });

      // Mock successful recovery check
      const mockPage = testSuite['mockPage'];
      mockPage.content.mockResolvedValue(`
        <html>
          <body>
            <div class="WB_nav">账号已恢复</div>
          </body>
        </html>
      `);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const recovered = await accountService.attemptAccountRecovery(restrictedAccount.id);
      expect(recovered).toBe(true);

      const recoveredAccount = await weiboAccountRepo.findOne({ where: { id: restrictedAccount.id } });
      expect(recoveredAccount.status).toBe(WeiboAccountStatus.ACTIVE);
      expect(recoveredAccount.restrictedUntil).toBeNull();
    });

    it('应该能够处理需要人工干预的账号恢复', async () => {
      const blockedAccount = await accountService.addAccount({
        weiboUid: 'blocked_456',
        weiboNickname: '被封账号',
        status: WeiboAccountStatus.BLOCKED,
        cookies: JSON.stringify([{ name: 'blocked_cookie', value: 'value', domain: '.weibo.com' }]),
        blockReason: '违反社区规定'
      });

      const recovered = await accountService.attemptAccountRecovery(blockedAccount.id);
      expect(recovered).toBe(false);

      const updatedAccount = await weiboAccountRepo.findOne({ where: { id: blockedAccount.id } });
      expect(updatedAccount.status).toBe(WeiboAccountStatus.BLOCKED);
      expect(updatedAccount.recoveryAttempts).toBe(1);
    });

    it('应该能够限制恢复尝试次数', async () => {
      const failedAccount = await accountService.addAccount({
        weiboUid: 'failed_recovery_789',
        weiboNickname: '恢复失败账号',
        status: WeiboAccountStatus.RESTRICTED,
        cookies: JSON.stringify([{ name: 'failed_cookie', value: 'value', domain: '.weibo.com' }]),
        recoveryAttempts: 5,
        lastRecoveryAttempt: new Date()
      });

      const recovered = await accountService.attemptAccountRecovery(failedAccount.id);
      expect(recovered).toBe(false);

      const updatedAccount = await weiboAccountRepo.findOne({ where: { id: failedAccount.id } });
      expect(updatedAccount.recoveryAttempts).toBe(5); // Should not increase beyond limit
    });

    it('应该能够定期检查账号恢复机会', async () => {
      // Add accounts in various states that might be recoverable
      await accountService.addAccount({
        weiboUid: 'recoverable_1',
        weiboNickname: '可恢复账号1',
        status: WeiboAccountStatus.RESTRICTED,
        cookies: JSON.stringify([{ name: 'cookie1', value: 'value', domain: '.weibo.com' }]),
        restrictedUntil: new Date(Date.now() - 1000 * 60 * 60), // 1小时前
        recoveryAttempts: 2
      });

      await accountService.addAccount({
        weiboUid: 'recoverable_2',
        weiboNickname: '可恢复账号2',
        status: WeiboAccountStatus.INACTIVE,
        cookies: JSON.stringify([{ name: 'cookie2', value: 'value', domain: '.weibo.com' }]),
        lastRecoveryAttempt: new Date(Date.now() - 1000 * 60 * 60 * 24) // 24小时前
      });

      // Mock recovery checks
      const mockPage = testSuite['mockPage'];
      mockPage.content.mockResolvedValue(`
        <html>
          <body>
            <div class="WB_nav">可访问</div>
          </body>
        </html>
      `);
      mockPage.waitForSelector.mockResolvedValue(true as any);

      const recoveryResults = await accountService.checkAccountRecoveryOpportunities();
      expect(recoveryResults).toBeDefined();
      expect(recoveryResults.checkedCount).toBeGreaterThan(0);
    });
  });

  describe('性能和监控测试', () => {
    it('应该能够监控账号使用统计', async () => {
      const accounts = await accountService.getAvailableAccounts();
      const testAccount = accounts[0];

      // Record some usage
      await accountService.recordAccountUsage(testAccount.id);
      await accountService.recordAccountUsage(testAccount.id);

      const usageStats = await accountService.getAccountUsageStats(testAccount.id);
      expect(usageStats).toBeDefined();
      expect(usageStats.totalUsage).toBe(2);
      expect(usageStats.lastUsedAt).toBeInstanceOf(Date);
    });

    it('应该能够生成账号池健康报告', async () => {
      const healthReport = await accountService.generateAccountPoolHealthReport();
      expect(healthReport).toBeDefined();
      expect(healthReport).toHaveProperty('totalAccounts');
      expect(healthReport).toHaveProperty('activeAccounts');
      expect(healthReport).toHaveProperty('healthyAccounts');
      expect(healthReport).toHaveProperty('unhealthyAccounts');
      expect(healthReport).toHaveProperty('restrictedAccounts');
      expect(healthReport).toHaveProperty('averageErrorCount');
      expect(healthReport).toHaveProperty('generatedAt');

      expect(healthReport.totalAccounts).toBeGreaterThan(0);
      expect(healthReport.activeAccounts).toBeGreaterThanOrEqual(0);
      expect(healthReport.generatedAt).toBeInstanceOf(Date);
    });

    it('应该能够在高并发下保持账号状态一致性', async () => {
      const accounts = await accountService.getAvailableAccounts();
      const testAccount = accounts[0];

      // Simulate concurrent account usage
      const concurrentPromises = Array.from({ length: 10 }, () =>
        accountService.recordAccountUsage(testAccount.id)
      );

      await Promise.all(concurrentPromises);

      const usageStats = await accountService.getAccountUsageStats(testAccount.id);
      expect(usageStats.totalUsage).toBe(10);
    });
  });
});