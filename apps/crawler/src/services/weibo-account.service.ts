import { Injectable } from '@pro/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger } from '@pro/logger';
import { RedisClient } from '@pro/redis';
import {
  WeiboAccountEntity,
  WeiboAccountStatus,
} from '@pro/entities';

export interface RequestWithHeaders {
  url?: string;
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
}

export interface InjectCookiesContext {
  taskId: number;
  taskName: string;
}

export interface WeiboAccountSelection {
  id: number;
  weiboUid?: string;
  nickname?: string;
  healthScore: number;
  cookieHeader: string;
}

@Injectable()
export class WeiboAccountService {
  private readonly healthKey = 'weibo:account:health';
  private readonly maxAttempts = 5;

  constructor(
    @InjectRepository(WeiboAccountEntity)
    private readonly accounts: Repository<WeiboAccountEntity>,
    private readonly redis: RedisClient,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(WeiboAccountService.name);
  }

  async injectCookies<T extends RequestWithHeaders>(
    request: T,
    context: InjectCookiesContext,
  ): Promise<WeiboAccountSelection | null> {
    try {
      const selection = await this.selectBestAccount(context);

      if (!selection) {
        return null;
      }

      if (!request.headers) {
        request.headers = {};
      }

      request.headers.cookie = selection.cookieHeader;

      this.logger.debug('已注入微博账号 cookies', {
        taskId: context.taskId,
        taskName: context.taskName,
        accountId: selection.id,
        weiboUid: selection.weiboUid,
        healthScore: selection.healthScore,
      });

      return selection;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);

      this.logger.error('注入微博账号 cookies 失败', {
        taskId: context.taskId,
        taskName: context.taskName,
        error: detail,
      });

      return null;
    }
  }

  async decreaseHealthScore(accountId: number, amount = 1): Promise<void> {
    if (!Number.isFinite(accountId)) {
      return;
    }

    const member = accountId.toString(10);
    const decrement = Math.abs(amount) * -1;
    const updated = await this.redis.zincrby(this.healthKey, decrement, member);
    const clamped = Math.max(updated, 0);

    if (clamped !== updated) {
      await this.redis.zadd(this.healthKey, clamped, member);
    }

    this.logger.debug('微博账号健康度已扣减', {
      accountId,
      deducted: Math.abs(amount),
      updatedScore: clamped,
    });
  }

  private async selectBestAccount(context: InjectCookiesContext): Promise<WeiboAccountSelection | null> {
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      const picked = await this.redis.zpopmax(this.healthKey);

      if (!picked) {
        this.logger.warn('当前没有可用的微博账号', {
          taskId: context.taskId,
          taskName: context.taskName,
          attempt,
        });
        return null;
      }

      const accountId = Number.parseInt(picked.member, 10);

      if (!Number.isFinite(accountId)) {
        this.logger.warn('健康度列表存在无效账号 ID，已移除', {
          member: picked.member,
        });
        await this.redis.zrem(this.healthKey, picked.member);
        continue;
      }

      const account = await this.accounts.findOne({ where: { id: accountId } });

      if (!account) {
        this.logger.warn('健康度列表中的账号不存在，已移除', {
          accountId,
        });
        continue;
      }

      if (account.status !== WeiboAccountStatus.ACTIVE) {
        this.logger.warn('账号状态不可用，跳过使用', {
          accountId,
          status: account.status,
        });
        continue;
      }

      const cookieHeader = this.composeCookieHeader(account.cookies);

      if (!cookieHeader) {
        this.logger.error('账号缺少有效 cookies，跳过并移除', {
          accountId,
        });
        continue;
      }

      await this.redis.zadd(this.healthKey, picked.score, picked.member);

      return {
        id: account.id,
        weiboUid: account.weiboUid,
        nickname: account.weiboNickname,
        healthScore: picked.score,
        cookieHeader,
      };
    }

    this.logger.error('多次尝试后仍未找到可用账号', {
      taskId: context.taskId,
      taskName: context.taskName,
      attempts: this.maxAttempts,
    });

    return null;
  }

  private composeCookieHeader(raw: string | null | undefined): string | null {
    if (!raw || !raw.trim()) {
      return null;
    }

    const trimmed = raw.trim();

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        const fragments = parsed
          .map((entry) => {
            if (!entry) {
              return '';
            }
            const name = typeof entry.name === 'string' ? entry.name.trim() : '';
            const value = typeof entry.value === 'string' ? entry.value.trim() : '';
            if (!name || !value) {
              return '';
            }
            return `${name}=${value}`;
          })
          .filter((fragment) => fragment.length > 0);

        return fragments.length > 0 ? fragments.join('; ') : null;
      }
    } catch {
      // fall through - treat as plain cookie string
    }

    return trimmed.includes('=') ? trimmed : null;
  }
}
