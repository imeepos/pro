import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeiboSearchTaskEntity } from '@pro/entities';

// 导入增强服务
import { EnhancedTaskStateTracker } from './enhanced-task-state-tracker.service.js';
import { IntelligentRetryManager } from './intelligent-retry-manager.service.js';
import { TaskPerformanceCollector } from './task-performance-collector.service.js';
import { TaskPriorityDependencyManager } from './task-priority-dependency-manager.service.js';
import { TaskExecutionReportGenerator } from './task-execution-report-generator.service.js';
import { EnhancedTaskOrchestrator } from './enhanced-task-orchestrator.service.js';

// 导入现有服务
import { TaskScannerScheduler } from './task-scanner-scheduler.service.js';
import { TaskMonitor } from './task-monitor.service.js';

// 导入依赖模块
import { RabbitMQConfigService } from '../rabbitmq/rabbitmq-config.service.js';
import { LoggerModule } from '@pro/logger';
import { RedisClient } from '@pro/redis';

/**
 * 增强任务管理模块
 * 集成所有智能任务管理组件的统一模块
 *
 * 模块特性：
 * - 状态追踪：记录任务生命周期的每个重要时刻
 * - 智能重试：基于失败类型的自适应重试策略
 * - 性能监控：实时收集和分析任务执行性能
 * - 优先级管理：动态调整任务执行优先级和依赖关系
 * - 报告生成：自动生成各种类型的任务执行报告
 * - 编排协调：统一管理所有任务管理组件
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([WeiboSearchTaskEntity]),
    LoggerModule,
  ],
  providers: [
    // 增强服务组件
    EnhancedTaskStateTracker,
    IntelligentRetryManager,
    TaskPerformanceCollector,
    TaskPriorityDependencyManager,
    TaskExecutionReportGenerator,
    EnhancedTaskOrchestrator,

    // 现有服务组件（增强版）
    TaskScannerScheduler,
    TaskMonitor,

    // 依赖服务
    RabbitMQConfigService,
    {
      provide: 'RedisService',
      useFactory: () => new RedisClient('redis://localhost:6379'),
    },
  ],
  exports: [
    // 导出增强服务供其他模块使用
    EnhancedTaskStateTracker,
    IntelligentRetryManager,
    TaskPerformanceCollector,
    TaskPriorityDependencyManager,
    TaskExecutionReportGenerator,
    EnhancedTaskOrchestrator,

    // 导出增强版现有服务
    TaskScannerScheduler,
    TaskMonitor,
  ],
})
export class EnhancedTaskManagementModule {}