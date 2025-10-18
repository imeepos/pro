import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Observable,
  Subject,
  interval,
  startWith,
  takeUntil,
  map,
  switchMap
} from 'rxjs';

import {
  StatusIndicatorComponent,
  ChartComponent,
  StatsCardComponent
} from '../shared/components';
import { WebSocketService, RealTimeDataService, DataManagerService } from '../shared/services';
import { ChartData, ChartConfig, StatusItem, StatsCardData } from '../shared/components';

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    inbound: number;
    outbound: number;
  };
  timestamp: string;
}

interface ServiceMetrics {
  name: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  responseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
  lastCheck: string;
}

interface AlertItem {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

@Component({
  selector: 'app-monitoring',
  standalone: true,
  imports: [
    CommonModule,
    StatusIndicatorComponent,
    ChartComponent,
    StatsCardComponent
  ],
  template: `
    <div class="monitoring-container p-6 space-y-6">
      <!-- 页面标题 -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">实时监控</h1>
          <p class="text-gray-600 mt-1">系统性能和服务状态实时监控</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full" [ngClass]="connectionStatus?.connected ? 'bg-green-500' : 'bg-red-500'"></div>
            <span class="text-sm text-gray-600">
              {{ connectionStatus?.connected ? '已连接' : '连接断开' }}
            </span>
          </div>
          <button
            (click)="toggleRealTimeUpdates()"
            class="px-4 py-2 rounded-lg transition-colors"
            [ngClass]="realTimeEnabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          >
            {{ realTimeEnabled ? '实时监控中' : '启用实时监控' }}
          </button>
        </div>
      </div>

      <!-- 系统指标概览 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <app-stats-card
          *ngFor="let metric of systemMetrics$ | async"
          [data]="metric"
          [loading]="loading"
        ></app-stats-card>
      </div>

      <!-- 实时性能图表 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- CPU 和内存使用率 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">CPU 和内存使用率</h2>
          <app-chart
            [data]="performanceChartData$ | async"
            [config]="performanceChartConfig"
            [loading]="loading"
          ></app-chart>
        </div>

        <!-- 网络流量 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">网络流量</h2>
          <app-chart
            [data]="networkChartData$ | async"
            [config]="networkChartConfig"
            [loading]="loading"
          ></app-chart>
        </div>
      </div>

      <!-- 服务状态监控 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">服务状态</h2>
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <span>最后更新: {{ lastServiceCheck | date:'short' }}</span>
            <button
              (click)="checkServices()"
              class="px-3 py-1 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
            >
              立即检查
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <div
            *ngFor="let service of serviceMetrics$ | async"
            class="border border-gray-200 rounded-lg p-4"
            [ngClass]="getServiceStatusClass(service.status)"
          >
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-medium text-gray-900">{{ service.name }}</h3>
              <app-status-indicator
                [status]="{
                  id: service.name,
                  name: '',
                  status: service.status,
                  lastUpdated: new Date(service.lastCheck)
                }"
                [config]="{ type: 'badge', animated: true }"
              ></app-status-indicator>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-gray-500">响应时间:</span>
                <span class="ml-1 font-medium">{{ service.responseTime }}ms</span>
              </div>
              <div>
                <span class="text-gray-500">吞吐量:</span>
                <span class="ml-1 font-medium">{{ service.throughput }}/s</span>
              </div>
              <div>
                <span class="text-gray-500">错误率:</span>
                <span class="ml-1 font-medium" [ngClass]="service.errorRate > 5 ? 'text-red-600' : 'text-green-600'">
                  {{ service.errorRate }}%
                </span>
              </div>
              <div>
                <span class="text-gray-500">运行时间:</span>
                <span class="ml-1 font-medium">{{ formatUptime(service.uptime) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 告警列表 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">系统告警</h2>
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 text-xs rounded-full" [ngClass]="getAlertCountClass()">
              {{ (alerts$ | async)?.length || 0 }} 条告警
            </span>
            <button
              (click)="clearAllAlerts()"
              class="px-3 py-1 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
            >
              清除全部
            </button>
          </div>
        </div>
        <div class="space-y-2">
          <ng-container *ngIf="alerts$ | async as alerts">
            <div
              *ngFor="let alert of alerts"
              class="flex items-start gap-3 p-3 rounded-lg border-l-4"
              [ngClass]="getAlertClass(alert.level, alert.resolved)"
            >
              <div class="flex-shrink-0 mt-1">
                <span class="text-lg">{{ getAlertIcon(alert.level) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <h4 class="text-sm font-medium text-gray-900">{{ alert.title }}</h4>
                  <span class="text-xs text-gray-500">{{ formatTime(alert.timestamp) }}</span>
                </div>
                <p class="text-sm text-gray-600 mt-1">{{ alert.message }}</p>
              </div>
              <div class="flex-shrink-0">
                <button
                  *ngIf="!alert.resolved"
                  (click)="resolveAlert(alert.id)"
                  class="text-green-600 hover:text-green-800 text-sm"
                >
                  解决
                </button>
              </div>
            </div>
          </ng-container>

          <div *ngIf="!(alerts$ | async)?.length" class="text-center py-8 text-gray-500">
            暂无系统告警
          </div>
        </div>
      </div>

      <!-- 实时日志流 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">实时日志</h2>
          <div class="flex items-center gap-2">
            <button
              (click)="toggleLogStream()"
              class="px-3 py-1 text-sm rounded transition-colors"
              [ngClass]="logStreamEnabled ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'"
            >
              {{ logStreamEnabled ? '暂停' : '恢复' }}
            </button>
            <button
              (click)="clearLogs()"
              class="px-3 py-1 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
            >
              清空
            </button>
          </div>
        </div>
        <div class="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
          <div
            *ngFor="let log of logStream$ | async"
            class="text-green-400 mb-1"
          >
            <span class="text-gray-500">{{ log.timestamp }}</span>
            <span [ngClass]="getLogLevelClass(log.level)">{{ log.level.toUpperCase() }}</span>
            <span>{{ log.message }}</span>
          </div>
          <div *ngIf="!(logStream$ | async)?.length" class="text-gray-500 text-center">
            等待日志数据...
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .monitoring-container {
      @apply min-h-screen bg-gray-50;
    }

    .metrics-grid {
      @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6;
    }

    .charts-grid {
      @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
    }

    .service-online {
      @apply border-green-200 bg-green-50;
    }

    .service-offline {
      @apply border-red-200 bg-red-50;
    }

    .service-warning {
      @apply border-yellow-200 bg-yellow-50;
    }

    .alert-critical {
      @apply border-red-500 bg-red-50;
    }

    .alert-error {
      @apply border-red-400 bg-red-50;
    }

    .alert-warning {
      @apply border-yellow-400 bg-yellow-50;
    }

    .alert-info {
      @apply border-blue-400 bg-blue-50;
    }

    .alert-resolved {
      @apply border-gray-300 bg-gray-50 opacity-60;
    }

    .log-container {
      @apply bg-gray-900 text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonitoringComponent implements OnInit, OnDestroy {
  private wsService = inject(WebSocketService);
  private realTimeService = inject(RealTimeDataService);
  private dataManager = inject(DataManagerService);
  private destroy$ = new Subject<void>();

  loading = false;
  realTimeEnabled = false;
  logStreamEnabled = true;
  lastServiceCheck = new Date();

  // 连接状态
  connectionStatus$ = this.wsService.getConnectionStatus();

  // 数据流
  systemMetrics$ = new Observable<StatsCardData[]>();
  performanceChartData$ = new Observable<ChartData>();
  networkChartData$ = new Observable<ChartData>();
  serviceMetrics$ = new Observable<ServiceMetrics[]>();
  alerts$ = new Observable<AlertItem[]>();
  logStream$ = new Observable<any[]>();

  // 图表配置
  performanceChartConfig: ChartConfig = {
    type: 'line',
    showGrid: true,
    showLegend: true,
    colors: ['#ef4444', '#3b82f6'],
    height: 250
  };

  networkChartConfig: ChartConfig = {
    type: 'line',
    showGrid: true,
    showLegend: true,
    colors: ['#10b981', '#f59e0b'],
    height: 250
  };

  // 数据存储
  private logData: any[] = [];
  private alertData: AlertItem[] = [];

  ngOnInit(): void {
    this.initializeDataStreams();
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.wsService.disconnect();
    this.realTimeService.cleanupAll();
  }

  // 初始化数据流
  private initializeDataStreams(): void {
    // 系统指标
    this.systemMetrics$ = interval(5000).pipe(
      startWith(0),
      takeUntil(this.destroy$),
      map(() => this.generateSystemMetrics())
    );

    // 性能图表数据
    this.performanceChartData$ = interval(3000).pipe(
      startWith(0),
      takeUntil(this.destroy$),
      map(() => this.generatePerformanceChartData())
    );

    // 网络图表数据
    this.networkChartData$ = interval(3000).pipe(
      startWith(0),
      takeUntil(this.destroy$),
      map(() => this.generateNetworkChartData())
    );

    // 服务状态
    this.serviceMetrics$ = interval(10000).pipe(
      startWith(0),
      takeUntil(this.destroy$),
      map(() => this.generateServiceMetrics())
    );

    // 告警数据
    this.alerts$ = interval(15000).pipe(
      startWith(0),
      takeUntil(this.destroy$),
      map(() => {
        // 随机生成新告警
        if (Math.random() > 0.8) {
          this.alertData.unshift(this.generateRandomAlert());
          if (this.alertData.length > 50) {
            this.alertData.pop();
          }
        }
        return [...this.alertData];
      })
    );

    // 日志流
    this.logStream$ = interval(1000).pipe(
      startWith(0),
      takeUntil(this.destroy$),
      map(() => {
        if (this.logStreamEnabled) {
          // 随机生成新日志
          if (Math.random() > 0.7) {
            this.logData.unshift(this.generateRandomLog());
            if (this.logData.length > 100) {
              this.logData.pop();
            }
          }
        }
        return [...this.logData];
      })
    );
  }

  // 连接WebSocket
  private connectWebSocket(): void {
    this.wsService.connect().subscribe({
      next: (connected) => {
        console.log('WebSocket connected:', connected);
      },
      error: (error) => {
        console.error('WebSocket connection failed:', error);
      }
    });
  }

  // 切换实时更新
  toggleRealTimeUpdates(): void {
    this.realTimeEnabled = !this.realTimeEnabled;
    if (this.realTimeEnabled) {
      this.connectWebSocket();
    } else {
      this.wsService.disconnect();
    }
  }

  // 切换日志流
  toggleLogStream(): void {
    this.logStreamEnabled = !this.logStreamEnabled;
  }

  // 检查服务状态
  checkServices(): void {
    this.lastServiceCheck = new Date();
    // 实际应用中这里会调用服务检查API
  }

  // 清除所有告警
  clearAllAlerts(): void {
    this.alertData = [];
  }

  // 解决告警
  resolveAlert(alertId: string): void {
    const alert = this.alertData.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  // 清空日志
  clearLogs(): void {
    this.logData = [];
  }

  // 数据生成方法
  private generateSystemMetrics(): StatsCardData[] {
    return [
      {
        title: 'CPU 使用率',
        value: Math.floor(Math.random() * 40) + 30,
        unit: '%',
        icon: '💻',
        color: 'primary',
        trend: {
          value: Math.random() * 10 - 5,
          isPositive: Math.random() > 0.5
        }
      },
      {
        title: '内存使用率',
        value: Math.floor(Math.random() * 30) + 50,
        unit: '%',
        icon: '🧠',
        color: 'warning',
        trend: {
          value: Math.random() * 10 - 5,
          isPositive: Math.random() > 0.5
        }
      },
      {
        title: '磁盘使用率',
        value: Math.floor(Math.random() * 20) + 60,
        unit: '%',
        icon: '💾',
        color: 'info',
        trend: {
          value: Math.random() * 10 - 5,
          isPositive: Math.random() > 0.5
        }
      },
      {
        title: '网络延迟',
        value: Math.floor(Math.random() * 50) + 10,
        unit: 'ms',
        icon: '🌐',
        color: 'success',
        trend: {
          value: Math.random() * 10 - 5,
          isPositive: Math.random() > 0.5
        }
      }
    ];
  }

  private generatePerformanceChartData(): ChartData {
    const labels = Array.from({ length: 20 }, (_, i) => {
      const date = new Date(Date.now() - (19 - i) * 3000);
      return date.toLocaleTimeString();
    });

    return {
      labels,
      datasets: [
        {
          label: 'CPU',
          data: labels.map(() => Math.floor(Math.random() * 30) + 40),
          borderColor: '#ef4444',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.4
        },
        {
          label: '内存',
          data: labels.map(() => Math.floor(Math.random() * 20) + 50),
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.4
        }
      ]
    };
  }

  private generateNetworkChartData(): ChartData {
    const labels = Array.from({ length: 20 }, (_, i) => {
      const date = new Date(Date.now() - (19 - i) * 3000);
      return date.toLocaleTimeString();
    });

    return {
      labels,
      datasets: [
        {
          label: '入站流量',
          data: labels.map(() => Math.floor(Math.random() * 100) + 50),
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.4
        },
        {
          label: '出站流量',
          data: labels.map(() => Math.floor(Math.random() * 80) + 30),
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.4
        }
      ]
    };
  }

  private generateServiceMetrics(): ServiceMetrics[] {
    const services = ['API服务', '爬虫服务', '任务调度器', '数据库', '缓存服务', '消息队列'];
    return services.map(name => ({
      name,
      status: Math.random() > 0.9 ? 'offline' : Math.random() > 0.7 ? 'warning' : 'online',
      responseTime: Math.floor(Math.random() * 200) + 50,
      throughput: Math.floor(Math.random() * 1000) + 100,
      errorRate: Math.random() * 5,
      uptime: Math.floor(Math.random() * 30) + 1,
      lastCheck: new Date().toISOString()
    }));
  }

  private generateRandomAlert(): AlertItem {
    const levels = ['info', 'warning', 'error', 'critical'];
    const titles = [
      'CPU使用率过高',
      '内存不足',
      '磁盘空间不足',
      '网络连接超时',
      '服务响应缓慢',
      '数据库连接异常'
    ];

    const level = levels[Math.floor(Math.random() * levels.length)] as any;
    const title = titles[Math.floor(Math.random() * titles.length)];

    return {
      id: Math.random().toString(36).substr(2, 9),
      level,
      title,
      message: `${title}: 当前值超出正常范围，请及时处理。`,
      timestamp: new Date().toISOString(),
      resolved: false
    };
  }

  private generateRandomLog(): any {
    const levels = ['info', 'warn', 'error', 'debug'];
    const messages = [
      '用户登录成功',
      '数据处理完成',
      '任务开始执行',
      '缓存更新完成',
      'API请求处理',
      '数据库查询执行'
    ];

    const level = levels[Math.floor(Math.random() * levels.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];

    return {
      timestamp: new Date().toISOString(),
      level,
      message
    };
  }

  // 工具方法
  private getServiceStatusClass(status: string): string {
    switch (status) {
      case 'online':
        return 'service-online';
      case 'offline':
        return 'service-offline';
      case 'warning':
        return 'service-warning';
      default:
        return '';
    }
  }

  private getAlertClass(level: string, resolved: boolean): string {
    if (resolved) return 'alert-resolved';
    return `alert-${level}`;
  }

  private getAlertCountClass(): string {
    const alertCount = this.alertData.length;
    if (alertCount > 10) return 'bg-red-100 text-red-700';
    if (alertCount > 5) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  }

  private getAlertIcon(level: string): string {
    switch (level) {
      case 'critical':
        return '🚨';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  }

  private getLogLevelClass(level: string): string {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      case 'debug':
        return 'text-gray-400';
      default:
        return 'text-green-400';
    }
  }

  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  }

  private formatUptime(hours: number): string {
    if (hours < 24) {
      return `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
}