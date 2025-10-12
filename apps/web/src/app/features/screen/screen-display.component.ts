import { Component, OnInit, OnDestroy, ViewChild, ViewContainerRef, ComponentRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { ScreenPage, Component as ScreenComponent, SkerSDK } from '@pro/sdk';
import { WebSocketManager, createScreensWebSocketConfig, JwtAuthService, ComponentRegistryService, IScreenComponent } from '@pro/components';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { environment } from '../../../environments/environment';

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

        <!-- 控制面板 -->
        <div class="control-panel" [class.hidden]="isFullscreen">
          <div class="control-group">
            <button
              *ngIf="availableScreens.length > 1"
              class="control-button"
              (click)="toggleAutoPlay()"
              [title]="isAutoPlay ? '停止轮播' : '开始轮播'">
              {{ isAutoPlay ? '⏸️' : '▶️' }}
            </button>
            <button
              *ngIf="availableScreens.length > 1"
              class="control-button"
              (click)="previousScreen()"
              title="上一页">
              ⬅️
            </button>
            <button
              *ngIf="availableScreens.length > 1"
              class="control-button"
              (click)="nextScreen()"
              title="下一页">
              ➡️
            </button>
            <select
              *ngIf="availableScreens.length > 1"
              class="screen-selector"
              [value]="currentScreenIndex"
              (change)="switchToScreen($event)">
              <option *ngFor="let screen of availableScreens; let i = index" [value]="i">
                {{ screen.name }}
              </option>
            </select>
            <div *ngIf="availableScreens.length > 1" class="screen-indicator">
              {{ currentScreenIndex + 1 }} / {{ availableScreens.length }}
            </div>
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
    }

    .control-panel {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .control-panel.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .control-button {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .control-button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .screen-selector {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 14px;
      min-width: 150px;
    }

    .screen-selector option {
      background: #374151;
      color: white;
    }

    .screen-indicator {
      color: rgba(255, 255, 255, 0.8);
      font-size: 12px;
      padding: 0 8px;
      border-left: 1px solid rgba(255, 255, 255, 0.2);
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

  // 轮播和切换功能
  availableScreens: ScreenPage[] = [];
  currentScreenIndex = 0;
  isAutoPlay = false;
  autoPlayInterval = 30000; // 30秒切换一次

  private destroy$ = new Subject<void>();
  private screenId: string | null = null;
  private componentRefs: ComponentRef<any>[] = [];
  private autoPlaySubscription: any;

  constructor(
    private route: ActivatedRoute,
    private sdk: SkerSDK,
    private wsManager: WebSocketManager,
    private authService: JwtAuthService,
    private componentRegistry: ComponentRegistryService,
    private cdr: ChangeDetectorRef,
    private tokenStorage: TokenStorageService
  ) {}

  ngOnInit(): void {
    this.screenId = this.route.snapshot.paramMap.get('id');

    // 首先加载所有已发布的页面
    this.loadAvailableScreens().then(() => {
      if (this.screenId) {
        this.loadScreen(this.screenId);
      } else {
        this.loadDefaultScreen();
      }
    });

    this.initializeWebSocketConnection();
    this.listenToFullscreenChanges();
    this.setupRealtimeSync();
  }

  ngOnDestroy(): void {
    this.clearComponents();
    this.stopAutoPlay();
    this.destroy$.next();
    this.destroy$.complete();
    this.wsManager.disconnectAll();
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

  private initializeWebSocketConnection(): void {
    console.log('WebSocket 连接初始化:');
    console.log('- wsUrl:', environment.wsUrl);
    console.log('- namespace:', environment.wsNamespace);

    const token = this.tokenStorage.getToken();
    const wsConfig = createScreensWebSocketConfig(environment.wsUrl, token);

    // 连接到 screens 命名空间
    this.wsManager.connectToNamespace(wsConfig);
  }

  // 加载所有已发布的页面
  private async loadAvailableScreens(): Promise<void> {
    try {
      const response = await this.sdk.screen.getPublishedScreens$().pipe(takeUntil(this.destroy$)).toPromise();
      if (response) {
        this.availableScreens = response.items;
        this.cdr.markForCheck();
      }
    } catch (error) {
      console.error('Failed to load available screens:', error);
    }
  }

  // 切换和轮播功能
  switchToScreen(event: any): void {
    const index = parseInt(event.target.value);
    if (index >= 0 && index < this.availableScreens.length) {
      this.currentScreenIndex = index;
      const screen = this.availableScreens[index];
      this.loadScreenConfig(screen);
    }
  }

  nextScreen(): void {
    if (this.availableScreens.length > 1) {
      this.currentScreenIndex = (this.currentScreenIndex + 1) % this.availableScreens.length;
      const screen = this.availableScreens[this.currentScreenIndex];
      this.loadScreenConfig(screen);
    }
  }

  previousScreen(): void {
    if (this.availableScreens.length > 1) {
      this.currentScreenIndex = this.currentScreenIndex === 0
        ? this.availableScreens.length - 1
        : this.currentScreenIndex - 1;
      const screen = this.availableScreens[this.currentScreenIndex];
      this.loadScreenConfig(screen);
    }
  }

  toggleAutoPlay(): void {
    if (this.isAutoPlay) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  private startAutoPlay(): void {
    if (this.availableScreens.length <= 1) return;

    this.isAutoPlay = true;
    this.autoPlaySubscription = interval(this.autoPlayInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.nextScreen();
      });
  }

  private stopAutoPlay(): void {
    this.isAutoPlay = false;
    if (this.autoPlaySubscription) {
      this.autoPlaySubscription.unsubscribe();
      this.autoPlaySubscription = null;
    }
  }

  private loadScreenConfig(screen: ScreenPage): void {
    this.screenConfig = screen;
    this.loading = false;
    this.error = null;
    this.cdr.markForCheck();
    this.renderComponents();

    // 更新当前屏幕在可用列表中的索引
    const screenIndex = this.availableScreens.findIndex(s => s.id === screen.id);
    if (screenIndex !== -1) {
      this.currentScreenIndex = screenIndex;
    }
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
    const existingIndex = this.availableScreens.findIndex(s => s.id === screen.id);
    if (existingIndex === -1) {
      this.availableScreens.push(screen);
      this.cdr.markForCheck();
      this.showNotification('新页面可用', `页面 "${screen.name}" 已发布，可用于展示`);
    }
  }

  private handleScreenUpdated(updatedScreen: ScreenPage): void {
    const index = this.availableScreens.findIndex(s => s.id === updatedScreen.id);
    if (index !== -1) {
      this.availableScreens[index] = updatedScreen;

      // 如果更新的是当前显示的页面，重新加载
      if (this.screenConfig?.id === updatedScreen.id) {
        this.loadScreenConfig(updatedScreen);
        this.showNotification('页面已更新', `当前页面 "${updatedScreen.name}" 已更新并重新加载`);
      }

      this.cdr.markForCheck();
    }
  }

  private handleScreenUnpublished(screenId: string): void {
    const index = this.availableScreens.findIndex(s => s.id === screenId);
    if (index !== -1) {
      const screenName = this.availableScreens[index].name;
      this.availableScreens.splice(index, 1);

      // 如果取消发布的是当前显示的页面
      if (this.screenConfig?.id === screenId) {
        if (this.availableScreens.length > 0) {
          // 切换到第一个可用页面
          this.currentScreenIndex = 0;
          this.loadScreenConfig(this.availableScreens[0]);
          this.showNotification('页面不可用', `页面 "${screenName}" 已取消发布，已切换到其他页面`);
        } else {
          // 没有可用页面
          this.screenConfig = null;
          this.clearComponents();
          this.showNotification('无可用页面', '所有页面都已取消发布');
        }
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

  // 请求通知权限
  requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}
