import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Logger } from '@pro/logger-nestjs';
import { ErrorHandlerService } from '@pro/error-handling';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MetricType,
  MetricCategory,
  MetricValue,
  TimeSeries,
  MetricSnapshot,
  MetricDimensions,
  AlertEvent,
  MetricThreshold,
  AggregationLevel,
  MetricRegistry,
} from '../types/metrics.types';

interface TimeWindow {
  size: number;
  retention: number;
}

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private registry: MetricRegistry = {};
  private thresholds: Map<string, MetricThreshold> = new Map();
  private windows: Map<AggregationLevel, TimeWindow> = new Map();
  private collectors: Map<string, NodeJS.Timeout> = new Map();
  private isCollecting = false;

  constructor(
    private readonly logger: Logger,
    private readonly errorHandler: ErrorHandlerService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeWindows();
  }

  async onModuleInit() {
    this.startCollection();
    this.logger.log('指标收集服务启动，开始聆听系统心跳', 'MetricsService');
  }

  async onModuleDestroy() {
    await this.stopCollection();
    this.logger.log('指标收集服务优雅停止', 'MetricsService');
  }

  private initializeWindows(): void {
    this.windows.set(AggregationLevel.REALTIME, { size: 300000, retention: 3600000 }); // 5min window, 1h retention
    this.windows.set(AggregationLevel.HOURLY, { size: 3600000, retention: 86400000 }); // 1h window, 24h retention
    this.windows.set(AggregationLevel.DAILY, { size: 86400000, retention: 2592000000 }); // 1d window, 30d retention
    this.windows.set(AggregationLevel.WINDOW, { size: 1800000, retention: 7200000 }); // 30min window, 2h retention
  }

  private startCollection(): void {
    if (this.isCollecting) return;

    this.isCollecting = true;

    // 每秒收集实时指标
    this.collectors.set('realtime', setInterval(() => {
      this.collectRealtimeMetrics();
    }, 1000));

    // 每分钟执行窗口聚合
    this.collectors.set('window', setInterval(() => {
      this.aggregateWindowMetrics();
    }, 60000));

    // 每小时清理过期数据
    this.collectors.set('cleanup', setInterval(() => {
      this.cleanupExpiredMetrics();
    }, 3600000));
  }

  private async stopCollection(): Promise<void> {
    this.isCollecting = false;

    for (const [name, timer] of this.collectors) {
      clearInterval(timer);
      this.logger.debug(`停止指标收集器: ${name}`);
    }

    this.collectors.clear();
  }

  createTimeSeries(
    name: string,
    type: MetricType,
    category: MetricCategory,
    unit: string,
    description: string,
  ): void {
    if (this.registry[name]) {
      this.logger.warn(`指标已存在，跳过创建: ${name}`);
      return;
    }

    this.registry[name] = {
      name,
      type,
      category,
      values: [],
      unit,
      description,
    };

    this.logger.debug(`创建新指标: ${name} [${type}]`, { category, unit });
  }

  recordValue(
    metricName: string,
    value: number,
    dimensions?: MetricDimensions,
  ): void {
    if (!this.registry[metricName]) {
      this.logger.warn(`未知指标: ${metricName}`);
      return;
    }

    const timestamp = Date.now();
    const metricValue: MetricValue = { value, timestamp, dimensions };

    this.registry[metricName].values.push(metricValue);
    this.checkThresholds(metricName, value, dimensions);

    this.logger.debug(`记录指标值: ${metricName}=${value}`, { dimensions });
  }

  incrementCounter(
    metricName: string,
    increment: number = 1,
    dimensions?: MetricDimensions,
  ): void {
    const series = this.registry[metricName];
    if (!series || series.type !== MetricType.COUNTER) {
      this.logger.warn(`无效计数器指标: ${metricName}`);
      return;
    }

    const lastValue = this.getLastValue(metricName);
    const newValue = (lastValue?.value || 0) + increment;

    this.recordValue(metricName, newValue, dimensions);
  }

  setGauge(
    metricName: string,
    value: number,
    dimensions?: MetricDimensions,
  ): void {
    const series = this.registry[metricName];
    if (!series || series.type !== MetricType.GAUGE) {
      this.logger.warn(`无效仪表指标: ${metricName}`);
      return;
    }

    this.recordValue(metricName, value, dimensions);
  }

  recordHistogram(
    metricName: string,
    value: number,
    buckets: number[],
    dimensions?: MetricDimensions,
  ): void {
    const series = this.registry[metricName];
    if (!series || series.type !== MetricType.HISTOGRAM) {
      this.logger.warn(`无效直方图指标: ${metricName}`);
      return;
    }

    // 记录原始值
    this.recordValue(metricName, value, dimensions);

    // 记录分桶数据
    for (const bucket of buckets) {
      if (value <= bucket) {
        const bucketMetric = `${metricName}_bucket_${bucket}`;
        this.incrementCounter(bucketMetric, 1, dimensions);
      }
    }
  }

  getTimeSeries(metricName: string): TimeSeries | null {
    return this.registry[metricName] || null;
  }

  getAllMetrics(): MetricRegistry {
    return { ...this.registry };
  }

  getMetricsByCategory(category: MetricCategory): TimeSeries[] {
    return Object.values(this.registry).filter(metric => metric.category === category);
  }

  getSnapshot(): MetricSnapshot {
    const timestamp = Date.now();

    return {
      timestamp,
      performance: this.extractPerformanceMetrics(),
      business: this.extractBusinessMetrics(),
      system: this.extractSystemMetrics(),
      experience: this.extractExperienceMetrics(),
    };
  }

  setThreshold(threshold: MetricThreshold): void {
    this.thresholds.set(threshold.metricName, threshold);
    this.logger.log(`设置阈值: ${threshold.metricName}`, threshold);
  }

  removeThreshold(metricName: string): void {
    this.thresholds.delete(metricName);
    this.logger.log(`移除阈值: ${metricName}`);
  }

  private getLastValue(metricName: string): MetricValue | null {
    const series = this.registry[metricName];
    if (!series || series.values.length === 0) return null;

    return series.values[series.values.length - 1];
  }

  private checkThresholds(
    metricName: string,
    value: number,
    dimensions?: MetricDimensions,
  ): void {
    const threshold = this.thresholds.get(metricName);
    if (!threshold) return;

    const exceedsWarning = this.compareValue(value, threshold.warning, threshold.comparison);
    const exceedsCritical = this.compareValue(value, threshold.critical, threshold.comparison);

    if (exceedsCritical) {
      this.emitAlert('critical', metricName, value, threshold.critical, dimensions);
    } else if (exceedsWarning) {
      this.emitAlert('warning', metricName, value, threshold.warning, dimensions);
    }
  }

  private compareValue(value: number, threshold: number, comparison: string): boolean {
    switch (comparison) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  private emitAlert(
    severity: 'warning' | 'critical',
    metricName: string,
    currentValue: number,
    threshold: number,
    context?: MetricDimensions,
  ): void {
    const alert: AlertEvent = {
      id: `${metricName}_${Date.now()}`,
      timestamp: Date.now(),
      severity,
      metricName,
      currentValue,
      threshold,
      message: `指标 ${metricName} 超过${severity === 'critical' ? '严重' : '警告'}阈值`,
      context: context || {},
    };

    this.eventEmitter.emit('metric.alert', alert);
    this.logger.warn(`指标告警: ${alert.message}`, alert);
  }

  private collectRealtimeMetrics(): void {
    try {
      // 这里可以收集系统级指标
      const memoryUsage = process.memoryUsage();
      this.setGauge('system_memory_heap_used', memoryUsage.heapUsed);
      this.setGauge('system_memory_heap_total', memoryUsage.heapTotal);
      this.setGauge('system_memory_external', memoryUsage.external);

      const cpuUsage = process.cpuUsage();
      this.setGauge('system_cpu_user', cpuUsage.user);
      this.setGauge('system_cpu_system', cpuUsage.system);

    } catch (error) {
      this.logger.error('实时指标收集失败', error);
    }
  }

  private aggregateWindowMetrics(): void {
    try {
      for (const [metricName, series] of Object.entries(this.registry)) {
        if (series.type === MetricType.HISTOGRAM) {
          this.calculateHistogramStats(metricName, series);
        }
      }
    } catch (error) {
      this.logger.error('窗口指标聚合失败', error);
    }
  }

  private calculateHistogramStats(metricName: string, series: TimeSeries): void {
    const windowStart = Date.now() - 300000; // 5分钟窗口
    const windowValues = series.values
      .filter(v => v.timestamp >= windowStart)
      .map(v => v.value)
      .sort((a, b) => a - b);

    if (windowValues.length === 0) return;

    const p50 = this.calculatePercentile(windowValues, 0.5);
    const p95 = this.calculatePercentile(windowValues, 0.95);
    const p99 = this.calculatePercentile(windowValues, 0.99);

    this.setGauge(`${metricName}_p50`, p50);
    this.setGauge(`${metricName}_p95`, p95);
    this.setGauge(`${metricName}_p99`, p99);
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private cleanupExpiredMetrics(): void {
    const now = Date.now();

    for (const series of Object.values(this.registry)) {
      const retentionTime = this.windows.get(AggregationLevel.DAILY)?.retention || 2592000000;
      const cutoffTime = now - retentionTime;

      series.values = series.values.filter(value => value.timestamp >= cutoffTime);
    }

    this.logger.debug('清理过期指标数据完成');
  }

  private extractPerformanceMetrics(): any {
    return {
      aggregationDuration: this.getTimeSeries('aggregation_duration'),
      throughput: this.getTimeSeries('aggregation_throughput'),
      queryResponseTime: this.getTimeSeries('query_response_time'),
      cacheHitRate: this.getTimeSeries('cache_hit_rate'),
    };
  }

  private extractBusinessMetrics(): any {
    return {
      messageConsumptionRate: this.getTimeSeries('message_consumption_rate'),
      dataAccuracy: this.getTimeSeries('data_accuracy'),
      duplicateMessageRatio: this.getTimeSeries('duplicate_message_ratio'),
      recoverySuccessRate: this.getTimeSeries('recovery_success_rate'),
    };
  }

  private extractSystemMetrics(): any {
    return {
      databaseConnectionUtilization: this.getTimeSeries('db_connection_utilization'),
      redisMemoryUsage: this.getTimeSeries('redis_memory_usage'),
      transactionExecutionTime: this.getTimeSeries('transaction_execution_time'),
      gcPerformance: this.getTimeSeries('gc_performance'),
    };
  }

  private extractExperienceMetrics(): any {
    return {
      apiResponseTimeDistribution: this.getTimeSeries('api_response_time'),
      concurrentRequestCapacity: this.getTimeSeries('concurrent_requests'),
      systemAvailability: this.getTimeSeries('system_availability'),
      dataFreshness: this.getTimeSeries('data_freshness'),
    };
  }
}