import { Redis, RedisOptions } from 'ioredis';

export class RedisClient {
  private client: Redis;

  constructor(options: RedisOptions | string) {
    this.client = typeof options === 'string'
      ? new Redis(options)
      : new Redis(options);
  }

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
  async zincrby(key: string, increment: number, member: string): Promise<number> {
    const result = await this.client.zincrby(key, increment, member);
    return parseFloat(result);
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

  // Hash operations
  async hmset(key: string, data: Record<string, any>): Promise<string> {
    return await this.client.hmset(key, data);
  }

  // Expiration operations
  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
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

class RedisPipeline {
  constructor(private pipeline: any) {}

  zincrby(key: string, increment: number, member: string): RedisPipeline {
    this.pipeline.zincrby(key, increment, member);
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

  async exec(): Promise<[Error | null, any][]> {
    return await this.pipeline.exec();
  }
}
