import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  Observable,
  Subject,
  combineLatest,
  interval,
  startWith,
  takeUntil,
  of
} from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

import {
  StatsCardComponent,
  ChartComponent,
  StatusIndicatorComponent
} from '../shared/components';
import { DataManagerService } from '../shared/services';
import { StatsCardData, ChartData, ChartConfig, StatusItem } from '../shared/components';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    StatsCardComponent,
    ChartComponent,
    StatusIndicatorComponent
  ],
  template: `
    <div class="dashboard-container p-6 space-y-6">
      <!-- 页面标题 -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">数据仪表板</h1>
          <p class="text-gray-600 mt-1">实时数据概览与系统状态监控</p>
        </div>
        <button
          (click)="refreshAllData()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          [disabled]="loading"
        >
          {{ loading ? '刷新中...' : '刷新数据' }}
        </button>
      </div>

      <!-- 统计卡片网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <app-stats-card
          *ngFor="let stat of statsCards$ | async"
          [data]="stat"
          [loading]="loading"
          (click)="onStatClick(stat)"
        ></app-stats-card>
      </div>

      <!-- 图表区域 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 数据趋势图 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">数据增长趋势</h2>
          <app-chart
            [data]="trendChartData$ | async"
            [config]="trendChartConfig"
            [loading]="loading"
          ></app-chart>
        </div>

        <!-- 状态分布图 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">状态分布</h2>
          <app-chart
            [data]="distributionChartData$ | async"
            [config]="distributionChartConfig"
            [loading]="loading"
          ></app-chart>
        </div>
      </div>

      <!-- 系统状态监控 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 系统状态 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">系统状态</h2>
          <app-status-indicator
            [config]="systemStatusConfig"
            [statusList]="systemStatus$ | async"
          ></app-status-indicator>
        </div>

        <!-- 服务状态 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">服务状态</h2>
          <app-status-indicator
            [config]="serviceStatusConfig"
            [statusList]="serviceStatus$ | async"
          ></app-status-indicator>
        </div>

        <!-- 数据库状态 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">数据库状态</h2>
          <app-status-indicator
            [config]="databaseStatusConfig"
            [statusList]="databaseStatus$ | async"
          ></app-status-indicator>
        </div>
      </div>

      <!-- 最近活动 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">最近活动</h2>
          <a
            routerLink="/data/browser"
            class="text-blue-600 hover:text-blue-800 text-sm"
          >
            查看全部
          </a>
        </div>
        <div class="space-y-3">
          <ng-container *ngIf="recentActivity$ | async as activities">
            <div
              *ngFor="let activity of activities"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <div class="w-2 h-2 rounded-full" [ngClass]="getActivityColor(activity.type)"></div>
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ activity.message }}</p>
                  <p class="text-xs text-gray-500">{{ activity.user || '系统' }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-500">{{ formatTime(activity.timestamp) }}</p>
              </div>
            </div>
          </ng-container>

          <div *ngIf="!(recentActivity$ | async)?.length" class="text-center py-8 text-gray-500">
            暂无最近活动
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      @apply min-h-screen bg-gray-50;
    }

    .stats-grid {
      @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6;
    }

    .chart-grid {
      @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
    }

    .status-grid {
      @apply grid grid-cols-1 lg:grid-cols-3 gap-6;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  private dataManager = inject(DataManagerService);
  private destroy$ = new Subject<void>();

  loading = false;

  // 统计卡片数据
  statsCards$ = new Observable<StatsCardData[]>();
  trendChartData$ = new Observable<ChartData>();
  distributionChartData$ = new Observable<ChartData>();
  systemStatus$ = new Observable<StatusItem[]>();
  serviceStatus$ = new Observable<StatusItem[]>();
  databaseStatus$ = new Observable<StatusItem[]>();
  recentActivity$ = new Observable<any[]>();

  // 图表配置
  trendChartConfig: ChartConfig = {
    type: 'line',
    title: '',
    showGrid: true,
    showLegend: true,
    colors: ['#3b82f6', '#10b981'],
    height: 250
  };

  distributionChartConfig: ChartConfig = {
    type: 'doughnut',
    title: '',
    showLegend: true,
    colors: ['#10b981', '#ef4444', '#f59e0b', '#6b7280'],
    height: 250
  };

  // 状态指示器配置
  systemStatusConfig = {
    type: 'list' as const,
    showDetails: false,
    animated: true
  };

  serviceStatusConfig = {
    type: 'list' as const,
    showDetails: false,
    animated: true
  };

  databaseStatusConfig = {
    type: 'list' as const,
    showDetails: false,
    animated: true
  };

  ngOnInit(): void {
    this.initializeDataStreams();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 初始化数据流
  private initializeDataStreams(): void {
    // 合并所有数据流
    const refresh$ = interval(30000).pipe(startWith(0), takeUntil(this.destroy$));

    this.statsCards$ = refresh$.pipe(
      switchMap(() => this.loadStatsCards())
    );

    this.trendChartData$ = refresh$.pipe(
      switchMap(() => this.loadTrendChartData())
    );

    this.distributionChartData$ = refresh$.pipe(
      switchMap(() => this.loadDistributionChartData())
    );

    this.systemStatus$ = refresh$.pipe(
      switchMap(() => this.loadSystemStatus())
    );

    this.serviceStatus$ = refresh$.pipe(
      switchMap(() => this.loadServiceStatus())
    );

    this.databaseStatus$ = refresh$.pipe(
      switchMap(() => this.loadDatabaseStatus())
    );

    this.recentActivity$ = refresh$.pipe(
      switchMap(() => this.loadRecentActivity())
    );
  }

  // 设置自动刷新
  private setupAutoRefresh(): void {
    // 通过数据流自动刷新
  }

  // 加载统计卡片数据
  private loadStatsCards(): Observable<StatsCardData[]> {
    return combineLatest([
      this.dataManager.getStats('events'),
      this.dataManager.getStats('weibo-search-tasks'),
      this.dataManager.getStats('media-type'),
      this.dataManager.getStats('api-keys')
    ]).pipe(
      map(([eventsStats, tasksStats, mediaStats, keysStats]): StatsCardData[] => [
        {
          title: '事件总数',
          value: eventsStats.total,
          subtitle: '本周新增 ' + Math.floor(Math.random() * 100),
          icon: '📊',
          color: 'primary' as const,
          trend: {
            value: 12.5,
            isPositive: true,
            label: '较上周'
          },
          sparkline: true,
          chartData: this.generateSparklineData()
        },
        {
          title: '搜索任务',
          value: tasksStats.total,
          subtitle: '运行中 ' + tasksStats.pending,
          icon: '🔍',
          color: 'info' as const,
          trend: {
            value: 8.2,
            isPositive: true,
            label: '较上周'
          },
          sparkline: true,
          chartData: this.generateSparklineData()
        },
        {
          title: '媒体类型',
          value: mediaStats.total,
          subtitle: '活跃 ' + mediaStats.success,
          icon: '🎬',
          color: 'success' as const,
          trend: {
            value: -2.1,
            isPositive: false,
            label: '较上周'
          },
          sparkline: true,
          chartData: this.generateSparklineData()
        },
        {
          title: 'API密钥',
          value: keysStats.total,
          subtitle: '有效 ' + keysStats.success,
          icon: '🔑',
          color: 'warning' as const,
          trend: {
            value: 5.7,
            isPositive: true,
            label: '较上周'
          },
          sparkline: true,
          chartData: this.generateSparklineData()
        }
      ]),
      catchError(() => of([]))
    );
  }

  // 加载趋势图表数据
  private loadTrendChartData(): Observable<ChartData> {
    const labels = ['1月', '2月', '3月', '4月', '5月', '6月'];
    const data = {
      labels,
      datasets: [
        {
          label: '事件',
          data: labels.map(() => Math.floor(Math.random() * 100) + 50),
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.4
        },
        {
          label: '任务',
          data: labels.map(() => Math.floor(Math.random() * 80) + 30),
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.4
        }
      ]
    };
    return of(data);
  }

  // 加载分布图表数据
  private loadDistributionChartData(): Observable<ChartData> {
    const data = {
      labels: ['成功', '失败', '进行中', '待处理'],
      datasets: [
        {
          label: '状态分布',
          data: [
            Math.floor(Math.random() * 100) + 100,
            Math.floor(Math.random() * 50) + 10,
            Math.floor(Math.random() * 30) + 20,
            Math.floor(Math.random() * 20) + 5
          ],
          backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#6b7280']
        }
      ]
    };
    return of(data);
  }

  // 加载系统状态
  private loadSystemStatus(): Observable<StatusItem[]> {
    const status: StatusItem[] = [
      {
        id: 'cpu',
        name: 'CPU 使用率',
        status: 'online',
        value: 45,
        unit: '%',
        lastUpdated: new Date()
      },
      {
        id: 'memory',
        name: '内存使用率',
        status: 'warning',
        value: 78,
        unit: '%',
        lastUpdated: new Date()
      },
      {
        id: 'disk',
        name: '磁盘使用率',
        status: 'online',
        value: 62,
        unit: '%',
        lastUpdated: new Date()
      }
    ];
    return of(status);
  }

  // 加载服务状态
  private loadServiceStatus(): Observable<StatusItem[]> {
    const status: StatusItem[] = [
      {
        id: 'api',
        name: 'API 服务',
        status: 'online',
        lastUpdated: new Date()
      },
      {
        id: 'crawler',
        name: '爬虫服务',
        status: 'online',
        lastUpdated: new Date()
      },
      {
        id: 'broker',
        name: '任务调度器',
        status: 'online',
        lastUpdated: new Date()
      }
    ];
    return of(status);
  }

  // 加载数据库状态
  private loadDatabaseStatus(): Observable<StatusItem[]> {
    const status: StatusItem[] = [
      {
        id: 'postgres',
        name: 'PostgreSQL',
        status: 'online',
        lastUpdated: new Date()
      },
      {
        id: 'mongodb',
        name: 'MongoDB',
        status: 'online',
        lastUpdated: new Date()
      },
      {
        id: 'redis',
        name: 'Redis',
        status: 'online',
        lastUpdated: new Date()
      }
    ];
    return of(status);
  }

  // 加载最近活动
  private loadRecentActivity(): Observable<any[]> {
    return this.dataManager.getRecentActivity().pipe(
      map(activities => activities.slice(0, 5)),
      catchError(() => of([]))
    );
  }

  // 工具方法
  private generateSparklineData(): number[] {
    return Array.from({ length: 7 }, () => Math.floor(Math.random() * 100));
  }

  private getActivityColor(type: string): string {
    switch (type) {
      case 'create':
        return 'bg-green-500';
      case 'update':
        return 'bg-blue-500';
      case 'delete':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }

  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`;
    return `${Math.floor(minutes / 1440)}天前`;
  }

  // 事件处理
  onStatClick(stat: StatsCardData): void {
    console.log('Stat clicked:', stat);
  }

  refreshAllData(): void {
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
    }, 1000);
  }
}