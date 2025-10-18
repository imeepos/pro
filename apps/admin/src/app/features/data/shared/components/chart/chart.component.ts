import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
  }[];
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'doughnut' | 'pie' | 'radar' | 'scatter';
  title?: string;
  subtitle?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  height?: number;
  colors?: string[];
  options?: any;
}

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container" [style.height.px]="config.height || 300">
      <!-- 加载状态 -->
      <div *ngIf="loading" class="flex items-center justify-center h-full">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <!-- 错误状态 -->
      <div *ngIf="error && !loading" class="flex items-center justify-center h-full text-red-500">
        <div class="text-center">
          <div class="text-2xl mb-2">📊</div>
          <div class="text-sm">{{ error }}</div>
        </div>
      </div>

      <!-- 图表标题 -->
      <div *ngIf="config.title && !loading && !error" class="mb-4">
        <h3 class="text-lg font-semibold text-gray-900">{{ config.title }}</h3>
        <p *ngIf="config.subtitle" class="text-sm text-gray-600 mt-1">{{ config.subtitle }}</p>
      </div>

      <!-- 图表画布 -->
      <div
        *ngIf="!loading && !error"
        class="chart-canvas relative"
        [ngClass]="getChartTypeClass()"
      >
        <!-- 简单的SVG图表实现 -->
        <svg
          #chartCanvas
          class="w-full h-full"
          [attr.viewBox]="getViewBox()"
          preserveAspectRatio="xMidYMid meet"
        >
          <!-- 网格线 -->
          <g *ngIf="config.showGrid && (config.type === 'line' || config.type === 'bar')" class="grid-lines">
            <ng-container *ngFor="let tick of yAxisTicks; let i = index">
              <line
                [attr.x1]="padding"
                [attr.y1]="getHeight() - padding - (i * tickSpacing)"
                [attr.x2]="getWidth() - padding"
                [attr.y2]="getHeight() - padding - (i * tickSpacing)"
                stroke="#e5e7eb"
                stroke-width="1"
              />
              <text
                [attr.x]="padding - 5"
                [attr.y]="getHeight() - padding - (i * tickSpacing) + 4"
                text-anchor="end"
                class="text-xs fill-gray-500"
              >
                {{ formatYTick(tick) }}
              </text>
            </ng-container>
          </g>

          <!-- X轴标签 -->
          <g *ngIf="showXAxisLabels" class="x-axis-labels">
            <ng-container *ngFor="let label of data.labels; let i = index">
              <text
                [attr.x]="getXPosition(i)"
                [attr.y]="getHeight() - padding + 20"
                text-anchor="middle"
                class="text-xs fill-gray-600"
              >
                {{ label }}
              </text>
            </ng-container>
          </g>

          <!-- 柱状图 -->
          <g *ngIf="config.type === 'bar'" class="bars">
            <ng-container *ngFor="let dataset of data.datasets; let di = index">
              <ng-container *ngFor="let value of dataset.data; let i = index">
                <rect
                  [attr.x]="getXPosition(i) - barWidth / 2"
                  [attr.y]="getYPosition(value)"
                  [attr.width]="barWidth"
                  [attr.height]="getBarHeight(value)"
                  [attr.fill]="getDatasetColor(di)"
                  class="bar cursor-pointer hover:opacity-80 transition-opacity"
                  (mouseover)="showTooltip(i, value)"
                  (mouseout)="hideTooltip()"
                />
              </ng-container>
            </ng-container>
          </g>

          <!-- 折线图 -->
          <g *ngIf="config.type === 'line'" class="lines">
            <ng-container *ngFor="let dataset of data.datasets; let di = index">
              <polyline
                [attr.points]="getLinePoints(dataset.data)"
                [attr.fill]="dataset.fill ? getDatasetColor(di) : 'none'"
                [attr.stroke]="getDatasetColor(di)"
                [attr.stroke-width]="dataset.borderWidth || 2"
                [attr.stroke-linecap]="'round'"
                [attr.stroke-linejoin]="'round'"
                class="line"
              />
              <!-- 数据点 -->
              <ng-container *ngFor="let value of dataset.data; let i = index">
                <circle
                  [attr.cx]="getXPosition(i)"
                  [attr.cy]="getYPosition(value)"
                  r="4"
                  [attr.fill]="getDatasetColor(di)"
                  class="cursor-pointer hover:r-6 transition-all"
                  (mouseover)="showTooltip(i, value)"
                  (mouseout)="hideTooltip()"
                />
              </ng-container>
            </ng-container>
          </g>

          <!-- 饼图/圆环图 -->
          <g *ngIf="config.type === 'pie' || config.type === 'doughnut'" class="pie-chart">
            <ng-container *ngFor="let dataset of data.datasets[0].data; let i = index">
              <path
                [attr.d]="getPieSlicePath(i, dataset)"
                [attr.fill]="getDatasetColor(i)"
                [attr.stroke]="'white'"
                [attr.stroke-width]="'2'"
                class="cursor-pointer hover:opacity-80 transition-opacity"
                (mouseover)="showTooltip(i, dataset)"
                (mouseout)="hideTooltip()"
              />
              <!-- 标签 -->
              <text
                *ngIf="shouldShowPieLabel(i)"
                [attr.x]="getPieLabelPosition(i).x"
                [attr.y]="getPieLabelPosition(i).y"
                text-anchor="middle"
                class="text-xs fill-white font-medium"
              >
                {{ data.labels[i] }}
              </text>
            </ng-container>
          </g>

          <!-- 雷达图 -->
          <g *ngIf="config.type === 'radar'" class="radar-chart">
            <!-- 网格 -->
            <ng-container *ngFor="let level of radarLevels; let li = index">
              <polygon
                [attr.points]="getRadarPolygonPoints(level)"
                [attr.fill]="'none'"
                [attr.stroke]="'#e5e7eb'"
                [attr.stroke-width]="'1'"
              />
            </ng-container>

            <!-- 数据区域 -->
            <ng-container *ngFor="let dataset of data.datasets; let di = index">
              <polygon
                [attr.points]="getRadarDataPoints(dataset.data)"
                [attr.fill]="getDatasetColor(di) + '40'"
                [attr.stroke]="getDatasetColor(di)"
                [attr.stroke-width]="'2'"
              />
            </ng-container>

            <!-- 轴标签 -->
            <ng-container *ngFor="let label of data.labels; let i = index">
              <text
                [attr.x]="getRadarLabelPosition(i).x"
                [attr.y]="getRadarLabelPosition(i).y"
                text-anchor="middle"
                class="text-xs fill-gray-600"
              >
                {{ label }}
              </text>
            </ng-container>
          </g>
        </svg>

        <!-- 工具提示 -->
        <div
          *ngIf="tooltip.visible"
          class="absolute bg-gray-800 text-white text-xs rounded px-2 py-1 pointer-events-none"
          [style.left.px]="tooltip.x"
          [style.top.px]="tooltip.y"
        >
          <div>{{ tooltip.label }}</div>
          <div>{{ tooltip.value }}</div>
        </div>
      </div>

      <!-- 图例 -->
      <div
        *ngIf="config.showLegend && !loading && !error"
        class="legend mt-4 flex flex-wrap justify-center gap-4"
      >
        <div
          *ngFor="let dataset of data.datasets; let i = index"
          class="flex items-center gap-2"
        >
          <div
            class="w-3 h-3 rounded"
            [ngStyle]="{ backgroundColor: getDatasetColor(i) }"
          ></div>
          <span class="text-sm text-gray-600">{{ dataset.label }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chart-container {
      @apply w-full;
    }

    .chart-canvas {
      @apply w-full h-full relative;
    }

    .bar,
    .line circle,
    .pie-chart path {
      @apply transition-all duration-200;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartComponent implements OnChanges, AfterViewInit {
  @Input() data: ChartData;
  @Input() config: ChartConfig = {
    type: 'bar',
    showLegend: true,
    showGrid: true,
    showTooltip: true,
    responsive: true,
    maintainAspectRatio: true,
    height: 300
  };
  @Input() loading = false;
  @Input() error: string;

  @ViewChild('chartCanvas') chartCanvas: ElementRef<SVGElement>;

  // 默认颜色配置
  private defaultColors = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
    '#f97316'  // orange-500
  ];

  // 图表尺寸和布局
  padding = 40;
  chartWidth = 0;
  chartHeight = 0;

  // 工具提示
  tooltip = {
    visible: false,
    x: 0,
    y: 0,
    label: '',
    value: ''
  };

  // 计算属性
  get barWidth(): number {
    const availableWidth = this.chartWidth - 2 * this.padding;
    const barCount = this.data?.labels?.length || 1;
    return Math.max(10, (availableWidth / barCount) * 0.6);
  }

  get xAxisLabels(): string[] {
    return this.data?.labels || [];
  }

  get showXAxisLabels(): boolean {
    return ['bar', 'line'].includes(this.config.type) && this.xAxisLabels.length > 0;
  }

  get yAxisTicks(): number[] {
    if (!this.data?.datasets?.length) return [0];
    const allValues = this.data.datasets.flatMap(d => d.data);
    const maxValue = Math.max(...allValues, 0);
    const tickCount = 5;
    return Array.from({ length: tickCount + 1 }, (_, i) => (maxValue / tickCount) * i);
  }

  get tickSpacing(): number {
    const availableHeight = this.chartHeight - 2 * this.padding;
    return availableHeight / 5;
  }

  get radarLevels(): number[] {
    return [0.2, 0.4, 0.6, 0.8, 1.0];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.data || changes.config) {
      this.calculateDimensions();
    }
  }

  ngAfterViewInit(): void {
    this.calculateDimensions();
  }

  // 尺寸计算
  private calculateDimensions(): void {
    if (this.chartCanvas) {
      const rect = this.chartCanvas.nativeElement.getBoundingClientRect();
      this.chartWidth = rect.width || 600;
      this.chartHeight = rect.height || 300;
    }
  }

  // SVG视图框
  getViewBox(): string {
    return `0 0 ${this.chartWidth} ${this.chartHeight}`;
  }

  // 位置计算方法
  getXPosition(index: number): number {
    const availableWidth = this.chartWidth - 2 * this.padding;
    const step = availableWidth / Math.max(1, this.xAxisLabels.length - 1);
    return this.padding + (index * step);
  }

  getYPosition(value: number): number {
    const maxValue = Math.max(...this.yAxisTicks);
    const availableHeight = this.chartHeight - 2 * this.padding;
    const percentage = value / maxValue;
    return this.chartHeight - this.padding - (availableHeight * percentage);
  }

  getBarHeight(value: number): number {
    const maxValue = Math.max(...this.yAxisTicks);
    const availableHeight = this.chartHeight - 2 * this.padding;
    return (value / maxValue) * availableHeight;
  }

  // 折线图点路径
  getLinePoints(data: number[]): string {
    return data.map((value, i) => {
      const x = this.getXPosition(i);
      const y = this.getYPosition(value);
      return `${x},${y}`;
    }).join(' ');
  }

  // 饼图相关计算
  getPieSlicePath(index: number, value: number): string {
    const total = this.data?.datasets?.[0]?.data?.reduce((a, b) => a + b, 0) || 1;
    const percentage = value / total;
    const angle = percentage * 360;
    const startAngle = this.getPieStartAngle(index);
    const endAngle = startAngle + angle;

    return this.describeArc(
      this.chartWidth / 2,
      this.chartHeight / 2,
      Math.min(this.chartWidth, this.chartHeight) / 2 - this.padding,
      startAngle,
      endAngle
    );
  }

  private getPieStartAngle(index: number): number {
    const data = this.data?.datasets?.[0]?.data || [];
    const total = data.reduce((a, b) => a + b, 0);
    let startAngle = -90; // 从顶部开始

    for (let i = 0; i < index; i++) {
      const percentage = data[i] / total;
      startAngle += percentage * 360;
    }

    return startAngle;
  }

  private describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
    const start = this.polarToCartesian(x, y, radius, endAngle);
    const end = this.polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", x, y,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  }

  private polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  getPieLabelPosition(index: number): { x: number; y: number } {
    const data = this.data?.datasets?.[0]?.data || [];
    const value = data[index];
    const total = data.reduce((a, b) => a + b, 0);
    const percentage = value / total;
    const angle = percentage * 360;
    const startAngle = this.getPieStartAngle(index);
    const midAngle = startAngle + (angle / 2);

    const labelRadius = Math.min(this.chartWidth, this.chartHeight) / 4;
    const center = this.chartWidth / 2;
    const midY = this.chartHeight / 2;

    return this.polarToCartesian(center, midY, labelRadius, midAngle);
  }

  shouldShowPieLabel(index: number): boolean {
    const data = this.data?.datasets?.[0]?.data || [];
    const total = data.reduce((a, b) => a + b, 0);
    return data[index] / total > 0.05; // 只显示占比大于5%的标签
  }

  // 雷达图相关计算
  getRadarPolygonPoints(level: number): string {
    const centerX = this.chartWidth / 2;
    const centerY = this.chartHeight / 2;
    const radius = Math.min(centerX, centerY) - this.padding;
    const points = this.xAxisLabels.map((_, i) => {
      const angle = (i * 360) / this.xAxisLabels.length - 90;
      const point = this.polarToCartesian(centerX, centerY, radius * level, angle);
      return `${point.x},${point.y}`;
    });
    return points.join(' ');
  }

  getRadarDataPoints(data: number[]): string {
    const centerX = this.chartWidth / 2;
    const centerY = this.chartHeight / 2;
    const radius = Math.min(centerX, centerY) - this.padding;
    const maxValue = Math.max(...data, 1);

    return data.map((value, i) => {
      const angle = (i * 360) / this.xAxisLabels.length - 90;
      const level = value / maxValue;
      const point = this.polarToCartesian(centerX, centerY, radius * level, angle);
      return `${point.x},${point.y}`;
    }).join(' ');
  }

  getRadarLabelPosition(index: number): { x: number; y: number } {
    const centerX = this.chartWidth / 2;
    const centerY = this.chartHeight / 2;
    const radius = Math.min(centerX, centerY) - this.padding + 20;
    const angle = (index * 360) / this.xAxisLabels.length - 90;
    return this.polarToCartesian(centerX, centerY, radius, angle);
  }

  // 工具方法
  getDatasetColor(index: number): string {
    const colors = this.config.colors || this.defaultColors;
    return colors[index % colors.length];
  }

  formatYTick(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }

  getChartTypeClass(): string {
    return `chart-${this.config.type}`;
  }

  getWidth(): number {
    return this.chartWidth;
  }

  getHeight(): number {
    return this.chartHeight;
  }

  // 工具提示处理
  showTooltip(index: number, value: number): void {
    const label = this.data?.labels?.[index] || '';
    this.tooltip = {
      visible: true,
      x: this.getXPosition(index),
      y: this.getYPosition(value) - 30,
      label,
      value: this.formatYTick(value)
    };
  }

  hideTooltip(): void {
    this.tooltip.visible = false;
  }
}