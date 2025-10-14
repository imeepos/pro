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

    // 一次性加载所有屏幕数据并正确设置默认页面
    this.loadScreensAndSetDefault();

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

  private scheduleComponentCreation(): void {
    console.log('[HomeComponent] scheduleComponentCreation 开始', {
      hasScreenConfig: !!this.screenConfig,
      isViewInitialized: this.isViewInitialized,
      hasComponentsContainer: !!this.componentsContainer,
      componentCount: this.screenConfig?.components?.length || 0
    });

    if (!this.screenConfig?.components) {
      console.log('[HomeComponent] 没有组件需要创建');
      return;
    }

    if (!this.isViewInitialized || !this.componentsContainer) {
      console.log('[HomeComponent] 视图未初始化或容器不可用，标记待处理');
      this.pendingComponentCreation = true;
      return;
    }

    // 使用 setTimeout + requestAnimationFrame 确保DOM完全准备好
    setTimeout(() => {
      if (this.isViewInitialized && this.componentsContainer) {
        requestAnimationFrame(() => {
          this.renderComponentsWithRetry();
        });
      }
    }, 0);
  }

  private renderComponentsWithRetry(): void {
    console.log('[HomeComponent] renderComponentsWithRetry 开始', {
      retryCount: this.componentCreationRetryCount,
      maxRetryCount: this.maxRetryCount
    });

    try {
      this.renderComponents();
      this.componentCreationRetryCount = 0; // 成功后重置计数
    } catch (error) {
      console.error('[HomeComponent] renderComponents 失败', error);
      this.componentCreationRetryCount++;

      if (this.componentCreationRetryCount < this.maxRetryCount) {
        console.log(`[HomeComponent] 将在 ${1000 * this.componentCreationRetryCount}ms 后重试`);
        setTimeout(() => {
          this.renderComponentsWithRetry();
        }, 1000 * this.componentCreationRetryCount);
      } else {
        console.error('[HomeComponent] 组件创建重试次数已达上限，放弃重试');
        this.error = '组件创建失败，请刷新页面重试';
        this.cdr.markForCheck();
      }
    }
  }

  private renderComponents(): void {
    console.log('[HomeComponent] renderComponents 开始', {
      hasScreenConfig: !!this.screenConfig,
      hasComponentsContainer: !!this.componentsContainer,
      componentCount: this.screenConfig?.components?.length || 0
    });

    if (!this.screenConfig?.components || !this.componentsContainer) {
      console.warn('[HomeComponent] renderComponents 条件不满足', {
        hasScreenConfig: !!this.screenConfig,
        hasComponentsContainer: !!this.componentsContainer
      });
      return;
    }

    this.clearComponents();

    const componentConfigs = this.screenConfig.components;
    console.log(`[HomeComponent] 准备创建 ${componentConfigs.length} 个组件`);

    let successCount = 0;
    let failureCount = 0;

    componentConfigs.forEach((componentConfig: ScreenComponent, index: number) => {
      try {
        const success = this.createComponent(componentConfig, index);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`[HomeComponent] 创建组件 ${index} 时发生错误`, error);
        failureCount++;
      }
    });

    console.log(`[HomeComponent] 组件创建完成: 成功 ${successCount}，失败 ${failureCount}`);

    // 确保DOM更新完成后再计算缩放
    requestAnimationFrame(() => {
      this.calculateScale();
      this.cdr.markForCheck();
    });
  }

  private createComponent(componentConfig: ScreenComponent, index: number): boolean {
    console.log(`[HomeComponent] createComponent 开始`, {
      componentType: componentConfig.type,
      componentIndex: index,
      position: componentConfig.position
    });

    try {
      // 验证容器是否可用
      if (!this.componentsContainer) {
        console.error('[HomeComponent] 组件容器不可用');
        return false;
      }

      // 获取组件类型
      const componentType = this.componentRegistry.get(componentConfig.type);
      if (!componentType) {
        console.error(`[HomeComponent] 组件类型未注册: ${componentConfig.type}`);
        return false;
      }

      console.log(`[HomeComponent] 开始创建组件实例: ${componentConfig.type}`);

      // 创建组件实例
      const componentRef = this.componentsContainer.createComponent(componentType);
      console.log(`[HomeComponent] 组件实例创建成功: ${componentConfig.type}`);

      // 设置组件样式和位置
      const wrapper = componentRef.location.nativeElement;
      wrapper.classList.add('component-wrapper');
      wrapper.style.position = 'absolute';
      wrapper.style.left = `${componentConfig.position.x}px`;
      wrapper.style.top = `${componentConfig.position.y}px`;
      wrapper.style.width = `${componentConfig.position.width}px`;
      wrapper.style.height = `${componentConfig.position.height}px`;
      wrapper.style.zIndex = `${componentConfig.position.zIndex}`;

      console.log(`[HomeComponent] 组件样式设置完成: ${componentConfig.type}`);

      // 设置组件配置
      const instance = componentRef.instance as IScreenComponent;
      if (instance.onConfigChange && componentConfig.config) {
        try {
          instance.onConfigChange(componentConfig.config);
          console.log(`[HomeComponent] 组件配置设置完成: ${componentConfig.type}`);
        } catch (configError) {
          console.error(`[HomeComponent] 设置组件配置失败: ${componentConfig.type}`, configError);
          // 配置失败不应该阻止组件显示，继续执行
        }
      }

      // 触发组件的变更检测
      if (componentRef.changeDetectorRef) {
        componentRef.changeDetectorRef.detectChanges();
      }

      this.componentRefs.push(componentRef);
      console.log(`[HomeComponent] 组件创建完成: ${componentConfig.type}`);

      return true;

    } catch (error) {
      console.error(`[HomeComponent] 创建组件失败: ${componentConfig.type}`, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        componentConfig,
        index
      });
      return false;
    }
  }

  private clearComponents(): void {
    this.componentRefs.forEach(ref => ref.destroy());
    this.componentRefs = [];

    if (this.componentsContainer) {
      this.componentsContainer.clear();
    }
  }

  private initializeWebSocketConnection(): void {
    console.log('[HomeComponent] WebSocket连接初始化开始');

    const existingConnection = this.wsManager.getConnection(environment.wsNamespace);
    if (existingConnection) {
      console.log('[HomeComponent] WebSocket连接已存在，跳过重复创建');
      return;
    }

    const token = this.tokenStorage.getToken();
    console.log('[HomeComponent] 获取认证令牌', { hasToken: !!token, tokenLength: token?.length });

    const wsConfig = createScreensWebSocketConfig(environment.wsUrl, token ?? undefined, {
      autoRefresh: true,
      onTokenExpired: async () => {
        console.log('[HomeComponent] JWT Token 已过期，跳转到登录页');
        this.handleTokenExpired();
        throw new Error('Token expired - redirecting to login');
      }
    });
    console.log('[HomeComponent] 创建WebSocket配置', { wsUrl: environment.wsUrl, namespace: environment.wsNamespace });

    const wsInstance = this.wsManager.connectToNamespace(wsConfig);

    // 监听认证错误事件
    wsInstance.on('auth:token-expired')
      .subscribe(() => {
        console.log('[HomeComponent] JWT Token 已过期，跳转到登录页');
        this.handleTokenExpired();
      });

    wsInstance.on('auth:authentication-failed')
      .subscribe((error: any) => {
        console.log('[HomeComponent] 认证失败，跳转到登录页', error);
        this.handleTokenExpired();
      });

    console.log('[HomeComponent] WebSocket连接请求已发送');
  }

  private handleTokenExpired(): void {
    // 清除本地存储的认证信息
    this.tokenStorage.clearToken();
    this.authStateService.logout();

    // 跳转到登录页
    this.router.navigate(['/auth/login']);
  }

  private async loadScreensAndSetDefault(): Promise<void> {
    try {
      console.log('[HomeComponent] loadScreensAndSetDefault 开始');

      // 并行加载可用屏幕和默认屏幕
      const [publishedResponse, defaultScreen] = await Promise.allSettled([
        this.sdk.screen.getPublishedScreens$().pipe(takeUntil(this.destroy$)).toPromise(),
        this.sdk.screen.getDefaultScreen$().pipe(takeUntil(this.destroy$)).toPromise()
      ]);

      // 处理已发布屏幕列表
      if (publishedResponse.status === 'fulfilled' && publishedResponse.value) {
        this.availableScreens = publishedResponse.value.items;
        console.log('[HomeComponent] 已发布屏幕加载完成', { count: this.availableScreens.length });
      }

      // 设置默认屏幕选中状态
      if (this.availableScreens.length > 0) {
        if (defaultScreen.status === 'fulfilled' && defaultScreen.value) {
          // 找到默认屏幕在列表中的索引
          const defaultIndex = this.availableScreens.findIndex(screen => screen.id === defaultScreen.value!.id);
          if (defaultIndex !== -1) {
            this.currentScreenIndex = defaultIndex;
            console.log('[HomeComponent] 默认屏幕选中', {
              screenId: defaultScreen.value!.id,
              screenName: defaultScreen.value!.name,
              index: defaultIndex
            });
          } else {
            // 如果默认屏幕不在已发布列表中，使用第一个屏幕
            this.currentScreenIndex = 0;
            console.log('[HomeComponent] 默认屏幕不在已发布列表中，使用第一个屏幕');
          }
        } else {
          // 如果获取默认屏幕失败，使用第一个屏幕
          this.currentScreenIndex = 0;
          const reason = defaultScreen.status === 'rejected' ? defaultScreen.reason : 'No default screen returned';
          console.warn('[HomeComponent] 获取默认屏幕失败，使用第一个屏幕', reason);
        }

        // 加载当前选中的屏幕配置
        const selectedScreen = this.availableScreens[this.currentScreenIndex];
        if (selectedScreen) {
          this.screenConfig = selectedScreen;
          this.loading = false;
          this.componentCreationRetryCount = 0;
          this.error = null;
          this.cdr.markForCheck();

          // 创建组件
          this.scheduleComponentCreation();
          console.log('[HomeComponent] 屏幕配置加载完成', {
            screenId: selectedScreen.id,
            screenName: selectedScreen.name
          });
        }
      } else {
        this.loading = false;
        this.error = '没有可用的屏幕';
        this.cdr.markForCheck();
      }

      console.log('[HomeComponent] loadScreensAndSetDefault 完成');
    } catch (error) {
      console.error('[HomeComponent] loadScreensAndSetDefault 失败:', error);
      this.loading = false;
      this.error = '加载屏幕配置失败';
      this.cdr.markForCheck();
    }
  }

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
    console.log('[HomeComponent] loadScreenConfig 开始', { screenId: screen.id, screenName: screen.name });
    this.screenConfig = screen;
    this.loading = false;
    this.componentCreationRetryCount = 0; // 重置重试计数
    this.error = null;
    this.cdr.markForCheck();

    // 使用改进的组件创建调度
    this.scheduleComponentCreation();

    const screenIndex = this.availableScreens.findIndex(s => s.id === screen.id);
    if (screenIndex !== -1) {
      this.currentScreenIndex = screenIndex;
    }

    console.log('[HomeComponent] loadScreenConfig 完成');
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
      console.log('[HomeComponent] 设置屏幕发布事件监听');
      wsInstance.on('screen:published')
        .pipe(takeUntil(this.destroy$))
        .subscribe((data: any) => {
          console.log('[HomeComponent] 收到屏幕发布事件', { data });
          this.handleNewScreenPublished(data.screen);
        });
    } else {
      console.warn('[HomeComponent] 未找到WebSocket实例，无法设置屏幕发布事件监听');
    }
  }

  private listenToScreenUpdateEvents(): void {
    const wsInstance = this.wsManager.getConnection(environment.wsNamespace);
    if (wsInstance) {
      console.log('[HomeComponent] 设置屏幕更新事件监听');
      wsInstance.on('screen:updated')
        .pipe(takeUntil(this.destroy$))
        .subscribe((data: any) => {
          console.log('[HomeComponent] 收到屏幕更新事件', { data });
          this.handleScreenUpdated(data.screen);
        });
    } else {
      console.warn('[HomeComponent] 未找到WebSocket实例，无法设置屏幕更新事件监听');
    }
  }

  private listenToScreenDeleteEvents(): void {
    const wsInstance = this.wsManager.getConnection(environment.wsNamespace);
    if (wsInstance) {
      console.log('[HomeComponent] 设置屏幕删除事件监听');
      wsInstance.on('screen:unpublished')
        .pipe(takeUntil(this.destroy$))
        .subscribe((data: any) => {
          console.log('[HomeComponent] 收到屏幕删除事件', { data });
          this.handleScreenUnpublished(data.screenId);
        });
    } else {
      console.warn('[HomeComponent] 未找到WebSocket实例，无法设置屏幕删除事件监听');
    }
  }

  private handleNewScreenPublished(screen: ScreenPage): void {
    const existingIndex = this.availableScreens.findIndex(s => s.id === screen.id);
    if (existingIndex === -1) {
      this.availableScreens.push(screen);

      // 检查新发布的屏幕是否是默认屏幕
      if (screen.isDefault) {
        this.currentScreenIndex = this.availableScreens.length - 1;
        // 如果是默认屏幕，立即加载配置
        this.loadScreenConfig(screen);
      }
      this.cdr.markForCheck();
    }
  }

  private handleScreenUpdated(updatedScreen: ScreenPage): void {
    const index = this.availableScreens.findIndex(s => s.id === updatedScreen.id);
    if (index !== -1) {
      this.availableScreens[index] = updatedScreen;

      // 如果更新的屏幕成为默认屏幕，更新当前选中
      if (updatedScreen.isDefault && this.currentScreenIndex !== index) {
        this.currentScreenIndex = index;
        this.loadScreenConfig(updatedScreen);
      } else if (this.screenConfig?.id === updatedScreen.id) {
        // 如果当前显示的屏幕被更新，重新加载配置
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
          // 删除的屏幕是当前显示的屏幕，切换到第一个可用屏幕
          this.currentScreenIndex = 0;
          this.loadScreenConfig(this.availableScreens[0]);
        } else {
          // 没有可用屏幕了
          this.screenConfig = null;
          this.clearComponents();
        }
      } else if (this.currentScreenIndex > index) {
        // 如果删除的屏幕在当前选中屏幕之前，调整索引
        this.currentScreenIndex--;
      }

      this.cdr.markForCheck();
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
