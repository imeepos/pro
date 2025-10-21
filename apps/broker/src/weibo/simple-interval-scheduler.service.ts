import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from '@pro/logger';
import { LessThanOrEqual, Repository, IsNull } from 'typeorm';

import { WeiboSearchTaskEntity, WeiboSubTaskEntity } from '@pro/entities';

import { RabbitMQConfigService } from '../rabbitmq/rabbitmq-config.service';
import { SubTaskMessage } from './interfaces/sub-task-message.interface';

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
    const tasks = await this.loadPendingTasks(now);

    if (tasks.length === 0) {
      this.logger.debug('没有到期的微博搜索任务');
      return;
    }

    for (const task of tasks) {
      await this.dispatchSubTask(task, now);
    }
  }

  private async loadPendingTasks(now: Date): Promise<WeiboSearchTaskEntity[]> {
    return this.taskRepository.find({
      where: [
        { enabled: true, nextRunAt: IsNull() },
        { enabled: true, nextRunAt: LessThanOrEqual(now) },
      ],
      order: { nextRunAt: 'ASC' },
    });
  }

  private async dispatchSubTask(task: WeiboSearchTaskEntity, now: Date): Promise<void> {
    const start = task.latestCrawlTime ?? task.startDate;
    const end = now;

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

    await this.taskRepository.update(task.id, {
      latestCrawlTime: end,
      nextRunAt: new Date(now.getTime() + parseIntervalToMs(task.crawlInterval)),
    });

    this.logger.info(
      `已为任务 ${task.id}（${task.keyword}）生成子任务 ${subTaskRecord.id}，时间段 ${metadata.startTime} ~ ${metadata.endTime}`,
    );
  }
}
