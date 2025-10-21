import { Command } from 'commander';
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { TimeDebugUtil } from '../utils/time-debug.util';

@Injectable()
export class TimeDebugCommand {
  constructor(
    private readonly moduleRef: ModuleRef,
  ) {}

  async run() {
    const timeDebug = this.moduleRef.get(TimeDebugUtil, { strict: false });

    try {
      await timeDebug.checkTimezoneSettings();
      await timeDebug.debugTaskScheduling();
    } catch (error) {
      console.error('调试命令执行失败:', error);
      process.exit(1);
    }
  }
}

// 创建 CLI 命令
export const createTimeDebugCommand = (timeDebugCommand: TimeDebugCommand) => {
  const command = new Command('time-debug')
    .description('调试时间调度相关问题')
    .action(async () => {
      await timeDebugCommand.run();
    });

  return command;
};