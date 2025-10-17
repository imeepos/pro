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

    // 记录请求详情（仅在debug级别）
    this.logger.debug('请求记录添加', {
      url: this.sanitizeUrl(url),
      success,
      duration,
      currentDelayMs: this.currentDelayMs,
      totalRequests: this.requests.length,
      recentSuccessRate: this.calculateRecentSuccessRate(),
      averageResponseTime: this.calculateAverageResponseTime()
    });

    // 对于失败的请求，记录更详细的信息
    if (!success) {
      this.logger.warn('请求失败记录', {
        url: this.sanitizeUrl(url),
        duration,
        failureCount: this.getRecentFailureCount(),
        currentDelayMs: this.currentDelayMs,
        isThrottling: this.getCurrentStats().isThrottling
      });
    }

    // 对于异常慢的请求，记录警告
    if (duration > 10000) { // 超过10秒
      this.logger.warn('请求响应时间过长', {
        url: this.sanitizeUrl(url),
        duration,
        threshold: 10000,
        averageResponseTime: this.calculateAverageResponseTime()
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
      this.logger.warn('触发限流机制', {
        currentDelayMs: this.currentDelayMs,
        requestsPerSecond: stats.requestsPerSecond,
        maxRequestsPerSecond: stats.maxRequestsPerWindow / (this.crawlerConfig.rateMonitoring.windowSizeMs / 1000),
        successRate: Math.round(stats.successRate * 100),
        averageResponseTime: Math.round(stats.averageResponseTime)
      });
    }

    // 等待当前延迟时间
    await this.delay(this.currentDelayMs);

    const waitDuration = Date.now() - waitStartTime;

    this.logger.debug('请求间延迟完成', {
      waitedMs: waitDuration,
      expectedDelayMs: this.currentDelayMs,
      currentStats: {
        requestsPerSecond: Math.round(stats.requestsPerSecond * 100) / 100,
        successRate: Math.round(stats.successRate * 100),
        averageResponseTime: Math.round(stats.averageResponseTime)
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

    this.currentDelayMs = Math.max(
      this.crawlerConfig.rateMonitoring.adaptiveDelay.minDelayMs,
      Math.min(
        this.crawlerConfig.rateMonitoring.adaptiveDelay.maxDelayMs,
        delayMs
      )
    );

    // 只有延迟发生显著变化时才记录日志
    if (Math.abs(this.currentDelayMs - previousDelay) > 100) { // 变化超过100ms才记录
      this.logger.log('请求延迟已调整', {
        previousDelayMs: previousDelay,
        newDelayMs: this.currentDelayMs,
        changeMs: this.currentDelayMs - previousDelay,
        changePercent: previousDelay > 0 ? Math.round(((this.currentDelayMs - previousDelay) / previousDelay) * 100) : 0,
        allowedRange: {
          min: this.crawlerConfig.rateMonitoring.adaptiveDelay.minDelayMs,
          max: this.crawlerConfig.rateMonitoring.adaptiveDelay.maxDelayMs
        },
        currentStats: {
          requestsPerSecond: Math.round(this.getCurrentStats().requestsPerSecond * 100) / 100,
          successRate: Math.round(this.getCurrentStats().successRate * 100),
          averageResponseTime: Math.round(this.getCurrentStats().averageResponseTime)
        }
      });
    }
  }

  reset(): void {
    const resetStartTime = Date.now();
    const previousRequestsCount = this.requests.length;
    const previousDelay = this.currentDelayMs;

    this.requests = [];
    this.currentDelayMs = this.crawlerConfig.requestDelay.min;

    const resetDuration = Date.now() - resetStartTime;

    this.logger.log('请求监控已重置', {
      resetTimeMs: resetDuration,
      previousRequestsCount,
      previousDelayMs: previousDelay,
      newDelayMs: this.currentDelayMs
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
}