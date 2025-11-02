import { LessThanOrEqual, IsNull } from 'typeorm';
import {
  WeiboSearchTaskEntity,
  WeiboSubTaskEntity,
  useEntityManager,
  useTranslation
} from '@pro/entities';
import { useQueue } from '@pro/rabbitmq';
import { Scheduler } from '../core/scheduler';
import { createContextLogger } from '../core/logger';
import { SubTaskMessage, WEIBO_CRAWL_QUEUE } from './interfaces/sub-task-message.interface';

const formatDateTime = (date: Date): string => {
  const utc = new Date(date.toISOString());
  const local = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  return `${utc.toISOString()} UTC / ${local.toISOString().replace('T', ' ').substring(0, 19)} Local`;
};

const parseIntervalToMs = (interval: string): number => {
  const match = interval.match(/^(\d+)([smhd])$/);
  if (!match) return 60 * 60 * 1000;

  const value = Number(match[1]);
  const unit = match[2];

  const multiplier = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  } as const;

  const step = multiplier[unit as keyof typeof multiplier];
  return step ? value * step : 60 * 60 * 1000;
};

/**
 * 简易间隔调度器 - 微博搜索任务的编排者
 *
 * 设计哲学：
 * - 摒弃 NestJS，使用纯函数式 hooks
 * - 每分钟扫描待执行任务，优雅派发
 * - 使用 useQueue 直接发送消息
 *
 * 使命：为微博搜索任务赋予准时执行的保障
 */
export class SimpleIntervalScheduler extends Scheduler {
  private readonly logger = createContextLogger('SimpleIntervalScheduler');
  private readonly queue = useQueue<SubTaskMessage>(WEIBO_CRAWL_QUEUE);

  constructor() {
    super(60 * 1000, 'SimpleIntervalScheduler'); // 每分钟执行一次
  }

  protected async execute(): Promise<void> {
    const now = new Date();
    const utcNow = new Date(now.toISOString());

    this.logger.info(`调度器运行 - 当前时间: ${formatDateTime(utcNow)}`);

    const tasks = await this.loadPendingTasks(utcNow);

    if (tasks.length === 0) {
      this.logger.debug('没有到期的微博搜索任务');
      return;
    }

    this.logger.info(`找到 ${tasks.length} 个到期的微博搜索任务`);

    for (const task of tasks) {
      this.logger.info(`任务 ${task.id}(${task.keyword}) - nextRunAt: ${task.nextRunAt ? formatDateTime(task.nextRunAt) : 'NULL'} - 开始处理`);
      await this.dispatchSubTask(task, utcNow);
    }
  }

  private async loadPendingTasks(now: Date): Promise<WeiboSearchTaskEntity[]> {
    return await useEntityManager(async (m) => {
      const tasks = await m.find(WeiboSearchTaskEntity, {
        where: [
          { enabled: true, nextRunAt: IsNull() },
          { enabled: true, nextRunAt: LessThanOrEqual(now) },
        ],
        order: { nextRunAt: 'ASC' },
      });

      this.logger.debug(`数据库查询 - 当前时间: ${formatDateTime(now)}`);

      const allEnabledTasks = await m.find(WeiboSearchTaskEntity, {
        where: { enabled: true },
        select: ['id', 'keyword', 'enabled', 'nextRunAt', 'crawlInterval'],
      });

      this.logger.debug(`所有启用的任务 (${allEnabledTasks.length}):`);
      for (const task of allEnabledTasks) {
        const status = task.nextRunAt ?
          (task.nextRunAt <= now ? '✓ 已到期' : `○ 等待中 (${formatDateTime(task.nextRunAt)})`) :
          '⚠ 未设置 nextRunAt';
        this.logger.debug(`  - 任务 ${task.id}(${task.keyword}): ${status}`);
      }

      return tasks;
    });
  }

  private async dispatchSubTask(task: WeiboSearchTaskEntity, now: Date): Promise<void> {
    const start = task.latestCrawlTime ?? task.startDate;
    const end = now;

    this.logger.debug(`任务 ${task.id} - 时间范围: ${start.toISOString()} ~ ${end.toISOString()}`);

    const metadata = {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      keyword: task.keyword,
    };

    await useTranslation(async (m) => {
      const subTaskRecord = m.create(WeiboSubTaskEntity, {
        taskId: task.id,
        metadata,
        type: 'KEYWORD_SEARCH',
        status: 'PENDING',
      });

      await m.save(subTaskRecord);

      const message: SubTaskMessage = {
        taskId: task.id,
        type: subTaskRecord.type,
        metadata,
        keyword: task.keyword,
        start,
        end,
        isInitialCrawl: !task.latestCrawlTime,
        enableAccountRotation: true,
      };

      // 使用 useQueue 直接发送消息
      this.queue.producer.next(message);

      const nextRunTime = new Date(now.getTime() + parseIntervalToMs(task.crawlInterval));

      await m.update(WeiboSearchTaskEntity, task.id, {
        latestCrawlTime: end,
        nextRunAt: nextRunTime,
      });

      this.logger.info(
        `已为任务 ${task.id}（${task.keyword}）生成子任务 ${subTaskRecord.id}，时间段 ${metadata.startTime} ~ ${metadata.endTime}`,
      );
      this.logger.info(`任务 ${task.id} 下次执行时间: ${formatDateTime(nextRunTime)} (间隔: ${task.crawlInterval})`);
    });
  }
}
