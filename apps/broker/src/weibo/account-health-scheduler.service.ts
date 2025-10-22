import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger } from '@pro/logger';
import { RedisClient } from '@pro/redis';
import { WeiboAccountEntity } from '@pro/entities';
import { WeiboAccountStatus } from '@pro/types';
import { fetch } from 'undici';

/**
 * 微博账号健康度调度器
 * 负责在 Redis 中维护账号的健康度画像
 */
@Injectable()
export class WeiboAccountHealthScheduler {
  private readonly healthKey = 'weibo:account:health';
  private readonly metricsKeyPrefix = 'weibo:account';

  constructor(
    @InjectRepository(WeiboAccountEntity)
    private readonly accountRepository: Repository<WeiboAccountEntity>,
    private readonly redis: RedisClient,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(WeiboAccountHealthScheduler.name);
  }

  /**
   * 每分钟恢复账号健康度，最高不超过 100
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async recoverAccountHealth(): Promise<void> {
    const startedAt = Date.now();
    const accountIds = await this.redis.zrange(this.healthKey, 0, -1);

    if (accountIds.length === 0) {
      return;
    }

    const pipeline = this.redis.pipeline();
    let updated = 0;

    for (const accountId of accountIds) {
      const currentScore = await this.redis.zscore(this.healthKey, accountId);
      const resolvedScore = currentScore ?? 0;
      const newScore = Math.min(resolvedScore + 10, 100);

      if (newScore !== resolvedScore) {
        pipeline.zadd(this.healthKey, newScore, accountId);
        updated++;
      }
    }

    if (updated > 0) {
      await pipeline.exec();
    }

    this.logger.info('账号健康度恢复任务完成', {
      totalAccounts: accountIds.length,
      adjustedAccounts: updated,
      durationMs: Date.now() - startedAt,
    });
  }

  /**
   * 每十分钟验证 Cookie，依据结果调整健康度
   */
  @Cron('*/10 * * * *')
  async validateAccountCookies(): Promise<void> {
    const startedAt = Date.now();

    const accounts = await this.accountRepository.find({
      where: { status: WeiboAccountStatus.ACTIVE },
    });

    if (accounts.length === 0) {
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    for (const account of accounts) {
      try {
        const isValid = await this.validateCookie(account);

        if (isValid) {
          await this.updateHealthScore(account.id, 20);
          successCount++;
        } else {
          await this.updateHealthScore(account.id, -20);
          failureCount++;
        }

        await this.redis.hset(
          this.metricsKey(account.id),
          'lastValidatedAt',
          Date.now(),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error('Cookie 验证失败', {
          accountId: account.id,
          error: message,
        });
      }
    }

    this.logger.info('Cookie 验证任务完成', {
      activeAccounts: accounts.length,
      successCount,
      failureCount,
      durationMs: Date.now() - startedAt,
    });
  }

  private async updateHealthScore(accountId: number, delta: number): Promise<void> {
    const member = accountId.toString();
    const current = await this.redis.zscore(this.healthKey, member);
    const base = current ?? 100;
    const updated = Math.max(0, Math.min(100, base + delta));

    await this.redis.zadd(this.healthKey, updated, member);

    this.logger.debug('健康度已更新', {
      accountId,
      delta,
      previousScore: base,
      updatedScore: updated,
    });
  }

  private async validateCookie(account: WeiboAccountEntity): Promise<boolean> {
    if (!account.cookies) {
      return false;
    }

    try {
      const parsed = JSON.parse(account.cookies);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return false;
      }

      const cookieString = parsed
        .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
        .join('; ');

      if (!cookieString) {
        return false;
      }

      const response = await fetch('https://m.weibo.cn/api/config', {
        headers: { Cookie: cookieString },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as { login?: boolean };
      return data.login === true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn('Cookie 验证请求异常', {
        accountId: account.id,
        error: message,
      });
      return false;
    }
  }

  private metricsKey(accountId: number): string {
    return `${this.metricsKeyPrefix}:${accountId}:metrics`;
  }
}
