/**
 * 性能监控工具
 * 提供前端性能监控、分析和优化建议
 */

import { createLogger } from './logger';
import { errorHandler, ErrorCode, ErrorSeverity } from './errorHandler';

type PerformanceMemoryInfo = {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
};

type PerformanceWithMemory = Performance & { memory?: PerformanceMemoryInfo };

const logger = createLogger('Performance');

// ================== 类型定义 ==================

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  unit: string;
  category: 'load' | 'runtime' | 'user' | 'api' | 'memory';
  metadata?: Record<string, unknown>;
}

export interface WebVitalMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  delta: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface PerformanceReport {
  timestamp: number;
  duration: number;
  metrics: PerformanceMetric[];
  webVitals: WebVitalMetric[];
  recommendations: string[];
  score: number; // 0-100
}

export interface APIPerformanceData {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  size: number;
  timestamp: number;
}

export interface ComponentPerformanceData {
  componentName: string;
  renderTime: number;
  updateCount: number;
  timestamp: number;
  props?: Record<string, unknown>;
}

// ================== 性能监控器类 ==================

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private webVitals: WebVitalMetric[] = [];
  private apiCalls: APIPerformanceData[] = [];
  private componentRenders: ComponentPerformanceData[] = [];
  private maxMetrics = 1000;
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeWebVitals();
    this.initializePerformanceObservers();
    this.startPeriodicReporting();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 初始化Web Vitals监控
   */
  private initializeWebVitals(): void {
    // 动态导入web-vitals库
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS((metric: any) => this.recordWebVital('CLS', metric));
      onINP((metric: any) => this.recordWebVital('FID', metric));
      onFCP((metric: any) => this.recordWebVital('FCP', metric));
      onLCP((metric: any) => this.recordWebVital('LCP', metric));
      onTTFB((metric: any) => this.recordWebVital('TTFB', metric));
    }).catch((error) => {
      logger.warn('Failed to load web-vitals library', error);
    });
  }

  /**
   * 初始化性能观察者
   */
  private initializePerformanceObservers(): void {
    try {
      // 监控导航性能
      if ('PerformanceObserver' in window) {
        const navObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'navigation') {
              this.processNavigationEntry(entry as PerformanceNavigationTiming);
            }
          });
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);

        // 监控资源加载性能
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'resource') {
              this.processResourceEntry(entry as PerformanceResourceTiming);
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);

        // 监控长任务
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.processLongTaskEntry(entry);
          });
        });
        
        try {
          longTaskObserver.observe({ entryTypes: ['longtask'] });
          this.observers.push(longTaskObserver);
        } catch (error) {
          logger.debug('Long task monitoring not supported', error);
        }
      }
    } catch (error) {
      logger.error('Failed to initialize performance observers', error);
    }
  }

  /**
   * 记录Web Vital指标
   */
  private recordWebVital(name: WebVitalMetric['name'], metric: any): void {
    const rating = this.getWebVitalRating(name, metric.value);
    
    const webVital: WebVitalMetric = {
      name,
      value: metric.value,
      delta: metric.delta,
      id: metric.id,
      rating,
    };

    this.webVitals.push(webVital);
    
    // 记录为通用指标
    this.recordMetric({
      name: `webvital.${name.toLowerCase()}`,
      value: metric.value,
      timestamp: Date.now(),
      unit: this.getWebVitalUnit(name),
      category: 'load',
      metadata: { rating, id: metric.id },
    });

    logger.debug(`Web Vital recorded: ${name}`, { value: metric.value, rating });
  }

  /**
   * 获取Web Vital评级
   */
  private getWebVitalRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, [number, number]> = {
      CLS: [0.1, 0.25],
      FID: [100, 300],
      FCP: [1800, 3000],
      LCP: [2500, 4000],
      TTFB: [800, 1800],
    };

    const [good, poor] = thresholds[name] || [0, 0];
    
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * 获取Web Vital单位
   */
  private getWebVitalUnit(name: string): string {
    const units: Record<string, string> = {
      CLS: 'score',
      FID: 'ms',
      FCP: 'ms',
      LCP: 'ms',
      TTFB: 'ms',
    };
    return units[name] || 'ms';
  }

  /**
   * 处理导航性能条目
   */
  private processNavigationEntry(entry: PerformanceNavigationTiming): void {
    const metrics = [
      { name: 'dns.lookup', value: entry.domainLookupEnd - entry.domainLookupStart },
      { name: 'tcp.connect', value: entry.connectEnd - entry.connectStart },
      { name: 'tls.handshake', value: entry.secureConnectionStart ? entry.connectEnd - entry.secureConnectionStart : 0 },
      { name: 'request.time', value: entry.responseStart - entry.requestStart },
      { name: 'response.time', value: entry.responseEnd - entry.responseStart },
      { name: 'dom.parse', value: entry.domInteractive - entry.responseEnd },
      { name: 'dom.ready', value: entry.domContentLoadedEventEnd - entry.fetchStart },
      { name: 'page.load', value: entry.loadEventEnd - entry.fetchStart },
    ];

    metrics.forEach(({ name, value }) => {
      if (value > 0) {
        this.recordMetric({
          name,
          value,
          timestamp: Date.now(),
          unit: 'ms',
          category: 'load',
        });
      }
    });
  }

  /**
   * 处理资源性能条目
   */
  private processResourceEntry(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.startTime;
    const size = entry.transferSize || entry.encodedBodySize || 0;

    // 记录资源加载时间
    this.recordMetric({
      name: 'resource.load',
      value: duration,
      timestamp: Date.now(),
      unit: 'ms',
      category: 'load',
      metadata: {
        url: entry.name,
        type: this.getResourceType(entry.name),
        size,
      },
    });

    // 记录大资源警告
    if (size > 1024 * 1024) { // 大于1MB
      logger.warn('Large resource detected', {
        url: entry.name,
        size: `${Math.round(size / 1024 / 1024 * 100) / 100}MB`,
        duration: `${Math.round(duration)}ms`,
      });
    }
  }

  /**
   * 处理长任务条目
   */
  private processLongTaskEntry(entry: PerformanceEntry): void {
    this.recordMetric({
      name: 'longtask.duration',
      value: entry.duration,
      timestamp: Date.now(),
      unit: 'ms',
      category: 'runtime',
      metadata: {
        startTime: entry.startTime,
      },
    });

    // 记录长任务警告
    if (entry.duration > 50) {
      logger.warn('Long task detected', {
        duration: `${Math.round(entry.duration)}ms`,
        startTime: entry.startTime,
      });
    }
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * 记录通用性能指标
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'> & { timestamp?: number }): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: metric.timestamp || Date.now(),
    };

    this.metrics.push(fullMetric);

    // 保持数组大小在限制内
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    logger.debug('Performance metric recorded', fullMetric);
  }

  /**
   * 记录API调用性能
   */
  recordAPICall(data: APIPerformanceData): void {
    this.apiCalls.push(data);

    // 记录为通用指标
    this.recordMetric({
      name: 'api.request',
      value: data.duration,
      timestamp: data.timestamp,
      unit: 'ms',
      category: 'api',
      metadata: {
        endpoint: data.endpoint,
        method: data.method,
        status: data.status,
        size: data.size,
      },
    });

    // 慢API警告
    if (data.duration > 3000) { // 超过3秒
      logger.warn('Slow API call detected', {
        endpoint: data.endpoint,
        method: data.method,
        duration: `${data.duration}ms`,
        status: data.status,
      });
    }

    // 保持数组大小
    if (this.apiCalls.length > this.maxMetrics) {
      this.apiCalls = this.apiCalls.slice(-this.maxMetrics);
    }
  }

  /**
   * 记录组件渲染性能
   */
  recordComponentRender(data: ComponentPerformanceData): void {
    this.componentRenders.push(data);

    // 记录为通用指标
    this.recordMetric({
      name: 'component.render',
      value: data.renderTime,
      timestamp: data.timestamp,
      unit: 'ms',
      category: 'runtime',
      metadata: {
        component: data.componentName,
        updateCount: data.updateCount,
        props: data.props,
      },
    });

    // 慢组件渲染警告
    if (data.renderTime > 16) { // 超过一帧的时间
      logger.warn('Slow component render detected', {
        component: data.componentName,
        renderTime: `${data.renderTime}ms`,
        updateCount: data.updateCount,
      });
    }

    // 保持数组大小
    if (this.componentRenders.length > this.maxMetrics) {
      this.componentRenders = this.componentRenders.slice(-this.maxMetrics);
    }
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage(): Record<string, number> {
    if ('memory' in performance) {
      const memory = (performance as PerformanceWithMemory).memory;
      if (memory) {
        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100),
        };
      }
    }
    return {};
  }

  /**
   * 生成性能报告
   */
  generateReport(): PerformanceReport {
    const now = Date.now();
    const timeWindow = 5 * 60 * 1000; // 5分钟窗口
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < timeWindow);

    const score = this.calculatePerformanceScore();
    const recommendations = this.generateRecommendations(recentMetrics);

    return {
      timestamp: now,
      duration: timeWindow,
      metrics: recentMetrics,
      webVitals: this.webVitals,
      recommendations,
      score,
    };
  }

  /**
   * 计算性能得分
   */
  private calculatePerformanceScore(): number {
    let score = 100;

    // Web Vitals评分
    this.webVitals.forEach(vital => {
      switch (vital.rating) {
        case 'poor':
          score -= 20;
          break;
        case 'needs-improvement':
          score -= 10;
          break;
      }
    });

    // API性能评分
    const slowAPIs = this.apiCalls.filter(api => api.duration > 2000).length;
    score -= Math.min(slowAPIs * 5, 30);

    // 长任务评分
    const longTasks = this.metrics.filter(m => 
      m.name === 'longtask.duration' && m.value > 50
    ).length;
    score -= Math.min(longTasks * 3, 20);

    return Math.max(score, 0);
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(metrics: PerformanceMetric[]): string[] {
    const recommendations: string[] = [];

    // 检查Web Vitals
    this.webVitals.forEach(vital => {
      if (vital.rating === 'poor') {
        switch (vital.name) {
          case 'LCP':
            recommendations.push('优化最大内容绘制(LCP): 考虑优化图片加载或减少服务器响应时间');
            break;
          case 'FID':
            recommendations.push('优化首次输入延迟(FID): 减少主线程阻塞时间，优化JavaScript执行');
            break;
          case 'CLS':
            recommendations.push('优化累积布局偏移(CLS): 为图片和广告预留空间，避免动态内容插入');
            break;
        }
      }
    });

    // 检查长任务
    const longTasks = metrics.filter(m => m.name === 'longtask.duration' && m.value > 50);
    if (longTasks.length > 5) {
      recommendations.push('检测到多个长任务，考虑拆分大型JavaScript操作或使用Web Workers');
    }

    // 检查API性能
    const slowAPIs = this.apiCalls.filter(api => api.duration > 2000);
    if (slowAPIs.length > 0) {
      recommendations.push('优化API性能: 考虑添加缓存、数据分页或后端优化');
    }

    // 检查内存使用
    const memory = this.getMemoryUsage();
    if (memory.percentage > 80) {
      recommendations.push('内存使用率较高，检查是否存在内存泄漏');
    }

    return recommendations;
  }

  /**
   * 开始定期报告
   */
  private startPeriodicReporting(): void {
    // 每5分钟生成一次报告
    setInterval(() => {
      const report = this.generateReport();
      logger.info('Performance report generated', {
        score: report.score,
        metricsCount: report.metrics.length,
        recommendationsCount: report.recommendations.length,
      });

      // 如果性能得分过低，记录为错误
      if (report.score < 60) {
        errorHandler.handleError(
          new Error(`Low performance score: ${report.score}`),
          { component: 'PerformanceMonitor' },
          {
            code: ErrorCode.SYSTEM_ERROR,
            severity: ErrorSeverity.MEDIUM,
            details: { report },
          }
        );
      }
    }, 5 * 60 * 1000);
  }

  /**
   * 清理观察者
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  /**
   * 获取所有指标
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 获取指定类别的指标
   */
  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(m => m.category === category);
  }

  /**
   * 清除历史数据
   */
  clearHistory(): void {
    this.metrics = [];
    this.webVitals = [];
    this.apiCalls = [];
    this.componentRenders = [];
  }
}

// ================== 导出 ==================

export const performanceMonitor = PerformanceMonitor.getInstance();

// 工具函数
export function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  category: PerformanceMetric['category'] = 'runtime'
): Promise<T> {
  const startTime = performance.now();
  
  return fn().then(
    result => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        category,
      });
      return result;
    },
    error => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric({
        name: `${name}.error`,
        value: duration,
        unit: 'ms',
        category,
      });
      throw error;
    }
  );
}

export function measureSync<T>(
  name: string,
  fn: () => T,
  category: PerformanceMetric['category'] = 'runtime'
): T {
  const startTime = performance.now();
  
  try {
    const result = fn();
    const duration = performance.now() - startTime;
    performanceMonitor.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      category,
    });
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    performanceMonitor.recordMetric({
      name: `${name}.error`,
      value: duration,
      unit: 'ms',
      category,
    });
    throw error;
  }
}
