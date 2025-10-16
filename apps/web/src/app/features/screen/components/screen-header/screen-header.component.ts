import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScreenPage } from '../../../../core/types/screen.types';

@Component({
  selector: 'app-screen-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="screen-header" [class.screen-header--compact]="isFullscreen">
      <div class="screen-header__meta">
        <h1 class="screen-title">{{ screen?.name || '未命名大屏' }}</h1>
        @if (screen?.description) {
          <p class="screen-subtitle">{{ screen?.description }}</p>
        }
      </div>

      <div class="screen-header__actions">
        @if (hasMultipleScreens) {
          <div class="screen-toolbar" data-testid="screen-selector">
            <button
              class="toolbar-trigger"
              (click)="autoPlayToggle.emit()"
              [title]="isAutoPlay ? '停止轮播' : '开始轮播'"
              [attr.aria-label]="isAutoPlay ? '停止轮播' : '开始轮播'">
              {{ isAutoPlay ? '⏸️' : '▶️' }}
            </button>
            <button
              class="toolbar-trigger"
              (click)="previous.emit()"
              title="上一页"
              aria-label="上一页">
              ⬅️
            </button>
            <button
              class="toolbar-trigger"
              (click)="next.emit()"
              title="下一页"
              aria-label="下一页">
              ➡️
            </button>
            <select
              class="toolbar-selector"
              [value]="currentScreenIndex"
              (change)="onScreenChange($event)"
              aria-label="选择页面">
              <option *ngFor="let item of availableScreens; let index = index; trackBy: trackById" [value]="index">
                {{ item.name }}
              </option>
            </select>
            <div
              class="toolbar-indicator"
              role="status"
              [attr.aria-label]="indicatorLabel">
              {{ currentScreenIndex + 1 }} / {{ availableScreens.length }}
            </div>
          </div>
        }

        <button
          class="screen-action screen-action--primary"
          (click)="fullscreenToggle.emit()"
          title="全屏切换"
          [attr.aria-label]="isFullscreen ? '退出全屏' : '全屏显示'">
          {{ isFullscreen ? '退出全屏' : '全屏显示' }}
        </button>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
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
      transition: opacity var(--pro-transition-base), transform var(--pro-transition-base);
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
      color: rgba(255, 255, 255, 0.95);
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

    .screen-toolbar {
      display: inline-flex;
      align-items: center;
      gap: var(--pro-space-2);
      padding: var(--pro-space-2) var(--pro-space-3);
      border-radius: var(--pro-radius-xl);
      border: 1px solid rgba(255, 255, 255, var(--pro-opacity-glass-light));
      backdrop-filter: blur(8px);
      background: rgba(15, 23, 42, 0.35);
      box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12);
    }

    .toolbar-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(15, 23, 42, 0.35);
      color: white;
      font-size: 16px;
      cursor: pointer;
      transition: all var(--pro-transition-fast);
    }

    .toolbar-trigger:hover {
      background: rgba(59, 130, 246, 0.4);
      box-shadow: 0 10px 25px -10px rgba(59, 130, 246, 0.35);
      transform: translateY(-1px);
    }

    .toolbar-trigger:focus-visible {
      outline: 2px solid rgba(59, 130, 246, 0.5);
      outline-offset: 2px;
    }

    .toolbar-selector {
      appearance: none;
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

      .screen-toolbar {
        flex-wrap: wrap;
      }

      .toolbar-selector {
        width: 100%;
        min-width: 0;
      }
    }

    @media (prefers-contrast: high) {
      .toolbar-trigger,
      .toolbar-selector,
      .screen-action {
        border-width: 2px;
      }
    }

    @media print {
      .screen-toolbar {
        display: none !important;
      }
    }
  `]
})
export class ScreenHeaderComponent {
  @Input() screen: ScreenPage | null = null;
  @Input() isFullscreen = false;
  @Input() hasMultipleScreens = false;
  @Input() isAutoPlay = false;
  @Input() currentScreenIndex = 0;
  @Input() availableScreens: ScreenPage[] = [];

  @Output() autoPlayToggle = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() screenSelect = new EventEmitter<number>();
  @Output() fullscreenToggle = new EventEmitter<void>();

  get indicatorLabel(): string {
    return `当前页面 ${this.currentScreenIndex + 1} / ${this.availableScreens.length}`;
  }

  trackById(_: number, item: ScreenPage): string {
    return item.id;
  }

  onScreenChange(event: Event): void {
    const { value } = event.target as HTMLSelectElement;
    const index = Number.parseInt(value, 10);
    if (!Number.isNaN(index)) {
      this.screenSelect.emit(index);
    }
  }
}
