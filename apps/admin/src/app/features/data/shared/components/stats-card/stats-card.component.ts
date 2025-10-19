import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StatsCardData {
  title: string;
  value: number | string;
  subtitle?: string;
  unit?: string;
  icon?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  chartData?: number[];
  sparkline?: boolean;
  loading?: boolean;
  error?: string;
}

@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-card bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <!-- 加载状态 -->
      <div *ngIf="loading" class="flex items-center justify-center h-32">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <!-- 错误状态 -->
      <div *ngIf="error && !loading" class="flex items-center justify-center h-32 text-red-500">
        <div class="text-center">
          <div class="text-2xl mb-2">⚠️</div>
          <div class="text-sm">{{ error }}</div>
        </div>
      </div>

      <!-- 正常状态 -->
      <div *ngIf="!loading && !error" class="space-y-4">
        <!-- 头部信息 -->
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">{{ title }}</h3>
            <div class="mt-1 flex items-baseline">
              <p class="text-2xl font-bold text-gray-900" [ngClass]="getValueColor()">
                {{ formatValue(value) }}
              </p>
              <span *ngIf="subtitle" class="ml-2 text-sm text-gray-500">{{ subtitle }}</span>
            </div>
          </div>

          <!-- 图标 -->
          <div *ngIf="icon" class="flex-shrink-0 ml-4">
            <div class="w-12 h-12 rounded-full flex items-center justify-center" [ngClass]="getIconBgColor()">
              <span class="text-xl" [ngClass]="getIconColor()">{{ icon }}</span>
            </div>
          </div>
        </div>

        <!-- 趋势指示器 -->
        <div *ngIf="trend" class="flex items-center justify-between">
          <div class="flex items-center">
            <span class="text-sm font-medium" [ngClass]="getTrendColor()">
              {{ trend.isPositive ? '↑' : '↓' }} {{ Math.abs(trend.value) }}%
            </span>
            <span *ngIf="trend.label" class="ml-1 text-sm text-gray-500">{{ trend.label }}</span>
          </div>
        </div>

        <!-- Sparkline 图表 -->
        <div *ngIf="sparkline && chartData && chartData.length > 0" class="mt-4">
          <div class="h-12 flex items-end space-x-1">
            <div
              *ngFor="let point of chartData; let i = index"
              class="flex-1 bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
              [style.height.%]="getSparklineHeight(point, chartData)"
              [title]="formatValue(point)"
            ></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-card {
      @apply relative overflow-hidden;
    }

    .stats-card:hover {
      @apply transform scale-105;
      transform-origin: center;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsCardComponent implements OnChanges {
  @Input() data: StatsCardData | null = null;
  @Input() loading = false;
  @Input() error: string | null = null;

  @Output() click = new EventEmitter<void>();

  // 便利属性
  get title(): string {
    return this.data?.title || '';
  }

  get value(): number | string {
    return this.data?.value || 0;
  }

  get subtitle(): string {
    return this.data?.subtitle || '';
  }

  get icon(): string {
    return this.data?.icon || '';
  }

  get color(): string {
    return this.data?.color || 'primary';
  }

  get trend(): StatsCardData['trend'] {
    return this.data?.trend;
  }

  get chartData(): number[] {
    return this.data?.chartData || [];
  }

  get sparkline(): boolean {
    return this.data?.sparkline || false;
  }

  ngOnChanges(changes: SimpleChanges): void {
    // 可以在这里处理数据变化逻辑
  }

  // 格式化数值显示
  formatValue(value: number | string): string {
    if (typeof value === 'number') {
      // 大数字格式化
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      } else if (value % 1 !== 0) {
        return value.toFixed(2);
      }
      return value.toLocaleString();
    }
    return value.toString();
  }

  // 获取数值颜色
  getValueColor(): string {
    switch (this.color) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'danger':
        return 'text-red-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-900';
    }
  }

  // 获取图标背景色
  getIconBgColor(): string {
    switch (this.color) {
      case 'success':
        return 'bg-green-100';
      case 'warning':
        return 'bg-yellow-100';
      case 'danger':
        return 'bg-red-100';
      case 'info':
        return 'bg-blue-100';
      default:
        return 'bg-blue-100';
    }
  }

  // 获取图标颜色
  getIconColor(): string {
    switch (this.color) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'danger':
        return 'text-red-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-blue-600';
    }
  }

  // 获取趋势颜色
  getTrendColor(): string {
    if (!this.trend) return '';
    return this.trend.isPositive ? 'text-green-600' : 'text-red-600';
  }

  // 计算Sparkline高度
  getSparklineHeight(value: number, data: number[]): number {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    return ((value - min) / range) * 100;
  }

  // 点击处理
  onClick(): void {
    this.click.emit();
  }
}