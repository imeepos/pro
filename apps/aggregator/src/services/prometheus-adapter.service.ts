import { Injectable } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { Logger } from '@pro/logger-nestjs';
import {
  TimeSeries,
  MetricType,
  PrometheusMetric,
  MetricDimensions,
} from '../types/metrics.types';

interface PrometheusConfig {
  defaultLabels: Record<string, string>;
  prefix: string;
  enableTimestamps: boolean;
}

@Injectable()
export class PrometheusAdapterService {
  private config: PrometheusConfig = {
    defaultLabels: {
      service: 'aggregator',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
    },
    prefix: 'aggregator',
    enableTimestamps: true,
  };

  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: Logger,
  ) {}

  /**
   * 获取 Prometheus 格式的所有指标
   */
  getPrometheusMetrics(): string {
    try {
      const allMetrics = this.metricsService.getAllMetrics();
      const prometheusMetrics: PrometheusMetric[] = [];

      for (const [name, timeSeries] of Object.entries(allMetrics)) {
        const prometheusMetric = this.convertToPrometheusMetric(name, timeSeries);
        if (prometheusMetric) {
          prometheusMetrics.push(prometheusMetric);
        }
      }

      return this.formatPrometheusOutput(prometheusMetrics);

    } catch (error) {
      this.logger.error('生成 Prometheus 指标失败', error);
      return '# 指标生成异常\n';
    }
  }

  /**
   * 获取特定类别的 Prometheus 指标
   */
  getPrometheusMetricsByCategory(category: string): string {
    try {
      const categoryMetrics = this.metricsService.getMetricsByCategory(category as any);
      const prometheusMetrics: PrometheusMetric[] = [];

      for (const timeSeries of categoryMetrics) {
        const prometheusMetric = this.convertToPrometheusMetric(
          timeSeries.name,
          timeSeries,
        );
        if (prometheusMetric) {
          prometheusMetrics.push(prometheusMetric);
        }
      }

      return this.formatPrometheusOutput(prometheusMetrics);

    } catch (error) {
      this.logger.error(`生成类别 ${category} 的 Prometheus 指标失败`, error);
      return '# 指标生成异常\n';
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PrometheusConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log('Prometheus 配置已更新', this.config);
  }

  private convertToPrometheusMetric(
    name: string,
    timeSeries: TimeSeries,
  ): PrometheusMetric | null {
    if (!timeSeries.values.length) {
      return null;
    }

    const prometheusName = this.sanitizeMetricName(name);
    const prometheusType = this.mapMetricType(timeSeries.type);

    // 获取最新的值或聚合值
    const values = this.extractValues(timeSeries);

    return {
      name: prometheusName,
      help: timeSeries.description || `Metric ${prometheusName}`,
      type: prometheusType,
      values,
    };
  }

  private extractValues(timeSeries: TimeSeries): Array<{
    value: number;
    labels?: Record<string, string>;
    timestamp?: number;
  }> {
    const values = [];

    switch (timeSeries.type) {
      case MetricType.COUNTER:
      case MetricType.GAUGE:
        // 对于计数器和仪表，使用最新值
        const latestValue = timeSeries.values[timeSeries.values.length - 1];
        if (latestValue) {
          values.push({
            value: latestValue.value,
            labels: this.combineLabels(latestValue.dimensions),
            timestamp: this.config.enableTimestamps ? latestValue.timestamp : undefined,
          });
        }
        break;

      case MetricType.HISTOGRAM:
        // 对于直方图，计算分位数
        values.push(...this.calculateHistogramValues(timeSeries));
        break;

      case MetricType.SUMMARY:
        // 对于摘要，计算统计信息
        values.push(...this.calculateSummaryValues(timeSeries));
        break;
    }

    return values;
  }

  private calculateHistogramValues(timeSeries: TimeSeries): Array<{
    value: number;
    labels?: Record<string, string>;
    timestamp?: number;
  }> {
    const values = [];
    const recentValues = this.getRecentValues(timeSeries, 300000); // 5分钟窗口

    if (recentValues.length === 0) return values;

    const sortedValues = recentValues.map(v => v.value).sort((a, b) => a - b);
    const timestamp = Date.now();

    // 添加分位数
    const percentiles = [0.5, 0.95, 0.99];
    for (const p of percentiles) {
      const value = this.calculatePercentile(sortedValues, p);
      values.push({
        value,
        labels: this.combineLabels({ quantile: p.toString() }),
        timestamp: this.config.enableTimestamps ? timestamp : undefined,
      });
    }

    // 添加总数和总和
    values.push({
      value: sortedValues.length,
      labels: this.combineLabels({}, '_count'),
      timestamp: this.config.enableTimestamps ? timestamp : undefined,
    });

    values.push({
      value: sortedValues.reduce((sum, val) => sum + val, 0),
      labels: this.combineLabels({}, '_sum'),
      timestamp: this.config.enableTimestamps ? timestamp : undefined,
    });

    return values;
  }

  private calculateSummaryValues(timeSeries: TimeSeries): Array<{
    value: number;
    labels?: Record<string, string>;
    timestamp?: number;
  }> {
    const values = [];
    const recentValues = this.getRecentValues(timeSeries, 300000);

    if (recentValues.length === 0) return values;

    const numericValues = recentValues.map(v => v.value);
    const timestamp = Date.now();

    // 计算基本统计信息
    const sum = numericValues.reduce((acc, val) => acc + val, 0);
    const count = numericValues.length;
    const avg = sum / count;

    values.push(
      {
        value: sum,
        labels: this.combineLabels({}, '_sum'),
        timestamp: this.config.enableTimestamps ? timestamp : undefined,
      },
      {
        value: count,
        labels: this.combineLabels({}, '_count'),
        timestamp: this.config.enableTimestamps ? timestamp : undefined,
      },
      {
        value: avg,
        labels: this.combineLabels({ stat: 'avg' }),
        timestamp: this.config.enableTimestamps ? timestamp : undefined,
      },
    );

    return values;
  }

  private getRecentValues(timeSeries: TimeSeries, windowMs: number) {
    const cutoff = Date.now() - windowMs;
    return timeSeries.values.filter(v => v.timestamp >= cutoff);
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }

  private combineLabels(
    dimensions?: MetricDimensions,
    suffix?: string,
  ): Record<string, string> {
    const labels = { ...this.config.defaultLabels };

    if (dimensions) {
      for (const [key, value] of Object.entries(dimensions)) {
        if (value !== undefined && value !== null) {
          labels[key] = String(value);
        }
      }
    }

    return labels;
  }

  private sanitizeMetricName(name: string): string {
    // Prometheus 指标名称规范化
    let sanitized = name
      .replace(/[^a-zA-Z0-9_:]/g, '_')
      .replace(/^[^a-zA-Z_:]/, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // 添加前缀
    if (this.config.prefix) {
      sanitized = `${this.config.prefix}_${sanitized}`;
    }

    return sanitized;
  }

  private mapMetricType(type: MetricType): 'counter' | 'gauge' | 'histogram' | 'summary' {
    switch (type) {
      case MetricType.COUNTER:
        return 'counter';
      case MetricType.GAUGE:
        return 'gauge';
      case MetricType.HISTOGRAM:
        return 'histogram';
      case MetricType.SUMMARY:
        return 'summary';
      default:
        return 'gauge';
    }
  }

  private formatPrometheusOutput(metrics: PrometheusMetric[]): string {
    const lines: string[] = [];

    for (const metric of metrics) {
      // 添加 HELP 注释
      lines.push(`# HELP ${metric.name} ${metric.help}`);

      // 添加 TYPE 注释
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      // 添加指标值
      for (const value of metric.values) {
        let line = metric.name;

        // 添加标签
        if (value.labels && Object.keys(value.labels).length > 0) {
          const labelPairs = Object.entries(value.labels)
            .map(([key, val]) => `${key}="${this.escapeLabel(val)}"`)
            .join(',');
          line += `{${labelPairs}}`;
        }

        // 添加值
        line += ` ${value.value}`;

        // 添加时间戳（如果启用）
        if (value.timestamp) {
          line += ` ${value.timestamp}`;
        }

        lines.push(line);
      }

      // 添加空行分隔
      lines.push('');
    }

    return lines.join('\n');
  }

  private escapeLabel(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t');
  }

  /**
   * 获取指标摘要信息
   */
  getMetricsSummary(): {
    totalMetrics: number;
    metricsByType: Record<string, number>;
    metricsByCategory: Record<string, number>;
    lastUpdate: number;
  } {
    const allMetrics = this.metricsService.getAllMetrics();
    const summary = {
      totalMetrics: Object.keys(allMetrics).length,
      metricsByType: {} as Record<string, number>,
      metricsByCategory: {} as Record<string, number>,
      lastUpdate: Date.now(),
    };

    for (const metric of Object.values(allMetrics)) {
      // 按类型统计
      summary.metricsByType[metric.type] =
        (summary.metricsByType[metric.type] || 0) + 1;

      // 按分类统计
      summary.metricsByCategory[metric.category] =
        (summary.metricsByCategory[metric.category] || 0) + 1;
    }

    return summary;
  }
}