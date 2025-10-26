import { Injectable } from '@nestjs/common';
import { RedisClient } from '@pro/redis';
import { PinoLogger } from '@pro/logger';

export interface LockOptions {
  ttl?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

@Injectable()
export class DistributedLockService {
  private readonly defaultTTL = 30;
  private readonly defaultRetryAttempts = 3;
  private readonly defaultRetryDelay = 100;
  private readonly lockPrefix = 'workflow:lock:';

  constructor(
    private readonly redis: RedisClient,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(DistributedLockService.name);
  }

  async acquireLock(
    key: string,
    options: LockOptions = {}
  ): Promise<boolean> {
    const {
      ttl = this.defaultTTL,
      retryAttempts = this.defaultRetryAttempts,
      retryDelay = this.defaultRetryDelay,
    } = options;

    const lockKey = this.lockPrefix + key;
    const lockValue = this.generateLockValue();

    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      const acquired = await this.redis.setnx(lockKey, lockValue);

      if (acquired === 1) {
        await this.redis.expire(lockKey, ttl);

        this.logger.debug('获取分布式锁成功', {
          key,
          ttl,
          attempt: attempt + 1,
        });

        return true;
      }

      if (attempt < retryAttempts - 1) {
        await this.sleep(retryDelay * Math.pow(2, attempt));
      }
    }

    this.logger.warn('获取分布式锁失败', {
      key,
      retryAttempts,
    });

    return false;
  }

  async releaseLock(key: string): Promise<void> {
    const lockKey = this.lockPrefix + key;
    await this.redis.del(lockKey);

    this.logger.debug('释放分布式锁', { key });
  }

  async extendLock(key: string, ttl: number): Promise<boolean> {
    const lockKey = this.lockPrefix + key;
    const exists = await this.redis.exists(lockKey);

    if (!exists) {
      this.logger.warn('锁不存在，无法延长', { key });
      return false;
    }

    const result = await this.redis.expire(lockKey, ttl);

    if (result === 1) {
      this.logger.debug('延长锁TTL成功', { key, ttl });
      return true;
    }

    return false;
  }

  async withLock<T>(
    key: string,
    callback: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T | null> {
    const acquired = await this.acquireLock(key, options);

    if (!acquired) {
      this.logger.warn('无法获取锁，跳过执行', { key });
      return null;
    }

    try {
      return await callback();
    } finally {
      await this.releaseLock(key);
    }
  }

  async isLocked(key: string): Promise<boolean> {
    const lockKey = this.lockPrefix + key;
    return await this.redis.exists(lockKey);
  }

  async getLockTTL(key: string): Promise<number> {
    const lockKey = this.lockPrefix + key;
    return await this.redis.ttl(lockKey);
  }

  private generateLockValue(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
