import { Injectable, OnModuleInit } from '@nestjs/common';
import { Logger } from '@pro/logger';
import { MetricsService } from './metrics.service';
import { AlertManagerService } from './alert-manager.service';
import {
  MetricType,
  MetricCategory,
  MetricThreshold,
} from '../types/metrics.types';

/**
 * 监控初始化服务
 *
 * 系统启动时的指挥家，为监控体系奠定基础
 * 每个指标的诞生都有其深刻的意义
 */
@Injectable()
export class MonitoringInitializerService implements OnModuleInit {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertManager: AlertManagerService,
    private readonly logger: Logger,
  ) {
    // 设置全局实例以供装饰器使用
    global['metricsServiceInstance'] = this.metricsService;
    global['loggerInstance'] = this.logger;
  }

  async onModuleInit() {
    await this.initializeMetrics();
    await this.setupAlertThresholds();
    this.logger.log('监控系统初始化完成，系统心跳开始律动', 'MonitoringInitializer');
  }

  private async initializeMetrics(): Promise<void> {
    // 性能指标 - 系统效率的艺术展现
    this.createPerformanceMetrics();

    // 业务指标 - 核心逻辑的价值体现
    this.createBusinessMetrics();

    // 系统资源指标 - 基础设施的健康脉搏
    this.createSystemMetrics();

    // 用户体验指标 - 服务质量的最终评判
    this.createExperienceMetrics();

    this.logger.log('所有核心指标已注册，监控之眼开始凝视');
  }

  private createPerformanceMetrics(): void {
    const performanceMetrics = [
      {
        name: 'aggregation_duration',
        type: MetricType.HISTOGRAM,
        category: MetricCategory.PERFORMANCE,
        unit: 'ms',
        description: '聚合处理耗时分布 - 数据转化的时间艺术',
      },
      {
        name: 'aggregation_throughput',
        type: MetricType.GAUGE,
        category: MetricCategory.PERFORMANCE,
        unit: 'tps',
        description: '数据处理吞吐量 - 系统处理能力的脉搏',
      },
      {
        name: 'query_response_time',
        type: MetricType.HISTOGRAM,
        category: MetricCategory.PERFORMANCE,
        unit: 'ms',
        description: '滑动窗口查询响应时间 - 智慧检索的速度',
      },
      {
        name: 'cache_hit_rate',
        type: MetricType.GAUGE,
        category: MetricCategory.PERFORMANCE,
        unit: '%',
        description: '缓存命中率 - 记忆效率的体现',
      },
      {
        name: 'cache_operations_total',
        type: MetricType.COUNTER,
        category: MetricCategory.PERFORMANCE,
        unit: 'count',
        description: '缓存操作总数 - 存储交互的累积',
      },
    ];

    for (const metric of performanceMetrics) {
      this.metricsService.createTimeSeries(
        metric.name,
        metric.type,
        metric.category,
        metric.unit,
        metric.description,
      );
    }

    this.logger.debug('性能指标注册完成');
  }

  private createBusinessMetrics(): void {
    const businessMetrics = [
      {
        name: 'message_consumption_rate',
        type: MetricType.GAUGE,
        category: MetricCategory.BUSINESS,
        unit: 'msg/s',
        description: '消息消费速率 - 数据流的节拍',
      },
      {
        name: 'message_queue_depth',
        type: MetricType.GAUGE,
        category: MetricCategory.BUSINESS,
        unit: 'count',
        description: '消息队列积压量 - 待处理任务的深度',
      },
      {
        name: 'data_accuracy_score',
        type: MetricType.GAUGE,
        category: MetricCategory.BUSINESS,
        unit: 'score',
        description: '数据准确性评分 - 质量的量化体现',
      },
      {
        name: 'duplicate_message_ratio',
        type: MetricType.GAUGE,
        category: MetricCategory.BUSINESS,
        unit: '%',
        description: '重复消息处理比率 - 去重效率的镜像',
      },
      {
        name: 'recovery_success_rate',
        type: MetricType.GAUGE,
        category: MetricCategory.BUSINESS,
        unit: '%',
        description: '错误恢复成功率 - 系统韧性的象征',
      },
      {
        name: 'hourly_aggregation_jobs',
        type: MetricType.COUNTER,
        category: MetricCategory.BUSINESS,
        unit: 'count',
        description: '小时级聚合任务数 - 时间维度的统计艺术',
      },
      {
        name: 'daily_aggregation_jobs',
        type: MetricType.COUNTER,
        category: MetricCategory.BUSINESS,
        unit: 'count',
        description: '日级聚合任务数 - 日度韵律的记录',
      },
    ];

    for (const metric of businessMetrics) {
      this.metricsService.createTimeSeries(
        metric.name,
        metric.type,
        metric.category,
        metric.unit,
        metric.description,
      );
    }

    this.logger.debug('业务指标注册完成');
  }

  private createSystemMetrics(): void {
    const systemMetrics = [
      {
        name: 'db_connection_utilization',
        type: MetricType.GAUGE,
        category: MetricCategory.SYSTEM,
        unit: '%',
        description: '数据库连接池使用率 - 连接资源的智慧管理',
      },
      {
        name: 'redis_memory_usage',
        type: MetricType.GAUGE,
        category: MetricCategory.SYSTEM,
        unit: 'MB',
        description: 'Redis内存使用量 - 缓存存储的空间艺术',
      },
      {
        name: 'transaction_execution_time',
        type: MetricType.HISTOGRAM,
        category: MetricCategory.SYSTEM,
        unit: 'ms',
        description: '事务执行时间分布 - 数据一致性的时间代价',
      },
      {
        name: 'gc_pause_time',
        type: MetricType.HISTOGRAM,
        category: MetricCategory.SYSTEM,
        unit: 'ms',
        description: 'GC暂停时间 - 内存清理的节奏',
      },
      {
        name: 'system_memory_heap_used',
        type: MetricType.GAUGE,
        category: MetricCategory.SYSTEM,
        unit: 'bytes',
        description: '堆内存使用量 - 程序运行的内存足迹',
      },
      {
        name: 'system_memory_heap_total',
        type: MetricType.GAUGE,
        category: MetricCategory.SYSTEM,
        unit: 'bytes',
        description: '堆内存总量 - 可用内存的边界',
      },
      {
        name: 'system_cpu_user',
        type: MetricType.GAUGE,
        category: MetricCategory.SYSTEM,
        unit: 'microseconds',
        description: '用户态CPU时间 - 计算资源的用户消耗',
      },
      {
        name: 'system_cpu_system',
        type: MetricType.GAUGE,
        category: MetricCategory.SYSTEM,
        unit: 'microseconds',
        description: '系统态CPU时间 - 计算资源的系统消耗',
      },
    ];

    for (const metric of systemMetrics) {
      this.metricsService.createTimeSeries(
        metric.name,
        metric.type,
        metric.category,
        metric.unit,
        metric.description,
      );
    }

    this.logger.debug('系统指标注册完成');
  }

  private createExperienceMetrics(): void {
    const experienceMetrics = [
      {
        name: 'api_response_time',
        type: MetricType.HISTOGRAM,
        category: MetricCategory.EXPERIENCE,
        unit: 'ms',
        description: 'API响应时间分布 - 用户等待的时间感知',
      },
      {
        name: 'concurrent_requests',
        type: MetricType.GAUGE,
        category: MetricCategory.EXPERIENCE,
        unit: 'count',
        description: '并发请求数量 - 系统负载的实时写照',
      },
      {
        name: 'system_availability',
        type: MetricType.GAUGE,
        category: MetricCategory.EXPERIENCE,
        unit: '%',
        description: '系统可用性 - 服务稳定性的承诺',
      },
      {
        name: 'data_freshness',
        type: MetricType.GAUGE,
        category: MetricCategory.EXPERIENCE,
        unit: 'seconds',
        description: '数据新鲜度 - 信息时效性的度量',
      },
      {
        name: 'error_rate',
        type: MetricType.GAUGE,
        category: MetricCategory.EXPERIENCE,
        unit: '%',
        description: '错误率 - 系统稳定性的反向指标',
      },
    ];

    for (const metric of experienceMetrics) {
      this.metricsService.createTimeSeries(
        metric.name,
        metric.type,
        metric.category,
        metric.unit,
        metric.description,
      );
    }

    this.logger.debug('用户体验指标注册完成');
  }

  private async setupAlertThresholds(): Promise<void> {
    const alertRules = [
      {
        name: '缓存命中率过低告警',
        description: '当缓存命中率低于阈值时，系统性能可能受到影响',
        category: MetricCategory.PERFORMANCE,
        enabled: true,
        threshold: {
          metricName: 'cache_hit_rate',
          warning: 70,
          critical: 50,
          unit: '%',
          comparison: 'lt' as const,
        },
        cooldownMs: 300000, // 5分钟冷却
        escalationLevels: [
          {
            level: 0,
            delayMs: 0,
            channels: [{ type: 'log' as const, config: {}, enabled: true }],
            condition: 'consecutive' as const,
            count: 3,
          },
        ],
      },
      {
        name: 'API响应时间过长告警',
        description: '当API响应时间超过用户体验阈值时',
        category: MetricCategory.EXPERIENCE,
        enabled: true,
        threshold: {
          metricName: 'api_response_time_p95',
          warning: 1000,
          critical: 3000,
          unit: 'ms',
          comparison: 'gt' as const,
        },
        cooldownMs: 600000, // 10分钟冷却
        escalationLevels: [
          {
            level: 0,
            delayMs: 0,
            channels: [{ type: 'log' as const, config: {}, enabled: true }],
            condition: 'consecutive' as const,
            count: 5,
          },
        ],
      },
      {
        name: '内存使用率过高告警',
        description: '当系统内存使用率超过安全阈值时',
        category: MetricCategory.SYSTEM,
        enabled: true,
        threshold: {
          metricName: 'system_memory_heap_used',
          warning: 536870912, // 512MB
          critical: 805306368, // 768MB
          unit: 'bytes',
          comparison: 'gt' as const,
        },
        cooldownMs: 180000, // 3分钟冷却
        escalationLevels: [
          {
            level: 0,
            delayMs: 0,
            channels: [{ type: 'log' as const, config: {}, enabled: true }],
            condition: 'consecutive' as const,
            count: 2,
          },
        ],
      },
      {
        name: '消息队列积压告警',
        description: '当消息队列积压量超过处理能力时',
        category: MetricCategory.BUSINESS,
        enabled: true,
        threshold: {
          metricName: 'message_queue_depth',
          warning: 1000,
          critical: 5000,
          unit: 'count',
          comparison: 'gt' as const,
        },
        cooldownMs: 300000, // 5分钟冷却
        escalationLevels: [
          {
            level: 0,
            delayMs: 0,
            channels: [{ type: 'log' as const, config: {}, enabled: true }],
            condition: 'frequency' as const,
            count: 3,
          },
        ],
      },
      {
        name: '数据准确性下降告警',
        description: '当数据准确性评分低于业务要求时',
        category: MetricCategory.BUSINESS,
        enabled: true,
        threshold: {
          metricName: 'data_accuracy_score',
          warning: 0.95,
          critical: 0.9,
          unit: 'score',
          comparison: 'lt' as const,
        },
        cooldownMs: 900000, // 15分钟冷却
        escalationLevels: [
          {
            level: 0,
            delayMs: 0,
            channels: [{ type: 'log' as const, config: {}, enabled: true }],
            condition: 'consecutive' as const,
            count: 1,
          },
        ],
      },
    ];

    for (const rule of alertRules) {
      this.alertManager.createRule(rule);
    }

    this.logger.log(`配置 ${alertRules.length} 个告警规则，系统守护者就位`);
  }

  /**
   * 设置指标阈值 - 为监控设定边界
   */
  private setMetricThresholds(): void {
    const thresholds: MetricThreshold[] = [
      {
        metricName: 'cache_hit_rate',
        warning: 70,
        critical: 50,
        unit: '%',
        comparison: 'lt',
      },
      {
        metricName: 'api_response_time_p95',
        warning: 1000,
        critical: 3000,
        unit: 'ms',
        comparison: 'gt',
      },
      {
        metricName: 'system_availability',
        warning: 95,
        critical: 90,
        unit: '%',
        comparison: 'lt',
      },
      {
        metricName: 'error_rate',
        warning: 1,
        critical: 5,
        unit: '%',
        comparison: 'gt',
      },
    ];

    for (const threshold of thresholds) {
      this.metricsService.setThreshold(threshold);
    }

    this.logger.debug('指标阈值配置完成');
  }
}