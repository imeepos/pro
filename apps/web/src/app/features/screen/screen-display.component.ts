import { Component, OnInit, OnDestroy, ViewChild, ViewContainerRef, ComponentRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ScreenPage, Component as ScreenComponent, SkerSDK } from '@pro/sdk';
import { WebSocketService, ComponentRegistryService, IScreenComponent } from '@pro/components';

@Component({
  selector: 'app-screen-display',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="screen-container" [style.width.px]="screenConfig?.layout?.width" [style.height.px]="screenConfig?.layout?.height">
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
          <div class="components-container" #componentsContainer></div>
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
  @ViewChild('componentsContainer', { read: ViewContainerRef }) componentsContainer!: ViewContainerRef;

  screenConfig: ScreenPage | null = null;
  loading = true;
  error: string | null = null;
  isFullscreen = false;

  private destroy$ = new Subject<void>();
  private screenId: string | null = null;
  private componentRefs: ComponentRef<any>[] = [];

  constructor(
    private route: ActivatedRoute,
    private sdk: SkerSDK,
    private wsService: WebSocketService,
    private componentRegistry: ComponentRegistryService,
    private cdr: ChangeDetectorRef
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
    this.clearComponents();
    this.destroy$.next();
    this.destroy$.complete();
    this.wsService.disconnect();
  }

  private loadScreen(id: string): void {
    this.loading = true;
    this.error = null;

    this.sdk.screen.getScreen$(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.screenConfig = config;
          this.loading = false;
          this.cdr.markForCheck();
          this.renderComponents();
        },
        error: (err) => {
          this.error = err.error?.message || '加载大屏配置失败';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private loadDefaultScreen(): void {
    this.loading = true;
    this.error = null;

    this.sdk.screen.getDefaultScreen$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.screenConfig = config;
          this.loading = false;
          this.cdr.markForCheck();
          this.renderComponents();
        },
        error: (err) => {
          this.error = err.error?.message || '加载默认大屏配置失败';
          this.loading = false;
          this.cdr.markForCheck();
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

  private renderComponents(): void {
    if (!this.screenConfig?.components || !this.componentsContainer) {
      return;
    }

    this.clearComponents();

    this.screenConfig.components.forEach((componentConfig: ScreenComponent) => {
      this.createComponent(componentConfig);
    });

    this.cdr.markForCheck();
  }

  private createComponent(componentConfig: ScreenComponent): void {
    const componentType = this.componentRegistry.get(componentConfig.type);

    if (!componentType) {
      console.error(`组件类型未注册: ${componentConfig.type}`);
      return;
    }

    const componentRef = this.componentsContainer.createComponent(componentType);

    const wrapper = componentRef.location.nativeElement;
    wrapper.classList.add('component-wrapper');
    wrapper.style.position = 'absolute';
    wrapper.style.left = `${componentConfig.position.x}px`;
    wrapper.style.top = `${componentConfig.position.y}px`;
    wrapper.style.width = `${componentConfig.position.width}px`;
    wrapper.style.height = `${componentConfig.position.height}px`;
    wrapper.style.zIndex = `${componentConfig.position.zIndex}`;

    const instance = componentRef.instance as IScreenComponent;
    if (instance.onConfigChange && componentConfig.config) {
      instance.onConfigChange(componentConfig.config);
    }

    this.componentRefs.push(componentRef);
  }

  private clearComponents(): void {
    this.componentRefs.forEach(ref => ref.destroy());
    this.componentRefs = [];

    if (this.componentsContainer) {
      this.componentsContainer.clear();
    }
  }
}
