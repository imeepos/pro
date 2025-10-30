import { Inject, Injectable } from '@pro/core';
import { RedisClient } from '@pro/redis';
import {
    useEntityManager,
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

    constructor(
        @Inject(RedisClient) private readonly redis: RedisClient,
    ) { }

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
            request.headers.Cookie = selection.cookieHeader;
            request.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
            return selection;
        } catch (error) {
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

            const account = await useEntityManager(async m => {
                return m.findOne(WeiboAccountEntity, {
                    where: { id: accountId }
                })
            })

            if (!account) {
                await this.redis.zrem(this.healthKey, picked.member);
                continue;
            }

            if (account.status !== WeiboAccountStatus.ACTIVE) {
                await this.redis.zrem(this.healthKey, picked.member);
                continue;
            }

            const cookieHeader = this.composeCookieHeader(account.cookies);

            if (!cookieHeader) {
                await this.redis.zrem(this.healthKey, picked.member);
                continue;
            }

            const newScore = Math.max(0, picked.score - 1);
            await this.redis.zadd(this.healthKey, newScore, picked.member);

            return {
                id: account.id,
                weiboUid: account.weiboUid,
                nickname: account.weiboNickname,
                healthScore: newScore,
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
