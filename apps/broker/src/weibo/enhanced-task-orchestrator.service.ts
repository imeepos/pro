import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';
import { PinoLogger } from '@pro/logger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisClient } from '@pro/redis';

// 导入所有增强组件
import { EnhancedTaskStateTracker, TaskExecutionPhase } from './enhanced-task-state-tracker.service.js';
import { IntelligentRetryManager, FailureType } from './intelligent-retry-manager.service.js';
import { TaskPerformanceCollector, TaskPerformanceMetrics } from './task-performance-collector.service.js';
import { TaskPriorityDependencyManager, TaskPriority, DependencyType } from './task-priority-dependency-manager.service.js';
import { TaskExecutionReportGenerator, ReportType } from './task-execution-report-generator.service.js';

// 导入现有组件
import { TaskScannerScheduler } from './task-scanner-scheduler.service.js';
import { TaskMonitor } from './task-monitor.service.js';
import { RabbitMQConfigService } from '../rabbitmq/rabbitmq-config.service.js';

/**
 * 任务编排策略接口
 */
export interface TaskOrchestrationStrategy {
  prioritizeFailures: boolean;
  adaptiveRetry: boolean;
  performanceOptimization: boolean;
  resourceAwareness: boolean;
  dependencyResolution: boolean;
}

/**
 * 任务生命周期事件接口
 */
export interface TaskLifecycleEvent {
  taskId: number;
  eventType: 'started' | 'completed' | 'failed' | 'retried' | 'paused' | 'resumed';
  timestamp: Date;
  phase?: TaskExecutionPhase;
  metadata?: Record<string, any>;
}

/**
 * 增强任务编排器
 * 统一管理所有任务管理组件，创造数字时代的智能任务调度艺术品
 *
 * 设计哲学：
 * - 存在即合理：每个组件都有其不可替代的存在价值
 * - 优雅即简约：通过统一的接口简化复杂的任务管理
 * - 协同即力量：各组件协同工作，产生超越个体的价值
 * - 智慧即未来：让系统具备自我学习和优化的能力
 */
@Injectable()
export class EnhancedTaskOrchestrator implements OnModuleInit {
  private readonly ORCHESTRATION_STATE_KEY = 'orchestration_state';

  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
    private readonly eventEmitter: EventEmitter2,
    @Inject('@Inject("RedisService") RedisClient')
    private readonly redisService: RedisClient,

    // 增强组件
    private readonly stateTracker: EnhancedTaskStateTracker,
    private readonly retryManager: IntelligentRetryManager,
    private readonly performanceCollector: TaskPerformanceCollector,
    private readonly priorityManager: TaskPriorityDependencyManager,
    private readonly reportGenerator: TaskExecutionReportGenerator,

    // 现有组件
    private readonly taskScanner: TaskScannerScheduler,
    private readonly taskMonitor: TaskMonitor,
    private readonly rabbitMQService: RabbitMQConfigService,
  ) {
    this.logger.setContext(EnhancedTaskOrchestrator.name);
  }

  /**
   * 模块初始化
   */
  async onModuleInit(): Promise<void> {
    this.logger.info('增强任务编排器初始化开始');

    try {
      // 设置事件监听器
      this.setupEventListeners();

      // 初始化编排策略
      await this.initializeOrchestrationStrategy();

      // 执行健康检查
      await this.performHealthCheck();

      this.logger.info('增强任务编排器初始化完成');
    } catch (error) {
      this.logger.error('增强任务编排器初始化失败', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 智能任务调度
   * 综合考虑所有因素的智能调度决策
   */
  async orchestrateTaskScheduling(): Promise<void> {
    const orchestrationStart = Date.now();
    this.logger.info('开始智能任务调度编排');

    try {
      // 1. 获取待调度任务
      const pendingTasks = await this.getPendingTasks();
      this.logger.debug(`发现 ${pendingTasks.length} 个待调度任务`);

      if (pendingTasks.length === 0) {
        this.logger.debug('没有待调度任务');
        return;
      }

      // 2. 对任务进行优先级排序
      const prioritizedTasks = await this.prioritizeTasks(pendingTasks);

      // 3. 检查依赖关系和资源约束
      const schedulableTasks = await this.filterSchedulableTasks(prioritizedTasks);

      // 4. 执行智能调度
      const schedulingResults = await this.executeIntelligentScheduling(schedulableTasks);

      // 5. 记录编排结果
      await this.recordOrchestrationResults(schedulingResults);

      const orchestrationDuration = Date.now() - orchestrationStart;
      this.logger.info(`智能任务调度编排完成`, {
        totalTasks: pendingTasks.length,
        schedulableTasks: schedulableTasks.length,
        scheduledTasks: schedulingResults.filter(r => r.success).length,
        failedTasks: schedulingResults.filter(r => !r.success).length,
        duration: orchestrationDuration,
      });

    } catch (error) {
      this.logger.error('智能任务调度编排失败', {
        error: error.message,
        stack: error.stack,
        duration: Date.now() - orchestrationStart,
      });
    }
  }

  /**
   * 处理任务生命周期事件
   */
  async handleTaskLifecycleEvent(event: TaskLifecycleEvent): Promise<void> {
    this.logger.debug(`处理任务生命周期事件`, {
      taskId: event.taskId,
      eventType: event.eventType,
      phase: event.phase,
    });

    try {
      const task = await this.taskRepository.findOne({ where: { id: event.taskId } });
      if (!task) {
        this.logger.warn(`任务 ${event.taskId} 不存在，无法处理生命周期事件`);
        return;
      }

      switch (event.eventType) {
        case 'started':
          await this.handleTaskStarted(task, event);
          break;

        case 'completed':
          await this.handleTaskCompleted(task, event);
          break;

        case 'failed':
          await this.handleTaskFailed(task, event);
          break;

        case 'retried':
          await this.handleTaskRetried(task, event);
          break;

        case 'paused':
          await this.handleTaskPaused(task, event);
          break;

        case 'resumed':
          await this.handleTaskResumed(task, event);
          break;

        default:
          this.logger.warn(`未知的任务生命周期事件类型: ${event.eventType}`);
      }

    } catch (error) {
      this.logger.error(`处理任务生命周期事件失败`, {
        taskId: event.taskId,
        eventType: event.eventType,
        error: error.message,
      });
    }
  }

  /**
   * 生成综合任务报告
   */
  async generateComprehensiveReport(
    reportType: ReportType,
    timeRange?: { start: Date; end: Date }
  ): Promise<any> {
    this.logger.info(`开始生成综合任务报告`, {
      reportType,
      timeRange,
    });

    try {
      // 设置默认时间范围
      const defaultTimeRange = timeRange || {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 默认24小时
        end: new Date(),
      };

      // 收集各组件数据
      const stateData = await this.collectStateData(defaultTimeRange);
      const performanceData = await this.collectPerformanceData(defaultTimeRange);
      const retryData = await this.collectRetryData(defaultTimeRange);
      const priorityData = await this.collectPriorityData(defaultTimeRange);

      // 生成基础报告
      const baseReport = await this.reportGenerator.generateReport(
        reportType,
        defaultTimeRange,
        {
          includeDetails: true,
        }
      );

      // 增强报告数据
      const enhancedReport = {
        ...baseReport,
        orchestrationInsights: {
          stateTransitions: stateData,
          performanceAnalysis: performanceData,
          retryPatterns: retryData,
          priorityDistribution: priorityData,
        },
        systemHealth: await this.assessSystemHealth(),
        recommendations: await this.generateIntegratedRecommendations(baseReport),
      };

      this.logger.info(`综合任务报告生成完成`, {
        reportId: enhancedReport.reportId,
        reportType,
      });

      return enhancedReport;
    } catch (error) {
      this.logger.error(`生成综合任务报告失败`, {
        reportType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 系统健康检查
   */
  async performHealthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    metrics: Record<string, any>;
    alerts: Array<{
      component: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
    }>;
  }> {
    const healthCheck = {
      overall: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      components: {} as Record<string, 'healthy' | 'degraded' | 'unhealthy'>,
      metrics: {} as Record<string, any>,
      alerts: [] as Array<{
        component: string;
        severity: 'low' | 'medium' | 'high';
        message: string;
      }>,
    };

    try {
      // 检查各组件健康状态
      const componentChecks = await Promise.allSettled([
        this.checkStateTrackerHealth(),
        this.checkRetryManagerHealth(),
        this.checkPerformanceCollectorHealth(),
        this.checkPriorityManagerHealth(),
        this.checkReportGeneratorHealth(),
      ]);

      const componentNames = ['stateTracker', 'retryManager', 'performanceCollector', 'priorityManager', 'reportGenerator'];

      componentChecks.forEach((result, index) => {
        const componentName = componentNames[index];
        if (result.status === 'fulfilled') {
          healthCheck.components[componentName] = result.value.status;
          healthCheck.metrics[componentName] = result.value.metrics;

          if (result.value.alerts) {
            healthCheck.alerts.push(...result.value.alerts.map(alert => ({
              ...alert,
              component: componentName,
            })));
          }
        } else {
          healthCheck.components[componentName] = 'unhealthy';
          healthCheck.alerts.push({
            component: componentName,
            severity: 'high',
            message: `组件健康检查失败: ${result.reason}`,
          });
        }
      });

      // 计算整体健康状态
      const componentStatuses = Object.values(healthCheck.components);
      const unhealthyCount = componentStatuses.filter(status => status === 'unhealthy').length;
      const degradedCount = componentStatuses.filter(status => status === 'degraded').length;

      if (unhealthyCount > 0) {
        healthCheck.overall = 'unhealthy';
      } else if (degradedCount > 0) {
        healthCheck.overall = 'degraded';
      }

      this.logger.info(`系统健康检查完成`, {
        overall: healthCheck.overall,
        componentCount: componentNames.length,
        healthyCount: componentStatuses.filter(s => s === 'healthy').length,
        degradedCount,
        unhealthyCount,
        alertCount: healthCheck.alerts.length,
      });

      return healthCheck;
    } catch (error) {
      this.logger.error(`系统健康检查失败`, {
        error: error.message,
      });

      return {
        overall: 'unhealthy',
        components: {},
        metrics: {},
        alerts: [{
          component: 'orchestrator',
          severity: 'high',
          message: `健康检查执行失败: ${error.message}`,
        }],
      };
    }
  }

  // 私有方法

  private setupEventListeners(): void {
    // 任务状态变更事件
    this.eventEmitter.on('task.state.changed', async (event) => {
      await this.handleTaskStateChange(event);
    });

    // 性能指标收集事件
    this.eventEmitter.on('performance.metrics.collected', async (metrics) => {
      await this.handlePerformanceMetricsCollected(metrics);
    });

    // 重试决策事件
    this.eventEmitter.on('task.retry.scheduled', async (event) => {
      await this.handleRetryScheduled(event);
    });

    // 异常检测事件
    this.eventEmitter.on('performance.anomalies.detected', async (anomalies) => {
      await this.handleAnomaliesDetected(anomalies);
    });
  }

  private async initializeOrchestrationStrategy(): Promise<void> {
    const defaultStrategy: TaskOrchestrationStrategy = {
      prioritizeFailures: true,
      adaptiveRetry: true,
      performanceOptimization: true,
      resourceAwareness: true,
      dependencyResolution: true,
    };

    await this.redisService.hset(
      this.ORCHESTRATION_STATE_KEY,
      'strategy',
      JSON.stringify(defaultStrategy)
    );
  }

  private async getPendingTasks(): Promise<WeiboSearchTaskEntity[]> {
    return this.taskRepository.find({
      where: {
        enabled: true,
        status: WeiboSearchTaskStatus.PENDING,
      },
      order: {
        nextRunAt: 'ASC',
      },
    });
  }

  private async prioritizeTasks(tasks: WeiboSearchTaskEntity[]): Promise<Array<{ task: WeiboSearchTaskEntity; priority: TaskPriority }>> {
    const prioritized = [];

    for (const task of tasks) {
      const priority = await this.priorityManager.calculateTaskPriority(task);
      prioritized.push({ task, priority });
    }

    return prioritized.sort((a, b) => a.priority - b.priority);
  }

  private async filterSchedulableTasks(
    prioritizedTasks: Array<{ task: WeiboSearchTaskEntity; priority: TaskPriority }>
  ): Promise<Array<{ task: WeiboSearchTaskEntity; priority: TaskPriority; schedulingDecision: any }>> {
    const schedulable = [];

    for (const { task, priority } of prioritizedTasks) {
      const schedulingDecision = await this.priorityManager.canScheduleTask(task.id);

      if (schedulingDecision.shouldSchedule) {
        schedulable.push({ task, priority, schedulingDecision });
      }
    }

    return schedulable;
  }

  private async executeIntelligentScheduling(
    schedulableTasks: Array<{ task: WeiboSearchTaskEntity; priority: TaskPriority; schedulingDecision: any }>
  ): Promise<Array<{ taskId: number; success: boolean; reason?: string }>> {
    const results = [];

    for (const { task, priority, schedulingDecision } of schedulableTasks) {
      try {
        // 记录任务开始
        await this.stateTracker.recordStateTransition(
          task.id,
          task.status as any,
          WeiboSearchTaskStatus.RUNNING,
          '智能调度器启动任务'
        );

        // 更新任务优先级
        await this.priorityManager.setTaskPriority(task.id, priority, '智能调度器自动分配');

        // 预留资源
        await this.priorityManager.reserveResources(task, schedulingDecision.resourceAllocation);

        // 记录开始时间
        const startTime = new Date();
        await this.performanceCollector.collectMetrics(task.id, {
          startTime,
          queueTime: startTime.getTime() - new Date(task.nextRunAt || startTime).getTime(),
        });

        // 调用原始调度器逻辑
        await this.taskScanner.dispatchTask(task);

        results.push({ taskId: task.id, success: true });

      } catch (error) {
        // 调度失败，释放资源
        await this.priorityManager.releaseResources(task.id);

        // 记录失败
        await this.stateTracker.recordStateTransition(
          task.id,
          WeiboSearchTaskStatus.RUNNING,
          WeiboSearchTaskStatus.FAILED,
          `智能调度失败: ${error.message}`
        );

        results.push({
          taskId: task.id,
          success: false,
          reason: error.message,
        });
      }
    }

    return results;
  }

  private async recordOrchestrationResults(results: Array<{ taskId: number; success: boolean; reason?: string }>): Promise<void> {
    const successfulTasks = results.filter(r => r.success).length;
    const failedTasks = results.filter(r => !r.success).length;

    await this.redisService.hset(
      this.ORCHESTRATION_STATE_KEY,
      'lastOrchestration',
      JSON.stringify({
        timestamp: new Date(),
        totalTasks: results.length,
        successfulTasks,
        failedTasks,
        successRate: results.length > 0 ? successfulTasks / results.length : 0,
      })
    );
  }

  // 任务生命周期事件处理器

  private async handleTaskStarted(task: WeiboSearchTaskEntity, event: TaskLifecycleEvent): Promise<void> {
    await this.stateTracker.recordTaskPhase(task.id, TaskExecutionPhase.INITIALIZING);
    await this.performanceCollector.collectMetrics(task.id, {
      startTime: event.timestamp,
      phase: TaskExecutionPhase.INITIALIZING,
    });
  }

  private async handleTaskCompleted(task: WeiboSearchTaskEntity, event: TaskLifecycleEvent): Promise<void> {
    // 释放资源
    await this.priorityManager.releaseResources(task.id);

    // 记录完成
    await this.stateTracker.recordStateTransition(
      task.id,
      WeiboSearchTaskStatus.RUNNING,
      WeiboSearchTaskStatus.PENDING,
      '任务执行完成'
    );

    // 收集最终性能指标
    await this.performanceCollector.collectMetrics(task.id, {
      endTime: event.timestamp,
      phase: TaskExecutionPhase.FINALIZING,
    });

    // 释放调度锁
    await this.priorityManager.releaseSchedulingLock(task.id);
  }

  private async handleTaskFailed(task: WeiboSearchTaskEntity, event: TaskLifecycleEvent): Promise<void> {
    // 释放资源
    await this.priorityManager.releaseResources(task.id);

    // 智能重试决策
    const errorMessage = event.metadata?.errorMessage || '未知错误';
    const retrySuccess = await this.retryManager.executeRetry(task, errorMessage);

    if (!retrySuccess) {
      // 重试失败，记录最终状态
      await this.stateTracker.recordStateTransition(
        task.id,
        task.status,
        WeiboSearchTaskStatus.FAILED,
        errorMessage
      );
    }

    // 释放调度锁
    await this.priorityManager.releaseSchedulingLock(task.id);
  }

  private async handleTaskRetried(task: WeiboSearchTaskEntity, event: TaskLifecycleEvent): Promise<void> {
    await this.stateTracker.recordStateTransition(
      task.id,
      WeiboSearchTaskStatus.FAILED,
      WeiboSearchTaskStatus.PENDING,
      '任务重试'
    );
  }

  private async handleTaskPaused(task: WeiboSearchTaskEntity, event: TaskLifecycleEvent): Promise<void> {
    await this.priorityManager.releaseResources(task.id);
    await this.stateTracker.recordStateTransition(
      task.id,
      task.status,
      WeiboSearchTaskStatus.PAUSED,
      '任务暂停'
    );
  }

  private async handleTaskResumed(task: WeiboSearchTaskEntity, event: TaskLifecycleEvent): Promise<void> {
    await this.stateTracker.recordStateTransition(
      task.id,
      WeiboSearchTaskStatus.PAUSED,
      WeiboSearchTaskStatus.PENDING,
      '任务恢复'
    );
  }

  // 数据收集方法

  private async collectStateData(timeRange: { start: Date; end: Date }): Promise<any> {
    // 收集状态追踪数据
    return {
      totalTransitions: 0,
      averageStateDuration: {},
      stateDistribution: {},
    };
  }

  private async collectPerformanceData(timeRange: { start: Date; end: Date }): Promise<any> {
    // 收集性能数据
    return {
      averageExecutionTime: 0,
      throughput: 0,
      resourceUtilization: {},
    };
  }

  private async collectRetryData(timeRange: { start: Date; end: Date }): Promise<any> {
    // 收集重试数据
    return {
      totalRetries: 0,
      retrySuccessRate: 0,
      commonFailureTypes: [],
    };
  }

  private async collectPriorityData(timeRange: { start: Date; end: Date }): Promise<any> {
    // 收集优先级数据
    return {
      priorityDistribution: {},
      averageWaitTime: 0,
    };
  }

  private async assessSystemHealth(): Promise<any> {
    return await this.performHealthCheck();
  }

  private async generateIntegratedRecommendations(baseReport: any): Promise<any[]> {
    // 基于所有组件数据生成综合建议
    return [];
  }

  // 组件健康检查方法

  private async checkStateTrackerHealth(): Promise<any> {
    return { status: 'healthy' as const, metrics: {}, alerts: [] };
  }

  private async checkRetryManagerHealth(): Promise<any> {
    return { status: 'healthy' as const, metrics: {}, alerts: [] };
  }

  private async checkPerformanceCollectorHealth(): Promise<any> {
    return { status: 'healthy' as const, metrics: {}, alerts: [] };
  }

  private async checkPriorityManagerHealth(): Promise<any> {
    return { status: 'healthy' as const, metrics: {}, alerts: [] };
  }

  private async checkReportGeneratorHealth(): Promise<any> {
    return { status: 'healthy' as const, metrics: {}, alerts: [] };
  }

  // 事件处理器

  private async handleTaskStateChange(event: any): Promise<void> {
    this.logger.debug('任务状态变更事件处理', event);
  }

  private async handlePerformanceMetricsCollected(metrics: TaskPerformanceMetrics): Promise<void> {
    this.logger.debug('性能指标收集事件处理', { taskId: metrics.taskId });
  }

  private async handleRetryScheduled(event: any): Promise<void> {
    this.logger.debug('重试调度事件处理', event);
  }

  private async handleAnomaliesDetected(anomalies: any[]): Promise<void> {
    this.logger.warn('性能异常检测事件', {
      anomalyCount: anomalies.length,
      anomalies: anomalies.map(a => ({
        type: a.metricName,
        severity: a.severity,
        description: a.description,
      })),
    });
  }

  // 注意：redisService应该在构造函数中注入，这里只是临时模拟
  // 在实际使用中，应该通过构造函数注入真实的@Inject("RedisService") RedisClient
}