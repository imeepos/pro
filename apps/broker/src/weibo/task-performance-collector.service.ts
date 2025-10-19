import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { WeiboSearchTaskEntity, WeiboSearchTaskStatus } from '@pro/entities';
import { PinoLogger } from '@pro/logger';
import { RedisClient } from '@pro/redis';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 任务性能指标接口
 * 量化任务执行的每一个维度
 */
export interface TaskPerformanceMetrics {
  taskId: number;
  timestamp: Date;

  // 时间指标
  executionTime?: number;           // 执行时间(ms)
  queueTime?: number;               // 队列等待时间(ms)
  processingTime?: number;          // 处理时间(ms)

  // 资源使用指标
  memoryUsage?: number;             // 内存使用(MB)
  cpuUsage?: number;                // CPU使用率(%)
  diskIO?: number;                  // 磁盘IO(MB)
  networkIO?: number;               // 网络IO(MB)

  // 数据处理指标
  pagesProcessed?: number;          // 处理页数
  dataVolume?: number;              // 数据量(MB)
  recordsFound?: number;            // 发现记录数
  recordsProcessed?: number;        // 处理记录数

  // 质量指标
  errorCount?: number;              // 错误次数
  warningCount?: number;            // 警告次数
  retryCount?: number;              // 重试次数
  successRate?: number;             // 成功率(%)

  // 效率指标
  throughput?: number;              // 吞吐量(records/sec)
  latency?: number;                 // 延迟(ms)
  resourceEfficiency?: number;      // 资源效率评分

  // 扩展指标
  customMetrics?: Record<string, number>;  // 自定义指标
}

/**
 * 性能趋势分析结果
 */
export interface PerformanceTrend {
  metricName: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  trend: 'improving' | 'degrading' | 'stable';
  confidence: number;
  prediction?: {
    nextValue: number;
    confidence: number;
  };
}

/**
 * 性能基准对比
 */
export interface PerformanceBenchmark {
  taskId: number;
  benchmarks: {
    [metricName: string]: {
      current: number;
      average: number;
      best: number;
      worst: number;
      percentile: number;  // 当前值在历史数据中的百分位
    };
  };
  overallScore: number;    // 综合性能评分(0-100)
  ranking: {
    position: number;      // 在同类任务中的排名
    total: number;         // 同类任务总数
  };
}

/**
 * 性能异常检测结果
 */
export interface PerformanceAnomaly {
  taskId: number;
  metricName: string;
  anomalyType: 'spike' | 'drop' | 'trend' | 'pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  confidence: number;
  suggestedActions: string[];
}

/**
 * 任务性能收集器
 * 基于MediaCrawler的性能监控智慧，创造数字时代的性能分析艺术品
 *
 * 设计哲学：
 * - 存在即合理：每个性能指标都有其不可替代的监控价值
 * - 优雅即简约：通过智能聚合简化复杂的性能数据分析
 * - 性能即艺术：将性能监控转化为系统优化的艺术
 * - 数据即智慧：从性能数据中提取系统优化的智慧
 */
@Injectable()
export class TaskPerformanceCollector {
  private readonly METRICS_KEY_PREFIX = 'task_metrics:';
  private readonly AGGREGATED_METRICS_KEY = 'aggregated_metrics';
  private readonly PERFORMANCE_TRENDS_KEY = 'performance_trends';
  private readonly ANOMALIES_KEY = 'performance_anomalies';

  private readonly DEFAULT_METRICS_RETENTION = 7 * 24 * 60 * 60; // 7天
  private readonly AGGREGATION_INTERVALS = [5, 15, 60, 360, 1440]; // 分钟

  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(WeiboSearchTaskEntity)
    private readonly taskRepository: Repository<WeiboSearchTaskEntity>,
    @Inject("RedisService") private readonly redisService: RedisClient,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(TaskPerformanceCollector.name);
  }

  /**
   * 收集任务性能指标
   * 记录任务执行过程中的每一个数字足迹
   */
  async collectMetrics(
    taskId: number,
    metrics: Partial<TaskPerformanceMetrics>
  ): Promise<void> {
    const fullMetrics: TaskPerformanceMetrics = {
      taskId,
      timestamp: new Date(),
      ...metrics,
    };

    // 存储原始指标数据
    const metricsKey = `${this.METRICS_KEY_PREFIX}${taskId}`;
    await this.redisService.zadd(
      metricsKey,
      fullMetrics.timestamp.getTime(),
      JSON.stringify(fullMetrics)
    );

    // 设置过期时间
    await this.redisService.expire(metricsKey, this.DEFAULT_METRICS_RETENTION);

    // 触发聚合处理
    this.eventEmitter.emit('performance.metrics.collected', fullMetrics);

    // 异步执行聚合和异常检测
    this.processMetricsAsync(fullMetrics);

    this.logger.debug(`性能指标已收集`, {
      taskId,
      timestamp: fullMetrics.timestamp.toISOString(),
      executionTime: fullMetrics.executionTime,
      memoryUsage: fullMetrics.memoryUsage,
      throughput: fullMetrics.throughput,
    });
  }

  /**
   * 异步处理指标数据
   * 执行聚合、趋势分析和异常检测
   */
  private async processMetricsAsync(metrics: TaskPerformanceMetrics): Promise<void> {
    try {
      // 执行多时间窗口聚合
      await this.performAggregation(metrics);

      // 检测性能异常
      await this.detectAnomalies(metrics);

      // 更新性能趋势
      await this.updateTrends(metrics);

    } catch (error) {
      this.logger.error(`异步处理性能指标失败`, {
        taskId: metrics.taskId,
        error: error.message,
      });
    }
  }

  /**
   * 执行多时间窗口聚合
   * 为不同粒度的性能分析提供数据
   */
  private async performAggregation(metrics: TaskPerformanceMetrics): Promise<void> {
    for (const intervalMinutes of this.AGGREGATION_INTERVALS) {
      const aggregationKey = `${this.AGGREGATED_METRICS_KEY}:${intervalMinutes}m`;
      const timeWindow = intervalMinutes * 60 * 1000;
      const windowStart = Math.floor(metrics.timestamp.getTime() / timeWindow) * timeWindow;

      // 获取当前窗口的聚合数据
      const existingData = await this.redisService.hget(aggregationKey, `${windowStart}:${metrics.taskId}`);

      let aggregated = existingData ? JSON.parse(existingData) : {
        taskId: metrics.taskId,
        windowStart: new Date(windowStart),
        intervalMinutes,
        count: 0,
        sum: {},
        min: {},
        max: {},
        avg: {},
      };

      // 更新聚合统计
      aggregated.count++;

      // 处理数值型指标
      const numericFields = [
        'executionTime', 'queueTime', 'processingTime',
        'memoryUsage', 'cpuUsage', 'diskIO', 'networkIO',
        'pagesProcessed', 'dataVolume', 'recordsFound', 'recordsProcessed',
        'errorCount', 'warningCount', 'retryCount', 'successRate',
        'throughput', 'latency', 'resourceEfficiency',
      ];

      for (const field of numericFields) {
        const value = metrics[field as keyof TaskPerformanceMetrics] as number;
        if (typeof value === 'number' && !isNaN(value)) {
          // 更新总和
          aggregated.sum[field] = (aggregated.sum[field] || 0) + value;

          // 更新最小值
          if (aggregated.min[field] === undefined || value < aggregated.min[field]) {
            aggregated.min[field] = value;
          }

          // 更新最大值
          if (aggregated.max[field] === undefined || value > aggregated.max[field]) {
            aggregated.max[field] = value;
          }

          // 更新平均值
          aggregated.avg[field] = aggregated.sum[field] / aggregated.count;
        }
      }

      // 保存聚合结果
      await this.redisService.hset(
        aggregationKey,
        `${windowStart}:${metrics.taskId}`,
        JSON.stringify(aggregated)
      );

      // 设置过期时间
      await this.redisService.expire(aggregationKey, this.DEFAULT_METRICS_RETENTION);
    }
  }

  /**
   * 检测性能异常
   * 智能识别异常的性能模式
   */
  private async detectAnomalies(metrics: TaskPerformanceMetrics): Promise<void> {
    const anomalies: PerformanceAnomaly[] = [];

    // 获取历史数据进行对比
    const historicalMetrics = await this.getHistoricalMetrics(
      metrics.taskId,
      24 * 60 * 60 * 1000 // 24小时窗口
    );

    if (historicalMetrics.length < 5) {
      return; // 数据不足，无法检测异常
    }

    // 检测各项指标的异常
    const anomalyDetection = [
      { metric: 'executionTime', threshold: 2.0, type: 'spike' },
      { metric: 'memoryUsage', threshold: 1.5, type: 'spike' },
      { metric: 'cpuUsage', threshold: 1.8, type: 'spike' },
      { metric: 'throughput', threshold: 0.5, type: 'drop' },
      { metric: 'errorRate', threshold: 2.0, type: 'spike' },
    ];

    for (const detection of anomalyDetection) {
      const currentValue = metrics[detection.metric as keyof TaskPerformanceMetrics] as number;
      if (typeof currentValue !== 'number') continue;

      const historicalValues = historicalMetrics
        .map(m => m[detection.metric as keyof TaskPerformanceMetrics] as number)
        .filter(v => typeof v === 'number' && !isNaN(v));

      if (historicalValues.length === 0) continue;

      const avgHistorical = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
      const stdDev = Math.sqrt(
        historicalValues.reduce((sum, val) => sum + Math.pow(val - avgHistorical, 2), 0) / historicalValues.length
      );

      const zScore = Math.abs((currentValue - avgHistorical) / stdDev);

      if (zScore > 2.0) { // 超过2个标准差
        const anomaly: PerformanceAnomaly = {
          taskId: metrics.taskId,
          metricName: detection.metric,
          anomalyType: detection.type as any,
          severity: zScore > 3.0 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
          description: `${detection.metric} 异常: 当前值 ${currentValue.toFixed(2)}, 历史平均 ${avgHistorical.toFixed(2)} (偏离 ${zScore.toFixed(2)}σ)`,
          detectedAt: new Date(),
          confidence: Math.min(0.95, zScore / 4.0),
          suggestedActions: this.generateAnomalyActions(detection.metric, currentValue, avgHistorical),
        };

        anomalies.push(anomaly);
      }
    }

    // 保存异常检测结果
    if (anomalies.length > 0) {
      await this.saveAnomalies(anomalies);

      // 发布异常事件
      this.eventEmitter.emit('performance.anomalies.detected', anomalies);

      this.logger.warn(`检测到性能异常`, {
        taskId: metrics.taskId,
        anomalyCount: anomalies.length,
        anomalies: anomalies.map(a => ({
          metric: a.metricName,
          severity: a.severity,
          description: a.description,
        })),
      });
    }
  }

  /**
   * 更新性能趋势
   * 分析性能变化趋势
   */
  private async updateTrends(metrics: TaskPerformanceMetrics): Promise<void> {
    const trends: PerformanceTrend[] = [];

    // 获取最近的数据点
    const recentMetrics = await this.getHistoricalMetrics(
      metrics.taskId,
      4 * 60 * 60 * 1000 // 4小时窗口
    );

    if (recentMetrics.length < 3) {
      return; // 数据不足，无法分析趋势
    }

    // 分析关键指标的趋势
    const trendMetrics = ['executionTime', 'throughput', 'memoryUsage', 'successRate'];

    for (const metricName of trendMetrics) {
      const values = recentMetrics
        .map(m => m[metricName as keyof TaskPerformanceMetrics] as number)
        .filter(v => typeof v === 'number' && !isNaN(v));

      if (values.length < 3) continue;

      const currentValue = values[values.length - 1];
      const previousValue = values[values.length - 2];
      const changePercent = ((currentValue - previousValue) / previousValue) * 100;

      // 简单的线性趋势分析
      let trend: 'improving' | 'degrading' | 'stable';
      if (Math.abs(changePercent) < 5) {
        trend = 'stable';
      } else {
        // 根据指标类型判断好坏趋势
        const isImproving = this.isImprovingTrend(metricName, changePercent);
        trend = isImproving ? 'improving' : 'degrading';
      }

      // 计算趋势置信度
      const confidence = Math.min(0.9, Math.abs(changePercent) / 20);

      // 简单的线性预测
      const nextValue = currentValue + (currentValue - values[0]) / (values.length - 1);

      trends.push({
        metricName,
        currentValue,
        previousValue,
        changePercent,
        trend,
        confidence,
        prediction: {
          nextValue,
          confidence: confidence * 0.7, // 预测置信度低于趋势置信度
        },
      });
    }

    // 保存趋势数据
    if (trends.length > 0) {
      await this.saveTrends(metrics.taskId, trends);
    }
  }

  /**
   * 获取历史性能指标
   */
  async getHistoricalMetrics(
    taskId: number,
    timeWindow: number = 60 * 60 * 1000 // 默认1小时
  ): Promise<TaskPerformanceMetrics[]> {
    const metricsKey = `${this.METRICS_KEY_PREFIX}${taskId}`;
    const cutoffTime = Date.now() - timeWindow;

    const records = await this.redisService.zrangebyscore(
      metricsKey,
      cutoffTime,
      Date.now()
    );

    return records.map(record => JSON.parse(record));
  }

  /**
   * 获取聚合性能指标
   */
  async getAggregatedMetrics(
    taskId: number,
    intervalMinutes: number,
    timeWindow: number = 24 * 60 * 60 * 1000 // 默认24小时
  ): Promise<any[]> {
    const aggregationKey = `${this.AGGREGATED_METRICS_KEY}:${intervalMinutes}m`;
    const cutoffTime = Date.now() - timeWindow;

    const allAggregated = await this.redisService.hgetall(aggregationKey);
    const taskAggregated = Object.entries(allAggregated)
      .filter(([key, value]) => key.endsWith(`:${taskId}`))
      .map(([key, value]) => JSON.parse(value))
      .filter(item => item.windowStart.getTime() >= cutoffTime)
      .sort((a, b) => a.windowStart.getTime() - b.windowStart.getTime());

    return taskAggregated;
  }

  /**
   * 生成性能基准对比
   */
  async generatePerformanceBenchmark(taskId: number): Promise<PerformanceBenchmark> {
    // 获取任务最近的性能指标
    const recentMetrics = await this.getHistoricalMetrics(taskId, 24 * 60 * 60 * 1000);

    if (recentMetrics.length === 0) {
      throw new Error(`任务 ${taskId} 没有性能数据`);
    }

    // 获取同类任务的历史数据进行对比
    const similarTasks = await this.getSimilarTasks(taskId);
    const allTaskMetrics = await this.getAllTasksHistoricalMetrics(similarTasks, 7 * 24 * 60 * 60 * 1000);

    // 计算基准对比
    const benchmarks: any = {};
    const latestMetrics = recentMetrics[recentMetrics.length - 1];

    const numericFields = [
      'executionTime', 'memoryUsage', 'cpuUsage', 'throughput', 'successRate'
    ];

    for (const field of numericFields) {
      const currentValue = latestMetrics[field as keyof TaskPerformanceMetrics] as number;
      if (typeof currentValue !== 'number') continue;

      const allValues = allTaskMetrics
        .map(m => m[field as keyof TaskPerformanceMetrics] as number)
        .filter(v => typeof v === 'number' && !isNaN(v));

      if (allValues.length === 0) continue;

      const average = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
      const best = Math.max(...allValues);
      const worst = Math.min(...allValues);

      // 计算百分位
      const percentile = (allValues.filter(v => v <= currentValue).length / allValues.length) * 100;

      benchmarks[field] = {
        current: currentValue,
        average,
        best,
        worst,
        percentile,
      };
    }

    // 计算综合性能评分
    const overallScore = this.calculateOverallScore(benchmarks);

    // 计算排名
    const ranking = await this.calculateTaskRanking(taskId, similarTasks);

    return {
      taskId,
      benchmarks,
      overallScore,
      ranking,
    };
  }

  /**
   * 获取性能异常检测结果
   */
  async getAnomalies(
    taskId?: number,
    severity?: string,
    timeWindow: number = 24 * 60 * 60 * 1000
  ): Promise<PerformanceAnomaly[]> {
    const anomaliesKey = this.ANONYMIES_KEY;
    const cutoffTime = Date.now() - timeWindow;

    // 这里应该从Redis或数据库获取异常数据
    // 为了简化，返回空数组
    return [];
  }

  /**
   * 获取性能趋势分析
   */
  async getPerformanceTrends(
    taskId: number,
    timeWindow: number = 24 * 60 * 60 * 1000
  ): Promise<PerformanceTrend[]> {
    const trendsKey = `${this.PERFORMANCE_TRENDS_KEY}:${taskId}`;

    // 这里应该从Redis获取趋势数据
    // 为了简化，返回空数组
    return [];
  }

  /**
   * 清理过期的性能数据
   */
  async cleanupExpiredMetrics(): Promise<void> {
    const cutoffTime = Date.now() - this.DEFAULT_METRICS_RETENTION * 1000;

    // 清理原始指标数据
    const taskMetrics = await this.redisService.keys(`${this.METRICS_KEY_PREFIX}*`);
    for (const key of taskMetrics) {
      await this.redisService.zremrangebyscore(key, 0, cutoffTime);
    }

    // 清理聚合数据
    const aggregatedMetrics = await this.redisService.keys(`${this.AGGREGATED_METRICS_KEY}*`);
    for (const key of aggregatedMetrics) {
      const allData = await this.redisService.hgetall(key);
      const expiredKeys = Object.entries(allData)
        .filter(([windowKey, value]) => {
          const data = JSON.parse(value);
          return data.windowStart.getTime() < cutoffTime;
        })
        .map(([windowKey, value]) => windowKey);

      if (expiredKeys.length > 0) {
        await this.redisService.hdel(key, ...expiredKeys);
      }
    }

    this.logger.debug('性能数据清理完成', {
      cutoffTime: new Date(cutoffTime).toISOString(),
    });
  }

  // 私有辅助方法

  private async saveAnomalies(anomalies: PerformanceAnomaly[]): Promise<void> {
    // 保存异常到Redis或数据库
    for (const anomaly of anomalies) {
      const anomalyKey = `${this.ANONYMIES_KEY}:${anomaly.taskId}`;
      await this.redisService.zadd(
        anomalyKey,
        anomaly.detectedAt.getTime(),
        JSON.stringify(anomaly)
      );
      await this.redisService.expire(anomalyKey, 7 * 24 * 60 * 60);
    }
  }

  private async saveTrends(taskId: number, trends: PerformanceTrend[]): Promise<void> {
    const trendsKey = `${this.PERFORMANCE_TRENDS_KEY}:${taskId}`;
    await this.redisService.setex(
      trendsKey,
      7 * 24 * 60 * 60,
      JSON.stringify({
        taskId,
        updatedAt: new Date(),
        trends,
      })
    );
  }

  private generateAnomalyActions(
    metricName: string,
    currentValue: number,
    historicalAvg: number
  ): string[] {
    const actions: string[] = [];

    switch (metricName) {
      case 'executionTime':
        if (currentValue > historicalAvg * 2) {
          actions.push('检查任务复杂度', '优化算法', '增加超时时间');
        }
        break;

      case 'memoryUsage':
        if (currentValue > historicalAvg * 1.5) {
          actions.push('检查内存泄漏', '优化数据结构', '增加内存限制');
        }
        break;

      case 'cpuUsage':
        if (currentValue > historicalAvg * 1.8) {
          actions.push('检查CPU密集操作', '优化算法', '限制并发数');
        }
        break;

      case 'throughput':
        if (currentValue < historicalAvg * 0.5) {
          actions.push('检查网络连接', '优化I/O操作', '检查数据源');
        }
        break;

      case 'errorRate':
        if (currentValue > historicalAvg * 2) {
          actions.push('检查错误日志', '修复代码bug', '加强异常处理');
        }
        break;
    }

    if (actions.length === 0) {
      actions.push('监控系统状态', '收集更多数据', '联系技术支持');
    }

    return actions;
  }

  private isImprovingTrend(metricName: string, changePercent: number): boolean {
    // 对于某些指标，下降是好的（如执行时间、错误率）
    const decreasingIsBetter = ['executionTime', 'memoryUsage', 'cpuUsage', 'errorRate', 'latency'];

    if (decreasingIsBetter.includes(metricName)) {
      return changePercent < -5; // 下降超过5%认为是改善
    } else {
      return changePercent > 5; // 上升超过5%认为是改善
    }
  }

  private calculateOverallScore(benchmarks: any): number {
    if (Object.keys(benchmarks).length === 0) return 0;

    let totalScore = 0;
    let weightSum = 0;

    // 为不同指标设置权重
    const weights = {
      throughput: 0.3,
      successRate: 0.25,
      executionTime: 0.2,
      memoryUsage: 0.15,
      cpuUsage: 0.1,
    };

    Object.entries(benchmarks).forEach(([metric, data]: [string, any]) => {
      const weight = weights[metric] || 0.1;

      // 根据百分位计算得分
      let score = data.percentile;

      // 对于某些指标，需要反转百分位（执行时间、内存使用等越低越好）
      const decreasingIsBetter = ['executionTime', 'memoryUsage', 'cpuUsage'];
      if (decreasingIsBetter.includes(metric)) {
        score = 100 - data.percentile;
      }

      totalScore += score * weight;
      weightSum += weight;
    });

    return weightSum > 0 ? Math.round(totalScore / weightSum) : 0;
  }

  private async calculateTaskRanking(taskId: number, similarTasks: number[]): Promise<{ position: number; total: number }> {
    // 这里应该实现实际的排名计算逻辑
    // 为了简化，返回默认值
    return {
      position: 1,
      total: similarTasks.length + 1,
    };
  }

  private async getSimilarTasks(taskId: number): Promise<number[]> {
    // 获取相似任务的逻辑
    // 可以基于关键词、任务类型等进行匹配
    return [];
  }

  private async getAllTasksHistoricalMetrics(taskIds: number[], timeWindow: number): Promise<TaskPerformanceMetrics[]> {
    // 获取多个任务的历史指标
    const allMetrics: TaskPerformanceMetrics[] = [];

    for (const taskId of taskIds) {
      const metrics = await this.getHistoricalMetrics(taskId, timeWindow);
      allMetrics.push(...metrics);
    }

    return allMetrics;
  }
}