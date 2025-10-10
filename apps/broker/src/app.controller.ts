import { Controller, Get, Post, Param, Body, HttpStatus } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TaskScannerScheduler } from './weibo/task-scanner-scheduler.service';
import { TaskMonitor } from './weibo/task-monitor.service';

// @ApiTags('broker')
@Controller()
export class AppController {
  constructor(
    private readonly taskScanner: TaskScannerScheduler,
    private readonly taskMonitor: TaskMonitor,
  ) {}

  @Post('broker/scan')
  // @ApiOperation({ summary: '手动触发任务扫描' })
  // @ApiResponse({ status: HttpStatus.OK, description: '扫描成功' })
  async triggerScan() {
    await this.taskScanner.triggerScan();
    return { message: '任务扫描已触发' };
  }

  @Post('broker/monitor')
  // @ApiOperation({ summary: '手动触发任务监控' })
  // @ApiResponse({ status: HttpStatus.OK, description: '监控成功' })
  async triggerMonitor() {
    await this.taskMonitor.triggerMonitor();
    return { message: '任务监控已触发' };
  }

  @Get('broker/stats')
  // @ApiOperation({ summary: '获取任务统计信息' })
  // @ApiResponse({ status: HttpStatus.OK, description: '获取成功' })
  async getStats() {
    const [pendingCount, monitorStats] = await Promise.all([
      this.taskScanner.getPendingTasksCount(),
      this.taskMonitor.getMonitorStats(),
    ]);

    const taskStats = await this.taskScanner.getTaskStats();

    return {
      scanner: {
        pendingCount,
        ...taskStats,
      },
      monitor: monitorStats,
    };
  }

  @Post('broker/reset/:taskId')
  // @ApiOperation({ summary: '重置失败任务' })
  // @ApiResponse({ status: HttpStatus.OK, description: '重置成功' })
  // @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '任务不存在或状态不允许重置' })
  async resetTask(@Param('taskId') taskId: number) {
    const success = await this.taskMonitor.resetFailedTask(taskId);
    if (success) {
      return { message: '任务重置成功' };
    }
    return { message: '任务重置失败', success: false };
  }

  @Get('health')
  // @ApiOperation({ summary: '健康检查' })
  // @ApiResponse({ status: HttpStatus.OK, description: '服务正常' })
  async health() {
    return {
      status: 'ok',
      service: 'broker',
      timestamp: new Date().toISOString(),
    };
  }
}