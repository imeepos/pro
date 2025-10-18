import { Injectable, Logger, Inject } from '@nestjs/common';
import { CrawlerConfig } from '../config/crawler.interface';

export interface RequestRecord {
  timestamp: number;
  url: string;
  success: boolean;
  duration: number;
}

export interface RateWindow {
  startTime: number;
  endTime: number;
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalDuration: number;
}

export interface RateStats {
  currentDelayMs: number;
  requestsPerSecond: number;
  successRate: number;
  averageResponseTime: number;
  windowSize: number;
  maxRequestsPerWindow: number;
  isThrottling: boolean;
}

@Injectable()
export class RequestMonitorService {
  private readonly logger = new Logger(RequestMonitorService.name);
  private requests: RequestRecord[] = [];
  private currentDelayMs: number;
  private readonly maxHistorySize = 1000;

  constructor(
    @Inject('CRAWLER_CONFIG') private readonly crawlerConfig: CrawlerConfig,
  ) {
    this.currentDelayMs = crawlerConfig.requestDelay.min;
  }

  recordRequest(url: string, success: boolean, duration: number): void {
    if (!this.crawlerConfig.rateMonitoring.enabled) {
      return;
    }

    const recordStartTime = Date.now();
    const record: RequestRecord = {
      timestamp: Date.now(),
      url,
      success,
      duration,
    };

    this.requests.push(record);

    // 保持历史记录大小
    if (this.requests.length > this.maxHistorySize) {
      this.requests.shift();
    }

    // 更新自适应延迟
    if (this.crawlerConfig.rateMonitoring.adaptiveDelay.enabled) {
      this.updateAdaptiveDelay();
    }

    // 清理过期记录
    this.cleanupOldRecords();

    const stats = this.getCurrentStats();

    // 记录请求详情
    this.logger.debug(`📊 ${success ? '✅' : '❌'} 请求记录`, {
      url: this.sanitizeUrl(url),
      success,
      duration,
      durationCategory: this.categorizeResponseTime(duration),
      currentDelayMs: this.currentDelayMs,
      totalRequests: this.requests.length,
      recentSuccessRate: Math.round(this.calculateRecentSuccessRate() * 100),
      averageResponseTime: Math.round(this.calculateAverageResponseTime()),
      requestsPerSecond: Math.round(stats.requestsPerSecond * 100) / 100,
      isThrottling: stats.isThrottling
    });

    // 对于失败的请求，记录更详细的信息
    if (!success) {
      this.logger.warn('❌ 请求失败记录', {
        url: this.sanitizeUrl(url),
        duration,
        failureCount: this.getRecentFailureCount(),
        consecutiveFailures: this.getConsecutiveFailures(),
        currentDelayMs: this.currentDelayMs,
        isThrottling: stats.isThrottling,
        recentSuccessRate: Math.round(this.calculateRecentSuccessRate() * 100),
        failureType: this.classifyFailure(url, duration)
      });
    }

    // 对于异常慢的请求，记录警告
    if (duration > 10000) { // 超过10秒
      this.logger.warn('⏱️ 请求响应时间过长', {
        url: this.sanitizeUrl(url),
        duration,
        durationCategory: 'very_slow',
        threshold: 10000,
        averageResponseTime: Math.round(this.calculateAverageResponseTime()),
        percentile95: this.calculateResponseTimePercentile(95),
        impact: this.assessPerformanceImpact(duration)
      });
    } else if (duration > 5000) { // 超过5秒
      this.logger.warn('⚠️ 请求响应时间较慢', {
        url: this.sanitizeUrl(url),
        duration,
        durationCategory: 'slow',
        threshold: 5000,
        averageResponseTime: Math.round(this.calculateAverageResponseTime())
      });
    }
  }

  async waitForNextRequest(): Promise<void> {
    if (!this.crawlerConfig.rateMonitoring.enabled) {
      return;
    }

    const waitStartTime = Date.now();
    const stats = this.getCurrentStats();

    // 检查是否需要延迟
    if (stats.isThrottling) {
      this.logger.warn('🚦 触发限流机制', {
        currentDelayMs: this.currentDelayMs,
        requestsPerSecond: Math.round(stats.requestsPerSecond * 100) / 100,
        maxRequestsPerSecond: Math.round(stats.maxRequestsPerWindow / (this.crawlerConfig.rateMonitoring.windowSizeMs / 1000) * 100) / 100,
        successRate: Math.round(stats.successRate * 100),
        averageResponseTime: Math.round(stats.averageResponseTime),
        utilizationRate: Math.round((stats.requestsPerSecond / (stats.maxRequestsPerWindow / (this.crawlerConfig.rateMonitoring.windowSizeMs / 1000))) * 100),
        throttlingReason: this.getThrottlingReason(stats)
      });
    }

    // 等待当前延迟时间
    this.logger.debug('⏳ 开始请求间延迟', {
      expectedDelayMs: this.currentDelayMs,
      delayReason: this.getDelayReason(stats),
      isAdaptive: this.crawlerConfig.rateMonitoring.adaptiveDelay.enabled
    });

    await this.delay(this.currentDelayMs);

    const waitDuration = Date.now() - waitStartTime;

    this.logger.debug('✅ 请求间延迟完成', {
      waitedMs: waitDuration,
      expectedDelayMs: this.currentDelayMs,
      delayAccuracy: Math.round((waitDuration / this.currentDelayMs) * 100),
      currentStats: {
        requestsPerSecond: Math.round(stats.requestsPerSecond * 100) / 100,
        successRate: Math.round(stats.successRate * 100),
        averageResponseTime: Math.round(stats.averageResponseTime),
        isThrottling: stats.isThrottling
      }
    });
  }

  getCurrentStats(): RateStats {
    const now = Date.now();
    const windowStart = now - this.crawlerConfig.rateMonitoring.windowSizeMs;

    const windowRequests = this.requests.filter(r => r.timestamp >= windowStart);
    const windowSize = this.crawlerConfig.rateMonitoring.windowSizeMs / 1000; // 转换为秒

    const successCount = windowRequests.filter(r => r.success).length;
    const errorCount = windowRequests.filter(r => !r.success).length;
    const totalDuration = windowRequests.reduce((sum, r) => sum + r.duration, 0);

    const requestsPerSecond = windowRequests.length / windowSize;
    const successRate = windowRequests.length > 0 ? successCount / windowRequests.length : 1;
    const averageResponseTime = windowRequests.length > 0 ? totalDuration / windowRequests.length : 0;

    const isThrottling = windowRequests.length >= this.crawlerConfig.rateMonitoring.maxRequestsPerWindow;

    return {
      currentDelayMs: this.currentDelayMs,
      requestsPerSecond,
      successRate,
      averageResponseTime,
      windowSize,
      maxRequestsPerWindow: this.crawlerConfig.rateMonitoring.maxRequestsPerWindow,
      isThrottling,
    };
  }

  getDetailedStats(): {
    totalRequests: number;
    lastMinuteStats: RateStats;
    lastHourStats: RateStats;
    topUrls: Array<{ url: string; count: number; successRate: number }>;
    errorPattern: Array<{ url: string; errorCount: number; lastError: Date }>;
  } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    const lastMinuteRequests = this.requests.filter(r => r.timestamp >= oneMinuteAgo);
    const lastHourRequests = this.requests.filter(r => r.timestamp >= oneHourAgo);

    const lastMinuteStats = this.calculateStats(lastMinuteRequests, 60);
    const lastHourStats = this.calculateStats(lastHourRequests, 3600);

    // 统计 URL 访问频率
    const urlStats = new Map<string, { count: number; successCount: number }>();
    for (const request of this.requests) {
      const stats = urlStats.get(request.url) || { count: 0, successCount: 0 };
      stats.count++;
      if (request.success) {
        stats.successCount++;
      }
      urlStats.set(request.url, stats);
    }

    const topUrls = Array.from(urlStats.entries())
      .map(([url, stats]) => ({
        url,
        count: stats.count,
        successRate: stats.count > 0 ? stats.successCount / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 统计错误模式
    const errorStats = new Map<string, { count: number; lastTimestamp: number }>();
    for (const request of this.requests) {
      if (!request.success) {
        const stats = errorStats.get(request.url) || { count: 0, lastTimestamp: 0 };
        stats.count++;
        stats.lastTimestamp = Math.max(stats.lastTimestamp, request.timestamp);
        errorStats.set(request.url, stats);
      }
    }

    const errorPattern = Array.from(errorStats.entries())
      .map(([url, stats]) => ({
        url,
        errorCount: stats.count,
        lastError: new Date(stats.lastTimestamp),
      }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 10);

    return {
      totalRequests: this.requests.length,
      lastMinuteStats,
      lastHourStats,
      topUrls,
      errorPattern,
    };
  }

  getCurrentDelay(): number {
    return this.currentDelayMs;
  }

  setCurrentDelay(delayMs: number): void {
    const previousDelay = this.currentDelayMs;
    const stats = this.getCurrentStats();

    this.currentDelayMs = Math.max(
      this.crawlerConfig.rateMonitoring.adaptiveDelay.minDelayMs,
      Math.min(
        this.crawlerConfig.rateMonitoring.adaptiveDelay.maxDelayMs,
        delayMs
      )
    );

    // 只有延迟发生显著变化时才记录日志
    if (Math.abs(this.currentDelayMs - previousDelay) > 100) { // 变化超过100ms才记录
      const changeDirection = this.currentDelayMs > previousDelay ? '⬆️ 增加' : '⬇️ 减少';
      const changeSeverity = this.assessDelayChangeSeverity(previousDelay, this.currentDelayMs);

      this.logger.log(`${changeDirection} 请求延迟已调整`, {
        previousDelayMs: previousDelay,
        newDelayMs: this.currentDelayMs,
        changeMs: this.currentDelayMs - previousDelay,
        changePercent: previousDelay > 0 ? Math.round(((this.currentDelayMs - previousDelay) / previousDelay) * 100) : 0,
        changeSeverity,
        allowedRange: {
          min: this.crawlerConfig.rateMonitoring.adaptiveDelay.minDelayMs,
          max: this.crawlerConfig.rateMonitoring.adaptiveDelay.maxDelayMs,
          utilizationPercent: Math.round((this.currentDelayMs - this.crawlerConfig.rateMonitoring.adaptiveDelay.minDelayMs) /
            (this.crawlerConfig.rateMonitoring.adaptiveDelay.maxDelayMs - this.crawlerConfig.rateMonitoring.adaptiveDelay.minDelayMs) * 100)
        },
        currentStats: {
          requestsPerSecond: Math.round(stats.requestsPerSecond * 100) / 100,
          successRate: Math.round(stats.successRate * 100),
          averageResponseTime: Math.round(stats.averageResponseTime),
          isThrottling: stats.isThrottling
        },
        adjustmentReason: this.getDelayAdjustmentReason(stats, previousDelay, this.currentDelayMs)
      });
    }
  }

  reset(): void {
    const resetStartTime = Date.now();
    const previousRequestsCount = this.requests.length;
    const previousDelay = this.currentDelayMs;
    const previousStats = this.getCurrentStats();

    this.requests = [];
    this.currentDelayMs = this.crawlerConfig.requestDelay.min;

    const resetDuration = Date.now() - resetStartTime;

    this.logger.log('🔄 请求监控已重置', {
      resetTimeMs: resetDuration,
      previousRequestsCount,
      previousDelayMs: previousDelay,
      newDelayMs: this.currentDelayMs,
      clearedData: {
        totalRequests: previousRequestsCount,
        oldSuccessRate: Math.round(previousStats.successRate * 100),
        oldRequestsPerSecond: Math.round(previousStats.requestsPerSecond * 100) / 100,
        oldAverageResponseTime: Math.round(previousStats.averageResponseTime)
      },
      freshStart: {
        baseDelay: this.crawlerConfig.requestDelay.min,
        monitoringEnabled: this.crawlerConfig.rateMonitoring.enabled,
        adaptiveDelayEnabled: this.crawlerConfig.rateMonitoring.adaptiveDelay.enabled
      }
    });
  }

  private updateAdaptiveDelay(): void {
    const stats = this.getCurrentStats();
    const config = this.crawlerConfig.rateMonitoring.adaptiveDelay;

    let newDelay = this.currentDelayMs;

    // 基于请求频率调整
    if (stats.isThrottling) {
      // 超过限制，增加延迟
      newDelay = Math.round(newDelay * config.increaseFactor);
      this.logger.debug(`请求频率过高，增加延迟: ${this.currentDelayMs}ms -> ${newDelay}ms`);
    } else if (stats.requestsPerSecond < this.crawlerConfig.rateMonitoring.maxRequestsPerWindow * 0.7) {
      // 请求频率较低，可以减少延迟
      newDelay = Math.round(newDelay * config.decreaseFactor);
      this.logger.debug(`请求频率正常，减少延迟: ${this.currentDelayMs}ms -> ${newDelay}ms`);
    }

    // 基于成功率调整
    if (stats.successRate < 0.8) {
      // 成功率低于80%，增加延迟
      newDelay = Math.round(newDelay * 1.2);
      this.logger.debug(`成功率较低(${(stats.successRate * 100).toFixed(1)}%)，增加延迟`);
    }

    // 基于响应时间调整
    if (stats.averageResponseTime > 10000) {
      // 平均响应时间超过10秒，增加延迟
      newDelay = Math.round(newDelay * 1.1);
      this.logger.debug(`响应时间较长(${stats.averageResponseTime.toFixed(0)}ms)，增加延迟`);
    }

    // 应用新延迟
    newDelay = Math.max(config.minDelayMs, Math.min(config.maxDelayMs, newDelay));

    if (newDelay !== this.currentDelayMs) {
      this.setCurrentDelay(newDelay);
    }
  }

  private cleanupOldRecords(): void {
    const cutoffTime = Date.now() - this.crawlerConfig.rateMonitoring.windowSizeMs * 2; // 保留2倍窗口时间的历史
    this.requests = this.requests.filter(r => r.timestamp >= cutoffTime);
  }

  private calculateStats(requests: RequestRecord[], windowSizeSeconds: number): RateStats {
    if (requests.length === 0) {
      return {
        currentDelayMs: this.currentDelayMs,
        requestsPerSecond: 0,
        successRate: 1,
        averageResponseTime: 0,
        windowSize: windowSizeSeconds,
        maxRequestsPerWindow: this.crawlerConfig.rateMonitoring.maxRequestsPerWindow,
        isThrottling: false,
      };
    }

    const successCount = requests.filter(r => r.success).length;
    const totalDuration = requests.reduce((sum, r) => sum + r.duration, 0);

    return {
      currentDelayMs: this.currentDelayMs,
      requestsPerSecond: requests.length / windowSizeSeconds,
      successRate: successCount / requests.length,
      averageResponseTime: totalDuration / requests.length,
      windowSize: windowSizeSeconds,
      maxRequestsPerWindow: this.crawlerConfig.rateMonitoring.maxRequestsPerWindow,
      isThrottling: requests.length >= this.crawlerConfig.rateMonitoring.maxRequestsPerWindow,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 新增辅助方法
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // 移除敏感查询参数
      const sanitized = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      return sanitized.length > 100 ? sanitized.substring(0, 100) + '...' : sanitized;
    } catch {
      return url.length > 100 ? url.substring(0, 100) + '...' : url;
    }
  }

  private calculateRecentSuccessRate(windowMinutes: number = 5): number {
    const now = Date.now();
    const windowStart = now - (windowMinutes * 60 * 1000);
    const recentRequests = this.requests.filter(r => r.timestamp >= windowStart);

    if (recentRequests.length === 0) return 1;

    const successCount = recentRequests.filter(r => r.success).length;
    return successCount / recentRequests.length;
  }

  private calculateAverageResponseTime(windowMinutes: number = 5): number {
    const now = Date.now();
    const windowStart = now - (windowMinutes * 60 * 1000);
    const recentRequests = this.requests.filter(r => r.timestamp >= windowStart);

    if (recentRequests.length === 0) return 0;

    const totalDuration = recentRequests.reduce((sum, r) => sum + r.duration, 0);
    return totalDuration / recentRequests.length;
  }

  private getRecentFailureCount(windowMinutes: number = 5): number {
    const now = Date.now();
    const windowStart = now - (windowMinutes * 60 * 1000);
    const recentRequests = this.requests.filter(r => r.timestamp >= windowStart && !r.success);

    return recentRequests.length;
  }

  // 获取实时健康状态
  getHealthStatus(): {
    isHealthy: boolean;
    issues: string[];
    metrics: {
      currentDelay: number;
      successRate: number;
      averageResponseTime: number;
      requestsPerSecond: number;
      recentFailures: number;
    };
    recommendations: string[];
  } {
    const stats = this.getCurrentStats();
    const recentFailures = this.getRecentFailureCount();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 检查各种健康指标
    if (stats.successRate < 0.8) {
      issues.push('low_success_rate');
      recommendations.push('检查网络连接和目标网站状态');
    }

    if (stats.averageResponseTime > 10000) {
      issues.push('high_response_time');
      recommendations.push('考虑增加请求延迟或检查网络状况');
    }

    if (stats.isThrottling) {
      issues.push('rate_limit_active');
      recommendations.push('当前处于限流状态，请耐心等待');
    }

    if (recentFailures > 5) {
      issues.push('recent_failures_high');
      recommendations.push('最近失败次数较多，建议检查配置');
    }

    if (this.currentDelayMs > this.crawlerConfig.rateMonitoring.adaptiveDelay.maxDelayMs * 0.8) {
      issues.push('delay_near_maximum');
      recommendations.push('延迟接近上限，可能存在严重的限流问题');
    }

    const isHealthy = issues.length === 0 && stats.successRate > 0.9;

    return {
      isHealthy,
      issues,
      metrics: {
        currentDelay: this.currentDelayMs,
        successRate: Math.round(stats.successRate * 100),
        averageResponseTime: Math.round(stats.averageResponseTime),
        requestsPerSecond: Math.round(stats.requestsPerSecond * 100) / 100,
        recentFailures
      },
      recommendations
    };
  }

  // 获取性能趋势数据
  getPerformanceTrends(windowMinutes: number = 60): {
    timeline: Array<{
      timestamp: number;
      successRate: number;
      averageResponseTime: number;
      requestsPerMinute: number;
    }>;
    summary: {
      trend: 'improving' | 'degrading' | 'stable';
      performanceScore: number;
    };
  } {
    const now = Date.now();
    const windowStart = now - (windowMinutes * 60 * 1000);
    const windowRequests = this.requests.filter(r => r.timestamp >= windowStart);

    // 按分钟分组计算趋势
    const minuteGroups = new Map<number, RequestRecord[]>();

    windowRequests.forEach(request => {
      const minute = Math.floor(request.timestamp / 60000) * 60000;
      if (!minuteGroups.has(minute)) {
        minuteGroups.set(minute, []);
      }
      minuteGroups.get(minute)!.push(request);
    });

    const timeline = Array.from(minuteGroups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([timestamp, requests]) => {
        const successCount = requests.filter(r => r.success).length;
        const totalDuration = requests.reduce((sum, r) => sum + r.duration, 0);

        return {
          timestamp,
          successRate: requests.length > 0 ? successCount / requests.length : 1,
          averageResponseTime: requests.length > 0 ? totalDuration / requests.length : 0,
          requestsPerMinute: requests.length
        };
      });

    // 计算趋势
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (timeline.length >= 2) {
      const recent = timeline.slice(-3);
      const older = timeline.slice(0, 3);

      const recentSuccessRate = recent.reduce((sum, t) => sum + t.successRate, 0) / recent.length;
      const olderSuccessRate = older.reduce((sum, t) => sum + t.successRate, 0) / older.length;

      const recentResponseTime = recent.reduce((sum, t) => sum + t.averageResponseTime, 0) / recent.length;
      const olderResponseTime = older.reduce((sum, t) => sum + t.averageResponseTime, 0) / older.length;

      if (recentSuccessRate > olderSuccessRate && recentResponseTime < olderResponseTime) {
        trend = 'improving';
      } else if (recentSuccessRate < olderSuccessRate && recentResponseTime > olderResponseTime) {
        trend = 'degrading';
      }
    }

    // 计算性能评分 (0-100)
    const latestStats = timeline[timeline.length - 1];
    const performanceScore = Math.round(
      (latestStats?.successRate || 1) * 50 +
      Math.max(0, (1 - Math.min((latestStats?.averageResponseTime || 0) / 5000, 1))) * 50
    );

    return {
      timeline,
      summary: {
        trend,
        performanceScore
      }
    };
  }

  /**
   * 分类响应时间
   */
  private categorizeResponseTime(duration: number): string {
    if (duration < 1000) return 'fast';
    if (duration < 3000) return 'normal';
    if (duration < 10000) return 'slow';
    return 'very_slow';
  }

  /**
   * 获取连续失败次数
   */
  private getConsecutiveFailures(): number {
    let consecutive = 0;
    for (let i = this.requests.length - 1; i >= 0; i--) {
      if (this.requests[i].success) {
        break;
      }
      consecutive++;
    }
    return consecutive;
  }

  /**
   * 分类失败类型
   */
  private classifyFailure(url: string, duration: number): string {
    if (duration < 1000) return 'fast_failure';
    if (duration < 5000) return 'normal_failure';
    if (duration < 15000) return 'slow_failure';
    return 'timeout_failure';
  }

  /**
   * 计算响应时间百分位数
   */
  private calculateResponseTimePercentile(percentile: number): number {
    if (this.requests.length === 0) return 0;

    const durations = this.requests
      .map(r => r.duration)
      .sort((a, b) => a - b);

    const index = Math.ceil((percentile / 100) * durations.length) - 1;
    return durations[Math.max(0, index)];
  }

  /**
   * 评估性能影响
   */
  private assessPerformanceImpact(duration: number): 'low' | 'medium' | 'high' | 'critical' {
    if (duration < 5000) return 'low';
    if (duration < 10000) return 'medium';
    if (duration < 20000) return 'high';
    return 'critical';
  }

  /**
   * 获取限流原因
   */
  private getThrottlingReason(stats: RateStats): string {
    if (stats.requestsPerSecond > stats.maxRequestsPerWindow / (this.crawlerConfig.rateMonitoring.windowSizeMs / 1000)) {
      return 'rate_limit_exceeded';
    }
    if (stats.successRate < 0.8) {
      return 'low_success_rate';
    }
    if (stats.averageResponseTime > 10000) {
      return 'high_response_time';
    }
    return 'unknown';
  }

  /**
   * 获取延迟原因
   */
  private getDelayReason(stats: RateStats): string {
    if (stats.isThrottling) return 'throttling';
    if (this.currentDelayMs > this.crawlerConfig.requestDelay.max) return 'adaptive_increase';
    if (this.currentDelayMs < this.crawlerConfig.requestDelay.min) return 'adaptive_decrease';
    return 'baseline';
  }

  /**
   * 评估延迟变化严重程度
   */
  private assessDelayChangeSeverity(previousDelay: number, newDelay: number): 'minor' | 'moderate' | 'significant' | 'major' {
    const changePercent = Math.abs(((newDelay - previousDelay) / previousDelay) * 100);

    if (changePercent < 20) return 'minor';
    if (changePercent < 50) return 'moderate';
    if (changePercent < 100) return 'significant';
    return 'major';
  }

  /**
   * 获取延迟调整原因
   */
  private getDelayAdjustmentReason(stats: RateStats, previousDelay: number, newDelay: number): string {
    if (stats.isThrottling) return 'rate_limit_protection';
    if (newDelay > previousDelay) {
      if (stats.successRate < 0.8) return 'low_success_rate_compensation';
      if (stats.averageResponseTime > 10000) return 'high_response_time_compensation';
      return 'performance_degradation';
    } else {
      if (stats.requestsPerSecond < stats.maxRequestsPerWindow * 0.5) return 'under_utilization_optimization';
      return 'performance_improvement';
    }
  }

  /**
   * 获取实时性能基准
   */
  async getPerformanceBenchmark(): Promise<{
    current: RateStats;
    benchmark: {
      excellent: { rps: number; successRate: number; avgResponseTime: number };
      good: { rps: number; successRate: number; avgResponseTime: number };
      acceptable: { rps: number; successRate: number; avgResponseTime: number };
      poor: { rps: number; successRate: number; avgResponseTime: number };
    };
    assessment: {
      level: 'excellent' | 'good' | 'acceptable' | 'poor';
      score: number;
      recommendations: string[];
    };
    trends: {
      direction: 'improving' | 'stable' | 'degrading';
      confidence: number;
    };
  }> {
    const current = this.getCurrentStats();
    const maxRPS = this.crawlerConfig.rateMonitoring.maxRequestsPerWindow / (this.crawlerConfig.rateMonitoring.windowSizeMs / 1000);

    const benchmark = {
      excellent: { rps: maxRPS * 0.9, successRate: 0.95, avgResponseTime: 2000 },
      good: { rps: maxRPS * 0.7, successRate: 0.85, avgResponseTime: 5000 },
      acceptable: { rps: maxRPS * 0.5, successRate: 0.75, avgResponseTime: 10000 },
      poor: { rps: maxRPS * 0.3, successRate: 0.6, avgResponseTime: 15000 }
    };

    // 计算评分 (0-100)
    let score = 0;
    const rpsScore = Math.min((current.requestsPerSecond / benchmark.excellent.rps) * 40, 40);
    const successRateScore = Math.min((current.successRate / benchmark.excellent.successRate) * 30, 30);
    const responseTimeScore = Math.min((benchmark.excellent.avgResponseTime / Math.max(current.averageResponseTime, 1)) * 30, 30);
    score = Math.round(rpsScore + successRateScore + responseTimeScore);

    let level: 'excellent' | 'good' | 'acceptable' | 'poor';
    const recommendations: string[] = [];

    if (score >= 85) {
      level = 'excellent';
    } else if (score >= 70) {
      level = 'good';
    } else if (score >= 50) {
      level = 'acceptable';
      recommendations.push('考虑优化请求频率或目标网站性能');
    } else {
      level = 'poor';
      recommendations.push('当前性能较差，建议检查网络连接和目标网站状态');
      recommendations.push('考虑增加延迟时间或减少并发请求');
    }

    if (current.successRate < 0.8) {
      recommendations.push('成功率偏低，检查请求逻辑和目标网站可用性');
    }

    if (current.averageResponseTime > benchmark.good.avgResponseTime) {
      recommendations.push('响应时间较长，可能需要优化网络或增加延迟');
    }

    // 趋势分析
    const trends = this.getPerformanceTrends(30); // 30分钟趋势
    const direction = trends.summary.trend;
    const confidence = Math.min(trends.timeline.length / 10, 1) * 100; // 数据点越多置信度越高

    return {
      current,
      benchmark,
      assessment: {
        level,
        score,
        recommendations
      },
      trends: {
        direction,
        confidence
      }
    };
  }
}