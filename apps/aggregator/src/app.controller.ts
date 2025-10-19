import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { HourlyAggregatorService } from './services/hourly-aggregator.service';
import { DailyAggregatorService } from './services/daily-aggregator.service';
import { WindowAggregatorService } from './services/window-aggregator.service';
import { MessageIdempotencyService } from './services/message-idempotency.service';
import { AnalysisResultConsumer } from './consumers/analysis-result.consumer';
import { CacheService } from './services/cache.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly hourlyAggregator: HourlyAggregatorService,
    private readonly dailyAggregator: DailyAggregatorService,
    private readonly windowAggregator: WindowAggregatorService,
    private readonly messageIdempotency: MessageIdempotencyService,
    private readonly analysisConsumer: AnalysisResultConsumer,
    private readonly cacheService: CacheService,
  ) {}

  @Get('health')
  health() {
    return this.appService.getHealth();
  }

  @Get('stats/hourly')
  async getHourlyStats(
    @Query('keyword') keyword: string,
    @Query('hours') hours: number = 24,
  ) {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    const stats = await this.hourlyAggregator.getHourlyStats(
      keyword,
      startTime,
      endTime,
    );

    return {
      keyword,
      hours,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats/daily')
  async getDailyStats(
    @Query('keyword') keyword: string,
    @Query('days') days: number = 7,
  ) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const stats = await this.dailyAggregator.getDailyStats(
      keyword,
      startDate,
      endDate,
    );

    return {
      keyword,
      days,
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats/realtime')
  async getRealtimeMetrics(@Query('keyword') keyword: string) {
    const metrics = await this.windowAggregator.getRealtimeMetrics(keyword);

    return {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats/window')
  async getWindowStats(
    @Query('keyword') keyword: string,
    @Query('window') window: 'last_24h' | 'last_7d' = 'last_24h',
  ) {
    const metrics = await this.windowAggregator.aggregateWindow(keyword, window);

    return {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('monitoring/consumer')
  getConsumerStatistics() {
    const consumerStats = this.analysisConsumer.getStatistics();

    return {
      success: true,
      data: {
        consumer: consumerStats,
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  @Get('monitoring/idempotency')
  getIdempotencyMetrics() {
    const idempotencyMetrics = this.messageIdempotency.getMetrics();

    return {
      success: true,
      data: {
        idempotency: idempotencyMetrics,
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  @Get('monitoring/cache')
  getCacheMetrics() {
    const cacheMetrics = this.cacheService.getMetrics();

    return {
      success: true,
      data: {
        cache: cacheMetrics,
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  @Get('monitoring/overview')
  getSystemOverview() {
    const consumerStats = this.analysisConsumer.getStatistics();
    const idempotencyMetrics = this.messageIdempotency.getMetrics();
    const cacheMetrics = this.cacheService.getMetrics();

    return {
      success: true,
      data: {
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString(),
        },
        consumer: consumerStats,
        idempotency: idempotencyMetrics,
        cache: cacheMetrics,
        health: {
          overall: consumerStats.errorRate < 5 && cacheMetrics.hitRate > 80 ? 'healthy' : 'degraded',
          consumerHealth: consumerStats.errorRate < 5 ? 'healthy' : 'unhealthy',
          cacheHealth: cacheMetrics.hitRate > 80 ? 'healthy' : 'poor',
        },
      },
    };
  }
}
