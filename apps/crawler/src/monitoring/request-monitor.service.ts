import { Injectable, Logger, Inject } from '@nestjs/common';
import { CrawlerConfig } from '../config/crawler.interface';

export interface RequestRecord {
  timestamp: number;
  url: string;
  success: boolean;
  duration: number;
  domain: string;
  statusCode?: number;
  errorType?: string;
  retryCount?: number;
  userAgent?: string;
  responseSize?: number;
}

export interface RateWindow {
  startTime: number;
  endTime: number;
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalDuration: number;
  uniqueDomains: number;
  errorTypes: Map<string, number>;
  statusCodeDistribution: Map<number, number>;
  retryDistribution: Map<number, number>;
}

export interface RateStats {
  currentDelayMs: number;
  requestsPerSecond: number;
  successRate: number;
  averageResponseTime: number;
  windowSize: number;
  maxRequestsPerWindow: number;
  isThrottling: boolean;
  domainDistribution: Map<string, number>;
  performanceScore: number;
  trendDirection: 'improving' | 'stable' | 'degrading';
  nextRecommendedDelay: number;
  recommendedActions: string[];
}

export interface AdaptiveDelayStrategy {
  name: string;
  enabled: boolean;
  weight: number;
  lastAdjustment: number;
  performance: {
    successRateImprovement: number;
    responseTimeImprovement: number;
    errorReduction: number;
  };
}

export interface IntelligentBackoffConfig {
  enabled: boolean;
  strategies: {
    exponential: { base: number; max: number; factor: number };
    linear: { increment: number; max: number };
    fibonacci: { max: number };
    adaptive: { targetSuccessRate: number; adjustmentFactor: number };
  };
  errorTypeMultipliers: Map<string, number>;
  cooldownPeriods: Map<string, number>;
}

export interface DomainThrottlingRule {
  domain: string;
  maxRequestsPerSecond: number;
  maxConcurrentRequests: number;
  backoffDuration: number;
  recoveryThreshold: number;
  priority: number;
}

@Injectable()
export class RequestMonitorService {
  private readonly logger = new Logger(RequestMonitorService.name);
  private requests: RequestRecord[] = [];
  private currentDelayMs: number;
  private readonly maxHistorySize = 10000;

  // 智能延迟策略
  private adaptiveStrategies: Map<string, AdaptiveDelayStrategy> = new Map();
  private domainThrottlingRules: Map<string, DomainThrottlingRule> = new Map();
  private intelligentBackoffConfig: IntelligentBackoffConfig;

  // 性能监控
  private performanceHistory: Array<{
    timestamp: number;
    delay: number;
    successRate: number;
    averageResponseTime: number;
    requestsPerSecond: number;
  }> = [];

  // 错误模式识别
  private errorPatterns: Map<string, {
    count: number;
    lastOccurrence: number;
    frequency: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendedAction: string;
  }> = new Map();

  constructor(
    @Inject('CRAWLER_CONFIG') private readonly crawlerConfig: CrawlerConfig,
  ) {
    this.currentDelayMs = crawlerConfig.requestDelay.min;
    this.initializeIntelligentFeatures();
  }

  private initializeIntelligentFeatures(): void {
    // 初始化自适应延迟策略
    this.initializeAdaptiveStrategies();

    // 初始化域名限流规则
    this.initializeDomainThrottlingRules();

    // 初始化智能退避配置
    this.initializeIntelligentBackoffConfig();

    this.logger.log(`智能请求监控系统已初始化`, {
      adaptiveStrategies: this.adaptiveStrategies.size,
      domainRules: this.domainThrottlingRules.size,
      initialDelay: this.currentDelayMs
    });
  }

  private initializeAdaptiveStrategies(): void {
    const strategies: AdaptiveDelayStrategy[] = [
      {
        name: 'success_rate_based',
        enabled: true,
        weight: 0.4,
        lastAdjustment: Date.now(),
        performance: { successRateImprovement: 0, responseTimeImprovement: 0, errorReduction: 0 }
      },
      {
        name: 'response_time_based',
        enabled: true,
        weight: 0.3,
        lastAdjustment: Date.now(),
        performance: { successRateImprovement: 0, responseTimeImprovement: 0, errorReduction: 0 }
      },
      {
        name: 'error_rate_based',
        enabled: true,
        weight: 0.2,
        lastAdjustment: Date.now(),
        performance: { successRateImprovement: 0, responseTimeImprovement: 0, errorReduction: 0 }
      },
      {
        name: 'domain_health_based',
        enabled: true,
        weight: 0.1,
        lastAdjustment: Date.now(),
        performance: { successRateImprovement: 0, responseTimeImprovement: 0, errorReduction: 0 }
      }
    ];

    strategies.forEach(strategy => {
      this.adaptiveStrategies.set(strategy.name, strategy);
    });
  }

  private initializeDomainThrottlingRules(): void {
    const prioritizedDomains = [
      { domain: 'weibo.com', maxRPS: 2, maxConcurrent: 1, priority: 1 },
      { domain: 'weibo.cn', maxRPS: 1, maxConcurrent: 1, priority: 2 },
      { domain: 's.weibo.com', maxRPS: 3, maxConcurrent: 2, priority: 3 },
      { domain: 'm.weibo.cn', maxRPS: 2, maxConcurrent: 1, priority: 4 }
    ];

    prioritizedDomains.forEach(({ domain, maxRPS, maxConcurrent, priority }) => {
      this.domainThrottlingRules.set(domain, {
        domain,
        maxRequestsPerSecond: maxRPS,
        maxConcurrentRequests: maxConcurrent,
        backoffDuration: 30000, // 30秒
        recoveryThreshold: 0.8,
        priority
      });
    });
  }

  private initializeIntelligentBackoffConfig(): void {
    this.intelligentBackoffConfig = {
      enabled: true,
      strategies: {
        exponential: { base: 1000, max: 60000, factor: 2 },
        linear: { increment: 5000, max: 30000 },
        fibonacci: { max: 45000 },
        adaptive: { targetSuccessRate: 0.85, adjustmentFactor: 1.5 }
      },
      errorTypeMultipliers: new Map([
        ['rate_limited', 3.0],
        ['timeout', 2.0],
        ['server_error', 2.5],
        ['client_error', 1.5],
        ['network_error', 1.8],
        ['authentication_error', 4.0]
      ]),
      cooldownPeriods: new Map([
        ['rate_limited', 60000],
        ['timeout', 30000],
        ['server_error', 45000],
        ['authentication_error', 300000] // 5分钟
      ])
    };
  }

  recordRequest(url: string, success: boolean, duration: number, additionalInfo?: {
    statusCode?: number;
    errorType?: string;
    retryCount?: number;
    userAgent?: string;
    responseSize?: number;
  }): void {
    if (!this.crawlerConfig.rateMonitoring.enabled) {
      return;
    }

    const recordStartTime = Date.now();
    const domain = this.extractDomain(url);

    const record: RequestRecord = {
      timestamp: Date.now(),
      url,
      success,
      duration,
      domain,
      statusCode: additionalInfo?.statusCode,
      errorType: additionalInfo?.errorType,
      retryCount: additionalInfo?.retryCount || 0,
      userAgent: additionalInfo?.userAgent,
      responseSize: additionalInfo?.responseSize
    };

    this.requests.push(record);

    // 保持历史记录大小
    if (this.requests.length > this.maxHistorySize) {
      this.requests.shift();
    }

    // 检查域名限流规则
    this.checkDomainThrottling(domain, record);

    // 识别错误模式
    if (!success && additionalInfo?.errorType) {
      this.identifyErrorPattern(additionalInfo.errorType, domain);
    }

    // 更新自适应延迟
    if (this.crawlerConfig.rateMonitoring.adaptiveDelay.enabled) {
      this.updateIntelligentAdaptiveDelay();
    }

    // 更新性能历史
    this.updatePerformanceHistory();

    // 清理过期记录
    this.cleanupOldRecords();

    const stats = this.getCurrentIntelligentStats();

    // 智能日志记录
    this.logRequestIntelligently(record, stats);

    // 触发智能预警
    this.triggerIntelligentAlerts(record, stats);
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
      domainDistribution: new Map(),
      performanceScore: 50,
      trendDirection: 'stable' as const,
      nextRecommendedDelay: this.currentDelayMs,
      recommendedActions: []
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
        domainDistribution: new Map(),
        performanceScore: 100,
        trendDirection: 'stable' as const,
        nextRecommendedDelay: this.currentDelayMs,
        recommendedActions: []
      };
    }

    const successCount = requests.filter(r => r.success).length;
    const totalDuration = requests.reduce((sum, r) => sum + r.duration, 0);

    // 计算域名分布
    const domainDistribution = new Map<string, number>();
    requests.forEach(request => {
      const count = domainDistribution.get(request.domain) || 0;
      domainDistribution.set(request.domain, count + 1);
    });

    return {
      currentDelayMs: this.currentDelayMs,
      requestsPerSecond: requests.length / windowSizeSeconds,
      successRate: successCount / requests.length,
      averageResponseTime: totalDuration / requests.length,
      windowSize: windowSizeSeconds,
      maxRequestsPerWindow: this.crawlerConfig.rateMonitoring.maxRequestsPerWindow,
      isThrottling: requests.length >= this.crawlerConfig.rateMonitoring.maxRequestsPerWindow,
      domainDistribution,
      performanceScore: this.calculatePerformanceScore(
        successCount / requests.length,
        totalDuration / requests.length,
        requests.length / windowSizeSeconds
      ),
      trendDirection: 'stable' as const,
      nextRecommendedDelay: this.currentDelayMs,
      recommendedActions: []
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

  // 新增智能方法

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  private checkDomainThrottling(domain: string, record: RequestRecord): void {
    const rule = this.domainThrottlingRules.get(domain);
    if (!rule) return;

    const now = Date.now();
    const recentRequests = this.requests.filter(r =>
      r.domain === domain && r.timestamp >= now - 1000
    );

    if (recentRequests.length >= rule.maxRequestsPerSecond) {
      // 触发域名限流
      this.logger.warn(`域名 ${domain} 触发限流`, {
        domain,
        currentRPS: recentRequests.length,
        maxRPS: rule.maxRequestsPerSecond,
        backoffDuration: rule.backoffDuration,
        priority: rule.priority
      });

      // 应用退避延迟
      const backoffDelay = this.calculateIntelligentBackoff(record.errorType || 'rate_limited', record.retryCount || 0);
      this.setCurrentDelay(Math.max(this.currentDelayMs, backoffDelay));
    }
  }

  private identifyErrorPattern(errorType: string, domain: string): void {
    const patternKey = `${domain}:${errorType}`;
    const now = Date.now();

    const pattern = this.errorPatterns.get(patternKey) || {
      count: 0,
      lastOccurrence: 0,
      frequency: 0,
      severity: 'low' as const,
      recommendedAction: ''
    };

    pattern.count++;
    pattern.lastOccurrence = now;

    // 计算频率（每小时错误次数）
    const hourMs = 60 * 60 * 1000;
    const recentErrors = this.requests.filter(r =>
      r.domain === domain &&
      r.errorType === errorType &&
      r.timestamp >= now - hourMs
    );
    pattern.frequency = recentErrors.length;

    // 评估严重程度
    if (pattern.frequency > 20) {
      pattern.severity = 'critical';
      pattern.recommendedAction = '立即停止请求，检查账户状态和网站政策';
    } else if (pattern.frequency > 10) {
      pattern.severity = 'high';
      pattern.recommendedAction = '大幅增加延迟，减少请求频率';
    } else if (pattern.frequency > 5) {
      pattern.severity = 'medium';
      pattern.recommendedAction = '适度增加延迟，监控错误模式';
    } else {
      pattern.severity = 'low';
      pattern.recommendedAction = '继续监控，保持当前策略';
    }

    this.errorPatterns.set(patternKey, pattern);

    if (pattern.severity === 'critical' || pattern.severity === 'high') {
      this.logger.error(`检测到严重错误模式`, {
        domain,
        errorType,
        severity: pattern.severity,
        frequency: pattern.frequency,
        totalOccurrences: pattern.count,
        recommendedAction: pattern.recommendedAction
      });
    }
  }

  private updateIntelligentAdaptiveDelay(): void {
    const stats = this.getCurrentIntelligentStats();
    let totalWeightedDelay = 0;
    let totalWeight = 0;

    // 应用各种自适应策略
    for (const [name, strategy] of this.adaptiveStrategies) {
      if (!strategy.enabled) continue;

      const strategyDelay = this.calculateStrategyDelay(name, stats);
      totalWeightedDelay += strategyDelay * strategy.weight;
      totalWeight += strategy.weight;
    }

    if (totalWeight > 0) {
      const recommendedDelay = totalWeightedDelay / totalWeight;
      const clampedDelay = Math.max(
        this.crawlerConfig.rateMonitoring.adaptiveDelay.minDelayMs,
        Math.min(this.crawlerConfig.rateMonitoring.adaptiveDelay.maxDelayMs, recommendedDelay)
      );

      if (Math.abs(clampedDelay - this.currentDelayMs) > 100) {
        this.setCurrentDelay(clampedDelay);
      }
    }
  }

  private calculateStrategyDelay(strategyName: string, stats: any): number {
    switch (strategyName) {
      case 'success_rate_based':
        return this.calculateSuccessRateBasedDelay(stats);
      case 'response_time_based':
        return this.calculateResponseTimeBasedDelay(stats);
      case 'error_rate_based':
        return this.calculateErrorRateBasedDelay(stats);
      case 'domain_health_based':
        return this.calculateDomainHealthBasedDelay(stats);
      default:
        return this.currentDelayMs;
    }
  }

  private calculateSuccessRateBasedDelay(stats: any): number {
    const targetSuccessRate = 0.85;
    const currentSuccessRate = stats.successRate;

    if (currentSuccessRate < targetSuccessRate) {
      const deficit = targetSuccessRate - currentSuccessRate;
      const increaseFactor = 1 + (deficit * 3);
      return this.currentDelayMs * increaseFactor;
    } else if (currentSuccessRate > 0.95) {
      return this.currentDelayMs * 0.8; // 成功率很高时可以减少延迟
    }

    return this.currentDelayMs;
  }

  private calculateResponseTimeBasedDelay(stats: any): number {
    const targetResponseTime = 5000; // 5秒
    const currentResponseTime = stats.averageResponseTime;

    if (currentResponseTime > targetResponseTime) {
      const excess = currentResponseTime - targetResponseTime;
      const increaseFactor = 1 + (excess / targetResponseTime);
      return this.currentDelayMs * increaseFactor;
    } else if (currentResponseTime < 2000) {
      return this.currentDelayMs * 0.9; // 响应很快时可以稍微减少延迟
    }

    return this.currentDelayMs;
  }

  private calculateErrorRateBasedDelay(stats: any): number {
    const recentErrors = this.getRecentFailureCount(5);
    const totalRecent = this.requests.filter(r =>
      r.timestamp >= Date.now() - 5 * 60 * 1000
    ).length;

    const errorRate = totalRecent > 0 ? recentErrors / totalRecent : 0;

    if (errorRate > 0.3) {
      return this.currentDelayMs * 2.5; // 错误率很高时大幅增加延迟
    } else if (errorRate > 0.15) {
      return this.currentDelayMs * 1.8;
    } else if (errorRate > 0.05) {
      return this.currentDelayMs * 1.3;
    }

    return this.currentDelayMs;
  }

  private calculateDomainHealthBasedDelay(stats: any): number {
    let domainHealthFactor = 1.0;

    for (const [domain, rule] of this.domainThrottlingRules) {
      const domainRequests = this.requests.filter(r => r.domain === domain);
      const recentDomainRequests = domainRequests.filter(r =>
        r.timestamp >= Date.now() - 60000
      );

      const domainRPS = recentDomainRequests.length;
      const utilizationRate = domainRPS / rule.maxRequestsPerSecond;

      if (utilizationRate > 0.8) {
        domainHealthFactor *= 1.5; // 域名使用率高时增加延迟
      } else if (utilizationRate < 0.3) {
        domainHealthFactor *= 0.9; // 域名使用率低时可以减少延迟
      }
    }

    return this.currentDelayMs * domainHealthFactor;
  }

  private calculateIntelligentBackoff(errorType: string, retryCount: number): number {
    if (!this.intelligentBackoffConfig.enabled) {
      return this.currentDelayMs * 2;
    }

    const multiplier = this.intelligentBackoffConfig.errorTypeMultipliers.get(errorType) || 1.0;
    const baseDelay = this.intelligentBackoffConfig.strategies.exponential.base;
    const maxDelay = this.intelligentBackoffConfig.strategies.exponential.max;
    const factor = this.intelligentBackoffConfig.strategies.exponential.factor;

    const exponentialDelay = Math.min(baseDelay * Math.pow(factor, retryCount) * multiplier, maxDelay);

    return Math.round(exponentialDelay);
  }

  private updatePerformanceHistory(): void {
    const stats = this.getCurrentIntelligentStats();

    this.performanceHistory.push({
      timestamp: Date.now(),
      delay: this.currentDelayMs,
      successRate: stats.successRate,
      averageResponseTime: stats.averageResponseTime,
      requestsPerSecond: stats.requestsPerSecond
    });

    // 保持性能历史大小
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-500);
    }
  }

  private getCurrentIntelligentStats(): RateStats {
    const now = Date.now();
    const windowStart = now - this.crawlerConfig.rateMonitoring.windowSizeMs;

    const windowRequests = this.requests.filter(r => r.timestamp >= windowStart);
    const windowSize = this.crawlerConfig.rateMonitoring.windowSizeMs / 1000;

    const successCount = windowRequests.filter(r => r.success).length;
    const errorCount = windowRequests.filter(r => !r.success).length;
    const totalDuration = windowRequests.reduce((sum, r) => sum + r.duration, 0);

    const requestsPerSecond = windowRequests.length / windowSize;
    const successRate = windowRequests.length > 0 ? successCount / windowRequests.length : 1;
    const averageResponseTime = windowRequests.length > 0 ? totalDuration / windowRequests.length : 0;

    const isThrottling = windowRequests.length >= this.crawlerConfig.rateMonitoring.maxRequestsPerWindow;

    // 计算域名分布
    const domainDistribution = new Map<string, number>();
    windowRequests.forEach(request => {
      const count = domainDistribution.get(request.domain) || 0;
      domainDistribution.set(request.domain, count + 1);
    });

    // 计算性能评分
    const performanceScore = this.calculatePerformanceScore(successRate, averageResponseTime, requestsPerSecond);

    // 分析趋势方向
    const trendDirection = this.analyzeTrendDirection();

    // 推荐下一个延迟
    const nextRecommendedDelay = this.calculateNextRecommendedDelay(successRate, averageResponseTime);

    // 生成推荐动作
    const recommendedActions = this.generateRecommendedActions(successRate, averageResponseTime, isThrottling);

    return {
      currentDelayMs: this.currentDelayMs,
      requestsPerSecond,
      successRate,
      averageResponseTime,
      windowSize,
      maxRequestsPerWindow: this.crawlerConfig.rateMonitoring.maxRequestsPerWindow,
      isThrottling,
      domainDistribution,
      performanceScore,
      trendDirection,
      nextRecommendedDelay,
      recommendedActions
    };
  }

  private calculatePerformanceScore(successRate: number, averageResponseTime: number, requestsPerSecond: number): number {
    const successScore = successRate * 40;
    const responseScore = Math.max(0, (1 - Math.min(averageResponseTime / 10000, 1))) * 30;
    const throughputScore = Math.min(requestsPerSecond / 10, 1) * 30;

    return Math.round(successScore + responseScore + throughputScore);
  }

  private analyzeTrendDirection(): 'improving' | 'stable' | 'degrading' {
    if (this.performanceHistory.length < 10) {
      return 'stable';
    }

    const recent = this.performanceHistory.slice(-5);
    const older = this.performanceHistory.slice(-10, -5);

    const recentSuccessRate = recent.reduce((sum, h) => sum + h.successRate, 0) / recent.length;
    const olderSuccessRate = older.reduce((sum, h) => sum + h.successRate, 0) / older.length;

    const recentResponseTime = recent.reduce((sum, h) => sum + h.averageResponseTime, 0) / recent.length;
    const olderResponseTime = older.reduce((sum, h) => sum + h.averageResponseTime, 0) / older.length;

    const successRateImprovement = recentSuccessRate - olderSuccessRate;
    const responseTimeImprovement = olderResponseTime - recentResponseTime;

    if (successRateImprovement > 0.05 && responseTimeImprovement > 500) {
      return 'improving';
    } else if (successRateImprovement < -0.05 || responseTimeImprovement < -500) {
      return 'degrading';
    }

    return 'stable';
  }

  private calculateNextRecommendedDelay(successRate: number, averageResponseTime: number): number {
    let recommendedDelay = this.currentDelayMs;

    if (successRate < 0.8) {
      recommendedDelay *= 1.5;
    } else if (successRate > 0.95 && averageResponseTime < 3000) {
      recommendedDelay *= 0.8;
    }

    if (averageResponseTime > 10000) {
      recommendedDelay *= 1.3;
    }

    return Math.max(
      this.crawlerConfig.rateMonitoring.adaptiveDelay.minDelayMs,
      Math.min(this.crawlerConfig.rateMonitoring.adaptiveDelay.maxDelayMs, recommendedDelay)
    );
  }

  private generateRecommendedActions(successRate: number, averageResponseTime: number, isThrottling: boolean): string[] {
    const actions: string[] = [];

    if (successRate < 0.7) {
      actions.push('成功率较低，建议检查网络连接和目标网站状态');
    }

    if (averageResponseTime > 10000) {
      actions.push('响应时间过长，考虑增加延迟或优化网络');
    }

    if (isThrottling) {
      actions.push('当前处于限流状态，请耐心等待或减少请求频率');
    }

    if (this.currentDelayMs > this.crawlerConfig.rateMonitoring.adaptiveDelay.maxDelayMs * 0.8) {
      actions.push('延迟接近上限，可能存在严重的访问限制');
    }

    if (actions.length === 0 && successRate > 0.9) {
      actions.push('当前状态良好，保持现有策略');
    }

    return actions;
  }

  private logRequestIntelligently(record: RequestRecord, stats: RateStats): void {
    const logLevel = this.determineLogLevel(record, stats);
    const logData = {
      url: this.sanitizeUrl(record.url),
      domain: record.domain,
      success: record.success,
      duration: record.duration,
      statusCode: record.statusCode,
      errorType: record.errorType,
      retryCount: record.retryCount,
      currentDelayMs: this.currentDelayMs,
      performanceScore: stats.performanceScore,
      trendDirection: stats.trendDirection,
      recommendedActions: stats.recommendedActions.slice(0, 2) // 只显示前两个推荐动作
    };

    if (logLevel === 'error') {
      this.logger.error(`❌ 请求失败`, logData);
    } else if (logLevel === 'warn') {
      this.logger.warn(`⚠️ 请求警告`, logData);
    } else if (logLevel === 'debug' && !record.success) {
      this.logger.debug(`📊 请求记录`, logData);
    }
  }

  private determineLogLevel(record: RequestRecord, stats: RateStats): 'error' | 'warn' | 'debug' {
    if (!record.success) {
      if (record.errorType === 'authentication_error' || record.errorType === 'rate_limited') {
        return 'error';
      }
      if (stats.performanceScore < 30 || record.retryCount > 2) {
        return 'warn';
      }
    }

    if (record.duration > 15000 || stats.isThrottling) {
      return 'warn';
    }

    return 'debug';
  }

  private triggerIntelligentAlerts(record: RequestRecord, stats: RateStats): void {
    // 连续失败预警
    const consecutiveFailures = this.getConsecutiveFailures();
    if (consecutiveFailures >= 5) {
      this.logger.error(`🚨 连续失败预警`, {
        consecutiveFailures,
        domain: record.domain,
        lastErrorType: record.errorType,
        recommendedAction: '建议暂停请求，检查账户状态和网站访问政策'
      });
    }

    // 性能严重下降预警
    if (stats.performanceScore < 20 && stats.trendDirection === 'degrading') {
      this.logger.error(`📉 性能严重下降`, {
        performanceScore: stats.performanceScore,
        trendDirection: stats.trendDirection,
        successRate: Math.round(stats.successRate * 100),
        averageResponseTime: Math.round(stats.averageResponseTime),
        recommendedAction: '立即检查系统状态，考虑大幅增加延迟或暂停请求'
      });
    }

    // 域名特定错误预警
    const criticalErrors = Array.from(this.errorPatterns.entries())
      .filter(([, pattern]) => pattern.severity === 'critical');

    if (criticalErrors.length > 0) {
      this.logger.error(`🚨 关键错误模式检测`, {
        criticalErrorCount: criticalErrors.length,
        errors: criticalErrors.map(([key, pattern]) => ({
          pattern: key,
          severity: pattern.severity,
          frequency: pattern.frequency,
          recommendedAction: pattern.recommendedAction
        })),
        recommendedAction: '存在关键错误模式，建议立即调整策略或暂停相关域名的请求'
      });
    }
  }

  // 公共API方法

  getIntelligentBackoffDelay(errorType?: string, retryCount?: number): number {
    return this.calculateIntelligentBackoff(errorType || 'unknown', retryCount || 0);
  }

  getDomainThrottlingStatus(): Array<{
    domain: string;
    currentRPS: number;
    maxRPS: number;
    utilizationRate: number;
    healthStatus: 'healthy' | 'warning' | 'critical';
  }> {
    const now = Date.now();
    const status: Array<{
      domain: string;
      currentRPS: number;
      maxRPS: number;
      utilizationRate: number;
      healthStatus: 'healthy' | 'warning' | 'critical';
    }> = [];

    for (const [domain, rule] of this.domainThrottlingRules) {
      const recentRequests = this.requests.filter(r =>
        r.domain === domain && r.timestamp >= now - 1000
      );

      const currentRPS = recentRequests.length;
      const utilizationRate = currentRPS / rule.maxRequestsPerSecond;

      let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (utilizationRate >= 0.9) {
        healthStatus = 'critical';
      } else if (utilizationRate >= 0.7) {
        healthStatus = 'warning';
      }

      status.push({
        domain,
        currentRPS,
        maxRPS: rule.maxRequestsPerSecond,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        healthStatus
      });
    }

    return status.sort((a, b) => b.utilizationRate - a.utilizationRate);
  }

  getErrorPatterns(): Array<{
    pattern: string;
    domain: string;
    errorType: string;
    count: number;
    frequency: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendedAction: string;
  }> {
    return Array.from(this.errorPatterns.entries())
      .map(([key, pattern]) => {
        const [domain, errorType] = key.split(':');
        return {
          pattern: key,
          domain,
          errorType,
          count: pattern.count,
          frequency: pattern.frequency,
          severity: pattern.severity,
          recommendedAction: pattern.recommendedAction
        };
      })
      .sort((a, b) => b.severity.localeCompare(a.severity) || b.frequency - a.frequency);
  }

  optimizeStrategies(): void {
    for (const [name, strategy] of this.adaptiveStrategies) {
      const recentPerformance = this.evaluateStrategyPerformance(name);

      if (recentPerformance.successRateImprovement < 0) {
        strategy.weight = Math.max(0.1, strategy.weight - 0.1);
        this.logger.debug(`降低策略权重`, {
          strategy: name,
          oldWeight: strategy.weight + 0.1,
          newWeight: strategy.weight,
          reason: 'performance_degradation'
        });
      } else if (recentPerformance.successRateImprovement > 0.1) {
        strategy.weight = Math.min(0.5, strategy.weight + 0.05);
        this.logger.debug(`提高策略权重`, {
          strategy: name,
          oldWeight: strategy.weight - 0.05,
          newWeight: strategy.weight,
          reason: 'performance_improvement'
        });
      }

      strategy.lastAdjustment = Date.now();
    }

    this.logger.log(`策略优化完成`, {
      optimizedStrategies: this.adaptiveStrategies.size,
      totalWeight: Array.from(this.adaptiveStrategies.values()).reduce((sum, s) => sum + s.weight, 0)
    });
  }

  private evaluateStrategyPerformance(strategyName: string): {
    successRateImprovement: number;
    responseTimeImprovement: number;
    errorReduction: number;
  } {
    // 基于历史数据评估策略性能
    const recentHistory = this.performanceHistory.slice(-20);
    const olderHistory = this.performanceHistory.slice(-40, -20);

    if (recentHistory.length === 0 || olderHistory.length === 0) {
      return { successRateImprovement: 0, responseTimeImprovement: 0, errorReduction: 0 };
    }

    const recentSuccessRate = recentHistory.reduce((sum, h) => sum + h.successRate, 0) / recentHistory.length;
    const olderSuccessRate = olderHistory.reduce((sum, h) => sum + h.successRate, 0) / olderHistory.length;

    const recentResponseTime = recentHistory.reduce((sum, h) => sum + h.averageResponseTime, 0) / recentHistory.length;
    const olderResponseTime = olderHistory.reduce((sum, h) => sum + h.averageResponseTime, 0) / olderHistory.length;

    return {
      successRateImprovement: recentSuccessRate - olderSuccessRate,
      responseTimeImprovement: olderResponseTime - recentResponseTime,
      errorReduction: 0 // 可以基于错误率历史计算
    };
  }
}