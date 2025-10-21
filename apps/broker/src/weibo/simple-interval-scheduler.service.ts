import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from '@pro/logger';
import { LessThanOrEqual, Repository, IsNull } from 'typeorm';

import { WeiboSearchTaskEntity, WeiboSubTaskEntity } from '@pro/entities';

import { RabbitMQConfigService } from '../rabbitmq/rabbitmq-config.service';
import { SubTaskMessage } from './interfaces/sub-task-message.interface';

const toUTC = (date: Date): Date => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
};

const formatDateTime = (date: Date): string => {
  const utc = new Date(date.toISOString());
  const local = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  return `${utc.toISOString()} UTC / ${local.toISOString().replace('T', ' ').substring(0, 19)} Local`;
};

const parseIntervalToMs = (interval: string): number => {
  const match = interval.match(/^(\d+)([smhd])$/);
  if (!match) return 60 * 60 * 1000; // 默认1小时

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

@Injectable()
export class SimpleIntervalScheduler {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
    @InjectRepository(WeiboSubTaskEntity)
    private readonly subTaskRepository: Repository<WeiboSubTaskEntity>,
    private readonly rabbitMQService: RabbitMQConfigService,
  ) {
    this.logger.setContext(SimpleIntervalScheduler.name);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async scheduleTasks(): Promise<void> {
    const now = new Date();
    const utcNow = new Date(now.toISOString()); // 统一使用UTC时间

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
    const tasks = await this.taskRepository.find({
      where: [
        { enabled: true, nextRunAt: IsNull() },
        { enabled: true, nextRunAt: LessThanOrEqual(now) },
      ],
      order: { nextRunAt: 'ASC' },
    });

    this.logger.debug(`数据库查询 - 当前时间: ${formatDateTime(now)}`);

    const allEnabledTasks = await this.taskRepository.find({
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

    const subTaskRecord = this.subTaskRepository.create({
      taskId: task.id,
      metadata,
      type: 'KEYWORD_SEARCH',
      status: 'PENDING',
    });

    await this.subTaskRepository.save(subTaskRecord);

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

    await this.rabbitMQService.publishSubTask(message);

    const nextRunTime = new Date(now.getTime() + parseIntervalToMs(task.crawlInterval));

    await this.taskRepository.update(task.id, {
      latestCrawlTime: end,
      nextRunAt: nextRunTime,
    });

    this.logger.info(
      `已为任务 ${task.id}（${task.keyword}）生成子任务 ${subTaskRecord.id}，时间段 ${metadata.startTime} ~ ${metadata.endTime}`,
    );
    this.logger.info(`任务 ${task.id} 下次执行时间: ${formatDateTime(nextRunTime)} (间隔: ${task.crawlInterval})`);
  }
}
