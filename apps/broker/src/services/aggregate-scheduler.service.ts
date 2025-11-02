import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PinoLogger } from '@pro/logger-nestjs';
import { RabbitMQConfigService } from '../rabbitmq/rabbitmq-config.service';
import {
  AggregateTaskEvent,
  TimeWindowType,
  AggregateMetric,
} from '@pro/types';

/**
 * 聚合调度服务
 *
 * 职责:
 * - 定时触发小时级和日度聚合任务
 * - 计算精确的时间窗口边界
 * - 发布聚合任务到 RabbitMQ
 *
 * 设计哲学:
 * - 时间边界精确到分钟,避免数据重叠或遗漏
 * - 每个 cron 表达式背后都有明确的业务时间点
 * - 错误不传播,单次失败不影响后续调度
 */
@Injectable()
export class AggregateSchedulerService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly rabbitMQService: RabbitMQConfigService,
  ) {
    this.logger.setContext(AggregateSchedulerService.name);
  }

  /**
   * 小时级聚合
   *
   * 调度策略: 每小时第5分钟执行,聚合上一小时的数据
   * Cron: 5 * * * * (每小时的第5分钟)
   *
   * 示例:
   * - 执行时间: 14:05
   * - 聚合窗口: [13:00, 14:00)
   *
   * 设计考量:
   * - 延迟5分钟执行,确保上一小时的数据全部完成清洗和分析
   * - 左闭右开区间,避免数据重复统计
   */
  @Cron('5 * * * *')
  async triggerHourlyAggregation(): Promise<void> {
    const executionStart = Date.now();
    this.logger.info('触发小时级聚合任务');

    try {
      const { startTime, endTime } = this.calculatePreviousHourWindow();

      const event: AggregateTaskEvent = {
        windowType: TimeWindowType.HOUR,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        metrics: [
          AggregateMetric.SENTIMENT_DISTRIBUTION,
          AggregateMetric.POST_TREND,
          AggregateMetric.ENGAGEMENT_TREND,
          AggregateMetric.TOP_KEYWORDS,
        ],
        config: {
          topN: 20,
          forceRecalculate: false,
          cacheTTL: 3600,
        },
        createdAt: new Date().toISOString(),
      };

      const publishSuccess = await this.rabbitMQService.publishAggregateTask(
        event,
      );

      if (!publishSuccess) {
        throw new Error('发布聚合任务失败,RabbitMQ 返回 false');
      }

      const duration = Date.now() - executionStart;
      this.logger.info('小时级聚合任务已发布', {
        windowType: TimeWindowType.HOUR,
        startTime: event.startTime,
        endTime: event.endTime,
        metrics: event.metrics,
        executionTimeMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - executionStart;
      this.logger.error('小时级聚合任务触发失败', {
        error: error.message,
        stack: error.stack,
        executionTimeMs: duration,
      });
    }
  }

  /**
   * 日度聚合
   *
   * 调度策略: 每天凌晨00:10执行,聚合前一天的数据
   * Cron: 10 0 * * * (每天00:10)
   *
   * 示例:
   * - 执行时间: 2025-01-20 00:10
   * - 聚合窗口: [2025-01-19 00:00, 2025-01-20 00:00)
   *
   * 设计考量:
   * - 延迟10分钟执行,确保23:xx小时的数据完成处理
   * - 日度聚合包含更丰富的分析维度
   */
  @Cron('10 0 * * *')
  async triggerDailyAggregation(): Promise<void> {
    const executionStart = Date.now();
    this.logger.info('触发日度聚合任务');

    try {
      const { startTime, endTime } = this.calculatePreviousDayWindow();

      const event: AggregateTaskEvent = {
        windowType: TimeWindowType.DAY,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        metrics: [
          AggregateMetric.SENTIMENT_DISTRIBUTION,
          AggregateMetric.TOP_KEYWORDS,
          AggregateMetric.TOP_TOPICS,
          AggregateMetric.POST_TREND,
          AggregateMetric.ENGAGEMENT_TREND,
          AggregateMetric.USER_ACTIVITY,
        ],
        config: {
          topN: 50,
          forceRecalculate: false,
          cacheTTL: 86400,
        },
        createdAt: new Date().toISOString(),
      };

      const publishSuccess = await this.rabbitMQService.publishAggregateTask(
        event,
      );

      if (!publishSuccess) {
        throw new Error('发布聚合任务失败,RabbitMQ 返回 false');
      }

      const duration = Date.now() - executionStart;
      this.logger.info('日度聚合任务已发布', {
        windowType: TimeWindowType.DAY,
        startTime: event.startTime,
        endTime: event.endTime,
        metrics: event.metrics,
        executionTimeMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - executionStart;
      this.logger.error('日度聚合任务触发失败', {
        error: error.message,
        stack: error.stack,
        executionTimeMs: duration,
      });
    }
  }

  /**
   * 计算上一小时的时间窗口
   *
   * 返回: [上一小时的00分, 当前小时的00分)
   *
   * 示例: 当前时间 14:35
   * - startTime: 13:00:00.000
   * - endTime: 14:00:00.000
   */
  private calculatePreviousHourWindow(): {
    startTime: Date;
    endTime: Date;
  } {
    const now = new Date();

    const endTime = new Date(now);
    endTime.setMinutes(0, 0, 0);

    const startTime = new Date(endTime);
    startTime.setHours(startTime.getHours() - 1);

    return { startTime, endTime };
  }

  /**
   * 计算前一天的时间窗口
   *
   * 返回: [昨天00:00, 今天00:00)
   *
   * 示例: 当前时间 2025-01-20 00:10
   * - startTime: 2025-01-19 00:00:00.000
   * - endTime: 2025-01-20 00:00:00.000
   */
  private calculatePreviousDayWindow(): { startTime: Date; endTime: Date } {
    const now = new Date();

    const endTime = new Date(now);
    endTime.setHours(0, 0, 0, 0);

    const startTime = new Date(endTime);
    startTime.setDate(startTime.getDate() - 1);

    return { startTime, endTime };
  }

  /**
   * 手动触发小时级聚合
   *
   * 用于测试或补偿任务
   */
  async manualTriggerHourly(): Promise<void> {
    this.logger.info('手动触发小时级聚合');
    await this.triggerHourlyAggregation();
  }

  /**
   * 手动触发日度聚合
   *
   * 用于测试或补偿任务
   */
  async manualTriggerDaily(): Promise<void> {
    this.logger.info('手动触发日度聚合');
    await this.triggerDailyAggregation();
  }

  /**
   * 触发指定时间窗口的聚合
   *
   * 用于数据补偿或重新计算
   */
  async triggerCustomAggregation(
    windowType: TimeWindowType,
    startTime: Date,
    endTime: Date,
    metrics?: AggregateMetric[],
  ): Promise<void> {
    const executionStart = Date.now();
    this.logger.info('触发自定义聚合任务', {
      windowType,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });

    try {
      const defaultMetrics =
        windowType === TimeWindowType.HOUR
          ? [
              AggregateMetric.SENTIMENT_DISTRIBUTION,
              AggregateMetric.POST_TREND,
              AggregateMetric.ENGAGEMENT_TREND,
            ]
          : [
              AggregateMetric.SENTIMENT_DISTRIBUTION,
              AggregateMetric.TOP_KEYWORDS,
              AggregateMetric.TOP_TOPICS,
              AggregateMetric.POST_TREND,
              AggregateMetric.ENGAGEMENT_TREND,
              AggregateMetric.USER_ACTIVITY,
            ];

      const event: AggregateTaskEvent = {
        windowType,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        metrics: metrics || defaultMetrics,
        config: {
          topN: windowType === TimeWindowType.HOUR ? 20 : 50,
          forceRecalculate: true,
          cacheTTL:
            windowType === TimeWindowType.HOUR ? 3600 : 86400,
        },
        createdAt: new Date().toISOString(),
      };

      const publishSuccess = await this.rabbitMQService.publishAggregateTask(
        event,
      );

      if (!publishSuccess) {
        throw new Error('发布聚合任务失败,RabbitMQ 返回 false');
      }

      const duration = Date.now() - executionStart;
      this.logger.info('自定义聚合任务已发布', {
        windowType,
        startTime: event.startTime,
        endTime: event.endTime,
        metrics: event.metrics,
        executionTimeMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - executionStart;
      this.logger.error('自定义聚合任务触发失败', {
        windowType,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        error: error.message,
        stack: error.stack,
        executionTimeMs: duration,
      });
      throw error;
    }
  }
}
