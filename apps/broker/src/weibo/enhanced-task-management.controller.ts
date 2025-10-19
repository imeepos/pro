import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReportType, ReportFormat } from './task-execution-report-generator.service.js';
import { EnhancedTaskOrchestrator } from './enhanced-task-orchestrator.service.js';
import { TaskScannerScheduler } from './task-scanner-scheduler.service.js';
import { TaskMonitor } from './task-monitor.service.js';
import { TaskPriorityDependencyManager, TaskPriority } from './task-priority-dependency-manager.service.js';
import { TaskExecutionReportGenerator } from './task-execution-report-generator.service.js';

/**
 * 增强任务管理控制器
 * 提供智能任务管理的HTTP API接口
 */
@ApiTags('增强任务管理')
@Controller('enhanced-task-management')
export class EnhancedTaskManagementController {
  constructor(
    private readonly orchestrator: EnhancedTaskOrchestrator,
    private readonly taskScanner: TaskScannerScheduler,
    private readonly taskMonitor: TaskMonitor,
    private readonly priorityManager: TaskPriorityDependencyManager,
    private readonly reportGenerator: TaskExecutionReportGenerator,
  ) {}

  /**
   * 手动触发智能任务调度
   */
  @Post('orchestrate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手动触发智能任务调度编排' })
  @ApiResponse({ status: 200, description: '任务调度编排完成' })
  async triggerOrchestration(): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
  }> {
    await this.orchestrator.orchestrateTaskScheduling();

    return {
      success: true,
      message: '智能任务调度编排已触发',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 触发传统任务扫描
   */
  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手动触发传统任务扫描' })
  @ApiResponse({ status: 200, description: '任务扫描完成' })
  async triggerScan(): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
  }> {
    await this.taskScanner.triggerScan();

    return {
      success: true,
      message: '任务扫描已触发',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 触发任务监控
   */
  @Post('monitor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手动触发任务监控' })
  @ApiResponse({ status: 200, description: '任务监控完成' })
  async triggerMonitor(): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
  }> {
    await this.taskMonitor.triggerMonitor();

    return {
      success: true,
      message: '任务监控已触发',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取系统健康状态
   */
  @Get('health')
  @ApiOperation({ summary: '获取系统健康状态' })
  @ApiResponse({ status: 200, description: '系统健康状态' })
  async getHealthStatus() {
    return await this.orchestrator.performHealthCheck();
  }

  /**
   * 生成任务执行报告
   */
  @Post('reports')
  @ApiOperation({ summary: '生成任务执行报告' })
  @ApiResponse({ status: 200, description: '报告生成成功' })
  async generateReport(
    @Body() body: {
      reportType: ReportType;
      timeRange?: {
        start: string;
        end: string;
      };
      format?: ReportFormat;
    }
  ) {
    const timeRange = body.timeRange ? {
      start: new Date(body.timeRange.start),
      end: new Date(body.timeRange.end),
    } : undefined;

    return await this.orchestrator.generateComprehensiveReport(
      body.reportType,
      timeRange
    );
  }

  /**
   * 获取报告列表
   */
  @Get('reports')
  @ApiOperation({ summary: '获取报告列表' })
  @ApiQuery({ name: 'reportType', required: false, description: '报告类型过滤' })
  @ApiQuery({ name: 'limit', required: false, description: '返回数量限制', type: Number })
  @ApiResponse({ status: 200, description: '报告列表' })
  async listReports(
    @Query('reportType') reportType?: ReportType,
    @Query('limit') limit: number = 50
  ) {
    return await this.reportGenerator.listReports(reportType, limit);
  }

  /**
   * 获取特定报告
   */
  @Get('reports/:reportId')
  @ApiOperation({ summary: '获取特定报告' })
  @ApiParam({ name: 'reportId', description: '报告ID' })
  @ApiResponse({ status: 200, description: '报告详情' })
  @ApiResponse({ status: 404, description: '报告不存在' })
  async getReport(@Param('reportId') reportId: string) {
    const report = await this.reportGenerator.getReport(reportId);

    if (!report) {
      return {
        success: false,
        message: '报告不存在',
        reportId,
      };
    }

    return {
      success: true,
      report,
    };
  }

  /**
   * 删除报告
   */
  @Delete('reports/:reportId')
  @ApiOperation({ summary: '删除报告' })
  @ApiParam({ name: 'reportId', description: '报告ID' })
  @ApiResponse({ status: 200, description: '报告删除成功' })
  async deleteReport(@Param('reportId') reportId: string) {
    const success = await this.reportGenerator.deleteReport(reportId);

    return {
      success,
      message: success ? '报告删除成功' : '报告不存在或删除失败',
      reportId,
    };
  }

  /**
   * 设置任务优先级
   */
  @Post('tasks/:taskId/priority')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '设置任务优先级' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({ status: 200, description: '优先级设置成功' })
  async setTaskPriority(
    @Param('taskId') taskId: number,
    @Body() body: {
      priority: TaskPriority;
      reason?: string;
    }
  ) {
    await this.priorityManager.setTaskPriority(
      taskId,
      body.priority,
      body.reason
    );

    return {
      success: true,
      message: '任务优先级设置成功',
      taskId,
      priority: body.priority,
      reason: body.reason,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 添加任务依赖关系
   */
  @Post('tasks/:taskId/dependencies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '添加任务依赖关系' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({ status: 200, description: '依赖关系添加成功' })
  async addTaskDependency(
    @Param('taskId') taskId: number,
    @Body() body: {
      dependsOnTaskId: number;
      dependencyType: string;
      maxWaitTime?: number;
      autoResolve?: boolean;
    }
  ) {
    await this.priorityManager.addTaskDependency(
      taskId,
      body.dependsOnTaskId,
      body.dependencyType as any,
      {
        maxWaitTime: body.maxWaitTime,
        autoResolve: body.autoResolve,
      }
    );

    return {
      success: true,
      message: '任务依赖关系添加成功',
      taskId,
      dependency: body,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 移除任务依赖关系
   */
  @Delete('tasks/:taskId/dependencies/:dependsOnTaskId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '移除任务依赖关系' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiParam({ name: 'dependsOnTaskId', description: '依赖任务ID' })
  @ApiResponse({ status: 200, description: '依赖关系移除成功' })
  async removeTaskDependency(
    @Param('taskId') taskId: number,
    @Param('dependsOnTaskId') dependsOnTaskId: number
  ) {
    await this.priorityManager.removeTaskDependency(taskId, dependsOnTaskId);

    return {
      success: true,
      message: '任务依赖关系移除成功',
      taskId,
      dependsOnTaskId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取优先级队列
   */
  @Get('priority-queue')
  @ApiOperation({ summary: '获取优先级队列' })
  @ApiQuery({ name: 'limit', required: false, description: '返回数量限制', type: Number })
  @ApiResponse({ status: 200, description: '优先级队列' })
  async getPriorityQueue(@Query('limit') limit: number = 50) {
    return await this.priorityManager.getPriorityQueue(limit);
  }

  /**
   * 获取资源使用情况
   */
  @Get('resource-usage')
  @ApiOperation({ summary: '获取系统资源使用情况' })
  @ApiResponse({ status: 200, description: '资源使用情况' })
  async getResourceUsage() {
    return await this.priorityManager.getResourceUsage();
  }

  /**
   * 重置失败任务
   */
  @Post('tasks/:taskId/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重置失败任务' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({ status: 200, description: '任务重置成功' })
  async resetFailedTask(@Param('taskId') taskId: number) {
    const success = await this.taskMonitor.resetFailedTask(taskId);

    return {
      success,
      message: success ? '任务重置成功' : '任务重置失败',
      taskId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取任务统计信息
   */
  @Get('stats')
  @ApiOperation({ summary: '获取任务统计信息' })
  @ApiResponse({ status: 200, description: '任务统计信息' })
  async getTaskStats() {
    return await this.taskScanner.getTaskStats();
  }

  /**
   * 获取监控统计信息
   */
  @Get('monitor-stats')
  @ApiOperation({ summary: '获取监控统计信息' })
  @ApiResponse({ status: 200, description: '监控统计信息' })
  async getMonitorStats() {
    return await this.taskMonitor.getMonitorStats();
  }

  /**
   * 获取详细的任务执行报告
   */
  @Get('execution-report')
  @ApiOperation({ summary: '获取详细的任务执行报告' })
  @ApiResponse({ status: 200, description: '任务执行报告' })
  async getTaskExecutionReport() {
    return await this.taskScanner.getTaskExecutionReport();
  }

  /**
   * 获取待执行任务数量
   */
  @Get('pending-count')
  @ApiOperation({ summary: '获取待执行任务数量' })
  @ApiResponse({ status: 200, description: '待执行任务数量' })
  async getPendingTasksCount() {
    const count = await this.taskScanner.getPendingTasksCount();
    return {
      pendingTasksCount: count,
      timestamp: new Date().toISOString(),
    };
  }
}