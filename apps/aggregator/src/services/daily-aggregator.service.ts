import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@pro/logger';
import { DailyStatsEntity, HourlyStatsEntity } from '@pro/entities';
import { CacheService } from './cache.service';
import { ConfigService } from '@nestjs/config';

interface AggregationConfig {
  readonly HOURS_PER_DAY: 24;
  readonly TOP_KEYWORDS_LIMIT: 10;
  readonly DEFAULT_CACHE_TTL: 604800;
}

interface AggregatedMetrics {
  totalPostCount: number;
  totalCommentCount: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  hourlyBreakdown: number[];
  topKeywords: string[];
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

@Injectable()
export class DailyAggregatorService {
  private readonly config: AggregationConfig = {
    HOURS_PER_DAY: 24,
    TOP_KEYWORDS_LIMIT: 10,
    DEFAULT_CACHE_TTL: 604800,
  };

  private readonly cacheTtl: number;

  constructor(
    @InjectRepository(DailyStatsEntity)
    private readonly dailyStatsRepo: Repository<DailyStatsEntity>,
    @InjectRepository(HourlyStatsEntity)
    private readonly hourlyStatsRepo: Repository<HourlyStatsEntity>,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    this.cacheTtl = this.configService.get(
      'CACHE_TTL_DAILY',
      this.config.DEFAULT_CACHE_TTL,
    );
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

    const stats = this.createEmptyDailyStats(keyword, normalizedDate);
    await this.dailyStatsRepo.save(stats);
    await this.cacheService.set(cacheKey, stats, this.cacheTtl);

    this.logger.log('创建日度统计记录', { date: normalizedDate });
    return stats;
  }

  async rollupFromHourly(date: Date): Promise<void> {
    const normalizedDate = this.normalizeToDay(date);
    const dateRange = this.createDateRange(normalizedDate);

    try {
      const hourlyStats = await this.fetchHourlyStatsForDate(dateRange);

      if (hourlyStats.length === 0) {
        this.logger.log('当日无小时数据需要汇总', { date: normalizedDate });
        return;
      }

      const keywordGroups = this.groupStatsByKeyword(hourlyStats);
      const processedKeywords = await this.processKeywordGroups(
        keywordGroups,
        normalizedDate,
      );

      this.logger.log('日度汇总优雅完成', {
        date: normalizedDate,
        keywordCount: processedKeywords,
        totalStats: hourlyStats.length,
      });
    } catch (error) {
      this.logger.error('日度汇总遭遇困境', {
        date: normalizedDate,
        error: error.message,
      });
      throw error;
    }
  }

  private async rollupKeywordDaily(
    keyword: string,
    date: Date,
    hourlyStats: HourlyStatsEntity[],
  ): Promise<void> {
    const validationResult = this.validateHourlyData(hourlyStats);
    if (!validationResult.isValid) {
      this.logger.warn('小时数据验证失败', {
        keyword,
        date,
        error: validationResult.error,
      });
      return;
    }

    let dailyStats = await this.dailyStatsRepo.findOne({
      where: { keyword, date },
    });

    if (!dailyStats) {
      dailyStats = this.createEmptyDailyStats(keyword, date);
    }

    const aggregatedMetrics = this.aggregateHourlyMetrics(hourlyStats);
    this.applyAggregatedMetrics(dailyStats, aggregatedMetrics);

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

  private createEmptyDailyStats(
    keyword: string,
    date: Date,
  ): DailyStatsEntity {
    return this.dailyStatsRepo.create({
      keyword,
      date,
      totalPostCount: 0,
      totalCommentCount: 0,
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      activeUserCount: 0,
      topKeywords: [],
      hourlyBreakdown: Array(this.config.HOURS_PER_DAY).fill(0),
    });
  }

  private validateHourlyData(
    hourlyStats: HourlyStatsEntity[],
  ): ValidationResult {
    if (!Array.isArray(hourlyStats)) {
      return { isValid: false, error: '小时数据不是数组' };
    }

    if (hourlyStats.length === 0) {
      return { isValid: false, error: '小时数据为空' };
    }

    for (const stat of hourlyStats) {
      if (!stat.hourTimestamp || stat.postCount === undefined) {
        return { isValid: false, error: '缺少必要字段' };
      }
    }

    return { isValid: true };
  }

  private aggregateHourlyMetrics(
    hourlyStats: HourlyStatsEntity[],
  ): AggregatedMetrics {
    const initialMetrics: AggregatedMetrics = {
      totalPostCount: 0,
      totalCommentCount: 0,
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      hourlyBreakdown: Array(this.config.HOURS_PER_DAY).fill(0),
      topKeywords: [],
    };

    const keywordCounts = new Map<string, number>();

    const aggregated = hourlyStats.reduce((metrics, stat) => {
      metrics.totalPostCount += stat.postCount || 0;
      metrics.totalCommentCount += stat.commentCount || 0;

      metrics.sentimentDistribution.positive += stat.positiveCount || 0;
      metrics.sentimentDistribution.neutral += stat.neutralCount || 0;
      metrics.sentimentDistribution.negative += stat.negativeCount || 0;

      const hour = stat.hourTimestamp.getHours();
      if (hour >= 0 && hour < this.config.HOURS_PER_DAY) {
        metrics.hourlyBreakdown[hour] += stat.postCount || 0;
      }

      if (stat.topKeywords) {
        stat.topKeywords.forEach((keyword) => {
          if (keyword) {
            keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
          }
        });
      }

      return metrics;
    }, initialMetrics);

    aggregated.topKeywords = this.extractTopKeywords(
      keywordCounts,
      this.config.TOP_KEYWORDS_LIMIT,
    );

    return aggregated;
  }

  private applyAggregatedMetrics(
    dailyStats: DailyStatsEntity,
    metrics: AggregatedMetrics,
  ): void {
    dailyStats.totalPostCount = metrics.totalPostCount;
    dailyStats.totalCommentCount = metrics.totalCommentCount;
    dailyStats.sentimentDistribution = metrics.sentimentDistribution;
    dailyStats.hourlyBreakdown = metrics.hourlyBreakdown;
    dailyStats.topKeywords = metrics.topKeywords;
  }

  private extractTopKeywords(
    keywordCounts: Map<string, number>,
    limit: number,
  ): string[] {
    return Array.from(keywordCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([keyword]) => keyword);
  }

  private createDateRange(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private async fetchHourlyStatsForDate({
    start,
    end,
  }: {
    start: Date;
    end: Date;
  }): Promise<HourlyStatsEntity[]> {
    return this.hourlyStatsRepo
      .createQueryBuilder('stats')
      .where('stats.hourTimestamp >= :start', { start })
      .andWhere('stats.hourTimestamp < :end', { end })
      .getMany();
  }

  private groupStatsByKeyword(
    hourlyStats: HourlyStatsEntity[],
  ): Map<string, HourlyStatsEntity[]> {
    return hourlyStats.reduce((groups, stat) => {
      const keyword = stat.keyword || '';
      if (!groups.has(keyword)) {
        groups.set(keyword, []);
      }
      groups.get(keyword)!.push(stat);
      return groups;
    }, new Map<string, HourlyStatsEntity[]>());
  }

  private async processKeywordGroups(
    keywordGroups: Map<string, HourlyStatsEntity[]>,
    date: Date,
  ): Promise<number> {
    let processedCount = 0;

    for (const [keyword, stats] of keywordGroups) {
      try {
        await this.rollupKeywordDaily(keyword, date, stats);
        processedCount++;
      } catch (error) {
        this.logger.warn('关键词聚合遇阻', {
          keyword,
          date,
          error: error.message,
        });
      }
    }

    return processedCount;
  }
}
