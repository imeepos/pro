import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisClient } from '@pro/redis';
import { WeiboAccountEntity, WeiboAccountStatus } from '@pro/entities';

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
  private readonly logger = new Logger(AccountHealthService.name);

  constructor(
    @InjectRepository(WeiboAccountEntity)
    private readonly accounts: Repository<WeiboAccountEntity>,
    private readonly redis: RedisClient,
  ) {}

  async getBestHealthAccount(): Promise<AccountHealthSelection | null> {
    for (let attempt = 0; attempt < this.maxSelectionAttempts; attempt++) {
      const picked = await this.redis.zpopmax(this.healthKey);

      if (!picked) {
        this.logger.warn('健康度队列为空，尝试初始化账号');
        await this.initializeAccountHealth();
        continue;
      }

      const accountId = Number.parseInt(picked.member, 10);

      if (!Number.isFinite(accountId)) {
        await this.redis.zrem(this.healthKey, picked.member);
        continue;
      }

      const account = await this.accounts.findOne({
        where: { id: accountId }
      });

      if (!account) {
        this.logger.warn('账号不存在', { accountId });
        continue;
      }

      if (account.status !== WeiboAccountStatus.ACTIVE) {
        this.logger.warn('账号状态不可用', {
          accountId,
          status: account.status
        });
        continue;
      }

      if (!account.cookies?.trim()) {
        this.logger.warn('账号cookies为空', { accountId });
        continue;
      }

      await this.redis.zadd(this.healthKey, picked.score, picked.member);

      this.logger.debug('选择最佳健康度账号', {
        accountId: account.id,
        healthScore: picked.score,
        nickname: account.weiboNickname,
      });

      return {
        id: account.id,
        weiboUid: account.weiboUid,
        nickname: account.weiboNickname || '',
        healthScore: picked.score,
        cookies: account.cookies,
      };
    }

    this.logger.error('无法找到可用账号');
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

    this.logger.debug('扣除账号健康度', {
      accountId,
      deducted: Math.abs(amount),
      newScore: clampedScore,
    });
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

    this.logger.debug('恢复账号健康度', {
      accountId,
      recovered: Math.abs(amount),
      newScore: clampedScore,
    });
  }

  async initializeAccountHealth(): Promise<void> {
    const activeAccounts = await this.accounts.find({
      where: { status: WeiboAccountStatus.ACTIVE },
    });

    if (activeAccounts.length === 0) {
      this.logger.warn('没有可用的活跃账号');
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

    this.logger.log('初始化账号健康度完成', {
      accountCount: activeAccounts.length,
      initialScore: this.initialHealthScore,
    });
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
}
