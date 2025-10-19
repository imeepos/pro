import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@pro/logger';
import { HourlyStatsEntity } from '@pro/entities';
import { CacheService } from './cache.service';
import { ConfigService } from '@nestjs/config';

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
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    this.cacheTtl = this.configService.get('CACHE_TTL_HOURLY', 86400);
  }

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
      await this.cacheService.set(cacheKey, existing, this.cacheTtl);
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
    await this.cacheService.set(cacheKey, stats, this.cacheTtl);

    this.logger.log('创建小时统计记录', { keyword, hourTimestamp });
    return stats;
  }

  async updateHourlyStats(data: {
    keyword: string;
    timestamp: Date;
    postCount?: number;
    commentCount?: number;
    sentiment?: { score: number; label: string };
    keywords?: string[];
  }): Promise<void> {
    const { keyword, timestamp, postCount, commentCount, sentiment, keywords } = data;
    const hourTimestamp = this.normalizeToHour(timestamp);

    let stats = await this.hourlyStatsRepo.findOne({
      where: { keyword, hourTimestamp },
    });

    if (!stats) {
      stats = this.hourlyStatsRepo.create({
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

    if (postCount) stats.postCount += postCount;
    if (commentCount) stats.commentCount += commentCount;

    if (sentiment) {
      const totalCount = stats.postCount + (postCount || 0);
      stats.avgSentimentScore =
        (stats.avgSentimentScore * stats.postCount + sentiment.score * (postCount || 1)) /
        totalCount;

      if (sentiment.label === 'positive') stats.positiveCount++;
      else if (sentiment.label === 'neutral') stats.neutralCount++;
      else if (sentiment.label === 'negative') stats.negativeCount++;
    }

    if (keywords && keywords.length > 0) {
      stats.topKeywords = this.mergeKeywords(stats.topKeywords || [], keywords);
    }

    await this.hourlyStatsRepo.save(stats);

    const cacheKey = this.cacheService.buildHourlyKey(keyword, hourTimestamp);
    await this.cacheService.invalidateKey(cacheKey);

    this.logger.debug('小时统计已更新', {
      keyword,
      hourTimestamp,
      postCount: stats.postCount,
    });
  }

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
