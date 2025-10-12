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

    this.logger.debug(
      `请求记录: ${url} - ${success ? '成功' : '失败'} - ${duration}ms - 当前延迟: ${this.currentDelayMs}ms`
    );
  }

  async waitForNextRequest(): Promise<void> {
    if (!this.crawlerConfig.rateMonitoring.enabled) {
      return;
    }

    const stats = this.getCurrentStats();

    // 检查是否需要延迟
    if (stats.isThrottling) {
      this.logger.warn(`请求频率过高，启用限流 - 当前延迟: ${this.currentDelayMs}ms`);
    }

    // 等待当前延迟时间
    await this.delay(this.currentDelayMs);
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
    this.currentDelayMs = Math.max(
      this.crawlerConfig.rateMonitoring.adaptiveDelay.minDelayMs,
      Math.min(
        this.crawlerConfig.rateMonitoring.adaptiveDelay.maxDelayMs,
        delayMs
      )
    );

    this.logger.log(`请求延迟已设置为: ${this.currentDelayMs}ms`);
  }

  reset(): void {
    this.requests = [];
    this.currentDelayMs = this.crawlerConfig.requestDelay.min;
    this.logger.log('请求监控已重置');
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
}