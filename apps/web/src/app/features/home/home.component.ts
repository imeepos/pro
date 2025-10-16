import { Component, OnInit, OnDestroy, ViewChild, ViewContainerRef, ComponentRef, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, HostListener, AfterViewInit, EffectRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { WebSocketManager, createScreensWebSocketConfig, JwtAuthService, ComponentRegistryService, IScreenComponent } from '@pro/components';
import { AuthStateService } from '../../core/state/auth-state.service';
import { AuthQuery } from '../../core/state/auth.query';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { ScreenService } from '../../core/services/screen.service';
import { ScreenSignalStore } from '../../core/state/screen.signal-store';
import { ScreenPage, ScreenComponentConfig as ScreenComponent } from '../../core/types/screen.types';
import { ToastService } from '../../shared/services/toast.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { logger } from '../../core/utils/logger';
import { environment } from '../../../environments/environment';
import { ScreenHeaderComponent } from '../screen/components/screen-header/screen-header.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, ScreenHeaderComponent],
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
  private readonly publishedScreensQuery = injectQuery(() => ({
    queryKey: ['screens', 'published'],
    queryFn: () => this.screenService.fetchPublishedScreens(),
    staleTime: 60_000,
    gcTime: 300_000
  }));
  private readonly log = logger.withScope('HomeComponent');
  private readonly defaultScreenQuery = injectQuery(() => ({
    queryKey: ['screens', 'default'],
    queryFn: () => this.screenService.fetchDefaultScreen(),
    staleTime: 60_000,
    gcTime: 300_000,
    retry: 1
  }));
  private hasInitializedScreen = false;
  private hasAnnouncedEmptyState = false;
  private hasReportedListError = false;
  private hasReportedDefaultError = false;
  private manualSelectionId: string | null = null;
  private readonly manualSelectionBridge: EffectRef = effect(() => {
    const manualId = this.screenStore.manualSelectionId();
    if (manualId === this.manualSelectionId) {
      return;
    }

    this.manualSelectionId = manualId;

    if (!manualId) {
      return;
    }

    const screens = this.availableScreensList;
    const index = screens.findIndex(screen => screen.id === manualId);
    if (index === -1) {
      return;
    }

    if (this.currentScreenIndex !== index) {
      this.currentScreenIndex = index;
    }

    const target = screens[index];
    if (!this.screenConfig || this.screenConfig.id !== target.id) {
      this.loadScreenConfig(target);
    }
  });
  get availableScreens(): ScreenPage[] {
    return this.screenStore.screens();
  }

  private get availableScreensList(): ScreenPage[] {
    return this.availableScreens;
  }

  get hasMultipleScreens(): boolean {
    return this.screenStore.hasMultipleScreens();
  }

  constructor(
    private authStateService: AuthStateService,
    private authQuery: AuthQuery,
    private router: Router,
    private screenService: ScreenService,
    private screenStore: ScreenSignalStore,
    private wsManager: WebSocketManager,
    private authService: JwtAuthService,
    private componentRegistry: ComponentRegistryService,
    private cdr: ChangeDetectorRef,
    private tokenStorage: TokenStorageService,
    private toastService: ToastService
  ) {
    this.registerScreenSynchronization();
  }

  private registerScreenSynchronization(): void {
    effect(() => {
      const publishedPending = this.publishedScreensQuery.isPending();
      const publishedError = this.publishedScreensQuery.error();
      const publishedIsError = this.publishedScreensQuery.isError();
      const published = this.publishedScreensQuery.data();

      if (publishedPending) {
        this.loading = true;
        this.error = null;
        this.screenStore.setLoading(true);
        this.screenStore.setError(null);
        this.cdr.markForCheck();
        return;
      }

      if (publishedIsError) {
        this.loading = false;
        this.screenConfig = null;
        this.clearComponents();
        this.screenStore.setScreens([]);
        this.screenStore.setActiveScreen(null);
        this.screenStore.setLoading(false);
        this.updateManualSelection(null);

        if (!this.hasReportedListError) {
          this.toastService.error('加载大屏列表失败，请稍后再试');
          this.hasReportedListError = true;
        }

        this.error = (publishedError as Error | undefined)?.message || '加载屏幕列表失败';
        this.screenStore.setError(this.error);
        this.cdr.markForCheck();
        return;
      }

      this.hasReportedListError = false;

      if (!published || published.items.length === 0) {
        this.loading = false;
        this.screenConfig = null;
        this.clearComponents();
        this.screenStore.setScreens([]);
        this.screenStore.setActiveScreen(null);
        this.screenStore.setLoading(false);
        this.updateManualSelection(null);

        if (!this.hasAnnouncedEmptyState) {
          this.toastService.info('暂无已发布的屏幕，请在管理后台创建并发布');
          this.hasAnnouncedEmptyState = true;
        }

        this.error = '没有可用的屏幕';
        this.screenStore.setError(this.error);
        this.cdr.markForCheck();
        return;
      }

      this.hasAnnouncedEmptyState = false;
      this.screenStore.setScreens([...published.items]);
      const availableScreens = this.availableScreensList;
      let desiredScreen: ScreenPage | null = null;

      if (this.manualSelectionId) {
        desiredScreen = availableScreens.find(screen => screen.id === this.manualSelectionId) ?? null;
        if (!desiredScreen) {
          this.updateManualSelection(null);
        }
      }

      const defaultData = this.defaultScreenQuery.data();
      const defaultIsError = this.defaultScreenQuery.isError();
      const defaultError = this.defaultScreenQuery.error();

      if (defaultIsError && !this.hasReportedDefaultError) {
        this.log.warn('获取默认屏幕失败，使用第一个已发布屏幕', defaultError);
        this.toastService.info('默认屏幕暂不可用，已展示第一个已发布的大屏');
        this.hasReportedDefaultError = true;
      }

      if (!defaultIsError && defaultData) {
        this.hasReportedDefaultError = false;
      }

      if (!desiredScreen && defaultData?.id) {
        desiredScreen = availableScreens.find(screen => screen.id === defaultData.id) ?? null;
      }

      if (!desiredScreen) {
        desiredScreen = availableScreens[this.currentScreenIndex] ?? null;
      }

      if (!desiredScreen) {
        desiredScreen = availableScreens[0] ?? null;
      }

      if (!desiredScreen) {
        return;
      }

      const selectedIndex = availableScreens.findIndex(screen => screen.id === desiredScreen.id);
      if (selectedIndex !== -1) {
        this.currentScreenIndex = selectedIndex;
      }

      if (!this.screenConfig || this.screenConfig.id !== desiredScreen.id) {
        this.loadScreenConfig(desiredScreen);
        this.hasInitializedScreen = true;
      }

      this.loading = false;
      this.error = null;
      this.screenStore.setLoading(false);
      this.screenStore.setError(null);
      this.screenStore.setActiveScreen(desiredScreen);
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.log.info('ngOnInit 开始');

    // 设置防抖监听器
    this.setupResizeDebouncer();

    this.initializeWebSocketConnection();
    this.listenToFullscreenChanges();
    this.setupRealtimeSync();

    this.log.info('ngOnInit 完成');
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    // 使用防抖机制避免频繁重计算
    this.resizeDebouncer$.next();
  }

  ngAfterViewInit(): void {
    this.log.info('ngAfterViewInit - 视图初始化完成');
    this.isViewInitialized = true;
    this.cdr.markForCheck();

    // 如果有待处理的组件创建请求，现在执行
    if (this.pendingComponentCreation && this.screenConfig) {
      this.log.info('ngAfterViewInit - 执行待处理的组件创建');
      this.pendingComponentCreation = false;
      this.scheduleComponentCreation();
    }
  }

  ngOnDestroy(): void {
    this.manualSelectionBridge.destroy();
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
    this.log.info('scheduleComponentCreation 开始', {
      hasScreenConfig: !!this.screenConfig,
      isViewInitialized: this.isViewInitialized,
      hasComponentsContainer: !!this.componentsContainer,
      componentCount: this.screenConfig?.components?.length || 0
    });

    if (!this.screenConfig?.components) {
      this.log.info('没有组件需要创建');
      return;
    }

    if (!this.isViewInitialized || !this.componentsContainer) {
      this.log.info('视图未初始化或容器不可用，标记待处理');
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
    this.log.info('renderComponentsWithRetry 开始', {
      retryCount: this.componentCreationRetryCount,
      maxRetryCount: this.maxRetryCount
    });

    try {
      this.renderComponents();
      this.componentCreationRetryCount = 0; // 成功后重置计数
    } catch (error) {
      this.log.error('renderComponents 失败', error);
      this.componentCreationRetryCount++;

      if (this.componentCreationRetryCount < this.maxRetryCount) {
        this.log.info(`将在 ${1000 * this.componentCreationRetryCount}ms 后重试`);
        setTimeout(() => {
          this.renderComponentsWithRetry();
        }, 1000 * this.componentCreationRetryCount);
      } else {
        this.log.error('组件创建重试次数已达上限，放弃重试');
        this.error = '组件创建失败，请刷新页面重试';
        this.toastService.error('组件渲染失败，请刷新页面重试');
        this.cdr.markForCheck();
      }
    }
  }

  private renderComponents(): void {
    this.log.info('renderComponents 开始', {
      hasScreenConfig: !!this.screenConfig,
      hasComponentsContainer: !!this.componentsContainer,
      componentCount: this.screenConfig?.components?.length || 0
    });

    if (!this.screenConfig?.components || !this.componentsContainer) {
      this.log.warn('renderComponents 条件不满足', {
        hasScreenConfig: !!this.screenConfig,
        hasComponentsContainer: !!this.componentsContainer
      });
      return;
    }

    this.clearComponents();

    const componentConfigs = this.screenConfig.components;
    this.log.info(`准备创建 ${componentConfigs.length} 个组件`);

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
        this.log.error(`创建组件 ${index} 时发生错误`, error);
        failureCount++;
      }
    });

    this.log.info(`组件创建完成: 成功 ${successCount}，失败 ${failureCount}`);

    // 确保DOM更新完成后再计算缩放
    requestAnimationFrame(() => {
      this.calculateScale();
      this.cdr.markForCheck();
    });
  }

  private createComponent(componentConfig: ScreenComponent, index: number): boolean {
    this.log.info(`createComponent 开始`, {
      componentType: componentConfig.type,
      componentIndex: index,
      position: componentConfig.position
    });

    try {
      // 验证容器是否可用
      if (!this.componentsContainer) {
        this.log.error('组件容器不可用');
        return false;
      }

      // 获取组件类型
      const componentType = this.componentRegistry.get(componentConfig.type);
      if (!componentType) {
        this.log.error(`组件类型未注册: ${componentConfig.type}`);
        return false;
      }

      this.log.info(`开始创建组件实例: ${componentConfig.type}`);

      // 创建组件实例
      const componentRef = this.componentsContainer.createComponent(componentType);
      this.log.info(`组件实例创建成功: ${componentConfig.type}`);

      // 设置组件样式和位置
      const wrapper = componentRef.location.nativeElement;
      wrapper.classList.add('component-wrapper');
      wrapper.style.position = 'absolute';
      wrapper.style.left = `${componentConfig.position.x}px`;
      wrapper.style.top = `${componentConfig.position.y}px`;
      wrapper.style.width = `${componentConfig.position.width}px`;
      wrapper.style.height = `${componentConfig.position.height}px`;
      wrapper.style.zIndex = `${componentConfig.position.zIndex}`;

      this.log.info(`组件样式设置完成: ${componentConfig.type}`);

      // 设置组件配置
      const instance = componentRef.instance as IScreenComponent;
      if (instance.onConfigChange && componentConfig.config) {
        try {
          instance.onConfigChange(componentConfig.config);
          this.log.info(`组件配置设置完成: ${componentConfig.type}`);
        } catch (configError) {
          this.log.error(`设置组件配置失败: ${componentConfig.type}`, configError);
          // 配置失败不应该阻止组件显示，继续执行
        }
      }

      // 触发组件的变更检测
      if (componentRef.changeDetectorRef) {
        componentRef.changeDetectorRef.detectChanges();
      }

      this.componentRefs.push(componentRef);
      this.log.info(`组件创建完成: ${componentConfig.type}`);

      return true;

    } catch (error) {
      this.log.error(`创建组件失败: ${componentConfig.type}`, {
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
    this.log.info('WebSocket连接初始化开始');

    const existingConnection = this.wsManager.getConnection(environment.wsNamespace);
    if (existingConnection) {
      this.log.info('WebSocket连接已存在，跳过重复创建');
      return;
    }

    const token = this.tokenStorage.getToken();
    this.log.info('获取认证令牌', { hasToken: !!token, tokenLength: token?.length });

    const wsConfig = createScreensWebSocketConfig(environment.wsUrl, token ?? undefined, {
      autoRefresh: true,
      onTokenExpired: async () => {
        this.log.info('JWT Token 已过期，跳转到登录页');
        this.handleTokenExpired();
        throw new Error('Token expired - redirecting to login');
      }
    });
    this.log.info('创建WebSocket配置', { wsUrl: environment.wsUrl, namespace: environment.wsNamespace });

    const wsInstance = this.wsManager.connectToNamespace(wsConfig);

    // 监听认证错误事件
    wsInstance.on('auth:token-expired')
      .subscribe(() => {
        this.log.info('JWT Token 已过期，跳转到登录页');
        this.handleTokenExpired();
      });

    wsInstance.on('auth:authentication-failed')
      .subscribe((error: any) => {
        this.log.info('认证失败，跳转到登录页', error);
        this.handleTokenExpired();
      });

    this.log.info('WebSocket连接请求已发送');
  }

  private handleTokenExpired(): void {
    // 清除本地存储的认证信息
    this.tokenStorage.clearToken();
    this.authStateService.logout();

    // 跳转到登录页
    this.router.navigate(['/auth/login']);
  }

  private updateManualSelection(id: string | null): void {
    if (this.manualSelectionId === id) {
      return;
    }

    this.manualSelectionId = id;
    this.screenStore.setManualSelection(id);
  }

  // 切换和轮播功能
  switchToScreen(selection: number | Event): void {
    const index = typeof selection === 'number'
      ? selection
      : Number.parseInt((selection.target as HTMLSelectElement).value, 10);

    if (Number.isNaN(index)) {
      return;
    }

    const screens = this.availableScreensList;
    if (index >= 0 && index < screens.length) {
      this.currentScreenIndex = index;
      const screen = screens[index];
      this.updateManualSelection(screen.id);
      this.loadScreenConfig(screen);
      this.screenStore.setActiveScreen(screen);
    }
  }

  nextScreen(): void {
    const screens = this.availableScreensList;
    if (screens.length > 1) {
      this.currentScreenIndex = (this.currentScreenIndex + 1) % screens.length;
      const screen = screens[this.currentScreenIndex];
      this.updateManualSelection(screen.id);
      this.loadScreenConfig(screen);
      this.screenStore.setActiveScreen(screen);
    }
  }

  previousScreen(): void {
    const screens = this.availableScreensList;
    if (screens.length > 1) {
      this.currentScreenIndex = this.currentScreenIndex === 0
        ? screens.length - 1
        : this.currentScreenIndex - 1;
      const screen = screens[this.currentScreenIndex];
      this.updateManualSelection(screen.id);
      this.loadScreenConfig(screen);
      this.screenStore.setActiveScreen(screen);
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
    if (this.availableScreensList.length <= 1) return;

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

  private loadScreenConfig(screen: ScreenPage): void {
    this.log.info('loadScreenConfig 开始', { screenId: screen.id, screenName: screen.name });
    this.updateManualSelection(screen.id);
    this.screenConfig = screen;
    this.loading = false;
    this.componentCreationRetryCount = 0; // 重置重试计数
    this.error = null;
    this.screenStore.setActiveScreen(screen);
    this.screenStore.setLoading(false);
    this.screenStore.setError(null);
    this.cdr.markForCheck();

    // 使用改进的组件创建调度
    this.scheduleComponentCreation();

    const screens = this.availableScreensList;
    const screenIndex = screens.findIndex(s => s.id === screen.id);
    if (screenIndex !== -1) {
      this.currentScreenIndex = screenIndex;
    }

    this.log.info('loadScreenConfig 完成');
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
      this.log.info('设置屏幕发布事件监听');
      wsInstance.on('screen:published')
        .pipe(takeUntil(this.destroy$))
        .subscribe((data: any) => {
          this.log.info('收到屏幕发布事件', { data });
          this.handleNewScreenPublished(data.screen);
        });
    } else {
      this.log.warn('未找到WebSocket实例，无法设置屏幕发布事件监听');
    }
  }

  private listenToScreenUpdateEvents(): void {
    const wsInstance = this.wsManager.getConnection(environment.wsNamespace);
    if (wsInstance) {
      this.log.info('设置屏幕更新事件监听');
      wsInstance.on('screen:updated')
        .pipe(takeUntil(this.destroy$))
        .subscribe((data: any) => {
          this.log.info('收到屏幕更新事件', { data });
          this.handleScreenUpdated(data.screen);
        });
    } else {
      this.log.warn('未找到WebSocket实例，无法设置屏幕更新事件监听');
    }
  }

  private listenToScreenDeleteEvents(): void {
    const wsInstance = this.wsManager.getConnection(environment.wsNamespace);
    if (wsInstance) {
      this.log.info('设置屏幕删除事件监听');
      wsInstance.on('screen:unpublished')
        .pipe(takeUntil(this.destroy$))
        .subscribe((data: any) => {
          this.log.info('收到屏幕删除事件', { data });
          this.handleScreenUnpublished(data.screenId);
        });
    } else {
      this.log.warn('未找到WebSocket实例，无法设置屏幕删除事件监听');
    }
  }

  private handleNewScreenPublished(screen: ScreenPage): void {
    const screens = this.availableScreensList;
    if (!screens.some(existing => existing.id === screen.id)) {
      const updatedScreens = [...screens, screen];
      this.screenStore.setScreens(updatedScreens);

      // 检查新发布的屏幕是否是默认屏幕
      if (screen.isDefault) {
        this.currentScreenIndex = updatedScreens.findIndex(s => s.id === screen.id);
        this.loadScreenConfig(screen);
      }
      this.cdr.markForCheck();
    }
  }

  private handleScreenUpdated(updatedScreen: ScreenPage): void {
    const screens = this.availableScreensList;
    const index = screens.findIndex(s => s.id === updatedScreen.id);
    if (index !== -1) {
      const updatedScreens = [...screens];
      updatedScreens[index] = updatedScreen;
      this.screenStore.setScreens(updatedScreens);

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
    const screens = this.availableScreensList;
    const index = screens.findIndex(s => s.id === screenId);
    if (index !== -1) {
      const updatedScreens = screens.filter(screen => screen.id !== screenId);
      this.screenStore.setScreens(updatedScreens);

      if (this.screenConfig?.id === screenId) {
        if (updatedScreens.length > 0) {
          // 删除的屏幕是当前显示的屏幕，切换到第一个可用屏幕
          this.currentScreenIndex = 0;
          this.loadScreenConfig(updatedScreens[0]);
        } else {
          // 没有可用屏幕了
          this.screenConfig = null;
          this.clearComponents();
          this.screenStore.setActiveScreen(null);
          this.updateManualSelection(null);
        }
      } else if (this.currentScreenIndex > index) {
        // 如果删除的屏幕在当前选中屏幕之前，调整索引
        this.currentScreenIndex--;
      }

      if (this.manualSelectionId === screenId && updatedScreens.length > 0) {
        const fallback = updatedScreens[Math.min(this.currentScreenIndex, updatedScreens.length - 1)];
        this.updateManualSelection(fallback.id);
      } else if (this.manualSelectionId === screenId) {
        this.updateManualSelection(null);
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
        this.log.warn('容器尺寸无效，跳过缩放计算');
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
      this.log.error('缩放计算失败:', error);
      // 设置默认缩放值，确保页面仍可显示
      this.scale = 1;
      this.scaleOffsetX = 0;
      this.scaleOffsetY = 0;
      this.cdr.markForCheck();
    }
  }

  getScaleTransform(): string {
    return `scale(${this.scale})`;
  }

  reloadPage(): void {
    window.location.reload();
  }

  goToAdmin(): void {
    window.open('/admin', '_blank');
  }
}
