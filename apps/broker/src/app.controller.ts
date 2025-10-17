import { Controller, Get, Post, Param, Body, HttpStatus } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TaskScannerScheduler } from './weibo/task-scanner-scheduler.service';
import { TaskMonitor } from './weibo/task-monitor.service';
import { PinoLogger } from '@pro/logger';

// @ApiTags('broker')
@Controller()
export class AppController {
  constructor(
    private readonly taskScanner: TaskScannerScheduler,
    private readonly taskMonitor: TaskMonitor,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AppController.name);
  }

  @Post('broker/scan')
  // @ApiOperation({ summary: '手动触发任务扫描' })
  // @ApiResponse({ status: HttpStatus.OK, description: '扫描成功' })
  async triggerScan() {
    this.logger.debug('收到手动触发任务扫描请求');
    const scanStart = Date.now();

    try {
      await this.taskScanner.triggerScan();
      const scanDuration = Date.now() - scanStart;

      this.logger.info(`手动任务扫描完成，耗时 ${scanDuration}ms`);
      return { message: '任务扫描已触发', scanTimeMs: scanDuration };
    } catch (error) {
      const scanDuration = Date.now() - scanStart;
      this.logger.error('手动任务扫描失败', {
        error: error.message,
        scanTimeMs: scanDuration
      });
      throw error;
    }
  }

  @Post('broker/monitor')
  // @ApiOperation({ summary: '手动触发任务监控' })
  // @ApiResponse({ status: HttpStatus.OK, description: '监控成功' })
  async triggerMonitor() {
    this.logger.debug('收到手动触发任务监控请求');
    const monitorStart = Date.now();

    try {
      await this.taskMonitor.triggerMonitor();
      const monitorDuration = Date.now() - monitorStart;

      this.logger.info(`手动任务监控完成，耗时 ${monitorDuration}ms`);
      return { message: '任务监控已触发', monitorTimeMs: monitorDuration };
    } catch (error) {
      const monitorDuration = Date.now() - monitorStart;
      this.logger.error('手动任务监控失败', {
        error: error.message,
        monitorTimeMs: monitorDuration
      });
      throw error;
    }
  }

  @Get('broker/stats')
  // @ApiOperation({ summary: '获取任务统计信息' })
  // @ApiResponse({ status: HttpStatus.OK, description: '获取成功' })
  async getStats() {
    this.logger.debug('收到获取任务统计信息请求');
    const statsStart = Date.now();

    try {
      const [pendingCount, monitorStats] = await Promise.all([
        this.taskScanner.getPendingTasksCount(),
        this.taskMonitor.getMonitorStats(),
      ]);

      const taskStats = await this.taskScanner.getTaskStats();
      const statsDuration = Date.now() - statsStart;

      this.logger.debug(`任务统计信息获取完成，耗时 ${statsDuration}ms`, {
        pendingCount,
        totalTasks: taskStats.total,
        runningTasks: taskStats.running,
        failedTasks: taskStats.failed
      });

      return {
        scanner: {
          pendingCount,
          ...taskStats,
        },
        monitor: monitorStats,
        queryTimeMs: statsDuration,
      };
    } catch (error) {
      const statsDuration = Date.now() - statsStart;
      this.logger.error('获取任务统计信息失败', {
        error: error.message,
        queryTimeMs: statsDuration
      });
      throw error;
    }
  }

  @Post('broker/reset/:taskId')
  // @ApiOperation({ summary: '重置失败任务' })
  // @ApiResponse({ status: HttpStatus.OK, description: '重置成功' })
  // @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '任务不存在或状态不允许重置' })
  async resetTask(@Param('taskId') taskId: number) {
    this.logger.debug('收到重置任务请求', { taskId });
    const resetStart = Date.now();

    try {
      const success = await this.taskMonitor.resetFailedTask(taskId);
      const resetDuration = Date.now() - resetStart;

      if (success) {
        this.logger.info(`任务 ${taskId} 重置成功，耗时 ${resetDuration}ms`);
        return { message: '任务重置成功', taskId, resetTimeMs: resetDuration };
      } else {
        this.logger.warn(`任务 ${taskId} 重置失败，耗时 ${resetDuration}ms`);
        return { message: '任务重置失败', taskId, success: false, resetTimeMs: resetDuration };
      }
    } catch (error) {
      const resetDuration = Date.now() - resetStart;
      this.logger.error(`重置任务 ${taskId} 失败`, {
        taskId,
        error: error.message,
        resetTimeMs: resetDuration
      });
      throw error;
    }
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