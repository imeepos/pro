import { Injectable } from '@nestjs/common';
import { Logger } from '@pro/logger-nestjs';

export interface TransactionMetric {
  operation: string;
  duration: number;
  attempts: number;
  success: boolean;
  timestamp: Date;
  isolationLevel: string;
  error?: string;
}

export interface PerformanceAlert {
  type: 'SLOW_TRANSACTION' | 'HIGH_RETRY_RATE' | 'FREQUENT_DEADLOCKS' | 'LOW_SUCCESS_RATE';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

export interface AggregatedMetrics {
  totalOperations: number;
  successRate: number;
  avgDuration: number;
  deadlockRate: number;
  slowOperationsCount: number;
  topSlowOperations: Array<{ operation: string; avgDuration: number; count: number }>;
  retryDistribution: Record<number, number>;
}

@Injectable()
export class TransactionMetricsService {
  private metrics: TransactionMetric[] = [];
  private readonly maxMetrics = 10000;
  private readonly alertThresholds = {
    slowTransactionMs: 5000,
    highRetryRate: 0.3,
    frequentDeadlockRate: 0.1,
    lowSuccessRate: 0.9,
  };

  constructor(private readonly logger: Logger) {}

  recordTransaction(metric: TransactionMetric): void {
    this.metrics.push(metric);

    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics * 0.8);
    }

    this.checkForAlerts(metric);

    this.logger.debug('事务指标已记录', {
      operation: metric.operation,
      duration: metric.duration,
      attempts: metric.attempts,
      success: metric.success,
    });
  }

  getAggregatedMetrics(timeWindowMs: number = 3600000): AggregatedMetrics {
    const cutoff = new Date(Date.now() - timeWindowMs);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    if (recentMetrics.length === 0) {
      return this.createEmptyMetrics();
    }

    const totalOperations = recentMetrics.length;
    const successfulOperations = recentMetrics.filter(m => m.success).length;
    const successRate = successfulOperations / totalOperations;

    const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations;

    const deadlocks = recentMetrics.filter(m =>
      !m.success && m.error?.toLowerCase().includes('deadlock')
    ).length;
    const deadlockRate = deadlocks / totalOperations;

    const slowOperations = recentMetrics.filter(m => m.duration > this.alertThresholds.slowTransactionMs);

    const operationStats = this.aggregateByOperation(recentMetrics);
    const topSlowOperations = Object.entries(operationStats)
      .map(([operation, stats]) => ({
        operation,
        avgDuration: stats.totalDuration / stats.count,
        count: stats.count,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    const retryDistribution = this.calculateRetryDistribution(recentMetrics);

    return {
      totalOperations,
      successRate: Math.round(successRate * 100) / 100,
      avgDuration: Math.round(avgDuration),
      deadlockRate: Math.round(deadlockRate * 100) / 100,
      slowOperationsCount: slowOperations.length,
      topSlowOperations,
      retryDistribution,
    };
  }

  getOperationMetrics(operation: string, timeWindowMs: number = 3600000): AggregatedMetrics {
    const cutoff = new Date(Date.now() - timeWindowMs);
    const operationMetrics = this.metrics.filter(
      m => m.operation === operation && m.timestamp >= cutoff
    );

    if (operationMetrics.length === 0) {
      return this.createEmptyMetrics();
    }

    return this.calculateMetricsForData(operationMetrics);
  }

  getSlowTransactions(limit: number = 10): TransactionMetric[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  getRecentFailures(limit: number = 10): TransactionMetric[] {
    return this.metrics
      .filter(m => !m.success)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  generatePerformanceReport(): {
    summary: AggregatedMetrics;
    recentAlerts: PerformanceAlert[];
    recommendations: string[];
  } {
    const summary = this.getAggregatedMetrics();
    const recentAlerts = this.getRecentAlerts();
    const recommendations = this.generateRecommendations(summary);

    this.logger.log('事务性能报告生成', {
      totalOperations: summary.totalOperations,
      successRate: summary.successRate,
      avgDuration: summary.avgDuration,
      alertCount: recentAlerts.length,
    });

    return {
      summary,
      recentAlerts,
      recommendations,
    };
  }

  clearMetrics(): void {
    const oldCount = this.metrics.length;
    this.metrics = [];
    this.logger.log('事务指标已清理', { clearedCount: oldCount });
  }

  private checkForAlerts(metric: TransactionMetric): void {
    const alerts: PerformanceAlert[] = [];

    if (metric.duration > this.alertThresholds.slowTransactionMs) {
      alerts.push({
        type: 'SLOW_TRANSACTION',
        message: `事务执行缓慢: ${metric.operation}`,
        metric: 'duration',
        value: metric.duration,
        threshold: this.alertThresholds.slowTransactionMs,
        timestamp: new Date(),
      });
    }

    if (metric.attempts > 3) {
      alerts.push({
        type: 'HIGH_RETRY_RATE',
        message: `事务重试次数过多: ${metric.operation}`,
        metric: 'attempts',
        value: metric.attempts,
        threshold: 3,
        timestamp: new Date(),
      });
    }

    if (!metric.success && metric.error?.toLowerCase().includes('deadlock')) {
      alerts.push({
        type: 'FREQUENT_DEADLOCKS',
        message: `检测到死锁: ${metric.operation}`,
        metric: 'deadlock',
        value: 1,
        threshold: 0,
        timestamp: new Date(),
      });
    }

    alerts.forEach(alert => {
      this.logger.warn('事务性能告警', alert);
    });
  }

  private aggregateByOperation(metrics: TransactionMetric[]): Record<string, {
    count: number;
    totalDuration: number;
    successCount: number;
  }> {
    return metrics.reduce((acc, metric) => {
      if (!acc[metric.operation]) {
        acc[metric.operation] = { count: 0, totalDuration: 0, successCount: 0 };
      }

      acc[metric.operation].count++;
      acc[metric.operation].totalDuration += metric.duration;
      if (metric.success) {
        acc[metric.operation].successCount++;
      }

      return acc;
    }, {} as Record<string, { count: number; totalDuration: number; successCount: number }>);
  }

  private calculateRetryDistribution(metrics: TransactionMetric[]): Record<number, number> {
    return metrics.reduce((acc, metric) => {
      acc[metric.attempts] = (acc[metric.attempts] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  }

  private calculateMetricsForData(metrics: TransactionMetric[]): AggregatedMetrics {
    const totalOperations = metrics.length;
    const successfulOperations = metrics.filter(m => m.success).length;
    const successRate = successfulOperations / totalOperations;
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations;
    const deadlocks = metrics.filter(m => !m.success && m.error?.toLowerCase().includes('deadlock')).length;
    const deadlockRate = deadlocks / totalOperations;
    const slowOperations = metrics.filter(m => m.duration > this.alertThresholds.slowTransactionMs);
    const retryDistribution = this.calculateRetryDistribution(metrics);

    return {
      totalOperations,
      successRate: Math.round(successRate * 100) / 100,
      avgDuration: Math.round(avgDuration),
      deadlockRate: Math.round(deadlockRate * 100) / 100,
      slowOperationsCount: slowOperations.length,
      topSlowOperations: [],
      retryDistribution,
    };
  }

  private createEmptyMetrics(): AggregatedMetrics {
    return {
      totalOperations: 0,
      successRate: 0,
      avgDuration: 0,
      deadlockRate: 0,
      slowOperationsCount: 0,
      topSlowOperations: [],
      retryDistribution: {},
    };
  }

  private getRecentAlerts(): PerformanceAlert[] {
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= oneHourAgo);

    const alerts: PerformanceAlert[] = [];
    const currentMetrics = this.getAggregatedMetrics();

    if (currentMetrics.successRate < this.alertThresholds.lowSuccessRate) {
      alerts.push({
        type: 'LOW_SUCCESS_RATE',
        message: '事务成功率过低',
        metric: 'successRate',
        value: currentMetrics.successRate,
        threshold: this.alertThresholds.lowSuccessRate,
        timestamp: new Date(),
      });
    }

    return alerts;
  }

  private generateRecommendations(metrics: AggregatedMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.successRate < 0.95) {
      recommendations.push('建议检查数据库连接配置和事务隔离级别设置');
    }

    if (metrics.deadlockRate > 0.05) {
      recommendations.push('死锁频率较高，建议优化事务顺序和减少事务持有时间');
    }

    if (metrics.avgDuration > 3000) {
      recommendations.push('平均事务时间较长，建议优化查询和减少事务范围');
    }

    if (metrics.slowOperationsCount > metrics.totalOperations * 0.1) {
      recommendations.push('慢事务较多，建议添加数据库索引或拆分大事务');
    }

    if (recommendations.length === 0) {
      recommendations.push('事务性能表现良好，继续保持现有配置');
    }

    return recommendations;
  }
}