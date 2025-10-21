import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from '@pro/logger';
import { Repository, LessThan } from 'typeorm';

import { WeiboSearchTaskEntity } from '@pro/entities';

@Injectable()
export class FixNextRunAtScript {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
  ) {
    this.logger.setContext(FixNextRunAtScript.name);
  }

  parseIntervalToMs = (interval: string): number => {
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

  formatDateTime = (date: Date): string => {
    const utc = new Date(date.toISOString());
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return `${utc.toISOString()} UTC / ${local.toISOString().replace('T', ' ').substring(0, 19)} Local`;
  };

  async fixOverdueTasks(): Promise<void> {
    this.logger.info('===== 开始修复过期的 nextRunAt 任务 =====');

    const now = new Date();
    const utcNow = new Date(now.toISOString());

    // 查找所有过期超过1小时的任务
    const oneHourAgo = new Date(utcNow.getTime() - 60 * 60 * 1000);

    const overdueTasks = await this.taskRepository.find({
      where: {
        enabled: true,
        nextRunAt: LessThan(oneHourAgo),
      },
    });

    this.logger.info(`找到 ${overdueTasks.length} 个过期超过1小时的任务`);

    for (const task of overdueTasks) {
      this.logger.info(`修复任务 ${task.id} (${task.keyword}):`);
      this.logger.info(`  原始 nextRunAt: ${this.formatDateTime(task.nextRunAt!)}`);

      // 计算从 lastestCrawlTime 开始的下一次执行时间
      const baseTime = task.latestCrawlTime || task.createdAt;
      const nextRunTime = new Date(baseTime.getTime() + this.parseIntervalToMs(task.crawlInterval));

      // 如果新的 nextRunAt 仍然在过去，则设置为当前时间加1个间隔
      const finalNextRunTime = nextRunTime <= utcNow
        ? new Date(utcNow.getTime() + this.parseIntervalToMs(task.crawlInterval))
        : nextRunTime;

      await this.taskRepository.update(task.id, {
        nextRunAt: finalNextRunTime,
      });

      this.logger.info(`  新的 nextRunAt: ${this.formatDateTime(finalNextRunTime)}`);
      this.logger.info(`  时间间隔: ${task.crawlInterval}`);
    }

    this.logger.info('===== nextRunAt 修复完成 =====');
  }

  async resetNullNextRunAt(): Promise<void> {
    this.logger.info('===== 开始修复 null 的 nextRunAt 任务 =====');

    const now = new Date();
    const utcNow = new Date(now.toISOString());

    const nullNextRunAtTasks = await this.taskRepository.find({
      where: {
        enabled: true,
        nextRunAt: null,
      },
    });

    this.logger.info(`找到 ${nullNextRunAtTasks.length} 个 nextRunAt 为 null 的任务`);

    for (const task of nullNextRunAtTasks) {
      this.logger.info(`设置任务 ${task.id} (${task.keyword}) 的 nextRunAt`);

      // 设置为当前时间加1个间隔
      const nextRunTime = new Date(utcNow.getTime() + this.parseIntervalToMs(task.crawlInterval));

      await this.taskRepository.update(task.id, {
        nextRunAt: nextRunTime,
      });

      this.logger.info(`  设置 nextRunAt: ${this.formatDateTime(nextRunTime)}`);
      this.logger.info(`  时间间隔: ${task.crawlInterval}`);
    }

    this.logger.info('===== null nextRunAt 修复完成 =====');
  }

  async runAll(): Promise<void> {
    await this.fixOverdueTasks();
    await this.resetNullNextRunAt();
  }
}