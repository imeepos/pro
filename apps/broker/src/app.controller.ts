import { Controller, Get, Post, Param } from '@nestjs/common';
import { TaskScannerScheduler } from './weibo/task-scanner-scheduler.service';
import { TaskMonitor } from './weibo/task-monitor.service';
import { DiagnosticService } from './weibo/diagnostic.service';
import { PinoLogger } from '@pro/logger';

/**
 * Broker 控制器 - API的优雅之门
 *
 * 设计理念：
 * - 每个端点都有其独特的使命
 * - 响应格式统一且富有意义
 * - 错误处理优雅且信息丰富
 *
 * 提供的服务：
 * - 任务扫描的手动触发
 * - 系统状态的实时监控
 * - 任务管理的精细操作
 * - 系统诊断的智能分析
 */
@Controller()
export class AppController {
  constructor(
    private readonly taskScanner: TaskScannerScheduler,
    private readonly taskMonitor: TaskMonitor,
    private readonly diagnostic: DiagnosticService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AppController.name);
  }

  /**
   * 手动触发任务扫描 - 即时的召唤
   * 当需要立即执行任务扫描时使用
   */
  @Post('broker/scan')
  async triggerScan() {
    const operationStart = Date.now();
    this.logger.debug('收到任务扫描请求');

    try {
      await this.taskScanner.triggerScan();
      const duration = Date.now() - operationStart;

      this.logger.info(`任务扫描完成，耗时 ${duration}ms`);
      return {
        success: true,
        message: '任务扫描已执行',
        executionTime: duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - operationStart;
      this.logger.error('任务扫描失败', {
        error: error.message,
        duration
      });
      throw error;
    }
  }

  /**
   * 手动触发任务监控 - 系统的体检
   * 检查所有任务的运行状态和健康状况
   */
  @Post('broker/monitor')
  async triggerMonitor() {
    const operationStart = Date.now();
    this.logger.debug('收到任务监控请求');

    try {
      await this.taskMonitor.triggerMonitor();
      const duration = Date.now() - operationStart;

      this.logger.info(`任务监控完成，耗时 ${duration}ms`);
      return {
        success: true,
        message: '任务监控已执行',
        executionTime: duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - operationStart;
      this.logger.error('任务监控失败', {
        error: error.message,
        duration
      });
      throw error;
    }
  }

  /**
   * 获取系统统计信息 - 数据的画卷
   * 展示任务调度的全景统计和实时状态
   */
  @Get('broker/stats')
  async getStats() {
    const operationStart = Date.now();
    this.logger.debug('收到统计信息请求');

    try {
      const [pendingCount, monitorStats, taskStats] = await Promise.all([
        this.taskScanner.getPendingTasksCount(),
        this.taskMonitor.getMonitorStats(),
        this.taskScanner.getTaskStats(),
      ]);

      const duration = Date.now() - operationStart;

      this.logger.debug(`统计信息获取完成，耗时 ${duration}ms`, {
        pendingTasks: pendingCount,
        totalTasks: taskStats.total,
        runningTasks: taskStats.running
      });

      return {
        success: true,
        data: {
          scanner: {
            pendingCount,
            ...taskStats,
          },
          monitor: monitorStats,
        },
        metadata: {
          queryTime: duration,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const duration = Date.now() - operationStart;
      this.logger.error('统计信息获取失败', {
        error: error.message,
        duration
      });
      throw error;
    }
  }

  /**
   * 重置失败任务 - 给予新的机会
   * 将失败状态的任务重新设置为待执行状态
   */
  @Post('broker/reset/:taskId')
  async resetTask(@Param('taskId') taskId: number) {
    const operationStart = Date.now();
    this.logger.debug('收到任务重置请求', { taskId });

    try {
      const success = await this.taskMonitor.resetFailedTask(taskId);
      const duration = Date.now() - operationStart;

      if (success) {
        this.logger.info(`任务 ${taskId} 重置成功`);
        return {
          success: true,
          message: '任务已重置为待执行状态',
          taskId,
          executionTime: duration,
          timestamp: new Date().toISOString()
        };
      } else {
        this.logger.warn(`任务 ${taskId} 重置失败`);
        return {
          success: false,
          message: '任务重置失败，可能任务不存在或状态不允许重置',
          taskId,
          executionTime: duration,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      const duration = Date.now() - operationStart;
      this.logger.error(`任务 ${taskId} 重置异常`, {
        taskId,
        error: error.message,
        duration
      });
      throw error;
    }
  }

  /**
   * 健康检查 - 系统的心跳
   * 简单的服务状态检查，用于负载均衡器和服务发现
   */
  @Get('health')
  async health() {
    return {
      status: 'healthy',
      service: 'broker',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 系统诊断 - 深度的体检
   * 全面分析数据库中的任务状态，发现潜在问题
   */
  @Get('broker/diagnostic')
  async diagnose() {
    this.logger.info('开始系统诊断');
    const result = await this.diagnostic.diagnoseTaskStatuses();

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 修复过期任务 - 时间的校准者
   * 自动修复那些过期未执行的任务，恢复系统的正常运行
   */
  @Post('broker/fix-overdue')
  async fixOverdue() {
    this.logger.info('开始修复过期任务');
    const result = await this.diagnostic.fixOverdueTasks();

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  }
}