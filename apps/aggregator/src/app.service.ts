import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@pro/logger-nestjs';
import { DailyAggregatorService } from './services/daily-aggregator.service';
import { WindowAggregatorService } from './services/window-aggregator.service';

@Injectable()
export class AppService {
  constructor(
    private readonly dailyAggregator: DailyAggregatorService,
    private readonly windowAggregator: WindowAggregatorService,
    private readonly logger: Logger,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleDailyRollup() {
    this.logger.log('开始执行日度汇总', 'DailyRollup');
    const startTime = Date.now();

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await this.dailyAggregator.rollupFromHourly(yesterday);

      const duration = Date.now() - startTime;
      this.logger.log('日度汇总完成', { date: yesterday, durationMs: duration });
    } catch (error) {
      this.logger.error('日度汇总失败', { error });
    }
  }

  @Cron('*/5 * * * *')
  async handleWindowUpdate() {
    this.logger.debug('开始更新滑动窗口缓存', 'WindowUpdate');
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'aggregator',
      timestamp: new Date().toISOString(),
    };
  }
}
