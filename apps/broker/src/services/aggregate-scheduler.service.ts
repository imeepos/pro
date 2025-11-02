import { useQueue } from '@pro/rabbitmq';
import { QUEUE_NAMES } from '@pro/types';
import {
  AggregateTaskEvent,
  TimeWindowType,
  AggregateMetric,
} from '@pro/types';
import { CronScheduler } from '../core/cron-scheduler';
import { createContextLogger } from '../core/logger';

/**
 * 聚合调度服务 - 数据聚合的指挥家
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
export class AggregateSchedulerService {
  private readonly logger = createContextLogger('AggregateSchedulerService');
  private readonly queue = useQueue<AggregateTaskEvent>(QUEUE_NAMES.AGGREGATE_TASK);
  private readonly hourlyScheduler: HourlyAggregateScheduler;
  private readonly dailyScheduler: DailyAggregateScheduler;

  constructor() {
    this.hourlyScheduler = new HourlyAggregateScheduler(this.queue, this.logger);
    this.dailyScheduler = new DailyAggregateScheduler(this.queue, this.logger);
  }

  start(): void {
    this.hourlyScheduler.start();
    this.dailyScheduler.start();
  }

  stop(): void {
    this.hourlyScheduler.stop();
    this.dailyScheduler.stop();
  }

  async manualTriggerHourly(): Promise<void> {
    await this.hourlyScheduler.manualTrigger();
  }

  async manualTriggerDaily(): Promise<void> {
    await this.dailyScheduler.manualTrigger();
  }

  async triggerCustomAggregation(
    windowType: TimeWindowType,
    startTime: Date,
    endTime: Date,
    metrics?: AggregateMetric[],
  ): Promise<void> {
    const executionStart = Date.now();
    this.logger.info({
      message: '触发自定义聚合任务',
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
          cacheTTL: windowType === TimeWindowType.HOUR ? 3600 : 86400,
        },
        createdAt: new Date().toISOString(),
      };

      this.queue.producer.next(event);

      const duration = Date.now() - executionStart;
      this.logger.info({
        message: '自定义聚合任务已发布',
        windowType,
        startTime: event.startTime,
        endTime: event.endTime,
        metrics: event.metrics,
        executionTimeMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - executionStart;
      this.logger.error({
        message: '自定义聚合任务触发失败',
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

/**
 * 小时级聚合调度器
 *
 * 调度策略: 每小时第5分钟执行,聚合上一小时的数据
 * Cron: 5 * * * * (每小时的第5分钟)
 */
class HourlyAggregateScheduler extends CronScheduler {
  constructor(
    private readonly queue: ReturnType<typeof useQueue<AggregateTaskEvent>>,
    private readonly logger: any
  ) {
    super('5 * * * *', 'HourlyAggregateScheduler');
  }

  protected async execute(): Promise<void> {
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

      this.queue.producer.next(event);

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

  private calculatePreviousHourWindow(): { startTime: Date; endTime: Date } {
    const now = new Date();

    const endTime = new Date(now);
    endTime.setMinutes(0, 0, 0);

    const startTime = new Date(endTime);
    startTime.setHours(startTime.getHours() - 1);

    return { startTime, endTime };
  }
}

/**
 * 日度聚合调度器
 *
 * 调度策略: 每天凌晨00:10执行,聚合前一天的数据
 * Cron: 10 0 * * * (每天00:10)
 */
class DailyAggregateScheduler extends CronScheduler {
  constructor(
    private readonly queue: ReturnType<typeof useQueue<AggregateTaskEvent>>,
    private readonly logger: any
  ) {
    super('10 0 * * *', 'DailyAggregateScheduler');
  }

  protected async execute(): Promise<void> {
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

      this.queue.producer.next(event);

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

  private calculatePreviousDayWindow(): { startTime: Date; endTime: Date } {
    const now = new Date();

    const endTime = new Date(now);
    endTime.setHours(0, 0, 0, 0);

    const startTime = new Date(endTime);
    startTime.setDate(startTime.getDate() - 1);

    return { startTime, endTime };
  }
}
