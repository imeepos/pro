import { Injectable } from '@pro/core';
import { RedisClient } from '@pro/redis';

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  current: number;
}

@Injectable()
export class RateLimiterService {
  constructor(private readonly redis: RedisClient) {}

  async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      await this.redis.zremrangebyscore(redisKey, 0, windowStart);

      const current = await this.redis.zcard(redisKey);

      if (current >= config.limit) {
        const oldest = await this.redis.zrange(redisKey, 0, 0, true);
        const resetAt =
          oldest.length > 0
            ? new Date(parseInt(oldest[1]!) + config.windowMs)
            : new Date(now + config.windowMs);

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          current,
        };
      }

      await this.redis.zadd(redisKey, now, `${now}-${Math.random()}`);

      await this.redis.expire(redisKey, Math.ceil(config.windowMs / 1000) * 2);

      return {
        allowed: true,
        remaining: config.limit - current - 1,
        resetAt: new Date(now + config.windowMs),
        current: current + 1,
      };
    } catch (error) {
      return {
        allowed: true,
        remaining: config.limit,
        resetAt: new Date(now + config.windowMs),
        current: 0,
      };
    }
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`ratelimit:${key}`);
  }

  async getStatus(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    await this.redis.zremrangebyscore(redisKey, 0, windowStart);
    const current = await this.redis.zcard(redisKey);

    return {
      allowed: current < config.limit,
      remaining: Math.max(0, config.limit - current),
      resetAt: new Date(now + config.windowMs),
      current,
    };
  }
}
