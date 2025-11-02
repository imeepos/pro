import { Injectable } from '@nestjs/common';
import { Logger } from '@pro/logger-nestjs';
import { CacheService } from './cache.service';
import { HourlyAggregatorService } from './hourly-aggregator.service';
import { DailyAggregatorService } from './daily-aggregator.service';
import { ConfigService } from '@nestjs/config';

export interface AggregatedMetrics {
  keyword: string;
  windowType: 'last_24h' | 'last_7d';
  postCount: number;
  commentCount: number;
  sentimentTrend: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topKeywords: string[];
  timestamp: Date;
}

export interface RealtimeMetrics {
  keyword: string;
  last1h: {
    postCount: number;
    avgSentimentScore: number;
  };
  last24h: {
    postCount: number;
    sentimentDistribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
  timestamp: Date;
}

@Injectable()
export class WindowAggregatorService {
  private cacheTtl: number;

  constructor(
    private readonly hourlyAggregator: HourlyAggregatorService,
    private readonly dailyAggregator: DailyAggregatorService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    this.cacheTtl = this.configService.get('CACHE_TTL_REALTIME', 300);
  }

  async aggregateWindow(
    keyword: string,
    windowType: 'last_24h' | 'last_7d',
  ): Promise<AggregatedMetrics> {
    const cacheKey = this.cacheService.buildWindowKey(keyword, windowType);
    const cached = await this.cacheService.get<AggregatedMetrics>(cacheKey);

    if (cached) {
      this.logger.debug('滑动窗口缓存命中', { keyword, windowType });
      return cached;
    }

    const now = new Date();
    let metrics: AggregatedMetrics;

    if (windowType === 'last_24h') {
      metrics = await this.aggregateLast24Hours(keyword, now);
    } else {
      metrics = await this.aggregateLast7Days(keyword, now);
    }

    await this.cacheService.set(cacheKey, metrics, 'window');
    this.logger.debug('滑动窗口聚合完成', { keyword, windowType });

    return metrics;
  }

  async getRealtimeMetrics(keyword: string): Promise<RealtimeMetrics> {
    const cacheKey = this.cacheService.buildRealtimeKey(keyword);
    const cached = await this.cacheService.get<RealtimeMetrics>(cacheKey);

    if (cached) {
      this.logger.debug('实时指标缓存命中', { keyword });
      return cached;
    }

    const now = new Date();
    const last1h = new Date(now.getTime() - 60 * 60 * 1000);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const hourlyStats1h = await this.hourlyAggregator.getHourlyStats(
      keyword,
      last1h,
      now,
    );
    const hourlyStats24h = await this.hourlyAggregator.getHourlyStats(
      keyword,
      last24h,
      now,
    );

    const metrics: RealtimeMetrics = {
      keyword,
      last1h: {
        postCount: hourlyStats1h.reduce((sum, stat) => sum + stat.postCount, 0),
        avgSentimentScore:
          hourlyStats1h.length > 0
            ? hourlyStats1h.reduce((sum, stat) => sum + stat.avgSentimentScore, 0) /
              hourlyStats1h.length
            : 0,
      },
      last24h: {
        postCount: hourlyStats24h.reduce((sum, stat) => sum + stat.postCount, 0),
        sentimentDistribution: {
          positive: hourlyStats24h.reduce(
            (sum, stat) => sum + stat.positiveCount,
            0,
          ),
          neutral: hourlyStats24h.reduce(
            (sum, stat) => sum + stat.neutralCount,
            0,
          ),
          negative: hourlyStats24h.reduce(
            (sum, stat) => sum + stat.negativeCount,
            0,
          ),
        },
      },
      timestamp: now,
    };

    await this.cacheService.set(cacheKey, metrics, 'realtime');
    this.logger.debug('实时指标聚合完成', { keyword });

    return metrics;
  }

  private async aggregateLast24Hours(
    keyword: string,
    now: Date,
  ): Promise<AggregatedMetrics> {
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const hourlyStats = await this.hourlyAggregator.getHourlyStats(
      keyword,
      startTime,
      now,
    );

    const allKeywords = hourlyStats
      .flatMap((stat) => stat.topKeywords || [])
      .filter((kw) => kw);

    return {
      keyword,
      windowType: 'last_24h',
      postCount: hourlyStats.reduce((sum, stat) => sum + stat.postCount, 0),
      commentCount: hourlyStats.reduce((sum, stat) => sum + stat.commentCount, 0),
      sentimentTrend: {
        positive: hourlyStats.reduce((sum, stat) => sum + stat.positiveCount, 0),
        neutral: hourlyStats.reduce((sum, stat) => sum + stat.neutralCount, 0),
        negative: hourlyStats.reduce((sum, stat) => sum + stat.negativeCount, 0),
      },
      topKeywords: this.getTopKeywords(allKeywords, 10),
      timestamp: now,
    };
  }

  private async aggregateLast7Days(
    keyword: string,
    now: Date,
  ): Promise<AggregatedMetrics> {
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dailyStats = await this.dailyAggregator.getDailyStats(
      keyword,
      startDate,
      now,
    );

    const allKeywords = dailyStats
      .flatMap((stat) => stat.topKeywords || [])
      .filter((kw) => kw);

    return {
      keyword,
      windowType: 'last_7d',
      postCount: dailyStats.reduce((sum, stat) => sum + stat.totalPostCount, 0),
      commentCount: dailyStats.reduce(
        (sum, stat) => sum + stat.totalCommentCount,
        0,
      ),
      sentimentTrend: {
        positive: dailyStats.reduce(
          (sum, stat) => sum + (stat.sentimentDistribution?.positive || 0),
          0,
        ),
        neutral: dailyStats.reduce(
          (sum, stat) => sum + (stat.sentimentDistribution?.neutral || 0),
          0,
        ),
        negative: dailyStats.reduce(
          (sum, stat) => sum + (stat.sentimentDistribution?.negative || 0),
          0,
        ),
      },
      topKeywords: this.getTopKeywords(allKeywords, 10),
      timestamp: now,
    };
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
