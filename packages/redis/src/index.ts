import { Inject, Injectable } from '@pro/core';
import { Redis, ChainableCommander } from 'ioredis';

export class RedisPipeline {
  constructor(private pipeline: ChainableCommander) { }

  get(key: string): RedisPipeline {
    this.pipeline.get(key);
    return this;
  }

  set(key: string, value: string): RedisPipeline {
    this.pipeline.set(key, value);
    return this;
  }

  del(key: string): RedisPipeline {
    this.pipeline.del(key);
    return this;
  }

  zincrby(key: string, increment: number, member: string): RedisPipeline {
    this.pipeline.zincrby(key, increment, member);
    return this;
  }

  zadd(key: string, score: number, member: string): RedisPipeline {
    this.pipeline.zadd(key, score, member);
    return this;
  }

  expire(key: string, seconds: number): RedisPipeline {
    this.pipeline.expire(key, seconds);
    return this;
  }

  hmset(key: string, data: Record<string, any>): RedisPipeline {
    this.pipeline.hmset(key, data);
    return this;
  }

  hset(key: string, field: string, value: any): RedisPipeline {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    this.pipeline.hset(key, field, serialized);
    return this;
  }

  async exec(): Promise<[Error | null, any][] | null> {
    return await this.pipeline.exec();
  }
}


@Injectable({
  useFactory: () => {
    return new RedisClient(new Redis(redisConfigFactory()))
  },
  deps: []
})
export class RedisClient {
  constructor(private client: Redis) { }

  async get<T = string>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl) {
      await this.client.setex(key, ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async setex(key: string, seconds: number, value: any): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await this.client.setex(key, seconds, serialized);
  }

  async setnx(key: string, value: any): Promise<number> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return await this.client.setnx(key, serialized);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async close(): Promise<void> {
    await this.client.quit();
  }

  // Sorted Set operations
  async zadd(key: string, score: number, member: string): Promise<number> {
    return await this.client.zadd(key, score, member);
  }

  async zincrby(key: string, increment: number, member: string): Promise<number> {
    const result = await this.client.zincrby(key, increment, member);
    return parseFloat(result);
  }

  async zscore(key: string, member: string): Promise<number | null> {
    const result = await this.client.zscore(key, member);
    if (result === null || result === undefined) {
      return null;
    }
    const parsed = parseFloat(result);
    return Number.isNaN(parsed) ? null : parsed;
  }

  async zrangebyscore(
    key: string,
    min: number,
    max: number,
    withScores?: boolean
  ): Promise<string[]> {
    try {
      if (withScores) {
        return await this.client.zrangebyscore(key, min, max, 'WITHSCORES');
      } else {
        return await this.client.zrangebyscore(key, min, max);
      }
    } catch (error) {
      return [];
    }
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    return await this.client.zremrangebyscore(key, min, max);
  }

  async zrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]> {
    try {
      if (withScores) {
        return await this.client.zrange(key, start, stop, 'WITHSCORES');
      } else {
        return await this.client.zrange(key, start, stop);
      }
    } catch (error) {
      return [];
    }
  }

  async zrevrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]> {
    try {
      if (withScores) {
        return await this.client.zrevrange(key, start, stop, 'WITHSCORES');
      } else {
        return await this.client.zrevrange(key, start, stop);
      }
    } catch (error) {
      return [];
    }
  }

  async zcard(key: string): Promise<number> {
    return await this.client.zcard(key);
  }

  async zpopmax(key: string): Promise<{ member: string; score: number } | null> {
    const result = await this.client.zpopmax(key);
    if (!Array.isArray(result) || result.length < 2) {
      return null;
    }

    const [member, score] = result;
    const numericScore = typeof score === 'number' ? score : Number(score);
    return {
      member: String(member),
      score: Number.isFinite(numericScore) ? numericScore : 0,
    };
  }

  async zrem(key: string, member: string): Promise<number> {
    return await this.client.zrem(key, member);
  }

  // Hash operations
  async hmset(key: string, data: Record<string, any>): Promise<string> {
    return await this.client.hmset(key, data);
  }

  async hset(key: string, field: string, value: any): Promise<number> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return await this.client.hset(key, field, serialized);
  }

  async hget<T = string>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hget(key, field);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return await this.client.hdel(key, ...fields);
  }

  // Expiration operations
  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    return await this.client.sadd(key, ...members);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return await this.client.srem(key, ...members);
  }

  async scard(key: string): Promise<number> {
    return await this.client.scard(key);
  }

  async smembers(key: string): Promise<string[]> {
    return await this.client.smembers(key);
  }

  // List operations
  async lpush(key: string, ...elements: string[]): Promise<number> {
    return await this.client.lpush(key, ...elements);
  }

  // Key operations
  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  // Pipeline operations
  pipeline(): RedisPipeline {
    return new RedisPipeline(this.client.pipeline());
  }
}

export const redisConfigFactory = (): string => {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return redisUrl;
  }
  throw new Error(`REDIS_URL NOT FOUND`)
};
