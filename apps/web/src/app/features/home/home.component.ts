import { Component, OnInit, OnDestroy, ViewChild, ViewContainerRef, ComponentRef, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, debounceTime } from 'rxjs/operators';
import { ScreenPage, Component as ScreenComponent, SkerSDK } from '@pro/sdk';
import { WebSocketManager, createScreensWebSocketConfig, JwtAuthService, ComponentRegistryService, IScreenComponent } from '@pro/components';
import { AuthStateService } from '../../core/state/auth-state.service';
import { AuthQuery } from '../../core/state/auth.query';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('componentsContainer', { read: ViewContainerRef }) componentsContainer!: ViewContainerRef;
  @ViewChild('screenWrapper', { read: ElementRef }) screenWrapper!: ElementRef<HTMLElement>;

  screenConfig: ScreenPage | null = null;
  loading = true;
  error: string | null = null;
  isFullscreen = false;
  currentUser$ = this.authQuery.currentUser$;

  // 缩放相关
  scale = 1;
  scaleOffsetX = 0;
  scaleOffsetY = 0;
  private resizeDebouncer$ = new Subject<void>();

  // 轮播和切换功能
  availableScreens: ScreenPage[] = [];
  currentScreenIndex = 0;
  isAutoPlay = false;
  autoPlayInterval = 30000; // 30秒切换一次

  private destroy$ = new Subject<void>();
  private componentRefs: ComponentRef<any>[] = [];
  private autoPlaySubscription: any;
  private isViewInitialized = false;
  private pendingComponentCreation = false;
  private componentCreationRetryCount = 0;
  private readonly maxRetryCount = 3;

  constructor(
    private authStateService: AuthStateService,
    private authQuery: AuthQuery,
    private router: Router,
    private sdk: SkerSDK,
    private wsManager: WebSocketManager,
    private authService: JwtAuthService,
    private componentRegistry: ComponentRegistryService,
    private cdr: ChangeDetectorRef,
    private tokenStorage: TokenStorageService
  ) {}

  ngOnInit(): void {
    console.log('[HomeComponent] ngOnInit 开始');

    // 设置防抖监听器
    this.setupResizeDebouncer();

    this.loadAvailableScreens().then(() => {
      // 在加载可用屏幕后，确保选中正确的默认屏幕
      this.identifyAndSelectDefaultScreen().then(() => {
        this.loadDefaultScreen();
      });
    });

    this.initializeWebSocketConnection();
    this.listenToFullscreenChanges();
    this.setupRealtimeSync();

    console.log('[HomeComponent] ngOnInit 完成');
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    // 使用防抖机制避免频繁重计算
    this.resizeDebouncer$.next();
  }

  ngAfterViewInit(): void {
    console.log('[HomeComponent] ngAfterViewInit - 视图初始化完成');
    this.isViewInitialized = true;
    this.cdr.markForCheck();

    // 如果有待处理的组件创建请求，现在执行
    if (this.pendingComponentCreation && this.screenConfig) {
      console.log('[HomeComponent] ngAfterViewInit - 执行待处理的组件创建');
      this.pendingComponentCreation = false;
      this.scheduleComponentCreation();
    }
  }

  ngOnDestroy(): void {
    this.clearComponents();
    this.stopAutoPlay();
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    this.authStateService.logout().subscribe();
  }

  private loadDefaultScreen(): void {
    console.log('[HomeComponent] loadDefaultScreen 开始');
    this.loading = true;
    this.error = null;

    this.sdk.screen.getDefaultScreen$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          console.log('[HomeComponent] 默认屏幕配置加载成功', { config });
          this.screenConfig = config;
          this.loading = false;
          this.componentCreationRetryCount = 0; // 重置重试计数
          this.cdr.markForCheck();

          // 使用改进的组件创建调度
          this.scheduleComponentCreation();
        },
        error: (err) => {
          console.error('[HomeComponent] 加载默认屏幕配置失败', err);
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
      // 全屏状态变化时重新计算缩放
      setTimeout(() => {
        this.calculateScale();
      }, 100);
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

    // 确保DOM更新完成后再计算缩放
    requestAnimationFrame(() => {
      this.calculateScale();
      this.cdr.markForCheck();
    });
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
    const existingConnection = this.wsManager.getConnection(environment.wsNamespace);
    if (existingConnection) {
      return;
    }

    const token = this.tokenStorage.getToken();
    const wsConfig = createScreensWebSocketConfig(environment.wsUrl, token ?? undefined);
    this.wsManager.connectToNamespace(wsConfig);
  }

  private async loadAvailableScreens(): Promise<void> {
    try {
      const response = await this.sdk.screen.getPublishedScreens$().pipe(takeUntil(this.destroy$)).toPromise();
      if (response) {
        this.availableScreens = response.items;

        // 识别并选中默认屏幕
        await this.identifyAndSelectDefaultScreen();

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
          this.handleScreenUnpublished(data.screenId);
        });
    }
  }

  private handleNewScreenPublished(screen: ScreenPage): void {
    const existingIndex = this.availableScreens.findIndex(s => s.id === screen.id);
    if (existingIndex === -1) {
      this.availableScreens.push(screen);

      // 检查新发布的屏幕是否是默认屏幕
      if (screen.isDefault) {
        this.currentScreenIndex = this.availableScreens.length - 1;
        this.cdr.markForCheck();
      } else {
        // 检查是否需要重新识别默认屏幕
        this.identifyAndSelectDefaultScreen().then(() => {
          this.cdr.markForCheck();
        });
      }
    }
  }

  private handleScreenUpdated(updatedScreen: ScreenPage): void {
    const index = this.availableScreens.findIndex(s => s.id === updatedScreen.id);
    if (index !== -1) {
      this.availableScreens[index] = updatedScreen;

      // 如果更新的屏幕成为默认屏幕，更新当前选中
      if (updatedScreen.isDefault) {
        this.currentScreenIndex = index;
      } else if (this.currentScreenIndex === index && !updatedScreen.isDefault) {
        // 如果当前选中的屏幕不再是默认屏幕，重新识别默认屏幕
        this.identifyAndSelectDefaultScreen().then(() => {
          this.cdr.markForCheck();
        });
      }

      if (this.screenConfig?.id === updatedScreen.id) {
        this.loadScreenConfig(updatedScreen);
      }

      this.cdr.markForCheck();
    }
  }

  private handleScreenUnpublished(screenId: string): void {
    const index = this.availableScreens.findIndex(s => s.id === screenId);
    if (index !== -1) {
      this.availableScreens.splice(index, 1);

      if (this.screenConfig?.id === screenId) {
        if (this.availableScreens.length > 0) {
          // 尝试重新识别并选中默认屏幕
          this.identifyAndSelectDefaultScreen().then(() => {
            if (this.currentScreenIndex < this.availableScreens.length) {
              this.loadScreenConfig(this.availableScreens[this.currentScreenIndex]);
            } else {
              this.currentScreenIndex = 0;
              this.loadScreenConfig(this.availableScreens[0]);
            }
          });
        } else {
          this.screenConfig = null;
          this.clearComponents();
        }
      }

      this.cdr.markForCheck();
    }
  }

  private async identifyAndSelectDefaultScreen(): Promise<void> {
    if (this.availableScreens.length === 0) {
      return;
    }

    try {
      // 获取默认屏幕配置
      const defaultScreen = await this.sdk.screen.getDefaultScreen$().pipe(takeUntil(this.destroy$)).toPromise();

      if (defaultScreen) {
        // 在可用屏幕列表中找到默认屏幕
        const defaultIndex = this.availableScreens.findIndex(screen => screen.id === defaultScreen.id);

        if (defaultIndex !== -1) {
          this.currentScreenIndex = defaultIndex;
        } else {
          // 如果默认屏幕不在已发布列表中，使用第一个屏幕
          this.currentScreenIndex = 0;
        }
      } else {
        // 如果没有默认屏幕，使用第一个屏幕
        this.currentScreenIndex = 0;
      }
    } catch (error) {
      console.warn('Failed to load default screen, using first screen:', error);
      // 如果获取默认屏幕失败，使用第一个屏幕
      this.currentScreenIndex = 0;
    }
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
        console.warn('[HomeComponent] 容器尺寸无效，跳过缩放计算');
        return;
      }

      const wrapperAspectRatio = wrapperWidth / wrapperHeight;

      // 添加容错边距，确保组件不会紧贴边缘
      const margin = this.isFullscreen ? 20 : 40;
      const availableWidth = wrapperWidth - margin;
      const availableHeight = wrapperHeight - margin;

      // 计算宽高比例，取较小值以保证完整显示
      const scaleX = availableWidth / designWidth;
      const scaleY = availableHeight / designHeight;

      // 根据屏幕比例差异选择合适的缩放策略
      let finalScale: number;
      if (Math.abs(designAspectRatio - wrapperAspectRatio) < 0.1) {
        // 比例相近，使用最大可能的缩放
        finalScale = Math.min(scaleX, scaleY);
      } else {
        // 比例差异较大，优先保证内容完整显示
        finalScale = Math.min(scaleX, scaleY) * 0.95; // 留5%边距
      }

      // 使用更精确的缩放计算，限制最小和最大缩放比例
      this.scale = Math.max(0.1, Math.min(3, finalScale));

      // 计算居中偏移量
      const scaledWidth = designWidth * this.scale;
      const scaledHeight = designHeight * this.scale;

      this.scaleOffsetX = (wrapperWidth - scaledWidth) / 2;
      this.scaleOffsetY = (wrapperHeight - scaledHeight) / 2;

      this.cdr.markForCheck();
    } catch (error) {
      console.error('[HomeComponent] 缩放计算失败:', error);
      // 设置默认缩放值，确保页面仍可显示
      this.scale = 1;
      this.scaleOffsetX = 0;
      this.scaleOffsetY = 0;
      this.cdr.markForCheck();
    }
  }

  getScaleTransform(): string {
    // 使用 transform-origin 为中心点，结合偏移量实现精确居中
    return `translate(${this.scaleOffsetX}px, ${this.scaleOffsetY}px) scale(${this.scale})`;
  }
}
