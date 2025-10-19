import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CrawlerModule } from '../../src/crawler.module';
import { WeiboCrawlerService } from '../../src/services/weibo-crawler.service';
import { AccountManagerService } from '../../src/services/account-manager.service';
import { CaptchaService } from '../../src/services/captcha.service';
import { Logger } from '@pro/logger';
import { setTimeout } from 'timers/promises';

describe('AccountExceptionHandlingTest', () => {
  let app: INestApplication;
  let crawlerService: WeiboCrawlerService;
  let accountManager: AccountManagerService;
  let captchaService: CaptchaService;
  let logger: Logger;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CrawlerModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    crawlerService = moduleFixture.get<WeiboCrawlerService>(WeiboCrawlerService);
    accountManager = moduleFixture.get<AccountManagerService>(AccountManagerService);
    captchaService = moduleFixture.get<CaptchaService>(CaptchaService);
    logger = moduleFixture.get<Logger>(Logger);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('账号封禁模拟', () => {
    it('应该在账号被封禁时自动停止使用该账号', async () => {
      const bannedAccountId = 'banned_account_001';
      await accountManager.addAccount({
        id: bannedAccountId,
        username: 'test_user_banned',
        cookies: { session: 'invalid_session' },
        status: 'active'
      });

      accountManager.simulateAccountBanned(bannedAccountId);

      const taskResult = await crawlerService.executeWithAccount(
        bannedAccountId,
        async (account) => {
          return await crawlerService.fetchUserData('target_user');
        }
      );

      expect(taskResult.success).toBe(false);
      expect(taskResult.error).toContain('Account banned');

      const accountStatus = await accountManager.getAccountStatus(bannedAccountId);
      expect(accountStatus.status).toBe('banned');
      expect(accountStatus.bannedUntil).toBeInstanceOf(Date);
    });

    it('应该在账号临时封禁后自动恢复', async () => {
      const tempBannedAccountId = 'temp_banned_account';
      const temporaryBanDuration = 300000;

      await accountManager.addAccount({
        id: tempBannedAccountId,
        username: 'temp_banned_user',
        cookies: { session: 'temp_session' },
        status: 'active'
      });

      accountManager.simulateTemporaryBan(tempBannedAccountId, temporaryBanDuration);

      const beforeRecovery = Date.now();
      const accountStatusBefore = await accountManager.getAccountStatus(tempBannedAccountId);
      expect(accountStatusBefore.status).toBe('temporarily_banned');

      await accountManager.waitAndRecoverAccount(tempBannedAccountId);

      const afterRecovery = Date.now();
      const accountStatusAfter = await accountManager.getAccountStatus(tempBannedAccountId);
      expect(accountStatusAfter.status).toBe('active');
      expect(afterRecovery - beforeRecovery).toBeGreaterThanOrEqual(temporaryBanDuration);
    });

    it('应该记录账号封禁的详细信息用于分析', async () => {
      const logSpy = jest.spyOn(logger, 'warn');
      const analyticsAccountId = 'analytics_account';

      await accountManager.addAccount({
        id: analyticsAccountId,
        username: 'analytics_user',
        cookies: { session: 'analytics_session' },
        status: 'active'
      });

      accountManager.simulateAccountBanned(analyticsAccountId, {
        reason: 'suspicious_activity',
        detectedAt: new Date(),
        lastActions: ['search', 'profile_view', 'post_interaction']
      });

      await crawlerService.executeWithAccount(analyticsAccountId, async () => {
        return await crawlerService.fetchSearchResults('test');
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Account banned detected'),
        expect.objectContaining({
          accountId: analyticsAccountId,
          reason: 'suspicious_activity',
          banDuration: expect.any(String),
          lastActions: expect.arrayContaining(['search', 'profile_view', 'post_interaction'])
        })
      );

      logSpy.mockRestore();
    });
  });

  describe('Cookie失效处理', () => {
    it('应该检测Cookie失效并尝试刷新', async () => {
      const expiredCookieAccount = 'expired_cookie_account';
      const originalCookies = { session: 'expired_session_token', expires: Date.now() - 86400000 };

      await accountManager.addAccount({
        id: expiredCookieAccount,
        username: 'expired_cookie_user',
        cookies: originalCookies,
        status: 'active'
      });

      const refreshSpy = jest.spyOn(accountManager, 'refreshCookies');
      refreshSpy.mockResolvedValue({
        session: 'new_session_token',
        expires: Date.now() + 86400000
      });

      const result = await crawlerService.executeWithAccount(expiredCookieAccount, async (account) => {
        return await crawlerService.fetchUserData('test_user');
      });

      expect(refreshSpy).toHaveBeenCalledWith(expiredCookieAccount);
      expect(result.success).toBe(true);

      const updatedAccount = await accountManager.getAccount(expiredCookieAccount);
      expect(updatedAccount.cookies.session).toBe('new_session_token');
      expect(updatedAccount.cookies.expires).toBeGreaterThan(Date.now());

      refreshSpy.mockRestore();
    });

    it('应该在Cookie刷新失败时标记账号为不可用', async () => {
      const failedRefreshAccount = 'failed_refresh_account';

      await accountManager.addAccount({
        id: failedRefreshAccount,
        username: 'failed_refresh_user',
        cookies: { session: 'stale_token' },
        status: 'active'
      });

      const refreshSpy = jest.spyOn(accountManager, 'refreshCookies');
      refreshSpy.mockRejectedValue(new Error('Cookie refresh failed: Invalid credentials'));

      const result = await crawlerService.executeWithAccount(failedRefreshAccount, async (account) => {
        return await crawlerService.fetchUserData('test_user');
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cookie refresh failed');

      const accountStatus = await accountManager.getAccountStatus(failedRefreshAccount);
      expect(accountStatus.status).toBe('unavailable');
      expect(accountStatus.lastError).toContain('Cookie refresh failed');

      refreshSpy.mockRestore();
    });

    it('应该预防性刷新即将过期的Cookie', async () => {
      const expiringSoonAccount = 'expiring_soon_account';
      const soonExpiringTime = Date.now() + 3600000;

      await accountManager.addAccount({
        id: expiringSoonAccount,
        username: 'expiring_soon_user',
        cookies: { session: 'expiring_token', expires: soonExpiringTime },
        status: 'active'
      });

      const refreshSpy = jest.spyOn(accountManager, 'refreshCookies');
      refreshSpy.mockResolvedValue({
        session: 'fresh_token',
        expires: Date.now() + 86400000
      });

      await accountManager.proactiveCookieRefresh();

      expect(refreshSpy).toHaveBeenCalledWith(expiringSoonAccount);

      const updatedAccount = await accountManager.getAccount(expiringSoonAccount);
      expect(updatedAccount.cookies.session).toBe('fresh_token');

      refreshSpy.mockRestore();
    });
  });

  describe('账号切换验证', () => {
    it('应该在当前账号遇到问题时自动切换到备用账号', async () => {
      const primaryAccount = 'primary_switch_account';
      const backupAccount = 'backup_switch_account';

      await accountManager.addAccount({
        id: primaryAccount,
        username: 'primary_user',
        cookies: { session: 'primary_session' },
        status: 'active'
      });

      await accountManager.addAccount({
        id: backupAccount,
        username: 'backup_user',
        cookies: { session: 'backup_session' },
        status: 'active'
      });

      accountManager.simulateAccountError(primaryAccount, 'Rate limit exceeded');

      const result = await crawlerService.executeWithFailover(
        [primaryAccount, backupAccount],
        async (account) => {
          return await crawlerService.fetchSearchResults('switch_test');
        }
      );

      expect(result.success).toBe(true);
      expect(result.usedAccountId).toBe(backupAccount);
      expect(result.switchReason).toContain('Rate limit exceeded');
    });

    it('应该智能选择最优可用账号', async () => {
      const accounts = ['smart_1', 'smart_2', 'smart_3'];

      for (let i = 0; i < accounts.length; i++) {
        await accountManager.addAccount({
          id: accounts[i],
          username: `smart_user_${i}`,
          cookies: { session: `session_${i}` },
          status: 'active',
          performance: {
            successRate: 0.9 - (i * 0.1),
            averageResponseTime: 1000 + (i * 500),
            lastUsed: Date.now() - (i * 60000)
          }
        });
      }

      const optimalAccount = await accountManager.selectOptimalAccount(accounts);
      expect(optimalAccount.id).toBe('smart_1');
    });

    it('应该在所有账号都不可用时优雅降级', async () => {
      const accounts = ['down_1', 'down_2'];

      for (const accountId of accounts) {
        await accountManager.addAccount({
          id: accountId,
          username: `down_user_${accountId}`,
          cookies: { session: `session_${accountId}` },
          status: 'banned'
        });
      }

      const result = await crawlerService.executeWithFailover(
        accounts,
        async (account) => {
          return await crawlerService.fetchSearchResults('test');
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No available accounts');
      expect(result.unavailableAccounts).toEqual(accounts);
    });
  });

  describe('验证码处理测试', () => {
    it('应该检测验证码挑战并触发解决流程', async () => {
      const captchaChallengeAccount = 'captcha_challenge_account';

      await accountManager.addAccount({
        id: captchaChallengeAccount,
        username: 'captcha_user',
        cookies: { session: 'captcha_session' },
        status: 'active'
      });

      accountManager.simulateCaptchaChallenge(captchaChallengeAccount, {
        type: 'image',
        imageUrl: 'https://captcha.example.com/image.png',
        challengeId: 'challenge_123'
      });

      const captchaSolveSpy = jest.spyOn(captchaService, 'solveCaptcha');
      captchaSolveSpy.mockResolvedValue({
        solution: 'captcha_solution',
        confidence: 0.95,
        solveTime: 2000
      });

      const result = await crawlerService.executeWithAccount(captchaChallengeAccount, async (account) => {
        return await crawlerService.fetchUserData('test_user');
      });

      expect(captchaSolveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'image',
          imageUrl: 'https://captcha.example.com/image.png'
        })
      );

      expect(result.success).toBe(true);
      expect(result.captchaSolved).toBe(true);

      captchaSolveSpy.mockRestore();
    });

    it('应该在验证码解决失败时重试或切换账号', async () => {
      const failedCaptchaAccount = 'failed_captcha_account';

      await accountManager.addAccount({
        id: failedCaptchaAccount,
        username: 'failed_captcha_user',
        cookies: { session: 'failed_captcha_session' },
        status: 'active'
      });

      const backupAccount = 'captcha_backup_account';
      await accountManager.addAccount({
        id: backupAccount,
        username: 'captcha_backup_user',
        cookies: { session: 'backup_session' },
        status: 'active'
      });

      accountManager.simulateCaptchaChallenge(failedCaptchaAccount, {
        type: 'complex_puzzle',
        challengeId: 'complex_456'
      });

      const captchaSolveSpy = jest.spyOn(captchaService, 'solveCaptcha');
      captchaSolveSpy.mockRejectedValue(new Error('Unable to solve captcha'));

      const result = await crawlerService.executeWithFailover(
        [failedCaptchaAccount, backupAccount],
        async (account) => {
          return await crawlerService.fetchSearchResults('captcha_fail_test');
        }
      );

      expect(result.success).toBe(true);
      expect(result.usedAccountId).toBe(backupAccount);
      expect(result.captchaErrors).toBeGreaterThan(0);

      captchaSolveSpy.mockRestore();
    });

    it('应该缓存验证码解决方案避免重复解决', async () => {
      const cachedCaptchaAccount = 'cached_captcha_account';
      const challengeId = 'repeat_challenge_789';

      await accountManager.addAccount({
        id: cachedCaptchaAccount,
        username: 'cached_captcha_user',
        cookies: { session: 'cached_session' },
        status: 'active'
      });

      const captchaSolveSpy = jest.spyOn(captchaService, 'solveCaptcha');
      captchaSolveSpy.mockResolvedValue({
        solution: 'cached_solution',
        confidence: 0.98,
        solveTime: 1500
      });

      accountManager.simulateCaptchaChallenge(cachedCaptchaAccount, {
        type: 'image',
        challengeId: challengeId
      });

      const result1 = await crawlerService.executeWithAccount(cachedCaptchaAccount, async () => {
        return await crawlerService.fetchUserData('user1');
      });

      const result2 = await crawlerService.executeWithAccount(cachedCaptchaAccount, async () => {
        return await crawlerService.fetchUserData('user2');
      });

      expect(captchaSolveSpy).toHaveBeenCalledTimes(1);
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      captchaSolveSpy.mockRestore();
    });
  });

  describe('账号恢复机制', () => {
    it('应该定期尝试恢复被封禁的账号', async () => {
      const recoverableAccount = 'recoverable_account';
      const banDuration = 60000;

      await accountManager.addAccount({
        id: recoverableAccount,
        username: 'recoverable_user',
        cookies: { session: 'recoverable_session' },
        status: 'banned',
        bannedUntil: new Date(Date.now() + banDuration)
      });

      const recoverySpy = jest.spyOn(accountManager, 'attemptAccountRecovery');
      recoverySpy.mockResolvedValue(true);

      await setTimeout(banDuration + 1000);
      await accountManager.processRecoveryQueue();

      expect(recoverySpy).toHaveBeenCalledWith(recoverableAccount);

      const accountStatus = await accountManager.getAccountStatus(recoverableAccount);
      expect(accountStatus.status).toBe('active');

      recoverySpy.mockRestore();
    });

    it('应该分析账号封禁原因并调整使用策略', async () => {
      const analyticsAccount = 'analytics_banned_account';

      await accountManager.addAccount({
        id: analyticsAccount,
        username: 'analytics_banned_user',
        cookies: { session: 'analytics_session' },
        status: 'banned',
        banReason: 'excessive_requests',
        banMetrics: {
          requestsPerHour: 500,
          averageDelay: 100,
          errorTypes: ['rate_limit', 'temp_ban']
        }
      });

      const strategy = await accountManager.analyzeAndAdjustStrategy(analyticsAccount);

      expect(strategy.maxRequestsPerHour).toBeLessThan(200);
      expect(strategy.minDelayBetweenRequests).toBeGreaterThan(5000);
      expect(strategy.useHeadlessBrowser).toBe(true);
      expect(strategy.rotateUserAgent).toBe(true);
    });

    it('应该维护账号健康评分系统', async () => {
      const healthScoreAccount = 'health_score_account';

      await accountManager.addAccount({
        id: healthScoreAccount,
        username: 'health_score_user',
        cookies: { session: 'health_session' },
        status: 'active',
        healthScore: 100
      });

      await accountManager.recordAccountAction(healthScoreAccount, {
        action: 'search',
        success: true,
        responseTime: 1200,
        timestamp: Date.now()
      });

      await accountManager.recordAccountAction(healthScoreAccount, {
        action: 'fetch_profile',
        success: false,
        error: 'Rate limit',
        responseTime: 5000,
        timestamp: Date.now()
      });

      const healthMetrics = await accountManager.getAccountHealthMetrics(healthScoreAccount);
      expect(healthMetrics.currentScore).toBeLessThan(100);
      expect(healthMetrics.successRate).toBeLessThan(1);
      expect(healthMetrics.averageResponseTime).toBeGreaterThan(1000);
      expect(healthMetrics.recentErrors).toContain('Rate limit');
    });
  });
});