import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { root } from '@pro/core';
import { PinoLogger } from '@pro/logger';
import { RedisClient } from '@pro/redis';
import { WeiboAccountEntity, useEntityManager } from '@pro/entities';
import { WeiboAccountStatus } from '@pro/types';
import {
  WeiboHealthCheckService as WeiboCoreHealthCheckService,
  type WeiboAccountHealthResult,
} from '@pro/weibo';

/**
 * 微博账号健康度调度器
 * 负责在 Redis 中维护账号的健康度画像
 */
@Injectable()
export class WeiboAccountHealthScheduler {
  private readonly healthKey = 'weibo:account:health';
  private readonly metricsKeyPrefix = 'weibo:account';
  private readonly redis: RedisClient;

  constructor(
    private readonly logger: PinoLogger,
    private readonly weiboHealthInspector: WeiboCoreHealthCheckService,
  ) {
    this.redis = root.get(RedisClient);
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

    const accounts = await useEntityManager(async manager => {
      return await manager.find(WeiboAccountEntity, {
        where: { status: WeiboAccountStatus.ACTIVE },
      });
    });

    if (accounts.length === 0) {
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    for (const account of accounts) {
      try {
        const health = await this.weiboHealthInspector.checkAccountHealth(account.id, account.cookies, {
          weiboUid: account.weiboUid,
        });

        if (health.isValid) {
          await this.updateHealthScore(account.id, 20);
          successCount++;
        } else {
          await this.updateHealthScore(account.id, -20);
          failureCount++;
        }

        await this.recordHealthSnapshot(account.id, health);
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

  private async recordHealthSnapshot(accountId: number, health: WeiboAccountHealthResult): Promise<void> {
    const metricsKey = this.metricsKey(accountId);
    const pipeline = this.redis.pipeline();

    pipeline.hset(metricsKey, 'lastValidatedAt', health.checkedAt.getTime());
    pipeline.hset(metricsKey, 'lastStatus', health.status);

    if (health.errorType) {
      pipeline.hset(metricsKey, 'lastErrorType', health.errorType);
    } else {
      pipeline.hset(metricsKey, 'lastErrorType', '');
    }

    if (health.errorMessage) {
      pipeline.hset(metricsKey, 'lastErrorMessage', health.errorMessage);
    } else {
      pipeline.hset(metricsKey, 'lastErrorMessage', '');
    }

    await pipeline.exec();
  }

  private metricsKey(accountId: number): string {
    return `${this.metricsKeyPrefix}:${accountId}:metrics`;
  }
}
