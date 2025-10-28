import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@pro/logger-nestjs';
import { HourlyStatsEntity } from '@pro/entities';
import { CacheService } from './cache.service';
import { TransactionService, TransactionContext } from './transaction.service';
import { Transactional, CriticalTransaction } from '../decorators/transactional.decorator';
import { ConfigService } from '@nestjs/config';
import {
  PerformanceMonitor,
  DatabaseMonitor,
  BusinessMonitor,
  CacheMonitor,
} from '../decorators/performance-monitor.decorator';

export interface TimeWindow {
  keyword: string;
  startTime: Date;
  endTime: Date;
}

@Injectable()
export class HourlyAggregatorService {
  private cacheTtl: number;

  constructor(
    @InjectRepository(HourlyStatsEntity)
    private readonly hourlyStatsRepo: Repository<HourlyStatsEntity>,
    private readonly cacheService: CacheService,
    private readonly transactionService: TransactionService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    this.cacheTtl = this.configService.get('CACHE_TTL_HOURLY', 86400);
  }

  @BusinessMonitor('hourly_aggregation')
  async aggregateHourly(timeWindow: TimeWindow): Promise<HourlyStatsEntity> {
    const { keyword, startTime } = timeWindow;
    const hourTimestamp = this.normalizeToHour(startTime);

    const cacheKey = this.cacheService.buildHourlyKey(keyword, hourTimestamp);
    const cached = await this.cacheService.get<HourlyStatsEntity>(cacheKey);

    if (cached) {
      this.logger.debug('小时聚合缓存命中', { keyword, hourTimestamp });
      return cached;
    }

    const existing = await this.hourlyStatsRepo.findOne({
      where: { keyword, hourTimestamp },
    });

    if (existing) {
      await this.cacheService.set(cacheKey, existing, 'hourly');
      return existing;
    }

    const stats = this.hourlyStatsRepo.create({
      keyword,
      hourTimestamp,
      postCount: 0,
      commentCount: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      avgSentimentScore: 0.0,
      topKeywords: [],
    });

    await this.hourlyStatsRepo.save(stats);
    await this.cacheService.set(cacheKey, stats, 'hourly');

    this.logger.log('创建小时统计记录', { keyword, hourTimestamp });
    return stats;
  }

  @CriticalTransaction({
    description: '小时统计数据原子更新',
  })
  async updateHourlyStats(data: {
    keyword: string;
    timestamp: Date;
    postCount?: number;
    commentCount?: number;
    sentiment?: { score: number; label: string };
    keywords?: string[];
  }): Promise<void> {
    const result = await this.transactionService.executeInTransaction(
      async (context: TransactionContext) => {
        return this.updateHourlyStatsWithinTransaction(data, context);
      },
      {
        description: '小时统计更新事务',
        isolationLevel: 'READ COMMITTED',
        retryOnDeadlock: true,
        maxRetries: 3,
      }
    );

    if (!result.success) {
      this.logger.error('小时统计更新失败', {
        data,
        error: result.error?.message,
        attempts: result.attempts,
      });
      throw result.error;
    }

    this.logger.debug('小时统计已更新', {
      keyword: data.keyword,
      hourTimestamp: this.normalizeToHour(data.timestamp),
      attempts: result.attempts,
      duration: result.duration,
    });
  }

  private async updateHourlyStatsWithinTransaction(
    data: {
      keyword: string;
      timestamp: Date;
      postCount?: number;
      commentCount?: number;
      sentiment?: { score: number; label: string };
      keywords?: string[];
    },
    context: TransactionContext,
  ): Promise<void> {
    const { keyword, timestamp, postCount, commentCount, sentiment, keywords } = data;
    const hourTimestamp = this.normalizeToHour(timestamp);

    let stats = await context.findOne(HourlyStatsEntity, {
      where: { keyword, hourTimestamp },
    });

    if (!stats) {
      stats = context.create(HourlyStatsEntity, {
        keyword,
        hourTimestamp,
        postCount: 0,
        commentCount: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
        avgSentimentScore: 0.0,
        topKeywords: [],
      });
    }

    this.updateCounts(stats, { postCount, commentCount });

    if (sentiment) {
      this.updateSentimentMetrics(stats, sentiment, postCount);
    }

    if (keywords?.length) {
      stats.topKeywords = this.mergeKeywords(stats.topKeywords || [], keywords);
    }

    await context.save(stats);

    await this.invalidateCache(keyword, hourTimestamp);
  }

  @DatabaseMonitor('query_hourly_stats')
  async getHourlyStats(
    keyword: string,
    startTime: Date,
    endTime: Date,
  ): Promise<HourlyStatsEntity[]> {
    return this.hourlyStatsRepo
      .createQueryBuilder('stats')
      .where('stats.keyword = :keyword', { keyword })
      .andWhere('stats.hourTimestamp >= :startTime', { startTime })
      .andWhere('stats.hourTimestamp <= :endTime', { endTime })
      .orderBy('stats.hourTimestamp', 'ASC')
      .getMany();
  }

  private normalizeToHour(date: Date): Date {
    const normalized = new Date(date);
    normalized.setMinutes(0, 0, 0);
    return normalized;
  }

  private updateCounts(
    stats: HourlyStatsEntity,
    counts: { postCount?: number; commentCount?: number },
  ): void {
    if (counts.postCount) stats.postCount += counts.postCount;
    if (counts.commentCount) stats.commentCount += counts.commentCount;
  }

  private updateSentimentMetrics(
    stats: HourlyStatsEntity,
    sentiment: { score: number; label: string },
    postIncrement?: number,
  ): void {
    const increment = postIncrement || 1;
    const previousPostCount = stats.postCount - (postIncrement || 0);

    if (previousPostCount <= 0) {
      stats.avgSentimentScore = sentiment.score;
    } else {
      const totalWeight = previousPostCount + increment;
      stats.avgSentimentScore = this.calculateWeightedAverage(
        stats.avgSentimentScore,
        previousPostCount,
        sentiment.score,
        increment,
        totalWeight,
      );
    }

    this.incrementSentimentCount(stats, sentiment.label);
  }

  private calculateWeightedAverage(
    currentAvg: number,
    currentWeight: number,
    newValue: number,
    newWeight: number,
    totalWeight: number,
  ): number {
    if (totalWeight === 0) return 0;

    return (currentAvg * currentWeight + newValue * newWeight) / totalWeight;
  }

  private incrementSentimentCount(
    stats: HourlyStatsEntity,
    label: string,
  ): void {
    switch (label) {
      case 'positive':
        stats.positiveCount++;
        break;
      case 'neutral':
        stats.neutralCount++;
        break;
      case 'negative':
        stats.negativeCount++;
        break;
    }
  }

  private async invalidateCache(keyword: string, hourTimestamp: Date): Promise<void> {
    const cacheKey = this.cacheService.buildHourlyKey(keyword, hourTimestamp);
    await this.cacheService.invalidateKey(cacheKey);
  }

  private mergeKeywords(existing: string[], newKeywords: string[]): string[] {
    const merged = [...existing, ...newKeywords];
    const counts = merged.reduce((acc, kw) => {
      acc[kw] = (acc[kw] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([kw]) => kw);
  }
}
