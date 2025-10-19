import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClient, RedisPipeline, redisConfigFactory } from '@pro/redis';
import { Logger } from '@pro/logger';
import { createHash } from 'crypto';

export interface CacheMetrics {
  hits: number;
  misses: number;
  operations: number;
  lastReset: Date;
}

interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl?: number;
}

type CacheLayer = 'realtime' | 'hourly' | 'daily' | 'window' | 'archive';

interface LayerConfig {
  ttl: number;
  prefix: string;
  description: string;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClient;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    operations: 0,
    lastReset: new Date(),
  };

  private readonly layers: Record<CacheLayer, LayerConfig> = {
    realtime: { ttl: 300, prefix: 'rt', description: '实时数据层' },
    hourly: { ttl: 7200, prefix: 'hr', description: '小时数据层' },
    daily: { ttl: 86400, prefix: 'dy', description: '日数据层' },
    window: { ttl: 3600, prefix: 'wd', description: '窗口数据层' },
    archive: { ttl: 2592000, prefix: 'ar', description: '归档数据层' },
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    const config = redisConfigFactory(this.configService);
    this.client = new RedisClient(config);
  }

  async onModuleInit() {
    await this.ensureConnection();
    this.logger.log('缓存服务已启动', 'CacheService');
  }

  async onModuleDestroy() {
    await this.gracefulShutdown();
  }

  private async ensureConnection(): Promise<void> {
    try {
      await this.client.set('health:check', '1', 5);
      this.logger.log('缓存连接健康检查通过', 'CacheService');
    } catch (error) {
      this.logger.error('缓存连接失败', error, 'CacheService');
      throw error;
    }
  }

  private async gracefulShutdown(): Promise<void> {
    try {
      await this.client.close();
      this.logger.log(`缓存服务优雅关闭 | 命中率: ${this.getHitRate()}%`, 'CacheService');
    } catch (error) {
      this.logger.error('缓存关闭异常', error, 'CacheService');
    }
  }

  private createSecureKey(...segments: string[]): string {
    const normalized = segments.map(s => String(s).replace(/[^a-zA-Z0-9\-_]/g, '_'));
    const raw = normalized.join(':');
    const hash = createHash('sha256').update(raw).digest('hex').slice(0, 8);
    return `${raw}:${hash}`;
  }

  private recordOperation(hit: boolean): void {
    this.metrics.operations++;
    if (hit) {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }
  }

  private getLayerTtl(layer: CacheLayer): number {
    return this.layers[layer].ttl;
  }

  private async safeOperation<T>(
    operation: () => Promise<T>,
    fallback: T,
    context: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.warn(`缓存操作降级: ${context}`, { error: error.message });
      return fallback;
    }
  }

  async set<T>(
    key: string,
    value: T,
    layer: CacheLayer = 'realtime',
  ): Promise<boolean> {
    return this.safeOperation(
      async () => {
        const ttl = this.getLayerTtl(layer);
        const entry: CacheEntry<T> = {
          value,
          timestamp: Date.now(),
          ttl,
        };

        await this.client.set(key, entry, ttl);
        this.recordOperation(false);
        this.logger.debug(`缓存写入: ${this.layers[layer].description}`, { key, ttl });
        return true;
      },
      false,
      `set:${key}`,
    );
  }

  async get<T>(key: string): Promise<T | null> {
    return this.safeOperation(
      async () => {
        const entry = await this.client.get<CacheEntry<T>>(key);
        const hit = entry !== null;
        this.recordOperation(hit);

        if (!hit) {
          this.logger.debug('缓存未命中', { key });
          return null;
        }

        this.logger.debug('缓存命中', {
          key,
          age: Date.now() - entry.timestamp,
        });

        return entry.value;
      },
      null,
      `get:${key}`,
    );
  }

  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    return this.safeOperation(
      async () => {
        const pipeline: RedisPipeline = this.client.pipeline();
        keys.forEach(key => pipeline.get(key));

        const results = await pipeline.exec();
        const values = results.map(([error, value]) => {
          if (error || !value) {
            this.recordOperation(false);
            return null;
          }

          try {
            const entry = JSON.parse(value) as CacheEntry<T>;
            this.recordOperation(true);
            return entry.value;
          } catch {
            this.recordOperation(false);
            return null;
          }
        });

        this.logger.debug('批量缓存读取', {
          keys: keys.length,
          hits: values.filter(v => v !== null).length,
        });

        return values;
      },
      new Array(keys.length).fill(null),
      `mget:${keys.length}keys`,
    );
  }

  async mset<T>(
    entries: Array<{ key: string; value: T; layer?: CacheLayer }>,
  ): Promise<boolean> {
    return this.safeOperation(
      async () => {
        const pipeline: RedisPipeline = this.client.pipeline();
        const timestamp = Date.now();

        entries.forEach(({ key, value, layer = 'realtime' }) => {
          const ttl = this.getLayerTtl(layer);
          const entry: CacheEntry<T> = { value, timestamp, ttl };
          pipeline.set(key, JSON.stringify(entry));
          pipeline.expire(key, ttl);
        });

        await pipeline.exec();
        this.logger.debug('批量缓存写入', { count: entries.length });
        return true;
      },
      false,
      `mset:${entries.length}entries`,
    );
  }

  async exists(key: string): Promise<boolean> {
    return this.safeOperation(
      async () => this.client.exists(key),
      false,
      `exists:${key}`,
    );
  }

  async invalidate(pattern: string): Promise<number> {
    return this.safeOperation(
      async () => {
        const keys = await this.client.keys(pattern);
        if (keys.length === 0) return 0;

        const pipeline: RedisPipeline = this.client.pipeline();
        keys.forEach(key => pipeline.del(key));
        await pipeline.exec();

        this.logger.log('缓存批量失效', { pattern, count: keys.length });
        return keys.length;
      },
      0,
      `invalidate:${pattern}`,
    );
  }

  async invalidateKey(key: string): Promise<boolean> {
    return this.safeOperation(
      async () => {
        await this.client.del(key);
        this.logger.debug('缓存键失效', { key });
        return true;
      },
      false,
      `invalidateKey:${key}`,
    );
  }

  async warmup<T>(
    entries: Array<{ key: string; value: T; layer?: CacheLayer }>,
  ): Promise<void> {
    await this.mset(entries);
    this.logger.log('缓存预热完成', { count: entries.length });
  }

  getMetrics(): CacheMetrics & { hitRate: number; uptime: number } {
    return {
      ...this.metrics,
      hitRate: this.getHitRate(),
      uptime: Date.now() - this.metrics.lastReset.getTime(),
    };
  }

  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      operations: 0,
      lastReset: new Date(),
    };
    this.logger.log('缓存指标已重置', 'CacheService');
  }

  private getHitRate(): number {
    const { hits, operations } = this.metrics;
    return operations > 0 ? Math.round((hits / operations) * 100) : 0;
  }

  buildRealtimeKey(keyword: string): string {
    return this.createSecureKey('stats', 'realtime', keyword);
  }

  buildHourlyKey(keyword: string, hour: Date): string {
    const hourStr = hour.toISOString().slice(0, 13);
    return this.createSecureKey('stats', 'hourly', keyword, hourStr);
  }

  buildDailyKey(keyword: string, date: Date): string {
    const dateStr = date.toISOString().slice(0, 10);
    return this.createSecureKey('stats', 'daily', keyword, dateStr);
  }

  buildWindowKey(keyword: string, windowType: 'last_24h' | 'last_7d'): string {
    return this.createSecureKey('stats', 'window', keyword, windowType);
  }

  buildArchiveKey(keyword: string, month: Date): string {
    const monthStr = month.toISOString().slice(0, 7);
    return this.createSecureKey('stats', 'archive', keyword, monthStr);
  }
}
