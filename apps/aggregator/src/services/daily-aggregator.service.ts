import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@pro/logger';
import { DailyStatsEntity, HourlyStatsEntity } from '@pro/entities';
import { CacheService } from './cache.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DailyAggregatorService {
  private cacheTtl: number;

  constructor(
    @InjectRepository(DailyStatsEntity)
    private readonly dailyStatsRepo: Repository<DailyStatsEntity>,
    @InjectRepository(HourlyStatsEntity)
    private readonly hourlyStatsRepo: Repository<HourlyStatsEntity>,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    this.cacheTtl = this.configService.get('CACHE_TTL_DAILY', 604800);
  }

  async aggregateDaily(date: Date): Promise<DailyStatsEntity> {
    const normalizedDate = this.normalizeToDay(date);
    const keyword = '';

    const cacheKey = this.cacheService.buildDailyKey(keyword, normalizedDate);
    const cached = await this.cacheService.get<DailyStatsEntity>(cacheKey);

    if (cached) {
      this.logger.debug('日度聚合缓存命中', { date: normalizedDate });
      return cached;
    }

    const existing = await this.dailyStatsRepo.findOne({
      where: { keyword, date: normalizedDate },
    });

    if (existing) {
      await this.cacheService.set(cacheKey, existing, this.cacheTtl);
      return existing;
    }

    const stats = this.dailyStatsRepo.create({
      keyword,
      date: normalizedDate,
      totalPostCount: 0,
      totalCommentCount: 0,
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      activeUserCount: 0,
      topKeywords: [],
      hourlyBreakdown: Array(24).fill(0),
    });

    await this.dailyStatsRepo.save(stats);
    await this.cacheService.set(cacheKey, stats, this.cacheTtl);

    this.logger.log('创建日度统计记录', { date: normalizedDate });
    return stats;
  }

  async rollupFromHourly(date: Date): Promise<void> {
    const normalizedDate = this.normalizeToDay(date);
    const startOfDay = new Date(normalizedDate);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const hourlyStats = await this.hourlyStatsRepo
      .createQueryBuilder('stats')
      .where('stats.hourTimestamp >= :start', { start: startOfDay })
      .andWhere('stats.hourTimestamp < :end', { end: endOfDay })
      .getMany();

    if (hourlyStats.length === 0) {
      this.logger.warn('无小时数据可汇总', { date: normalizedDate });
      return;
    }

    const keywordMap = hourlyStats.reduce((acc, stat) => {
      if (!acc[stat.keyword]) {
        acc[stat.keyword] = [];
      }
      acc[stat.keyword].push(stat);
      return acc;
    }, {} as Record<string, HourlyStatsEntity[]>);

    for (const [keyword, stats] of Object.entries(keywordMap)) {
      await this.rollupKeywordDaily(keyword, normalizedDate, stats);
    }

    this.logger.log('日度汇总完成', {
      date: normalizedDate,
      keywordCount: Object.keys(keywordMap).length,
    });
  }

  private async rollupKeywordDaily(
    keyword: string,
    date: Date,
    hourlyStats: HourlyStatsEntity[],
  ): Promise<void> {
    let dailyStats = await this.dailyStatsRepo.findOne({
      where: { keyword, date },
    });

    if (!dailyStats) {
      dailyStats = this.dailyStatsRepo.create({
        keyword,
        date,
        totalPostCount: 0,
        totalCommentCount: 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        activeUserCount: 0,
        topKeywords: [],
        hourlyBreakdown: Array(24).fill(0),
      });
    }

    dailyStats.totalPostCount = hourlyStats.reduce(
      (sum, stat) => sum + stat.postCount,
      0,
    );
    dailyStats.totalCommentCount = hourlyStats.reduce(
      (sum, stat) => sum + stat.commentCount,
      0,
    );

    dailyStats.sentimentDistribution = {
      positive: hourlyStats.reduce((sum, stat) => sum + stat.positiveCount, 0),
      neutral: hourlyStats.reduce((sum, stat) => sum + stat.neutralCount, 0),
      negative: hourlyStats.reduce((sum, stat) => sum + stat.negativeCount, 0),
    };

    dailyStats.hourlyBreakdown = this.buildHourlyBreakdown(hourlyStats);

    const allKeywords = hourlyStats
      .flatMap((stat) => stat.topKeywords || [])
      .filter((kw) => kw);
    dailyStats.topKeywords = this.getTopKeywords(allKeywords, 10);

    await this.dailyStatsRepo.save(dailyStats);

    const cacheKey = this.cacheService.buildDailyKey(keyword, date);
    await this.cacheService.invalidateKey(cacheKey);

    this.logger.debug('关键词日度统计已更新', {
      keyword,
      date,
      totalPostCount: dailyStats.totalPostCount,
    });
  }

  async getDailyStats(
    keyword: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyStatsEntity[]> {
    return this.dailyStatsRepo
      .createQueryBuilder('stats')
      .where('stats.keyword = :keyword', { keyword })
      .andWhere('stats.date >= :startDate', { startDate })
      .andWhere('stats.date <= :endDate', { endDate })
      .orderBy('stats.date', 'ASC')
      .getMany();
  }

  private normalizeToDay(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private buildHourlyBreakdown(hourlyStats: HourlyStatsEntity[]): number[] {
    const breakdown = Array(24).fill(0);
    for (const stat of hourlyStats) {
      const hour = stat.hourTimestamp.getHours();
      breakdown[hour] = stat.postCount;
    }
    return breakdown;
  }

  private getTopKeywords(keywords: string[], limit: number): string[] {
    const counts = keywords.reduce((acc, kw) => {
      acc[kw] = (acc[kw] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([kw]) => kw);
  }
}
