import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ScreenApiService, ScreenPage } from '../../core/services/screen-api.service';
import { WebSocketService } from '../../core/services/websocket.service';

@Component({
  selector: 'app-screen-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="screen-container" [style.width.px]="screenConfig?.layout.width" [style.height.px]="screenConfig?.layout.height">
      @if (loading) {
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      } @else if (error) {
        <div class="error-container">
          <p class="error-message">{{ error }}</p>
        </div>
      } @else if (screenConfig) {
        <div class="screen-canvas" [style.background]="screenConfig.layout.background">
          <div class="components-container">
            @for (component of screenConfig.components; track component.id) {
              <div
                class="component-wrapper"
                [style.left.px]="component.position.x"
                [style.top.px]="component.position.y"
                [style.width.px]="component.position.width"
                [style.height.px]="component.position.height"
                [style.z-index]="component.position.zIndex">
                <div class="component-placeholder">
                  <p>{{ component.type }}</p>
                  <p class="text-sm text-gray-500">组件渲染待实现</p>
                </div>
              </div>
            }
          </div>
        </div>

        <button
          class="fullscreen-button"
          (click)="toggleFullscreen()"
          title="全屏切换">
          {{ isFullscreen ? '退出全屏' : '全屏显示' }}
        </button>
      }
    </div>
  `,
  styles: [`
    .screen-container {
      margin: 0 auto;
      position: relative;
      overflow: hidden;
    }

    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #f3f4f6;
    }

    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e5e7eb;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-message {
      color: #ef4444;
      font-size: 1.125rem;
    }

    .screen-canvas {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .components-container {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .component-wrapper {
      position: absolute;
      border: 1px dashed #cbd5e1;
    }

    .component-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.8);
      border: 2px dashed #94a3b8;
      border-radius: 8px;
    }

    .fullscreen-button {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 24px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: all 0.2s;
      z-index: 9999;
    }

    .fullscreen-button:hover {
      background: #2563eb;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    :host ::ng-deep :fullscreen .fullscreen-button {
      bottom: 12px;
      right: 12px;
    }
  `]
})
export class ScreenDisplayComponent implements OnInit, OnDestroy {
  screenConfig: ScreenPage | null = null;
  loading = true;
  error: string | null = null;
  isFullscreen = false;

  private destroy$ = new Subject<void>();
  private screenId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private screenApi: ScreenApiService,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.screenId = this.route.snapshot.paramMap.get('id');

    if (this.screenId) {
      this.loadScreen(this.screenId);
    } else {
      this.loadDefaultScreen();
    }

    this.wsService.connect();
    this.listenToFullscreenChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.wsService.disconnect();
  }

  private loadScreen(id: string): void {
    this.loading = true;
    this.error = null;

    this.screenApi.getScreen(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.screenConfig = config;
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || '加载大屏配置失败';
          this.loading = false;
        }
      });
  }

  private loadDefaultScreen(): void {
    this.loading = true;
    this.error = null;

    this.screenApi.getDefaultScreen()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.screenConfig = config;
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || '加载默认大屏配置失败';
          this.loading = false;
        }
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
    });
  }
}
