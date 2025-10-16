import { Component, OnInit, OnDestroy, ViewChild, ViewContainerRef, ComponentRef, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, HostListener, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { WebSocketManager, createScreensWebSocketConfig, JwtAuthService, ComponentRegistryService, IScreenComponent } from '@pro/components';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { ScreenService } from '../../core/services/screen.service';
import { ScreenSignalStore } from '../../core/state/screen.signal-store';
import { ScreenPage, ScreenComponentConfig as ScreenComponent } from '../../core/types/screen.types';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-screen-display',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen-viewport" #screenWrapper>
      <div class="ambient-backdrop">
        <span class="ambient-orb ambient-orb--primary"></span>
        <span class="ambient-orb ambient-orb--secondary"></span>
        <span class="ambient-orb ambient-orb--tertiary"></span>
      </div>

      <div class="screen-stage"
           [style.width.px]="screenConfig?.layout?.width"
           [style.height.px]="screenConfig?.layout?.height"
           [style.transform]="getScaleTransform()"
           [style.left.px]="scaleOffsetX"
           [style.top.px]="scaleOffsetY">
        @if (loading) {
          <div class="status-container">
            <div class="loading-indicator"></div>
            <p class="status-message">加载中...</p>
          </div>
        } @else if (error) {
          <div class="status-container">
            <p class="status-message status-message--error">{{ error }}</p>
          </div>
        } @else if (screenConfig) {
          <div class="screen-canvas" [style.background]="screenConfig.layout.background">
            <div class="components-stage" #componentsContainer></div>
          </div>
        }
      </div>

      @if (!loading && !error && screenConfig) {
        <header class="screen-header" [class.screen-header--compact]="isFullscreen">
          <div class="screen-header__meta">
            <h1 class="screen-title">{{ screenConfig?.name || '未命名大屏' }}</h1>
            @if (screenConfig?.description) {
              <p class="screen-subtitle">{{ screenConfig?.description }}</p>
            }
          </div>

          <div class="screen-header__actions">
            @if (hasMultipleScreens) {
              <div class="screen-toolbar">
                <button
                  class="toolbar-trigger"
                  (click)="toggleAutoPlay()"
                  [title]="isAutoPlay ? '停止轮播' : '开始轮播'"
                  [attr.aria-label]="isAutoPlay ? '停止轮播' : '开始轮播'">
                  {{ isAutoPlay ? '⏸️' : '▶️' }}
                </button>
                <button
                  class="toolbar-trigger"
                  (click)="previousScreen()"
                  title="上一页"
                  aria-label="上一页">
                  ⬅️
                </button>
                <button
                  class="toolbar-trigger"
                  (click)="nextScreen()"
                  title="下一页"
                  aria-label="下一页">
                  ➡️
                </button>
                <select
                  class="toolbar-selector"
                  [value]="currentScreenIndex"
                  (change)="switchToScreen($event)"
                  aria-label="选择页面">
                  <option *ngFor="let screen of availableScreens; let i = index" [value]="i">
                    {{ screen.name }}
                  </option>
                </select>
                <div
                  class="toolbar-indicator"
                  role="status"
                  [attr.aria-label]="'当前页面 ' + (currentScreenIndex + 1) + ' / ' + availableScreens.length">
                  {{ currentScreenIndex + 1 }} / {{ availableScreens.length }}
                </div>
              </div>
            }

            <button
              class="screen-action screen-action--primary"
              (click)="toggleFullscreen()"
              title="全屏切换"
              [attr.aria-label]="isFullscreen ? '退出全屏' : '全屏显示'">
              {{ isFullscreen ? '退出全屏' : '全屏显示' }}
            </button>
          </div>
        </header>
      }

    </div>
  `,
  styles: [`
    /*
     * 屏幕显示组件 - 完全样式隔离设计
     * 统一设计系统变量，确保与@pro/admin应用一致性
     */

    /* ===== CSS变量命名空间定义 ===== */
    :host {
      /* 主题色彩 - Pro设计系统 */
      --pro-primary-50: #eff6ff;
      --pro-primary-100: #dbeafe;
      --pro-primary-500: #3b82f6;
      --pro-primary-600: #2563eb;
      --pro-primary-700: #1d4ed8;
      --pro-primary-900: #1e3a8a;

      /* 中性色彩 */
      --pro-slate-50: #f8fafc;
      --pro-slate-100: #f1f5f9;
      --pro-slate-200: #e2e8f0;
      --pro-slate-300: #cbd5e1;
      --pro-slate-400: #94a3b8;
      --pro-slate-500: #64748b;
      --pro-slate-600: #475569;
      --pro-slate-700: #334155;
      --pro-slate-800: #1e293b;
      --pro-slate-900: #0f172a;

      /* 状态色彩 */
      --pro-error: #ef4444;
      --pro-success: #10b981;
      --pro-warning: #f59e0b;
      --pro-info: #3b82f6;

      /* 间距系统 */
      --pro-space-1: 0.25rem;
      --pro-space-2: 0.5rem;
      --pro-space-3: 0.75rem;
      --pro-space-4: 1rem;
      --pro-space-5: 1.25rem;
      --pro-space-6: 1.5rem;
      --pro-space-8: 2rem;
      --pro-space-10: 2.5rem;
      --pro-space-12: 3rem;
      --pro-space-16: 4rem;
      --pro-space-20: 5rem;
      --pro-space-24: 6rem;
      --pro-space-32: 8rem;

      /* 圆角系统 */
      --pro-radius-sm: 0.25rem;
      --pro-radius-md: 0.5rem;
      --pro-radius-lg: 0.75rem;
      --pro-radius-xl: 1rem;
      --pro-radius-2xl: 1.5rem;
      --pro-radius-3xl: 2rem;
      --pro-radius-4xl: 2.5rem;

      /* 字体系统 */
      --pro-font-size-xs: 0.75rem;
      --pro-font-size-sm: 0.875rem;
      --pro-font-size-base: 1rem;
      --pro-font-size-lg: 1.125rem;
      --pro-font-size-xl: 1.25rem;
      --pro-font-weight-normal: 400;
      --pro-font-weight-medium: 500;
      --pro-font-weight-semibold: 600;
      --pro-font-weight-bold: 700;

      /* 动画系统 */
      --pro-transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      --pro-transition-base: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      --pro-transition-slow: 0.5s cubic-bezier(0.4, 0, 0.2, 1);

      /* 阴影系统 */
      --pro-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --pro-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --pro-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --pro-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      --pro-shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

      /* 透明度系统 */
      --pro-opacity-backdrop: 0.9;
      --pro-opacity-glass-light: 0.05;
      --pro-opacity-glass-medium: 0.1;
      --pro-opacity-glass-heavy: 0.15;

      /* Z-index层级系统 */
      --pro-z-dropdown: 1000;
      --pro-z-sticky: 1020;
      --pro-z-fixed: 1030;
      --pro-z-modal-backdrop: 1040;
      --pro-z-modal: 1050;
      --pro-z-popover: 1060;
      --pro-z-tooltip: 1070;
      --pro-z-toast: 9999;

      /* 断点系统 */
      --pro-breakpoint-sm: 640px;
      --pro-breakpoint-md: 768px;
      --pro-breakpoint-lg: 1024px;
      --pro-breakpoint-xl: 1280px;
      --pro-breakpoint-2xl: 1536px;
    }

    /* ===== 样式隔离和重置规则 ===== */
    :host {
      display: block;
      font-family: inherit;
      line-height: 1.6;
      color: var(--pro-slate-100);
      isolation: isolate;
      contain: layout style paint;
    }

    /* 防止全局样式污染 */
    :host * {
      box-sizing: border-box;
    }

    /* 重置可能的第三方组件样式干扰 */
    :host button {
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      font: inherit;
      color: inherit;
      cursor: pointer;
      outline: none;
    }

    :host select {
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      font: inherit;
      color: inherit;
      outline: none;
      cursor: pointer;
    }

    /* ===== 核心布局组件 ===== */
    .screen-viewport {
      position: relative;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: radial-gradient(circle at center,
        var(--pro-slate-900) 0%,
        rgba(15, 23, 42, 0.95) 50%,
        rgba(0, 0, 0, 1) 100%
      );
      color: var(--pro-slate-100);
    }

    .ambient-backdrop {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }

    .ambient-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.65;
      transform: translate3d(-50%, -50%, 0);
    }

    .ambient-orb--primary {
      top: 18%;
      right: 6%;
      width: 420px;
      height: 420px;
      background: rgba(59, 130, 246, 0.25);
    }

    .ambient-orb--secondary {
      bottom: -12%;
      left: 10%;
      width: 520px;
      height: 520px;
      background: rgba(168, 85, 247, 0.22);
    }

    .ambient-orb--tertiary {
      top: 52%;
      left: 55%;
      width: 360px;
      height: 360px;
      background: rgba(34, 197, 94, 0.16);
    }

    .screen-stage {
      position: absolute;
      left: 0;
      top: 0;
      transform-origin: top left;
      transition: transform var(--pro-transition-base);
      border-radius: var(--pro-radius-lg);
      box-shadow: var(--pro-shadow-2xl);
      will-change: transform, left, top;
      z-index: 1;
    }

    .screen-header {
      position: absolute;
      top: var(--pro-space-6);
      left: 50%;
      transform: translateX(-50%);
      width: min(92vw, 1280px);
      padding: var(--pro-space-4) var(--pro-space-6);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--pro-space-6);
      background: rgba(15, 23, 42, 0.78);
      border: 1px solid rgba(255, 255, 255, var(--pro-opacity-glass-light));
      border-radius: var(--pro-radius-2xl);
      backdrop-filter: blur(20px) saturate(180%);
      box-shadow: var(--pro-shadow-2xl);
      color: rgba(255, 255, 255, 0.92);
      z-index: 2;
      transition: opacity var(--pro-transition-base),
                  transform var(--pro-transition-base);
      pointer-events: none;
    }

    .screen-header--compact {
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, -12px);
    }

    .screen-header__meta {
      flex: 1;
      min-width: 0;
      pointer-events: auto;
    }

    .screen-title {
      margin: 0;
      font-size: var(--pro-font-size-xl);
      font-weight: var(--pro-font-weight-semibold);
      letter-spacing: 0.02em;
    }

    .screen-subtitle {
      margin: var(--pro-space-2) 0 0;
      font-size: var(--pro-font-size-sm);
      color: rgba(255, 255, 255, 0.68);
      line-height: 1.5;
    }

    .screen-header__actions {
      display: flex;
      align-items: center;
      gap: var(--pro-space-4);
      pointer-events: auto;
    }

    .screen-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--pro-space-2) var(--pro-space-5);
      border-radius: var(--pro-radius-2xl);
      border: 1px solid rgba(255, 255, 255, var(--pro-opacity-glass-light));
      font-size: var(--pro-font-size-sm);
      font-weight: var(--pro-font-weight-semibold);
      color: rgba(255, 255, 255, 0.9);
      background: linear-gradient(135deg,
        rgba(255, 255, 255, calc(var(--pro-opacity-glass-medium) * 1.2)) 0%,
        rgba(255, 255, 255, var(--pro-opacity-glass-light)) 100%
      );
      cursor: pointer;
      transition: all var(--pro-transition-fast);
      backdrop-filter: blur(8px);
      min-width: 120px;
      white-space: nowrap;
      pointer-events: auto;
    }

    .screen-action:hover {
      border-color: rgba(255, 255, 255, calc(var(--pro-opacity-glass-heavy) * 1.4));
      box-shadow: var(--pro-shadow-md);
      transform: translateY(-1px);
    }

    .screen-action:active {
      transform: translateY(0);
    }

    .screen-action:focus-visible {
      outline: 2px solid rgba(59, 130, 246, 0.5);
      outline-offset: 2px;
    }

    .screen-action--primary {
      background: linear-gradient(135deg,
        var(--pro-primary-500) 0%,
        var(--pro-primary-600) 100%
      );
      border: 1px solid rgba(59, 130, 246, 0.35);
      color: white;
      box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3),
                  0 4px 6px -2px rgba(0, 0, 0, 0.15);
    }

    .screen-action--primary:hover {
      background: linear-gradient(135deg,
        var(--pro-primary-600) 0%,
        var(--pro-primary-700) 100%
      );
    }

    /* ===== 状态显示组件 ===== */
    .status-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: linear-gradient(135deg,
        var(--pro-slate-800) 0%,
        var(--pro-slate-900) 100%
      );
      animation: fadeIn var(--pro-transition-slow) ease-out;
    }

    .loading-indicator {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(59, 130, 246, 0.2);
      border-top-color: var(--pro-primary-500);
      border-radius: 50%;
      animation: rotate 1s linear infinite;
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
    }

    .status-message {
      margin-top: var(--pro-space-6);
      font-size: var(--pro-font-size-lg);
      font-weight: var(--pro-font-weight-medium);
      color: var(--pro-slate-100);
      text-align: center;
    }

    .status-message--error {
      color: var(--pro-error);
      text-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
    }

    /* ===== 画布系统 ===== */
    .screen-canvas {
      width: 100%;
      height: 100%;
      position: relative;
      border-radius: var(--pro-radius-lg);
      overflow: hidden;
      background: transparent;
    }

    .components-stage {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .component-element {
      position: absolute;
      box-sizing: border-box;
      background: rgba(59, 130, 246, var(--pro-opacity-glass-medium));
      border: 1px solid rgba(156, 163, 175, 0.2);
      transition: all var(--pro-transition-base);
      border-radius: var(--pro-radius-md);
      overflow: hidden;
      animation: componentEnter var(--pro-transition-slow) ease-out;
      contain: layout style paint;
    }

    .component-element:hover {
      border-color: rgba(59, 130, 246, 0.4);
      background: rgba(59, 130, 246, calc(var(--pro-opacity-glass-medium) * 1.6));
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
      transform: translateZ(0);
    }

    .component-element--error {
      background: rgba(239, 68, 68, var(--pro-opacity-glass-medium));
      border: 2px dashed rgba(239, 68, 68, 0.6);
      animation: errorPulse 2s ease-in-out infinite;
    }

    .component-element--error:hover {
      background: rgba(239, 68, 68, calc(var(--pro-opacity-glass-medium) * 1.5));
      border-color: rgba(239, 68, 68, 0.8);
    }

    .component-element ::ng-deep > * {
      width: 100%;
      height: 100%;
      border-radius: calc(var(--pro-radius-md) - 1px);
      pointer-events: auto;
    }

    /* ===== 顶部工具栏 ===== */
    .screen-toolbar {
      display: inline-flex;
      align-items: center;
      gap: var(--pro-space-3);
      background: rgba(15, 23, 42, 0.65);
      border-radius: var(--pro-radius-2xl);
      padding: var(--pro-space-2) var(--pro-space-3);
      border: 1px solid rgba(255, 255, 255, var(--pro-opacity-glass-heavy));
      backdrop-filter: blur(12px);
      box-shadow: var(--pro-shadow-md);
      contain: layout style paint;
      pointer-events: auto;
    }

    .toolbar-trigger {
      background: linear-gradient(135deg,
        rgba(255, 255, 255, var(--pro-opacity-glass-medium)) 0%,
        rgba(255, 255, 255, var(--pro-opacity-glass-light)) 100%
      );
      color: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(255, 255, 255, calc(var(--pro-opacity-glass-heavy) * 1.2));
      border-radius: var(--pro-radius-lg);
      padding: var(--pro-space-2) var(--pro-space-3);
      cursor: pointer;
      font-size: var(--pro-font-size-sm);
      font-weight: var(--pro-font-weight-medium);
      letter-spacing: 0.025em;
      transition: all var(--pro-transition-fast);
      backdrop-filter: blur(4px);
      position: relative;
      overflow: hidden;
    }

    .toolbar-trigger::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg,
        transparent,
        rgba(255, 255, 255, 0.1),
        transparent
      );
      transition: left var(--pro-transition-slow);
    }

    .toolbar-trigger:hover::before {
      left: 100%;
    }

    .toolbar-trigger:hover {
      background: linear-gradient(135deg,
        rgba(255, 255, 255, calc(var(--pro-opacity-glass-medium) * 1.5)) 0%,
        rgba(255, 255, 255, calc(var(--pro-opacity-glass-light) * 2)) 100%
      );
      border-color: rgba(255, 255, 255, calc(var(--pro-opacity-glass-heavy) * 1.6));
      transform: translateY(-1px);
      box-shadow: var(--pro-shadow-md);
    }

    .toolbar-trigger:active {
      transform: translateY(0);
    }

    .toolbar-selector {
      background: linear-gradient(135deg,
        rgba(255, 255, 255, var(--pro-opacity-glass-medium)) 0%,
        rgba(255, 255, 255, var(--pro-opacity-glass-light)) 100%
      );
      color: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(255, 255, 255, calc(var(--pro-opacity-glass-heavy) * 1.2));
      border-radius: var(--pro-radius-lg);
      padding: var(--pro-space-2) var(--pro-space-3);
      font-size: var(--pro-font-size-sm);
      font-weight: var(--pro-font-weight-medium);
      min-width: 160px;
      cursor: pointer;
      transition: all var(--pro-transition-fast);
      backdrop-filter: blur(4px);
    }

    .toolbar-selector:hover {
      border-color: rgba(255, 255, 255, calc(var(--pro-opacity-glass-heavy) * 1.6));
      background: linear-gradient(135deg,
        rgba(255, 255, 255, calc(var(--pro-opacity-glass-medium) * 1.5)) 0%,
        rgba(255, 255, 255, calc(var(--pro-opacity-glass-light) * 2)) 100%
      );
    }

    .toolbar-selector option {
      background: var(--pro-slate-800);
      color: rgba(255, 255, 255, 0.9);
      padding: var(--pro-space-2);
    }

    .toolbar-indicator {
      color: rgba(255, 255, 255, 0.7);
      font-size: var(--pro-font-size-xs);
      font-weight: var(--pro-font-weight-semibold);
      padding: 0 var(--pro-space-3);
      border-left: 1px solid rgba(255, 255, 255, calc(var(--pro-opacity-glass-heavy) * 1.2));
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    /* ===== 动画系统 ===== */
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes rotate {
      to { transform: rotate(360deg); }
    }

    @keyframes componentEnter {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes errorPulse {
      0%, 100% {
        opacity: 0.8;
        transform: translateY(0) scale(1);
      }
      50% {
        opacity: 1;
        transform: translateY(0) scale(1.02);
      }
    }

    /* ===== 响应式设计系统 ===== */
    @media (max-width: 768px) {
      .screen-header {
        flex-direction: column;
        align-items: stretch;
        gap: var(--pro-space-3);
        padding: var(--pro-space-3) var(--pro-space-4);
      }

      .screen-header__actions {
        width: 100%;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: var(--pro-space-3);
      }

      .screen-toolbar {
        width: 100%;
        justify-content: center;
        padding: var(--pro-space-2) var(--pro-space-3);
        border-radius: var(--pro-radius-xl);
      }

      .toolbar-trigger {
        padding: var(--pro-space-2) var(--pro-space-3);
        font-size: var(--pro-font-size-xs);
      }

      .toolbar-indicator {
        font-size: 0.625rem;
        padding: 0 var(--pro-space-2);
      }

      .screen-action {
        width: 100%;
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .screen-header {
        top: var(--pro-space-4);
        width: min(94vw, 480px);
      }

      .toolbar-selector {
        min-width: 140px;
        font-size: var(--pro-font-size-xs);
      }

      .screen-toolbar {
        flex-wrap: wrap;
      }
    }

    /* ===== 高对比度和无障碍支持 ===== */
    @media (prefers-contrast: high) {
      :host {
        --pro-opacity-backdrop: 0.95;
        --pro-opacity-glass-light: 0.1;
        --pro-opacity-glass-medium: 0.15;
        --pro-opacity-glass-heavy: 0.2;
      }

      .toolbar-trigger,
      .toolbar-selector,
      .screen-action {
        border-width: 2px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }

    /* ===== 打印样式 ===== */
    @media print {
      .screen-toolbar {
        display: none !important;
      }

      .screen-viewport {
        background: white !important;
      }
    }
  `]
})
export class ScreenDisplayComponent implements OnInit, OnDestroy {
  @ViewChild('componentsContainer', { read: ViewContainerRef }) componentsContainer!: ViewContainerRef;
  @ViewChild('screenWrapper', { read: ElementRef }) screenWrapper!: ElementRef<HTMLElement>;

  screenConfig: ScreenPage | null = null;
  loading = true;
  error: string | null = null;
  isFullscreen = false;

  // 缩放相关
  scale = 1;
  scaleOffsetX = 0;
  scaleOffsetY = 0;
  private resizeDebouncer$ = new Subject<void>();

  // 轮播和切换功能
  currentScreenIndex = 0;
  isAutoPlay = false;
  autoPlayInterval = 30000; // 30秒切换一次

  get availableScreens(): ScreenPage[] {
    return this.screenStore.screens();
  }

  get hasMultipleScreens(): boolean {
    return this.screenStore.hasMultipleScreens();
  }

  private destroy$ = new Subject<void>();
  private readonly routeScreenId = signal<string | null>(null);
  private readonly publishedScreensQuery = injectQuery(() => ({
    queryKey: ['screens', 'published'],
    queryFn: () => this.screenService.fetchPublishedScreens(),
    staleTime: 60_000,
    gcTime: 300_000
  }));
  private readonly defaultScreenQuery = injectQuery(() => ({
    queryKey: ['screens', 'default'],
    queryFn: () => this.screenService.fetchDefaultScreen(),
    staleTime: 60_000,
    gcTime: 300_000,
    retry: 1,
    enabled: !this.routeScreenId()
  }));
  private readonly screenQuery = injectQuery(() => {
    const id = this.routeScreenId();
    return {
      queryKey: ['screens', 'detail', id],
      queryFn: () => this.screenService.fetchScreen(id!),
      staleTime: 60_000,
      gcTime: 300_000,
      retry: 1,
      enabled: !!id
    };
  });
  private manualSelectionId: string | null = null;
  private hasReportedListError = false;
  private hasAnnouncedEmptyState = false;
  private hasReportedDefaultError = false;
  private hasReportedScreenError = false;
  private componentRefs: ComponentRef<any>[] = [];
  private componentCache = new Map<string, ComponentRef<any>>();
  private componentMetadata = new Map<ComponentRef<any>, { id: string; type: string; config: ScreenComponent }>();
  private componentLifecycleCallbacks = new Map<ComponentRef<any>, { onDestroy?: () => void; onMount?: () => void }>();
  private componentPerformanceMetrics = new Map<string, { created: number; renderTime: number; errorCount: number }>();
  private autoPlaySubscription: any;

  constructor(
    private route: ActivatedRoute,
    private screenService: ScreenService,
    private screenStore: ScreenSignalStore,
    private wsManager: WebSocketManager,
    private authService: JwtAuthService,
    private componentRegistry: ComponentRegistryService,
    private cdr: ChangeDetectorRef,
    private tokenStorage: TokenStorageService
  ) {
    this.registerScreenSynchronization();
  }

  private registerScreenSynchronization(): void {
    effect(() => {
      const publishedPending = this.publishedScreensQuery.isPending();
      const publishedIsError = this.publishedScreensQuery.isError();
      const publishedError = this.publishedScreensQuery.error();
      const published = this.publishedScreensQuery.data();

      if (publishedPending && !this.screenConfig) {
        this.loading = true;
        this.error = null;
        this.screenStore.setLoading(true);
        this.screenStore.setError(null);
        this.cdr.markForCheck();
      }

      if (publishedIsError) {
        if (!this.hasReportedListError) {
          console.error('[ScreenDisplay] 加载已发布大屏失败', publishedError);
          this.hasReportedListError = true;
        }

        this.loading = false;
        this.error = (publishedError as Error | undefined)?.message || '加载大屏列表失败';
        this.currentScreenIndex = 0;
        this.screenConfig = null;
        this.destroyComponents();
        this.screenStore.setScreens([]);
        this.screenStore.setActiveScreen(null);
        this.screenStore.setManualSelection(null);
        this.screenStore.setLoading(false);
        this.screenStore.setError(this.error);
        this.cdr.markForCheck();
        return;
      }

      this.hasReportedListError = false;

      const publishedItems = published?.items ?? [];
      const availableScreens = [...publishedItems];
      this.screenStore.setScreens(availableScreens);
      this.cdr.markForCheck();

      const routeId = this.routeScreenId();
      let target: ScreenPage | null = null;

      if (this.manualSelectionId) {
        target = availableScreens.find(screen => screen.id === this.manualSelectionId) ?? null;

        if (!target) {
          this.updateManualSelection(null);
        }
      }

      if (!target && routeId) {
        target = availableScreens.find(screen => screen.id === routeId) ?? null;

        if (!target) {
          if (this.screenQuery.isPending()) {
            this.loading = true;
            this.error = null;
            this.screenStore.setLoading(true);
            this.screenStore.setError(null);
            this.cdr.markForCheck();
            return;
          }

          if (this.screenQuery.isError()) {
            if (!this.hasReportedScreenError) {
              console.warn('[ScreenDisplay] 指定大屏加载失败，尝试使用列表数据', this.screenQuery.error());
              this.hasReportedScreenError = true;
            }

            this.loading = false;
            this.error = (this.screenQuery.error() as Error | undefined)?.message || '无法加载指定大屏';
            this.screenConfig = null;
            this.destroyComponents();
            this.cdr.markForCheck();
            return;
          }

          const detail = this.screenQuery.data();
          if (detail) {
            target = detail;
          }
        } else {
          this.hasReportedScreenError = false;
        }
      } else {
        this.hasReportedScreenError = false;
      }

      if (!target) {
        if (this.defaultScreenQuery.isPending() && availableScreens.length === 0) {
          this.loading = true;
          this.error = null;
          this.screenStore.setLoading(true);
          this.screenStore.setError(null);
          this.cdr.markForCheck();
          return;
        }

        if (this.defaultScreenQuery.isError()) {
          if (!this.hasReportedDefaultError && !routeId) {
            console.warn('[ScreenDisplay] 获取默认大屏失败，使用第一个已发布大屏作为回退', this.defaultScreenQuery.error());
            this.hasReportedDefaultError = true;
          }
        } else {
          const defaultScreen = this.defaultScreenQuery.data();
          if (defaultScreen) {
            target = defaultScreen;
          }
          this.hasReportedDefaultError = false;
        }
      } else {
        this.hasReportedDefaultError = false;
      }

      if (!target && availableScreens.length > 0) {
        target = availableScreens[0];
      }

      if (!target) {
        if (!this.hasAnnouncedEmptyState) {
          console.info('[ScreenDisplay] 暂无已发布大屏');
          this.hasAnnouncedEmptyState = true;
        }

        this.loading = false;
        this.error = '暂无可展示的大屏，请先在管理后台发布屏幕';
        this.screenConfig = null;
        this.destroyComponents();
        this.cdr.markForCheck();
        return;
      }

      this.hasAnnouncedEmptyState = false;

      const index = availableScreens.findIndex(screen => screen.id === target!.id);
      if (index !== -1) {
        this.currentScreenIndex = index;
      }

      if (!this.screenConfig || this.screenConfig.id !== target.id || this.shouldRerenderComponents(target)) {
        void this.loadScreenConfig(target);
      } else {
        this.loading = false;
        this.error = null;
        this.screenStore.setLoading(false);
        this.screenStore.setError(null);
        this.screenStore.setActiveScreen(target);
        this.cdr.markForCheck();
      }
    });
  }

  ngOnInit(): void {
    this.routeScreenId.set(this.route.snapshot.paramMap.get('id'));

    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = params.get('id');
        this.routeScreenId.set(id);
        if (id) {
          this.updateManualSelection(null);
        }
      });

    // 设置防抖监听器
    this.setupResizeDebouncer();

    this.initializeWebSocketConnection();
    this.listenToFullscreenChanges();
    this.setupRealtimeSync();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    // 使用防抖机制避免频繁重计算
    this.resizeDebouncer$.next();
  }

  ngOnDestroy(): void {
    this.destroyComponents();
    this.stopAutoPlay();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupResizeDebouncer(): void {
    this.resizeDebouncer$
      .pipe(
        debounceTime(150), // 150ms 防抖延迟
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.calculateScale();
      });
  }


  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  private listenToFullscreenChanges(): void {
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
      // 全屏状态变化时重新计算缩放
      setTimeout(() => {
        this.calculateScale();
      }, 100);
    });
  }

  private async renderComponents(): Promise<void> {
    if (!this.screenConfig?.components || !this.componentsContainer) {
      return;
    }

    this.destroyComponents();

    try {
      // 批量创建组件以提高性能
      const componentPromises = this.screenConfig.components.map((componentConfig: ScreenComponent) =>
        this.createComponentOptimized(componentConfig)
      );

      await Promise.allSettled(componentPromises);

      // 确保DOM更新完成后再计算缩放
      requestAnimationFrame(() => {
        this.calculateScale();
        this.cdr.markForCheck();
      });
    } catch (error) {
      console.error('[ScreenDisplay] 组件渲染失败:', error);
      this.handleComponentRenderingError(error);
    }
  }

  private calculateScale(): void {
    try {
      if (!this.screenConfig || !this.screenWrapper) {
        return;
      }

      const designWidth = this.screenConfig.layout.width || 1920;
      const designHeight = this.screenConfig.layout.height || 1080;
      const designAspectRatio = designWidth / designHeight;

      const wrapper = this.screenWrapper.nativeElement;
      const wrapperWidth = wrapper.clientWidth;
      const wrapperHeight = wrapper.clientHeight;

      // 添加容器尺寸检查
      if (wrapperWidth <= 0 || wrapperHeight <= 0) {
        console.warn('[ScreenDisplay] 容器尺寸无效，跳过缩放计算');
        return;
      }

      const wrapperAspectRatio = wrapperWidth / wrapperHeight;

      const availableWidth = wrapperWidth;
      const availableHeight = wrapperHeight;

      const scaleX = availableWidth / designWidth;
      const scaleY = availableHeight / designHeight;

      const shouldScaleByHeight = wrapperAspectRatio < designAspectRatio;
      const coverScale = shouldScaleByHeight ? scaleY : scaleX;
      const safeScale = Number.isFinite(coverScale) && coverScale > 0 ? coverScale : 1;

      this.scale = Math.max(0.1, Math.min(3, safeScale));

      // 计算居中偏移量
      const scaledWidth = designWidth * this.scale;
      const scaledHeight = designHeight * this.scale;

      this.scaleOffsetX = (wrapperWidth - scaledWidth) / 2;
      this.scaleOffsetY = (wrapperHeight - scaledHeight) / 2;

      this.cdr.markForCheck();
    } catch (error) {
      console.error('[ScreenDisplay] 缩放计算失败:', error);
      // 设置默认缩放值，确保页面仍可显示
      this.scale = 1;
      this.scaleOffsetX = 0;
      this.scaleOffsetY = 0;
      this.cdr.markForCheck();
    }
  }

  getScaleTransform(): string {
    // 缩放交给 transform，位置由绝对定位控制，避免额外的平移计算
    return `scale(${this.scale})`;
  }

  private async createComponentOptimized(componentConfig: ScreenComponent): Promise<ComponentRef<any> | null> {
    const startTime = performance.now();
    const componentId = `${componentConfig.type}_${componentConfig.position.x}_${componentConfig.position.y}`;

    try {
      // 记录性能指标
      const existingMetrics = this.componentPerformanceMetrics.get(componentId);
      if (existingMetrics) {
        existingMetrics.created++;
      } else {
        this.componentPerformanceMetrics.set(componentId, {
          created: 1,
          renderTime: 0,
          errorCount: 0
        });
      }

      const cachedRef = this.componentCache.get(componentId);
      if (cachedRef) {
        // 复用缓存组件
        return this.reuseCachedComponent(cachedRef, componentConfig, componentId);
      }

      const componentType = this.componentRegistry.get(componentConfig.type);
      if (!componentType) {
        throw new Error(`组件类型未注册: ${componentConfig.type}`);
      }

      // 使用createComponent的工厂函数模式创建组件
      const componentRef = await this.createComponentInstance(componentType, componentConfig);

      // 注册生命周期回调
      this.registerComponentLifecycle(componentRef, componentConfig);

      // 异步应用样式和配置
      this.applyComponentConfiguration(componentRef, componentConfig);

      // 存储组件元数据
      this.componentMetadata.set(componentRef, {
        id: componentId,
        type: componentConfig.type,
        config: componentConfig
      });

      this.componentRefs.push(componentRef);
      this.componentCache.set(componentId, componentRef);

      // 记录性能指标
      const renderTime = performance.now() - startTime;
      const metrics = this.componentPerformanceMetrics.get(componentId)!;
      metrics.renderTime = renderTime;

      // 调用组件挂载回调
      this.executeComponentMount(componentRef);

      return componentRef;
    } catch (error) {
      console.error(`[ScreenDisplay] 组件创建失败 ${componentConfig.type}:`, error);

      // 更新错误计数
      const metrics = this.componentPerformanceMetrics.get(componentId);
      if (metrics) {
        metrics.errorCount++;
      }

      await this.handleComponentCreationError(componentConfig, error);
      return null;
    }
  }

  private async createComponentInstance(componentType: any, _componentConfig: ScreenComponent): Promise<ComponentRef<any>> {
    return new Promise((resolve, reject) => {
      try {
        const componentRef = this.componentsContainer.createComponent(componentType);

        // 确保组件视图初始化完成
        componentRef.changeDetectorRef.detectChanges();

        // 微任务中解析，确保DOM更新完成
        Promise.resolve().then(() => resolve(componentRef));
      } catch (error) {
        reject(error);
      }
    });
  }

  private applyComponentConfiguration(componentRef: ComponentRef<any>, componentConfig: ScreenComponent): void {
    const wrapper = componentRef.location.nativeElement;

    // 使用CSS类名批量应用样式，减少重排
    wrapper.className = 'component-element';

    // 计算经过边界检查的位置和尺寸
    const { x, y, width, height } = this.calculateComponentBounds(componentConfig);

    // 使用transform替代left/top提高性能
    const styles = {
      position: 'absolute',
      transform: `translate(${x}px, ${y}px)`,
      width: `${width}px`,
      height: `${height}px`,
      zIndex: `${componentConfig.position.zIndex || 1}`
    };

    // 批量设置样式以减少重排
    Object.assign(wrapper.style, styles);

    // 异步设置组件配置，避免阻塞渲染
    this.applyComponentData(componentRef, componentConfig);
  }

  private applyComponentData(componentRef: ComponentRef<any>, componentConfig: ScreenComponent): void {
    const instance = componentRef.instance as IScreenComponent;

    if (instance.onConfigChange && componentConfig.config) {
      // 使用setTimeout确保在下一个事件循环中执行
      setTimeout(() => {
        try {
          instance.onConfigChange?.(componentConfig.config);
          componentRef.changeDetectorRef.detectChanges();
        } catch (error) {
          console.error(`[ScreenDisplay] 组件配置应用失败:`, error);
        }
      }, 0);
    }
  }

  private reuseCachedComponent(cachedRef: ComponentRef<any>, componentConfig: ScreenComponent, componentId: string): ComponentRef<any> {
    // 更新缓存的组件配置
    this.applyComponentConfiguration(cachedRef, componentConfig);

    this.componentMetadata.set(cachedRef, {
      id: componentId,
      type: componentConfig.type,
      config: componentConfig
    });

    return cachedRef;
  }

  private calculateComponentBounds(componentConfig: ScreenComponent): { x: number; y: number; width: number; height: number } {
    if (!this.screenConfig) {
      return {
        x: componentConfig.position.x,
        y: componentConfig.position.y,
        width: componentConfig.position.width,
        height: componentConfig.position.height
      };
    }

    const canvasWidth = this.screenConfig.layout.width || 1920;
    const canvasHeight = this.screenConfig.layout.height || 1080;

    // 最小组件尺寸限制
    const minComponentSize = 20;

    let x = Math.max(0, componentConfig.position.x);
    let y = Math.max(0, componentConfig.position.y);
    let width = Math.max(minComponentSize, componentConfig.position.width);
    let height = Math.max(minComponentSize, componentConfig.position.height);

    // 边界检查，确保组件不会超出画布
    if (x + width > canvasWidth) {
      x = Math.max(0, canvasWidth - width);
    }
    if (y + height > canvasHeight) {
      y = Math.max(0, canvasHeight - height);
    }

    // 如果调整后的位置仍然超出边界，进一步调整尺寸
    if (x === 0 && width > canvasWidth) {
      width = canvasWidth;
    }
    if (y === 0 && height > canvasHeight) {
      height = canvasHeight;
    }

    return { x, y, width, height };
  }

  private destroyComponents(): void {
    // 执行组件销毁回调
    this.componentRefs.forEach(ref => {
      this.executeComponentDestroy(ref);
    });

    // 清理组件元数据
    this.componentMetadata.clear();
    this.componentLifecycleCallbacks.clear();
    this.componentCache.clear();

    // 销毁所有组件引用
    this.componentRefs.forEach(ref => {
      try {
        if (ref && ref.destroy) {
          ref.destroy();
        }
      } catch (error) {
        console.error('[ScreenDisplay] 组件销毁失败:', error);
      }
    });
    this.componentRefs = [];

    // 清理容器
    if (this.componentsContainer) {
      try {
        this.componentsContainer.clear();
      } catch (error) {
        console.error('[ScreenDisplay] 容器清理失败:', error);
      }
    }
  }

  private registerComponentLifecycle(componentRef: ComponentRef<any>, _componentConfig: ScreenComponent): void {
    const instance = componentRef.instance as IScreenComponent;
    const callbacks: { onDestroy?: () => void; onMount?: () => void } = {};

    // 检查组件是否实现了生命周期方法
    if (instance.onMount && typeof instance.onMount === 'function') {
      callbacks.onMount = () => {
        try {
          instance.onMount?.();
        } catch (error) {
          console.error('[ScreenDisplay] 组件onMount回调失败:', error);
        }
      };
    }

    if (instance.onDestroy && typeof instance.onDestroy === 'function') {
      callbacks.onDestroy = () => {
        try {
          instance.onDestroy?.();
        } catch (error) {
          console.error('[ScreenDisplay] 组件onDestroy回调失败:', error);
        }
      };
    }

    this.componentLifecycleCallbacks.set(componentRef, callbacks);
  }

  private executeComponentMount(componentRef: ComponentRef<any>): void {
    const callbacks = this.componentLifecycleCallbacks.get(componentRef);
    if (callbacks?.onMount) {
      setTimeout(() => {
        callbacks.onMount?.();
      }, 0);
    }
  }

  private executeComponentDestroy(componentRef: ComponentRef<any>): void {
    const callbacks = this.componentLifecycleCallbacks.get(componentRef);
    if (callbacks?.onDestroy) {
      try {
        callbacks.onDestroy();
      } catch (error) {
        console.error('[ScreenDisplay] 组件销毁回调执行失败:', error);
      }
    }
  }

  private async handleComponentCreationError(componentConfig: ScreenComponent, error: any): Promise<void> {
    // 记录错误信息
    console.error(`[ScreenDisplay] 组件创建失败详情:`, {
      componentType: componentConfig.type,
      position: componentConfig.position,
      error: error.message
    });

    // 尝试创建占位符组件
    await this.createFallbackComponent(componentConfig);
  }

  private async createFallbackComponent(componentConfig: ScreenComponent): Promise<void> {
    try {
      // 创建一个简单的错误占位符组件
      const fallbackElement = document.createElement('div');
      fallbackElement.className = 'component-element component-element--error';
      fallbackElement.style.position = 'absolute';

      const { x, y, width, height } = this.calculateComponentBounds(componentConfig);
      fallbackElement.style.transform = `translate(${x}px, ${y}px)`;
      fallbackElement.style.width = `${width}px`;
      fallbackElement.style.height = `${height}px`;
      fallbackElement.style.zIndex = `${componentConfig.position.zIndex || 1}`;

      fallbackElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ef4444; font-size: 12px; text-align: center; padding: 8px;">
          <div>
            <div>组件加载失败</div>
            <div style="opacity: 0.7; margin-top: 4px;">${componentConfig.type}</div>
          </div>
        </div>
      `;

      this.componentsContainer?.element.nativeElement.appendChild(fallbackElement);
    } catch (error) {
      console.error('[ScreenDisplay] 占位符组件创建失败:', error);
    }
  }

  private handleComponentRenderingError(error: any): void {
    console.error('[ScreenDisplay] 批量渲染发生错误:', error);

    // 清理可能部分创建的组件
    this.destroyComponents();

    // 显示错误信息
    this.error = '组件渲染失败，请刷新页面重试';
    this.loading = false;
    this.screenStore.setError(this.error);
    this.screenStore.setLoading(false);
    this.cdr.markForCheck();
  }

  private initializeWebSocketConnection(): void {
    console.log('WebSocket 连接检查:');
    console.log('- wsUrl:', environment.wsUrl);
    console.log('- namespace:', environment.wsNamespace);

    const existingConnection = this.wsManager.getConnection(environment.wsNamespace);
    if (existingConnection) {
      console.log('复用现有WebSocket连接');
      return;
    }

    console.log('创建新的WebSocket连接');
    const token = this.tokenStorage.getToken();
    const wsConfig = createScreensWebSocketConfig(environment.wsUrl, token ?? undefined);
    this.wsManager.connectToNamespace(wsConfig);
  }

  // 切换和轮播功能
  switchToScreen(event: any): void {
    const index = parseInt(event.target.value);
    const screens = this.availableScreens;
    if (index >= 0 && index < screens.length) {
      this.currentScreenIndex = index;
      const screen = screens[index];
      this.updateManualSelection(screen.id);
      void this.loadScreenConfig(screen);
    }
  }

  nextScreen(): void {
    const screens = this.availableScreens;
    if (screens.length > 1) {
      this.currentScreenIndex = (this.currentScreenIndex + 1) % screens.length;
      const screen = screens[this.currentScreenIndex];
      this.updateManualSelection(screen.id);
      void this.loadScreenConfig(screen);
    }
  }

  previousScreen(): void {
    const screens = this.availableScreens;
    if (screens.length > 1) {
      this.currentScreenIndex = this.currentScreenIndex === 0
        ? screens.length - 1
        : this.currentScreenIndex - 1;
      const screen = screens[this.currentScreenIndex];
      this.updateManualSelection(screen.id);
      void this.loadScreenConfig(screen);
    }
  }

  toggleAutoPlay(): void {
    if (this.isAutoPlay) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  private updateManualSelection(id: string | null): void {
    this.manualSelectionId = id;
    this.screenStore.setManualSelection(id);
  }

  private startAutoPlay(): void {
    if (this.availableScreens.length <= 1) return;

    this.isAutoPlay = true;
    this.screenStore.setAutoPlay(true);
    this.autoPlaySubscription = interval(this.autoPlayInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.nextScreen();
      });
  }

  private stopAutoPlay(): void {
    this.isAutoPlay = false;
    this.screenStore.setAutoPlay(false);
    if (this.autoPlaySubscription) {
      this.autoPlaySubscription.unsubscribe();
      this.autoPlaySubscription = null;
    }
  }

  private async loadScreenConfig(screen: ScreenPage): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      this.screenStore.setLoading(true);
      this.screenStore.setError(null);
      this.screenStore.setActiveScreen(screen);

      // 智能检测是否需要重新渲染组件
      const needsRerender = this.shouldRerenderComponents(screen);

      this.screenConfig = screen;
      this.cdr.markForCheck();

      if (needsRerender) {
        await this.renderComponents();
      }

      // 更新当前屏幕在可用列表中的索引
    const screenIndex = this.availableScreens.findIndex(s => s.id === screen.id);
      if (screenIndex !== -1) {
        this.currentScreenIndex = screenIndex;
      }

      this.loading = false;
      this.screenStore.setLoading(false);
      this.cdr.markForCheck();
    } catch (error) {
      console.error('[ScreenDisplay] 屏幕配置加载失败:', error);
      this.loading = false;
      this.error = '屏幕配置加载失败';
      this.screenStore.setLoading(false);
      this.screenStore.setError(this.error);
      this.cdr.markForCheck();
    }
  }

  private shouldRerenderComponents(newScreen: ScreenPage): boolean {
    if (!this.screenConfig || this.componentRefs.length === 0) {
      return true;
    }

    // 比较组件数量
    if (newScreen.components?.length !== this.screenConfig.components?.length) {
      return true;
    }

    // 比较组件配置
    if (!newScreen.components || !this.screenConfig.components) {
      return newScreen.components !== this.screenConfig.components;
    }

    // 深度比较组件配置
    for (let i = 0; i < newScreen.components.length; i++) {
      const newComponent = newScreen.components[i];
      const oldComponent = this.screenConfig.components[i];

      if (!this.areComponentsEqual(newComponent, oldComponent)) {
        return true;
      }
    }

    return false;
  }

  private areComponentsEqual(comp1: ScreenComponent, comp2: ScreenComponent): boolean {
    // 基本属性比较
    if (comp1.type !== comp2.type) return false;
    if (comp1.position.x !== comp2.position.x) return false;
    if (comp1.position.y !== comp2.position.y) return false;
    if (comp1.position.width !== comp2.position.width) return false;
    if (comp1.position.height !== comp2.position.height) return false;
    if (comp1.position.zIndex !== comp2.position.zIndex) return false;

    // 配置深度比较
    const config1 = JSON.stringify(comp1.config || {});
    const config2 = JSON.stringify(comp2.config || {});

    return config1 === config2;
  }

  // 实时同步功能
  private setupRealtimeSync(): void {
    this.listenToScreenPublishEvents();
    this.listenToScreenUpdateEvents();
    this.listenToScreenDeleteEvents();
  }

  private listenToScreenPublishEvents(): void {
    const wsInstance = this.wsManager.getConnection(environment.wsNamespace);
    if (wsInstance) {
      wsInstance.on('screen:published')
        .pipe(takeUntil(this.destroy$))
        .subscribe((data: any) => {
          console.log('新页面已发布:', data);
          this.handleNewScreenPublished(data.screen);
        });
    }
  }

  private listenToScreenUpdateEvents(): void {
    const wsInstance = this.wsManager.getConnection(environment.wsNamespace);
    if (wsInstance) {
      wsInstance.on('screen:updated')
        .pipe(takeUntil(this.destroy$))
        .subscribe((data: any) => {
          console.log('页面已更新:', data);
          this.handleScreenUpdated(data.screen);
        });
    }
  }

  private listenToScreenDeleteEvents(): void {
    const wsInstance = this.wsManager.getConnection(environment.wsNamespace);
    if (wsInstance) {
      wsInstance.on('screen:unpublished')
        .pipe(takeUntil(this.destroy$))
        .subscribe((data: any) => {
          console.log('页面已取消发布:', data);
          this.handleScreenUnpublished(data.screenId);
        });
    }
  }

  private handleNewScreenPublished(screen: ScreenPage): void {
    // 检查是否已存在
    const screens = this.availableScreens;
    if (!screens.some(existing => existing.id === screen.id)) {
      const updatedScreens = [...screens, screen];
      this.screenStore.setScreens(updatedScreens);
      void this.publishedScreensQuery.refetch();
      void this.defaultScreenQuery.refetch();
      this.cdr.markForCheck();
      this.showNotification('新页面可用', `页面 "${screen.name}" 已发布，可用于展示`);
    }
  }

  private handleScreenUpdated(updatedScreen: ScreenPage): void {
    const screens = this.availableScreens;
    const index = screens.findIndex(s => s.id === updatedScreen.id);
    if (index !== -1) {
      const updatedScreens = [...screens];
      updatedScreens[index] = updatedScreen;
      this.screenStore.setScreens(updatedScreens);
      void this.publishedScreensQuery.refetch();

      // 如果更新的是当前显示的页面，重新加载
      if (this.screenConfig?.id === updatedScreen.id) {
        this.updateManualSelection(updatedScreen.id);
        void this.loadScreenConfig(updatedScreen);
        this.showNotification('页面已更新', `当前页面 "${updatedScreen.name}" 已更新并重新加载`);
      }

      this.cdr.markForCheck();
    }
  }

  private handleScreenUnpublished(screenId: string): void {
    const screens = this.availableScreens;
    const index = screens.findIndex(s => s.id === screenId);
    if (index !== -1) {
      const screenName = screens[index].name;
      const updatedScreens = screens.filter(screen => screen.id !== screenId);
      if (this.manualSelectionId === screenId) {
        this.updateManualSelection(null);
      }
      this.screenStore.setScreens(updatedScreens);
      void this.publishedScreensQuery.refetch();
      void this.defaultScreenQuery.refetch();

      // 如果取消发布的是当前显示的页面
      if (this.screenConfig?.id === screenId) {
        if (updatedScreens.length > 0) {
          // 切换到第一个可用页面
          this.currentScreenIndex = 0;
          const fallbackScreen = updatedScreens[0];
          this.updateManualSelection(fallbackScreen.id);
          void this.loadScreenConfig(fallbackScreen);
          this.showNotification('页面不可用', `页面 "${screenName}" 已取消发布，已切换到其他页面`);
        } else {
          // 没有可用页面
          this.screenConfig = null;
          this.destroyComponents();
          this.showNotification('无可用页面', '所有页面都已取消发布');
        }
      } else if (this.currentScreenIndex > index) {
        this.currentScreenIndex--;
      } else {
        this.showNotification('页面已移除', `页面 "${screenName}" 已取消发布`);
      }

      this.cdr.markForCheck();
    }
  }

  private showNotification(title: string, message: string): void {
    // 简单的通知实现，可以集成更高级的通知组件
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico'
      });
    } else {
      console.log(`${title}: ${message}`);
    }
  }

  // 性能监控和调试方法
  public getComponentMetrics(): Array<{ id: string; metrics: any }> {
    const metrics: Array<{ id: string; metrics: any }> = [];

    this.componentPerformanceMetrics.forEach((value, key) => {
      metrics.push({
        id: key,
        metrics: {
          created: value.created,
          renderTime: Math.round(value.renderTime * 100) / 100,
          errorCount: value.errorCount,
          isCached: this.componentCache.has(key)
        }
      });
    });

    return metrics.sort((a, b) => b.metrics.renderTime - a.metrics.renderTime);
  }

  public logPerformanceReport(): void {
    const metrics = this.getComponentMetrics();
    console.group('[ScreenDisplay] 组件性能报告');

    if (metrics.length === 0) {
      console.log('暂无组件性能数据');
    } else {
      const totalRenderTime = metrics.reduce((sum, item) => sum + item.metrics.renderTime, 0);
      const avgRenderTime = totalRenderTime / metrics.length;
      const totalErrors = metrics.reduce((sum, item) => sum + item.metrics.errorCount, 0);

      console.log(`总组件数: ${metrics.length}`);
      console.log(`平均渲染时间: ${Math.round(avgRenderTime * 100) / 100}ms`);
      console.log(`总渲染时间: ${Math.round(totalRenderTime * 100) / 100}ms`);
      console.log(`错误总数: ${totalErrors}`);

      if (metrics.length > 0) {
        console.table(metrics.map(item => ({
          '组件ID': item.id,
          '创建次数': item.metrics.created,
          '渲染时间(ms)': item.metrics.renderTime,
          '错误次数': item.metrics.errorCount,
          '已缓存': item.metrics.isCached
        })));
      }
    }

    console.groupEnd();
  }

  // 请求通知权限
  requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}
