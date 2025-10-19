/**
 * 性能监控指标类型定义
 * 每个指标都承载着系统心跳的意义
 */

export enum MetricType {
  COUNTER = 'counter',           // 累积计数 - 永远向前的脚步
  GAUGE = 'gauge',              // 瞬时值 - 当下的状态快照
  HISTOGRAM = 'histogram',       // 分布统计 - 时间的艺术分布
  SUMMARY = 'summary',          // 摘要统计 - 智慧的凝练
}

export enum MetricCategory {
  PERFORMANCE = 'performance',   // 性能艺术
  BUSINESS = 'business',        // 业务本质
  SYSTEM = 'system',           // 系统资源之韵
  EXPERIENCE = 'experience',    // 用户体验之诗
}

export enum AggregationLevel {
  REALTIME = 'realtime',       // 实时脉搏
  HOURLY = 'hourly',          // 小时节拍
  DAILY = 'daily',            // 日度韵律
  WINDOW = 'window',          // 窗口智慧
}

export interface MetricDimensions {
  service?: string;
  operation?: string;
  layer?: string;
  status?: string;
  errorCode?: string;
  errorType?: string;
  endpoint?: string;
  cacheType?: string;
  process?: string;
  quantile?: string;
  stat?: string;
  [key: string]: string | undefined;
}

export interface MetricValue {
  value: number;
  timestamp: number;
  dimensions?: MetricDimensions;
}

export interface TimeSeries {
  name: string;
  type: MetricType;
  category: MetricCategory;
  values: MetricValue[];
  unit: string;
  description: string;
}

export interface PerformanceMetrics {
  aggregationDuration: TimeSeries;
  throughput: TimeSeries;
  queryResponseTime: TimeSeries;
  cacheHitRate: TimeSeries;
}

export interface BusinessMetrics {
  messageConsumptionRate: TimeSeries;
  dataAccuracy: TimeSeries;
  duplicateMessageRatio: TimeSeries;
  recoverySuccessRate: TimeSeries;
}

export interface SystemMetrics {
  databaseConnectionUtilization: TimeSeries;
  redisMemoryUsage: TimeSeries;
  transactionExecutionTime: TimeSeries;
  gcPerformance: TimeSeries;
}

export interface ExperienceMetrics {
  apiResponseTimeDistribution: TimeSeries;
  concurrentRequestCapacity: TimeSeries;
  systemAvailability: TimeSeries;
  dataFreshness: TimeSeries;
}

export interface MetricSnapshot {
  timestamp: number;
  performance: PerformanceMetrics;
  business: BusinessMetrics;
  system: SystemMetrics;
  experience: ExperienceMetrics;
}

export interface MetricThreshold {
  metricName: string;
  warning: number;
  critical: number;
  unit: string;
  comparison: 'gt' | 'lt' | 'eq';
}

export interface AlertEvent {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
  metricName: string;
  currentValue: number;
  threshold: number;
  message: string;
  context: MetricDimensions;
}

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: number;
  checks: Record<string, {
    status: 'pass' | 'fail';
    message?: string;
    duration?: number;
  }>;
  metrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
}

export interface PrometheusMetric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  values: Array<{
    value: number;
    labels?: Record<string, string>;
    timestamp?: number;
  }>;
}

// 健康检查相关类型
export interface HealthCheckResult {
  status: 'pass' | 'fail';
  message?: string;
  duration?: number;
  details?: any;
}

export interface ServiceInfo {
  name: string;
  version: string;
  description: string;
  dependencies: string[];
  endpoints: string[];
}

// 指标注册类型
export interface MetricRegistry {
  [key: string]: TimeSeries;
}