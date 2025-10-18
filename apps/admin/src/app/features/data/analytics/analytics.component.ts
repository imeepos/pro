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
  combineLatest,
  startWith,
  takeUntil,
  map
} from 'rxjs';

import {
  ChartComponent,
  StatsCardComponent
} from '../shared/components';
import { DataManagerService } from '../shared/services';
import { ChartData, ChartConfig, StatsCardData } from '../shared/components';

interface AnalyticsFilter {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  entity: string;
  metric: string;
}

interface DataInsight {
  title: string;
  description: string;
  value: string;
  trend: {
    value: number;
    isPositive: boolean;
  };
  recommendation: string;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    ChartComponent,
    StatsCardComponent
  ],
  template: `
    <div class="analytics-container p-6 space-y-6">
      <!-- 页面标题 -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">数据分析</h1>
          <p class="text-gray-600 mt-1">深度数据洞察与趋势分析</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            (click)="exportReport()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            导出报告
          </button>
          <button
            (click)="refreshAnalytics()"
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            刷新数据
          </button>
        </div>
      </div>

      <!-- 分析筛选器 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">时间范围</label>
            <select
              [(ngModel)]="selectedTimeRange"
              (change)="onTimeRangeChange()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">最近7天</option>
              <option value="30d">最近30天</option>
              <option value="90d">最近90天</option>
              <option value="1y">最近一年</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">数据类型</label>
            <select
              [(ngModel)]="filters.entity"
              (change)="applyFilters()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部类型</option>
              <option value="events">事件</option>
              <option value="weibo-search-tasks">微博任务</option>
              <option value="media-type">媒体类型</option>
              <option value="api-keys">API密钥</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">分析维度</label>
            <select
              [(ngModel)]="filters.metric"
              (change)="applyFilters()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="growth">增长趋势</option>
              <option value="distribution">分布分析</option>
              <option value="performance">性能指标</option>
              <option value="quality">质量评估</option>
            </select>
          </div>
          <div *ngIf="selectedTimeRange === 'custom'">
            <label class="block text-sm font-medium text-gray-700 mb-1">自定义范围</label>
            <input
              type="date"
              [(ngModel)]="customDateRange.start"
              (change)="applyFilters()"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- 数据洞察卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          *ngFor="let insight of dataInsights$ | async"
          class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200"
        >
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium text-gray-700">{{ insight.title }}</h3>
            <span class="text-xs px-2 py-1 rounded-full" [ngClass]="getInsightBadgeClass(insight.trend.isPositive)">
              {{ insight.trend.isPositive ? '上升' : '下降' }} {{ Math.abs(insight.trend.value) }}%
            </span>
          </div>
          <div class="text-2xl font-bold text-gray-900 mb-2">{{ insight.value }}</div>
          <p class="text-sm text-gray-600 mb-3">{{ insight.description }}</p>
          <div class="text-xs text-blue-700 bg-blue-100 rounded px-2 py-1">
            💡 {{ insight.recommendation }}
          </div>
        </div>
      </div>

      <!-- 主要分析图表 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 趋势分析图 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">增长趋势分析</h2>
            <div class="flex items-center gap-2">
              <button
                *ngFor="let period of trendPeriods"
                (click)="changeTrendPeriod(period)"
                class="px-3 py-1 text-xs rounded transition-colors"
                [ngClass]="selectedTrendPeriod === period ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'"
              >
                {{ period }}
              </button>
            </div>
          </div>
          <app-chart
            [data]="trendChartData$ | async"
            [config]="trendChartConfig"
            [loading]="loading"
          ></app-chart>
        </div>

        <!-- 分布分析图 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">数据分布分析</h2>
            <select
              [(ngModel)]="selectedDistributionType"
              (change)="onDistributionTypeChange()"
              class="px-3 py-1 text-sm border border-gray-300 rounded"
            >
              <option value="category">按类别</option>
              <option value="status">按状态</option>
              <option value="time">按时间</option>
            </select>
          </div>
          <app-chart
            [data]="distributionChartData$ | async"
            [config]="distributionChartConfig"
            [loading]="loading"
          ></app-chart>
        </div>
      </div>

      <!-- 次要分析图表 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 性能指标 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">性能指标</h2>
          <app-chart
            [data]="performanceChartData$ | async"
            [config]="performanceChartConfig"
            [loading]="loading"
          ></app-chart>
        </div>

        <!-- 质量评估 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">质量评估</h2>
          <app-chart
            [data]="qualityChartData$ | async"
            [config]="qualityChartConfig"
            [loading]="loading"
          ></app-chart>
        </div>

        <!-- 对比分析 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">同比/环比</h2>
          <app-chart
            [data]="comparisonChartData$ | async"
            [config]="comparisonChartConfig"
            [loading]="loading"
          ></app-chart>
        </div>
      </div>

      <!-- 数据表格总结 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">关键指标汇总</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">指标</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">当前值</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">上期值</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">变化率</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">趋势</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let metric of summaryMetrics$ | async">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ metric.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ metric.current }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ metric.previous }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm" [ngClass]="metric.change > 0 ? 'text-green-600' : 'text-red-600'">
                  {{ metric.change > 0 ? '+' : '' }}{{ metric.change.toFixed(1) }}%
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span [ngClass]="getTrendClass(metric.trend)">{{ getTrendIcon(metric.trend) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 预测和趋势 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">预测分析</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <app-chart
            [data]="forecastChartData$ | async"
            [config]="forecastChartConfig"
            [loading]="loading"
          ></app-chart>
          <div class="space-y-4">
            <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 class="font-medium text-blue-900 mb-2">📈 增长预测</h3>
              <p class="text-sm text-blue-700 mb-3">基于历史数据分析，预计下月数据量将增长15-20%</p>
              <div class="text-xs text-blue-600">置信度: 85%</div>
            </div>
            <div class="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 class="font-medium text-yellow-900 mb-2">⚠️ 风险提示</h3>
              <p class="text-sm text-yellow-700 mb-3">系统负载可能在未来2周内达到阈值，建议提前扩容</p>
              <div class="text-xs text-yellow-600">建议处理时间: 7天内</div>
            </div>
            <div class="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 class="font-medium text-green-900 mb-2">💡 优化建议</h3>
              <p class="text-sm text-green-700 mb-3">通过数据压缩技术可节省30%的存储空间</p>
              <div class="text-xs text-green-600">预期收益: 节省存储成本20%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-container {
      @apply min-h-screen bg-gray-50;
    }

    .insight-card {
      @apply bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200;
    }

    .trend-up {
      @apply text-green-600 bg-green-100;
    }

    .trend-down {
      @apply text-red-600 bg-red-100;
    }

    .filter-grid {
      @apply grid grid-cols-1 md:grid-cols-4 gap-4;
    }

    .charts-grid {
      @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
    }

    .small-charts-grid {
      @apply grid grid-cols-1 lg:grid-cols-3 gap-6;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  private dataManager = inject(DataManagerService);
  private destroy$ = new Subject<void>();

  loading = false;
  selectedTimeRange = '30d';
  selectedTrendPeriod = '7d';
  selectedDistributionType = 'category';

  // 筛选器
  filters: AnalyticsFilter = {
    dateRange: {
      startDate: '',
      endDate: ''
    },
    entity: 'all',
    metric: 'growth'
  };

  customDateRange = {
    start: '',
    end: ''
  };

  trendPeriods = ['24h', '7d', '30d', '90d'];

  // 数据流
  dataInsights$ = new Observable<DataInsight[]>();
  trendChartData$ = new Observable<ChartData>();
  distributionChartData$ = new Observable<ChartData>();
  performanceChartData$ = new Observable<ChartData>();
  qualityChartData$ = new Observable<ChartData>();
  comparisonChartData$ = new Observable<ChartData>();
  forecastChartData$ = new Observable<ChartData>();
  summaryMetrics$ = new Observable<any[]>();

  // 图表配置
  trendChartConfig: ChartConfig = {
    type: 'line',
    showGrid: true,
    showLegend: true,
    colors: ['#3b82f6', '#10b981', '#f59e0b'],
    height: 250
  };

  distributionChartConfig: ChartConfig = {
    type: 'doughnut',
    showLegend: true,
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
    height: 250
  };

  performanceChartConfig: ChartConfig = {
    type: 'bar',
    showGrid: true,
    showLegend: false,
    colors: ['#3b82f6'],
    height: 200
  };

  qualityChartConfig: ChartConfig = {
    type: 'radar',
    showGrid: true,
    showLegend: false,
    colors: ['#10b981', '#f59e0b'],
    height: 200
  };

  comparisonChartConfig: ChartConfig = {
    type: 'bar',
    showGrid: false,
    showLegend: true,
    colors: ['#3b82f6', '#10b981'],
    height: 200
  };

  forecastChartConfig: ChartConfig = {
    type: 'line',
    showGrid: true,
    showLegend: true,
    colors: ['#3b82f6', '#10b981', '#ef4444'],
    height: 300
  };

  ngOnInit(): void {
    this.initializeData();
    this.updateDateRange();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 初始化数据
  private initializeData(): void {
    this.dataInsights$ = this.generateDataInsights();
    this.trendChartData$ = this.generateTrendChartData();
    this.distributionChartData$ = this.generateDistributionChartData();
    this.performanceChartData$ = this.generatePerformanceChartData();
    this.qualityChartData$ = this.generateQualityChartData();
    this.comparisonChartData$ = this.generateComparisonChartData();
    this.forecastChartData$ = this.generateForecastChartData();
    this.summaryMetrics$ = this.generateSummaryMetrics();
  }

  // 更新日期范围
  private updateDateRange(): void {
    const endDate = new Date();
    const startDate = new Date();

    switch (this.selectedTimeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'custom':
        if (this.customDateRange.start) {
          startDate.setTime(new Date(this.customDateRange.start).getTime());
        }
        break;
    }

    this.filters.dateRange = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  // 事件处理
  onTimeRangeChange(): void {
    this.updateDateRange();
    this.applyFilters();
  }

  onDistributionTypeChange(): void {
    this.applyFilters();
  }

  changeTrendPeriod(period: string): void {
    this.selectedTrendPeriod = period;
    this.trendChartData$ = this.generateTrendChartData();
  }

  applyFilters(): void {
    this.loading = true;
    setTimeout(() => {
      this.initializeData();
      this.loading = false;
    }, 1000);
  }

  refreshAnalytics(): void {
    this.applyFilters();
  }

  exportReport(): void {
    console.log('Export analytics report');
  }

  // 数据生成方法
  private generateDataInsights(): Observable<DataInsight[]> {
    return new Observable(observer => {
      const insights: DataInsight[] = [
        {
          title: '数据增长',
          description: '本月数据量较上月增长',
          value: '23.5%',
          trend: { value: 23.5, isPositive: true },
          recommendation: '保持当前增长策略'
        },
        {
          title: '处理效率',
          description: '平均处理时间优化',
          value: '156ms',
          trend: { value: -12.3, isPositive: true },
          recommendation: '继续优化算法'
        },
        {
          title: '成功率',
          description: '数据处理成功率',
          value: '98.7%',
          trend: { value: 2.1, isPositive: true },
          recommendation: '监控异常情况'
        },
        {
          title: '存储使用',
          description: '存储空间使用率',
          value: '67.2%',
          trend: { value: 5.8, isPositive: false },
          recommendation: '考虑数据压缩'
        }
      ];
      observer.next(insights);
    });
  }

  private generateTrendChartData(): Observable<ChartData> {
    return new Observable(observer => {
      const labels = this.generateTimeLabels(this.selectedTrendPeriod);
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
          },
          {
            label: '用户',
            data: labels.map(() => Math.floor(Math.random() * 60) + 20),
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.4
          }
        ]
      };
      observer.next(data);
    });
  }

  private generateDistributionChartData(): Observable<ChartData> {
    return new Observable(observer => {
      const data = {
        labels: ['新闻', '社交', '视频', '图片', '音频', '文档'],
        datasets: [
          {
            label: '数据分布',
            data: [
              Math.floor(Math.random() * 100) + 50,
              Math.floor(Math.random() * 80) + 30,
              Math.floor(Math.random() * 60) + 20,
              Math.floor(Math.random() * 40) + 10,
              Math.floor(Math.random() * 30) + 5,
              Math.floor(Math.random() * 20) + 5
            ],
            backgroundColor: [
              '#3b82f6', '#10b981', '#f59e0b',
              '#ef4444', '#8b5cf6', '#ec4899'
            ]
          }
        ]
      };
      observer.next(data);
    });
  }

  private generatePerformanceChartData(): Observable<ChartData> {
    return new Observable(observer => {
      const data = {
        labels: ['CPU', '内存', '磁盘', '网络', '响应时间'],
        datasets: [
          {
            label: '性能指标',
            data: [
              Math.floor(Math.random() * 40) + 30,
              Math.floor(Math.random() * 30) + 50,
              Math.floor(Math.random() * 20) + 60,
              Math.floor(Math.random() * 50) + 20,
              Math.floor(Math.random() * 100) + 50
            ],
            backgroundColor: '#3b82f6'
          }
        ]
      };
      observer.next(data);
    });
  }

  private generateQualityChartData(): Observable<ChartData> {
    return new Observable(observer => {
      const data = {
        labels: ['完整性', '准确性', '一致性', '及时性', '有效性'],
        datasets: [
          {
            label: '当前',
            data: [85, 92, 78, 88, 95],
            backgroundColor: '#10b98140',
            borderColor: '#10b981',
            borderWidth: 2
          },
          {
            label: '目标',
            data: [90, 95, 85, 90, 98],
            backgroundColor: '#f59e0b40',
            borderColor: '#f59e0b',
            borderWidth: 2
          }
        ]
      };
      observer.next(data);
    });
  }

  private generateComparisonChartData(): Observable<ChartData> {
    return new Observable(observer => {
      const data = {
        labels: ['本周', '上周', '本月', '上月'],
        datasets: [
          {
            label: '当前周期',
            data: [1200, 1050, 4800, 4200],
            backgroundColor: '#3b82f6'
          },
          {
            label: '上期周期',
            data: [1100, 980, 4500, 3900],
            backgroundColor: '#10b981'
          }
        ]
      };
      observer.next(data);
    });
  }

  private generateForecastChartData(): Observable<ChartData> {
    return new Observable(observer => {
      const labels = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - 6 + i);
        return date.toLocaleDateString('zh-CN', { month: 'short' });
      });

      const data = {
        labels,
        datasets: [
          {
            label: '历史数据',
            data: Array.from({ length: 6 }, () => Math.floor(Math.random() * 100) + 50),
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
            borderWidth: 2
          },
          {
            label: '预测数据',
            data: Array.from({ length: 6 }, (_, i) => 100 + i * 15 + Math.random() * 20),
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5]
          },
          {
            label: '置信区间上界',
            data: Array.from({ length: 6 }, (_, i) => 120 + i * 18 + Math.random() * 25),
            borderColor: '#ef4444',
            backgroundColor: '#ef444420',
            borderWidth: 1,
            fill: true
          },
          {
            label: '置信区间下界',
            data: Array.from({ length: 6 }, (_, i) => 80 + i * 12 + Math.random() * 15),
            borderColor: '#ef4444',
            backgroundColor: 'transparent',
            borderWidth: 1,
            fill: false
          }
        ]
      };
      observer.next(data);
    });
  }

  private generateSummaryMetrics(): Observable<any[]> {
    return new Observable(observer => {
      const metrics = [
        {
          name: '总数据量',
          current: '125,432',
          previous: '101,234',
          change: 23.9,
          trend: 'up'
        },
        {
          name: '日增长率',
          current: '2.3%',
          previous: '1.8%',
          change: 27.8,
          trend: 'up'
        },
        {
          name: '平均响应时间',
          current: '156ms',
          previous: '178ms',
          change: -12.4,
          trend: 'up'
        },
        {
          name: '成功率',
          current: '98.7%',
          previous: '96.5%',
          change: 2.3,
          trend: 'up'
        },
        {
          name: '存储使用',
          current: '67.2%',
          previous: '61.8%',
          change: 8.7,
          trend: 'down'
        }
      ];
      observer.next(metrics);
    });
  }

  // 工具方法
  private generateTimeLabels(period: string): string[] {
    const labels: string[] = [];
    const now = new Date();

    switch (period) {
      case '24h':
        for (let i = 23; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 60 * 60 * 1000);
          labels.push(date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
        }
        break;
      case '7d':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        }
        break;
      case '30d':
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        }
        break;
      case '90d':
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        }
        break;
    }

    return labels;
  }

  private getInsightBadgeClass(isPositive: boolean): string {
    return isPositive ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100';
  }

  private getTrendClass(trend: string): string {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  }

  private getTrendIcon(trend: string): string {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '➡️';
    }
  }
}