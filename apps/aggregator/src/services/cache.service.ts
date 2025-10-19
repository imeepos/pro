import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClient } from '@pro/redis';
import { Logger } from '@pro/logger';
import { createRedisConfig } from '../config/redis.config';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    const config = createRedisConfig(this.configService);
    this.client = new RedisClient(config);
  }

  async onModuleInit() {
    this.logger.log('Redis 客户端已初始化', 'CacheService');
  }

  async onModuleDestroy() {
    await this.client.close();
    this.logger.log('Redis 连接已关闭', 'CacheService');
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.client.set(key, value, ttl);
    this.logger.debug(`缓存写入: ${key}`, { ttl });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get<T>(key);
    this.logger.debug(`缓存读取: ${key}`, { hit: value !== null });
    return value;
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    for (const key of keys) {
      await this.client.del(key);
    }
    this.logger.log(`缓存失效: ${pattern}`, { count: keys.length });
  }

  async invalidateKey(key: string): Promise<void> {
    await this.client.del(key);
    this.logger.debug(`缓存失效: ${key}`);
  }

  buildHourlyKey(keyword: string, hour: Date): string {
    const hourStr = hour.toISOString().slice(0, 13).replace('T', ' ');
    return `stats:hourly:${keyword}:${hourStr}`;
  }

  buildDailyKey(keyword: string, date: Date): string {
    const dateStr = date.toISOString().slice(0, 10);
    return `stats:daily:${keyword}:${dateStr}`;
  }

  buildRealtimeKey(keyword: string): string {
    return `stats:realtime:${keyword}`;
  }

  buildWindowKey(keyword: string, windowType: 'last_24h' | 'last_7d'): string {
    return `stats:window:${keyword}:${windowType}`;
  }
}
