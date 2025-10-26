import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    private readonly logger = new Logger(WeiboAccountService.name);

    constructor(
        @InjectRepository(WeiboAccountEntity)
        private readonly accounts: Repository<WeiboAccountEntity>,
        private readonly redis: RedisClient,
    ) {}

    async injectCookies<T extends RequestWithHeaders>(
        request: T
    ): Promise<WeiboAccountSelection | null> {
        try {
            const selection = await this.selectBestAccount();

            if (!selection) {
                return null;
            }

            if (!request.headers) {
                request.headers = {};
            }
            request.headers.cookie = selection.cookieHeader;
            return selection;
        } catch (error) {
            this.logger.error('账号注入失败', { error });
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

    private async selectBestAccount(): Promise<WeiboAccountSelection | null> {
        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            const picked = await this.redis.zpopmax(this.healthKey);
            if (!picked) {
                return null;
            }

            const accountId = Number.parseInt(picked.member, 10);

            if (!Number.isFinite(accountId)) {
                await this.redis.zrem(this.healthKey, picked.member);
                continue;
            }

            const account = await this.accounts.findOne({ where: { id: accountId } });

            if (!account) {
                continue;
            }

            if (account.status !== WeiboAccountStatus.ACTIVE) {
                continue;
            }

            const cookieHeader = this.composeCookieHeader(account.cookies);

            if (!cookieHeader) {
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
