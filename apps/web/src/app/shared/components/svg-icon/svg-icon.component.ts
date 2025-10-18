import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export type IconType =
  // 导航控制
  | 'play' | 'pause' | 'next' | 'prev'
  // 状态指示
  | 'warning' | 'error' | 'success' | 'info'
  // 功能图标
  | 'chart' | 'screen' | 'users' | 'compass' | 'mail'
  // 媒体控制
  | 'fullscreen' | 'minimize' | 'close'
  // 数据相关
  | 'data' | 'analytics' | 'refresh' | 'settings';

@Component({
  selector: 'pro-svg-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      [attr.viewBox]="viewBox"
      class="inline-block transition-all duration-200"
      [class]="cssClasses"
      [attr.fill]="fill"
      [attr.stroke]="stroke"
    >
      <ng-container [ngSwitch]="icon">
        <!-- 播放/暂停控制 -->
        <g *ngSwitchCase="'play'">
          <path d="M8 5v14l11-7z" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'pause'">
          <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
          <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'next'">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'prev'">
          <path d="M6 6l8.5 6L6 18V6z" fill="currentColor"/>
          <rect x="16" y="6" width="2" height="12" fill="currentColor"/>
        </g>

        <!-- 状态图标 -->
        <g *ngSwitchCase="'warning'">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'error'">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'success'">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'info'">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/>
        </g>

        <!-- 功能图标 -->
        <g *ngSwitchCase="'chart'">
          <path d="M3 13h2v8H3zm4-8h2v16H7zm4-2h2v18h-2zm4 4h2v14h-2zm4-2h2v16h-2z" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'screen'">
          <path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v1h12v-1l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'users'">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'compass'">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'mail'">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/>
        </g>

        <!-- 媒体控制 -->
        <g *ngSwitchCase="'fullscreen'">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'minimize'">
          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'close'">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
        </g>

        <!-- 数据相关 -->
        <g *ngSwitchCase="'data'">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'analytics'">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-5h2v5zm4 0h-2v-3h2v3zm0-5h-2v-2h2v2zm4 5h-2V7h2v10z" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'refresh'">
          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/>
        </g>
        <g *ngSwitchCase="'settings'">
          <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" fill="currentColor"/>
        </g>
      </ng-container>
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SvgIconComponent implements OnInit, OnChanges {
  @Input({ required: true }) icon!: IconType;
  @Input() size: number = 24;
  @Input() color?: string;
  @Input() strokeWidth: number = 2;
  @Input() fill: string = 'currentColor';
  @Input() stroke: string = 'none';
  @Input() className: string = '';

  cssClasses = '';
  viewBox = '0 0 24 24';

  ngOnInit() {
    this.updateClasses();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['icon'] || changes['className'] || changes['color']) {
      this.updateClasses();
    }
  }

  private updateClasses() {
    const baseClasses = [
      'transition-all',
      'duration-200',
      'ease-in-out'
    ];

    const colorClasses = this.getColorClasses();
    const userClasses = this.className ? [this.className] : [];

    this.cssClasses = [...baseClasses, ...colorClasses, ...userClasses].join(' ');
  }

  private getColorClasses(): string[] {
    if (this.color) {
      // 如果传入了自定义颜色，直接使用内联样式
      return [];
    }

    // 默认颜色映射
    const colorMap: Record<IconType, string[]> = {
      play: ['text-green-400', 'hover:text-green-300'],
      pause: ['text-yellow-400', 'hover:text-yellow-300'],
      next: ['text-blue-400', 'hover:text-blue-300'],
      prev: ['text-blue-400', 'hover:text-blue-300'],
      warning: ['text-yellow-400', 'hover:text-yellow-300'],
      error: ['text-red-400', 'hover:text-red-300'],
      success: ['text-green-400', 'hover:text-green-300'],
      info: ['text-blue-400', 'hover:text-blue-300'],
      chart: ['text-purple-400', 'hover:text-purple-300'],
      screen: ['text-cyan-400', 'hover:text-cyan-300'],
      users: ['text-indigo-400', 'hover:text-indigo-300'],
      compass: ['text-orange-400', 'hover:text-orange-300'],
      mail: ['text-gray-400', 'hover:text-gray-300'],
      fullscreen: ['text-gray-400', 'hover:text-gray-300'],
      minimize: ['text-gray-400', 'hover:text-gray-300'],
      close: ['text-red-400', 'hover:text-red-300'],
      data: ['text-teal-400', 'hover:text-teal-300'],
      analytics: ['text-pink-400', 'hover:text-pink-300'],
      refresh: ['text-blue-400', 'hover:text-blue-300'],
      settings: ['text-gray-400', 'hover:text-gray-300']
    };

    return colorMap[this.icon] || ['text-gray-400', 'hover:text-gray-300'];
  }
}