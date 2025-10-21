import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from '@pro/logger';
import { Repository } from 'typeorm';

import { WeiboSearchTaskEntity } from '@pro/entities';

@Injectable()
export class TimeDebugUtil {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
  ) {
    this.logger.setContext(TimeDebugUtil.name);
  }

  formatDateTime = (date: Date): string => {
    const utc = new Date(date.toISOString());
    const local = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return `${utc.toISOString()} UTC / ${local.toISOString().replace('T', ' ').substring(0, 19)} Local (${local.getTimezoneOffset() / -60 > 0 ? '+' : ''}${local.getTimezoneOffset() / -60}:00)`;
  };

  async debugTaskScheduling(): Promise<void> {
    this.logger.info('===== 时间调度调试开始 =====');

    const now = new Date();
    const utcNow = new Date(now.toISOString());

    this.logger.info(`系统当前时间: ${this.formatDateTime(utcNow)}`);
    this.logger.info(`  时区偏移: ${now.getTimezoneOffset()} 分钟 (UTC${now.getTimezoneOffset() > 0 ? '-' : '+'}${Math.abs(now.getTimezoneOffset()) / 60}:00)`);

    const allTasks = await this.taskRepository.find({
      where: { enabled: true },
      select: ['id', 'keyword', 'enabled', 'nextRunAt', 'crawlInterval', 'createdAt'],
    });

    this.logger.info(`找到 ${allTasks.length} 个启用的任务:`);

    for (const task of allTasks) {
      this.logger.info(`\n任务 ${task.id} (${task.keyword}):`);
      this.logger.info(`  状态: ${task.enabled ? '✓ 启用' : '✗ 禁用'}`);
      this.logger.info(`  爬取间隔: ${task.crawlInterval}`);

      if (task.nextRunAt) {
        this.logger.info(`  下次执行时间: ${this.formatDateTime(task.nextRunAt)}`);

        const isOverdue = task.nextRunAt <= utcNow;
        const timeDiff = task.nextRunAt.getTime() - utcNow.getTime();

        this.logger.info(`  是否到期: ${isOverdue ? '✓ 是，应立即执行' : '✗ 否，等待中'}`);

        if (timeDiff > 0) {
          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          this.logger.info(`  距离下次执行: ${hours}小时${minutes}分钟`);
        } else {
          const minutes = Math.floor(Math.abs(timeDiff) / (1000 * 60));
          this.logger.info(`  已过期: ${minutes}分钟`);
        }
      } else {
        this.logger.info(`  下次执行时间: null (任务将立即执行)`);
      }
    }

    const dueTasks = allTasks.filter(task =>
      task.enabled && (!task.nextRunAt || task.nextRunAt <= utcNow)
    );

    this.logger.info(`\n应该执行的任务数量: ${dueTasks.length}`);
    for (const task of dueTasks) {
      this.logger.info(`  - 任务 ${task.id} (${task.keyword})`);
    }

    this.logger.info('===== 时间调度调试结束 =====\n');
  }

  async checkTimezoneSettings(): Promise<void> {
    this.logger.info('===== 时区设置检查 =====');

    const now = new Date();

    this.logger.info('Node.js 时区信息:');
    this.logger.info(`  当前时间: ${this.formatDateTime(now)}`);
    this.logger.info(`  时区偏移: ${now.getTimezoneOffset()} 分钟 (UTC${now.getTimezoneOffset() > 0 ? '-' : '+'}${Math.abs(now.getTimezoneOffset()) / 60}:00)`);

    this.logger.info('环境变量:');
    this.logger.info(`  TZ: ${process.env.TZ || 'undefined'}`);

    // 验证时区转换函数
    const testDate = new Date('2025-10-21T12:00:00Z');
    const convertedLocal = new Date(testDate.getTime() + testDate.getTimezoneOffset() * 60000);
    this.logger.info('时区转换验证:');
    this.logger.info(`  测试时间: ${testDate.toISOString()} UTC`);
    this.logger.info(`  转换后: ${this.formatDateTime(convertedLocal)}`);

    this.logger.info('===== 时区设置检查结束 =====\n');
  }
}