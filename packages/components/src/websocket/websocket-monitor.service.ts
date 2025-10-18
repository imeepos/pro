import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval, merge } from 'rxjs';
import { map, distinctUntilChanged, filter, startWith, takeUntil } from 'rxjs/operators';
import { WebSocketService } from './websocket.service';
import { WebSocketConnectionPool } from './websocket-connection-pool';
import { WeiboLoginWebSocketManager } from './weibo-login-websocket-manager';
import { ConnectionState } from './websocket.types';

/**
 * 连接健康状态
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown'
}

/**
 * 连接指标接口
 */
export interface ConnectionMetrics {
  readonly totalConnections: number;
  readonly activeConnections: number;
  readonly failedConnections: number;
  readonly averageResponseTime: number;
  readonly connectionSuccessRate: number;
  readonly reconnectionAttempts: number;
  readonly lastHealthCheck: Date;
}

/**
 * WebSocket诊断信息
 */
export interface WebSocketDiagnostics {
  readonly timestamp: Date;
  readonly healthStatus: HealthStatus;
  readonly metrics: ConnectionMetrics;
  readonly connectionPool: any;
  readonly weiboLoginSessions: any;
  readonly recommendations: string[];
  readonly alerts: Array<{
    level: 'info' | 'warning' | 'error';
    message: string;
    timestamp: Date;
  }>;
}

/**
 * 监控配置
 */
export interface MonitorConfig {
  readonly healthCheckInterval: number;
  readonly metricsRetentionPeriod: number;
  readonly alertThresholds: {
    connectionFailureRate: number;
    averageResponseTime: number;
    reconnectionAttempts: number;
  };
}

/**
 * WebSocket监控服务
 * 提供连接监控、诊断和告警功能
 */
@Injectable({
  providedIn: 'root'
})
export class WebSocketMonitorService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly diagnostics$ = new BehaviorSubject<WebSocketDiagnostics | null>(null);
  private readonly alerts$ = new Subject<any>();
  private readonly healthStatus$ = new BehaviorSubject<HealthStatus>(HealthStatus.UNKNOWN);

  private metricsHistory: ConnectionMetrics[] = [];
  private healthCheckTimer?: number;

  private readonly defaultConfig: MonitorConfig = {
    healthCheckInterval: 30000, // 30秒
    metricsRetentionPeriod: 24 * 60 * 60 * 1000, // 24小时
    alertThresholds: {
      connectionFailureRate: 0.1, // 10%
      averageResponseTime: 5000, // 5秒
      reconnectionAttempts: 5
    }
  };

  private config: MonitorConfig;

  constructor(
    private readonly connectionPool: WebSocketConnectionPool,
    private readonly weiboLoginManager: WeiboLoginWebSocketManager
  ) {
    this.config = { ...this.defaultConfig };
    this.startMonitoring();
    this.setupEventListeners();
  }

  /**
   * 获取诊断信息流
   */
  get diagnostics(): Observable<WebSocketDiagnostics | null> {
    return this.diagnostics$.asObservable();
  }

  /**
   * 获取健康状态流
   */
  get healthStatus(): Observable<HealthStatus> {
    return this.healthStatus$.asObservable();
  }

  /**
   * 获取告警流
   */
  get alerts(): Observable<any> {
    return this.alerts$.asObservable();
  }

  /**
   * 获取当前诊断信息
   */
  getCurrentDiagnostics(): WebSocketDiagnostics | null {
    return this.diagnostics$.value;
  }

  /**
   * 配置监控参数
   */
  configure(config: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...config };

    // 重启监控
    this.stopMonitoring();
    this.startMonitoring();

    console.log('[WebSocketMonitorService] Configuration updated:', this.config);
  }

  /**
   * 手动触发健康检查
   */
  async performHealthCheck(): Promise<WebSocketDiagnostics> {
    console.log('[WebSocketMonitorService] Performing manual health check');

    const diagnostics = await this.collectDiagnostics();
    this.diagnostics$.next(diagnostics);
    this.healthStatus$.next(diagnostics.healthStatus);

    return diagnostics;
  }

  /**
   * 获取连接指标历史
   */
  getMetricsHistory(limit?: number): ConnectionMetrics[] {
    return limit ? this.metricsHistory.slice(-limit) : [...this.metricsHistory];
  }

  /**
   * 清理指标历史
   */
  clearMetricsHistory(): void {
    this.metricsHistory = [];
    console.log('[WebSocketMonitorService] Metrics history cleared');
  }

  /**
   * 导出诊断报告
   */
  exportDiagnosticReport(): {
    timestamp: Date;
    currentDiagnostics: WebSocketDiagnostics | null;
    metricsHistory: ConnectionMetrics[];
    config: MonitorConfig;
    summary: {
      totalChecks: number;
      healthyChecks: number;
      warningChecks: number;
      criticalChecks: number;
      averageResponseTime: number;
      connectionSuccessRate: number;
    };
  } {
    const currentDiagnostics = this.diagnostics$.value;
    const metricsHistory = this.getMetricsHistory();

    const summary = {
      totalChecks: metricsHistory.length,
      healthyChecks: metricsHistory.filter(m => this.calculateHealthStatus(m) === HealthStatus.HEALTHY).length,
      warningChecks: metricsHistory.filter(m => this.calculateHealthStatus(m) === HealthStatus.WARNING).length,
      criticalChecks: metricsHistory.filter(m => this.calculateHealthStatus(m) === HealthStatus.CRITICAL).length,
      averageResponseTime: metricsHistory.length > 0 ?
        metricsHistory.reduce((sum, m) => sum + m.averageResponseTime, 0) / metricsHistory.length : 0,
      connectionSuccessRate: metricsHistory.length > 0 ?
        metricsHistory.reduce((sum, m) => sum + m.connectionSuccessRate, 0) / metricsHistory.length : 0
    };

    return {
      timestamp: new Date(),
      currentDiagnostics,
      metricsHistory,
      config: { ...this.config },
      summary
    };
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  /**
   * 销毁监控服务
   */
  destroy(): void {
    this.stopMonitoring();
    this.destroy$.next();
    this.destroy$.complete();
    this.diagnostics$.complete();
    this.alerts$.complete();
    this.healthStatus$.complete();

    console.log('[WebSocketMonitorService] Monitor service destroyed');
  }

  /**
   * 启动监控
   */
  private startMonitoring(): void {
    this.healthCheckTimer = window.setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.error('[WebSocketMonitorService] Health check failed:', error);
      });
    }, this.config.healthCheckInterval);

    console.log(`[WebSocketMonitorService] Monitoring started with interval: ${this.config.healthCheckInterval}ms`);
  }

  /**
   * 停止监控
   */
  private stopMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    console.log('[WebSocketMonitorService] Monitoring stopped');
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听连接池事件
    this.connectionPool.events$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(event => {
      console.log('[WebSocketMonitorService] Connection pool event:', event);

      if (event.type === 'pool:full') {
        this.alerts$.next({
          level: 'warning',
          message: 'WebSocket连接池已满，可能影响新连接的建立',
          timestamp: new Date()
        });
      }
    });

    // 监听微博登录管理器事件
    this.weiboLoginManager.events$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(event => {
      console.log('[WebSocketMonitorService] Weibo login manager event:', event);

      if (event.type === 'connection:lost') {
        this.alerts$.next({
          level: 'error',
          message: `微博登录连接丢失: ${event.data.sessionId}`,
          timestamp: new Date()
        });
      }
    });
  }

  /**
   * 收集诊断信息
   */
  private async collectDiagnostics(): Promise<WebSocketDiagnostics> {
    const timestamp = new Date();

    try {
      // 收集连接池指标
      const poolDiagnostics = this.connectionPool.getPoolDiagnostics();

      // 收集微博登录会话指标
      const weiboStats = this.weiboLoginManager.getSessionStats();

      // 计算连接指标
      const metrics = this.calculateMetrics(poolDiagnostics, weiboStats);

      // 评估健康状态
      const healthStatus = this.calculateHealthStatus(metrics);

      // 生成建议
      const recommendations = this.generateRecommendations(metrics, poolDiagnostics, weiboStats);

      // 生成告警
      const alerts = this.generateAlerts(metrics, healthStatus);

      const diagnostics: WebSocketDiagnostics = {
        timestamp,
        healthStatus,
        metrics,
        connectionPool: poolDiagnostics,
        weiboLoginSessions: weiboStats,
        recommendations,
        alerts
      };

      // 保存指标历史
      this.saveMetricsToHistory(metrics);

      return diagnostics;

    } catch (error) {
      console.error('[WebSocketMonitorService] Failed to collect diagnostics:', error);

      return {
        timestamp,
        healthStatus: HealthStatus.UNKNOWN,
        metrics: {
          totalConnections: 0,
          activeConnections: 0,
          failedConnections: 0,
          averageResponseTime: 0,
          connectionSuccessRate: 0,
          reconnectionAttempts: 0,
          lastHealthCheck: timestamp
        },
        connectionPool: null,
        weiboLoginSessions: null,
        recommendations: ['无法收集诊断信息，请检查服务状态'],
        alerts: [{
          level: 'error',
          message: '诊断信息收集失败',
          timestamp
        }]
      };
    }
  }

  /**
   * 计算连接指标
   */
  private calculateMetrics(poolDiagnostics: any, weiboStats: any): ConnectionMetrics {
    const totalConnections = poolDiagnostics?.stats?.totalConnections || 0;
    const activeConnections = poolDiagnostics?.stats?.activeConnections || 0;
    const failedConnections = totalConnections - activeConnections;

    // 模拟响应时间计算（实际应用中应该从连接实例获取）
    const averageResponseTime = this.calculateAverageResponseTime(poolDiagnostics);

    // 计算连接成功率
    const connectionSuccessRate = totalConnections > 0 ? activeConnections / totalConnections : 1;

    // 模拟重连尝试次数
    const reconnectionAttempts = this.calculateReconnectionAttempts(poolDiagnostics);

    return {
      totalConnections,
      activeConnections,
      failedConnections,
      averageResponseTime,
      connectionSuccessRate,
      reconnectionAttempts,
      lastHealthCheck: new Date()
    };
  }

  /**
   * 计算平均响应时间
   */
  private calculateAverageResponseTime(poolDiagnostics: any): number {
    // 这里应该从实际的连接实例收集响应时间数据
    // 暂时返回基于连接数的估算值
    const totalConnections = poolDiagnostics?.stats?.totalConnections || 0;

    if (totalConnections === 0) return 0;

    // 模拟响应时间：连接数越多，响应时间可能越长
    return Math.min(100 + totalConnections * 50, 5000);
  }

  /**
   * 计算重连尝试次数
   */
  private calculateReconnectionAttempts(poolDiagnostics: any): number {
    // 这里应该从实际的连接实例收集重连数据
    // 暂时基于失败连接数估算
    const failedConnections = poolDiagnostics?.stats?.idleConnections || 0;
    return failedConnections * 2; // 假设每个失败连接尝试重连2次
  }

  /**
   * 计算健康状态
   */
  private calculateHealthStatus(metrics: ConnectionMetrics): HealthStatus {
    const { alertThresholds } = this.config;

    // 检查关键指标
    if (metrics.connectionSuccessRate < 0.5) {
      return HealthStatus.CRITICAL;
    }

    if (metrics.averageResponseTime > alertThresholds.averageResponseTime * 2) {
      return HealthStatus.CRITICAL;
    }

    if (metrics.connectionSuccessRate < (1 - alertThresholds.connectionFailureRate)) {
      return HealthStatus.WARNING;
    }

    if (metrics.averageResponseTime > alertThresholds.averageResponseTime) {
      return HealthStatus.WARNING;
    }

    if (metrics.reconnectionAttempts > alertThresholds.reconnectionAttempts) {
      return HealthStatus.WARNING;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(metrics: ConnectionMetrics, poolDiagnostics: any, weiboStats: any): string[] {
    const recommendations: string[] = [];

    // 连接成功率建议
    if (metrics.connectionSuccessRate < 0.8) {
      recommendations.push('连接成功率较低，建议检查网络连接和服务器状态');
    }

    // 响应时间建议
    if (metrics.averageResponseTime > 3000) {
      recommendations.push('响应时间较长，建议优化网络配置或增加服务器资源');
    }

    // 连接池建议
    if (poolDiagnostics?.stats?.idleConnections > poolDiagnostics?.config?.maxConnections * 0.7) {
      recommendations.push('空闲连接数过多，建议调整连接池配置');
    }

    // 重连尝试建议
    if (metrics.reconnectionAttempts > 10) {
      recommendations.push('重连尝试次数过多，建议检查连接稳定性');
    }

    // 微博登录会话建议
    if (weiboStats?.activeSessions > 10) {
      recommendations.push('活跃登录会话较多，建议定期清理过期会话');
    }

    if (recommendations.length === 0) {
      recommendations.push('所有指标正常，WebSocket连接运行良好');
    }

    return recommendations;
  }

  /**
   * 生成告警
   */
  private generateAlerts(metrics: ConnectionMetrics, healthStatus: HealthStatus): Array<{
    level: 'info' | 'warning' | 'error';
    message: string;
    timestamp: Date;
  }> {
    const alerts: Array<{
      level: 'info' | 'warning' | 'error';
      message: string;
      timestamp: Date;
    }> = [];

    const { alertThresholds } = this.config;
    const now = new Date();

    // 基于健康状态生成告警
    if (healthStatus === HealthStatus.CRITICAL) {
      alerts.push({
        level: 'error',
        message: 'WebSocket连接状态严重异常，需要立即处理',
        timestamp: now
      });
    } else if (healthStatus === HealthStatus.WARNING) {
      alerts.push({
        level: 'warning',
        message: 'WebSocket连接状态需要关注',
        timestamp: now
      });
    }

    // 基于具体指标生成告警
    if (metrics.connectionSuccessRate < (1 - alertThresholds.connectionFailureRate)) {
      alerts.push({
        level: 'warning',
        message: `连接成功率低于阈值: ${Math.round(metrics.connectionSuccessRate * 100)}%`,
        timestamp: now
      });
    }

    if (metrics.averageResponseTime > alertThresholds.averageResponseTime) {
      alerts.push({
        level: 'warning',
        message: `平均响应时间过高: ${Math.round(metrics.averageResponseTime)}ms`,
        timestamp: now
      });
    }

    if (metrics.reconnectionAttempts > alertThresholds.reconnectionAttempts) {
      alerts.push({
        level: 'info',
        message: `检测到重连尝试: ${metrics.reconnectionAttempts}次`,
        timestamp: now
      });
    }

    return alerts;
  }

  /**
   * 保存指标到历史记录
   */
  private saveMetricsToHistory(metrics: ConnectionMetrics): void {
    this.metricsHistory.push(metrics);

    // 清理过期记录
    const cutoffTime = Date.now() - this.config.metricsRetentionPeriod;
    this.metricsHistory = this.metricsHistory.filter(
      metric => metric.lastHealthCheck.getTime() > cutoffTime
    );

    // 限制历史记录数量（最多保留1000条）
    if (this.metricsHistory.length > 1000) {
      this.metricsHistory = this.metricsHistory.slice(-1000);
    }
  }
}