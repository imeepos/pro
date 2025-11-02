import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@pro/logger-nestjs';

export interface PerformanceMetrics {
  operationType: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

export interface TaskMetrics {
  sessionId: string;
  taskType: string;
  startTime: number;
  totalDuration?: number;
  operations: Record<string, { duration: number; success: boolean }>;
  completed: boolean;
  failedOperation?: string;
}

@Injectable()
export class PerformanceMonitorService {
  private readonly metrics: PerformanceMetrics[] = [];
  private readonly cacheStats = new Map<string, CacheStats>();
  private readonly tasks = new Map<string, TaskMetrics>();
  private readonly maxMetricsSize = 10000;

  constructor(private readonly logger: PinoLogger) {}

  startTimer(operationType: string): (success?: boolean, metadata?: Record<string, any>) => void {
    const startTime = Date.now();

    return (success: boolean = true, metadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      this.recordMetric({
        operationType,
        duration,
        success,
        timestamp: new Date(),
        metadata: metadata || {}
      });
    };
  }

  recordCacheHit(cacheType: string): void {
    this.updateCacheStats(cacheType, true);
  }

  recordCacheMiss(cacheType: string): void {
    this.updateCacheStats(cacheType, false);
  }

  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push({
      ...metric,
      metadata: metric.metadata || {}
    });

    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics.splice(0, this.metrics.length - this.maxMetricsSize);
    }

    if (metric.duration > 5000) {
      this.logger.warn('慢操作检测', {
        operationType: metric.operationType,
        duration: metric.duration,
        metadata: metric.metadata
      });
    }
  }

  private updateCacheStats(cacheType: string, isHit: boolean): void {
    if (!this.cacheStats.has(cacheType)) {
      this.cacheStats.set(cacheType, {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalRequests: 0
      });
    }

    const stats = this.cacheStats.get(cacheType)!;
    stats.totalRequests++;

    if (isHit) {
      stats.hits++;
    } else {
      stats.misses++;
    }

    stats.hitRate = stats.hits / stats.totalRequests;
  }

  getPerformanceReport(): {
    averageDurations: Record<string, number>;
    successRates: Record<string, number>;
    cacheStats: Record<string, CacheStats>;
    recentSlowOperations: PerformanceMetrics[];
  } {
    const operationGroups = this.groupMetricsByOperation();
    const averageDurations: Record<string, number> = {};
    const successRates: Record<string, number> = {};

    Object.entries(operationGroups).forEach(([operation, metrics]) => {
      const durations = metrics.map(m => m.duration);
      const successes = metrics.filter(m => m.success).length;

      averageDurations[operation] = durations.reduce((a, b) => a + b, 0) / durations.length;
      successRates[operation] = successes / metrics.length;
    });

    const recentSlowOperations = this.metrics
      .filter(m => m.duration > 3000)
      .slice(-10);

    return {
      averageDurations,
      successRates,
      cacheStats: Object.fromEntries(this.cacheStats),
      recentSlowOperations
    };
  }

  private groupMetricsByOperation(): Record<string, PerformanceMetrics[]> {
    return this.metrics.reduce((groups, metric) => {
      const key = metric.operationType;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetrics[]>);
  }

  startTask(sessionId: string, taskType: string): TaskMetrics {
    const taskMetrics: TaskMetrics = {
      sessionId,
      taskType,
      startTime: Date.now(),
      operations: {},
      completed: false
    };

    this.tasks.set(sessionId, taskMetrics);
    return taskMetrics;
  }

  async measureAsync<T>(
    sessionId: string,
    operationType: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const task = this.tasks.get(sessionId);

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      if (task) {
        task.operations[operationType] = { duration, success: true };
      }

      this.recordMetric({
        operationType,
        duration,
        success: true,
        timestamp: new Date(),
        metadata: { sessionId }
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (task) {
        task.operations[operationType] = { duration, success: false };
        task.failedOperation = operationType;
      }

      this.recordMetric({
        operationType,
        duration,
        success: false,
        timestamp: new Date(),
        metadata: { sessionId, error: error instanceof Error ? error.message : String(error) }
      });

      throw error;
    }
  }

  completeTask(sessionId: string): TaskMetrics {
    const task = this.tasks.get(sessionId);
    if (!task) {
      throw new Error(`Task not found: ${sessionId}`);
    }

    task.totalDuration = Date.now() - task.startTime;
    task.completed = true;

    this.tasks.delete(sessionId);
    return task;
  }

  failTask(sessionId: string, _error: any): TaskMetrics {
    const task = this.tasks.get(sessionId);
    if (!task) {
      throw new Error(`Task not found: ${sessionId}`);
    }

    task.totalDuration = Date.now() - task.startTime;
    task.completed = false;

    this.tasks.delete(sessionId);
    return task;
  }

  logPerformanceReport(): void {
    const report = this.getPerformanceReport();

    this.logger.info('性能监控报告', {
      averageDurations: report.averageDurations,
      successRates: report.successRates,
      cacheStats: report.cacheStats,
      slowOperationsCount: report.recentSlowOperations.length
    });
  }

  cleanup(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const originalLength = this.metrics.length;

    // 清理一天前的指标
    const recentIndex = this.metrics.findIndex(m => m.timestamp > oneDayAgo);
    if (recentIndex > 0) {
      this.metrics.splice(0, recentIndex);
    }

    if (originalLength !== this.metrics.length) {
      this.logger.debug('清理性能指标', {
        originalCount: originalLength,
        currentCount: this.metrics.length,
        cleanedCount: originalLength - this.metrics.length
      });
    }
  }
}