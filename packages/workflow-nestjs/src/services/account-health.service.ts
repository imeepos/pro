import { Injectable } from '@pro/core';
import { RedisClient } from '@pro/redis';
import { useEntityManager, WeiboAccountEntity, WeiboAccountStatus } from '@pro/entities';

export interface AccountHealthSelection {
  id: number;
  weiboUid: string;
  nickname: string;
  healthScore: number;
  cookies: string;
}

@Injectable()
export class AccountHealthService {
  private readonly healthKey = 'weibo:account:health';
  private readonly maxHealthScore = 100;
  private readonly initialHealthScore = 100;
  private readonly maxSelectionAttempts = 5;

  constructor(
    private readonly redis: RedisClient,
  ) { }

  async getBestHealthAccount(): Promise<AccountHealthSelection | null> {
    for (let attempt = 0; attempt < this.maxSelectionAttempts; attempt++) {
      const picked = await this.redis.zpopmax(this.healthKey);

      if (!picked) {
        await this.initializeAccountHealth();
        continue;
      }

      const accountId = Number.parseInt(picked.member, 10);

      if (!Number.isFinite(accountId)) {
        await this.redis.zrem(this.healthKey, picked.member);
        continue;
      }

      const account = await useEntityManager(async m => {
        return m.findOne(WeiboAccountEntity, {
          where: { id: accountId }
        })
      })

      if (!account) {
        continue;
      }

      if (account.status !== WeiboAccountStatus.ACTIVE) {
        continue;
      }

      if (!account.cookies?.trim()) {
        continue;
      }

      await this.redis.zadd(this.healthKey, picked.score, picked.member);

      return {
        id: account.id,
        weiboUid: account.weiboUid,
        nickname: account.weiboNickname || '',
        healthScore: picked.score,
        cookies: account.cookies,
      };
    }

    return null;
  }

  async deductHealth(accountId: number, amount = 1): Promise<void> {
    if (!Number.isFinite(accountId) || amount <= 0) {
      return;
    }

    const member = accountId.toString();
    const decrement = -Math.abs(amount);

    const newScore = await this.redis.zincrby(
      this.healthKey,
      decrement,
      member
    );

    const clampedScore = Math.max(newScore, 0);

    if (clampedScore !== newScore) {
      await this.redis.zadd(this.healthKey, clampedScore, member);
    }
  }

  async recoverHealth(accountId: number, amount = 1): Promise<void> {
    if (!Number.isFinite(accountId) || amount <= 0) {
      return;
    }

    const member = accountId.toString();
    const increment = Math.abs(amount);

    const newScore = await this.redis.zincrby(
      this.healthKey,
      increment,
      member
    );

    const clampedScore = Math.min(newScore, this.maxHealthScore);

    if (clampedScore !== newScore) {
      await this.redis.zadd(this.healthKey, clampedScore, member);
    }
  }

  async initializeAccountHealth(): Promise<void> {
    const activeAccounts = await useEntityManager(async m => {
      return m.find(WeiboAccountEntity, {
        where: { status: WeiboAccountStatus.ACTIVE },
      })
    })

    if (activeAccounts.length === 0) {
      return;
    }

    const pipeline = this.redis.pipeline();

    for (const account of activeAccounts) {
      pipeline.zadd(
        this.healthKey,
        this.initialHealthScore,
        account.id.toString()
      );
    }

    await pipeline.exec();
  }

  async getHealthScore(accountId: number): Promise<number | null> {
    if (!Number.isFinite(accountId)) {
      return null;
    }

    const member = accountId.toString();
    return await this.redis.zscore(this.healthKey, member);
  }

  async getAllAccountsHealth(): Promise<Array<{ accountId: number; score: number }>> {
    const results = await this.redis.zrevrange(
      this.healthKey,
      0,
      -1,
      true
    );

    const healthData: Array<{ accountId: number; score: number }> = [];

    for (let i = 0; i < results.length; i += 2) {
      const member = results[i];
      const scoreStr = results[i + 1];

      if (member && scoreStr) {
        const accountId = Number.parseInt(member, 10);
        const score = Number.parseFloat(scoreStr);

        if (Number.isFinite(accountId) && Number.isFinite(score)) {
          healthData.push({ accountId, score });
        }
      }
    }

    return healthData;
  }

  async markAccountAsExpired(accountId: number): Promise<void> {
    if (!Number.isFinite(accountId)) {
      console.warn('[AccountHealthService] 无效的 accountId:', accountId);
      return;
    }

    try {
      // 1. 更新数据库账号状态
      await useEntityManager(async m => {
        const account = await m.findOne(WeiboAccountEntity, {
          where: { id: accountId }
        });

        if (!account) {
          console.warn(`[AccountHealthService] 账号不存在: ${accountId}`);
          return;
        }

        account.status = WeiboAccountStatus.SUSPENDED;
        account.lastCheckAt = new Date();

        await m.save(account);

        console.log(`[AccountHealthService] 账号已标记为登录失效: ${accountId} (${account.weiboNickname || account.weiboUid})`);
      });

      // 2. 从 Redis 健康度队列移除
      const member = accountId.toString();
      await this.redis.zrem(this.healthKey, member);

      console.log(`[AccountHealthService] 账号已从健康度队列移除: ${accountId}`);
    } catch (error) {
      console.error(`[AccountHealthService] 标记账号失效失败: ${accountId}`, error);
      throw error;
    }
  }
}
