import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { HourlyAggregatorService } from './services/hourly-aggregator.service';
import { DailyAggregatorService } from './services/daily-aggregator.service';
import { WindowAggregatorService } from './services/window-aggregator.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly hourlyAggregator: HourlyAggregatorService,
    private readonly dailyAggregator: DailyAggregatorService,
    private readonly windowAggregator: WindowAggregatorService,
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
}
