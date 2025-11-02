import { Injectable } from '@pro/core';
import { RedisClient } from '@pro/redis';

export interface CrawlStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalPostsCollected: number;
  totalPagesProcessed: number;
  averageResponseTime: number;
  successRate: number;
  lastUpdated: Date;
}

@Injectable()
export class CrawlStatisticsService {
  private readonly statsKey = 'crawl:stats:global';
  private readonly dailyStatsPrefix = 'crawl:stats:daily:';

  constructor(private readonly redis: RedisClient) {}

  async recordRequest(
    success: boolean,
    responseTime: number,
    postsCount = 0,
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `${this.dailyStatsPrefix}${today}`;

    const globalStats = await this.getGlobalStats();
    const dailyStats = await this.getDailyStats(today!);

    globalStats.totalRequests += 1;
    dailyStats.totalRequests += 1;

    if (success) {
      globalStats.successfulRequests += 1;
      globalStats.totalPostsCollected += postsCount;
      globalStats.totalPagesProcessed += 1;
      dailyStats.successfulRequests += 1;
      dailyStats.totalPostsCollected += postsCount;
      dailyStats.totalPagesProcessed += 1;
    } else {
      globalStats.failedRequests += 1;
      dailyStats.failedRequests += 1;
    }

    const total = globalStats.totalRequests;
    const avg = globalStats.averageResponseTime;
    globalStats.averageResponseTime = (avg * (total - 1) + responseTime) / total;
    dailyStats.averageResponseTime = globalStats.averageResponseTime;

    globalStats.lastUpdated = new Date();
    dailyStats.lastUpdated = new Date();

    await this.redis.set(this.statsKey, globalStats);
    await this.redis.setex(dailyKey, 30 * 24 * 60 * 60, dailyStats);
  }

  async getGlobalStats(): Promise<CrawlStats> {
    const data = await this.redis.get<CrawlStats>(this.statsKey);

    if (!data) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalPostsCollected: 0,
        totalPagesProcessed: 0,
        averageResponseTime: 0,
        successRate: 0,
        lastUpdated: new Date(),
      };
    }

    const totalRequests = data.totalRequests || 0;
    const successfulRequests = data.successfulRequests || 0;

    return {
      ...data,
      successRate:
        totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : new Date(),
    };
  }

  async getDailyStats(date: string): Promise<CrawlStats> {
    const key = `${this.dailyStatsPrefix}${date}`;
    const data = await this.redis.get<CrawlStats>(key);

    if (!data) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalPostsCollected: 0,
        totalPagesProcessed: 0,
        averageResponseTime: 0,
        successRate: 0,
        lastUpdated: new Date(),
      };
    }

    const totalRequests = data.totalRequests || 0;
    const successfulRequests = data.successfulRequests || 0;

    return {
      ...data,
      successRate:
        totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : new Date(),
    };
  }

  async resetStats(): Promise<void> {
    await this.redis.del(this.statsKey);
  }
}
