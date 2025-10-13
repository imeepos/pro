import { Component, OnInit, OnDestroy, Input, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval, Observable, combineLatest, filter, switchMap } from 'rxjs';
import { IScreenComponent } from '../base/screen-component.interface';
import { WebSocketManager, WebSocketService, ConnectionState, createScreensWebSocketConfig, JwtAuthService } from '../../websocket';
import { SkerSDK, type LoggedInUsersStats, type ITokenStorage } from '@pro/sdk';

export interface WeiboUsersCardConfig {
  mode?: 'edit' | 'display';
  title?: string;
  showTotal?: boolean;
  showTodayNew?: boolean;
  showOnline?: boolean;
  theme?: 'default' | 'blue' | 'green' | 'purple' | 'orange';
  refreshInterval?: number;
  showIcons?: boolean;
  enableAnimation?: boolean;
  showErrorHandling?: boolean;
  showTrends?: boolean;
  showUpdateTime?: boolean;
}

const DEFAULT_CONFIG: WeiboUsersCardConfig = {
  mode: 'display',
  title: '微博已登录用户统计',
  showTotal: true,
  showTodayNew: true,
  showOnline: true,
  theme: 'default',
  refreshInterval: 30000,
  showIcons: true,
  enableAnimation: true,
  showErrorHandling: true,
  showTrends: true,
  showUpdateTime: true
};

const SIMPLE_CONFIG: WeiboUsersCardConfig = {
  mode: 'display',
  title: '微博已登录用户统计',
  showTotal: true,
  showTodayNew: true,
  showOnline: true,
  theme: 'default',
  refreshInterval: 0,
  showIcons: false,
  enableAnimation: false,
  showErrorHandling: false,
  showTrends: false,
  showUpdateTime: false
};

@Component({
  selector: 'pro-weibo-logged-in-users-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="weibo-stats-card h-full rounded-lg shadow-lg transition-all duration-300"
         [ngClass]="getContainerClasses()"
         [class.hover-scale]="isEditMode && config.enableAnimation">

      <!-- 编辑模式 - 丰富功能 -->
      <ng-container *ngIf="isEditMode">
        <!-- 标题区域 -->
        <div class="card-header mb-6 flex items-center justify-between">
          <h3 class="text-xl font-bold m-0 flex items-center gap-2" [ngClass]="getTitleClasses()">
            <span *ngIf="config.showIcons" class="icon-title">📊</span>
            {{ config.title }}
          </h3>
          <div class="status-indicators flex items-center gap-2">
            <div *ngIf="isLoading" class="loading-indicator">
              <span class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
            </div>
            <div class="connection-status" [ngClass]="getConnectionStatusClass()">
              <span class="status-dot w-2 h-2 rounded-full inline-block"></span>
            </div>
          </div>
        </div>

        <!-- 错误状态 -->
        <div *ngIf="config.showErrorHandling && errorMessage" class="error-state text-center py-8">
          <div class="text-red-500 mb-2">⚠️</div>
          <div class="text-red-600 text-sm">{{ errorMessage }}</div>
          <button (click)="retryLoad()" class="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors">
            重试
          </button>
        </div>

        <!-- 统计数据区域 -->
        <div *ngIf="!errorMessage" class="stats-container">
          <div class="stats-grid" [ngClass]="getStatsGridClass()">
            <!-- 总用户数 -->
            <div *ngIf="config.showTotal"
                 class="stat-item group cursor-pointer"
                 [class.animate-in]="config.enableAnimation && stats?.total">
              <div class="stat-icon" *ngIf="config.showIcons">
                <span class="text-2xl">👥</span>
              </div>
              <div class="stat-value" [ngClass]="getValueClass('total')">
                {{ stats?.total || 0 }}
              </div>
              <div class="stat-label">总用户数</div>
              <div class="stat-change text-xs mt-1" *ngIf="config.showTrends && lastStats && stats">
                <span class="text-green-500" *ngIf="stats.total > lastStats.total">
                  ↗ +{{ stats.total - lastStats.total }}
                </span>
                <span class="text-red-500" *ngIf="stats.total < lastStats.total">
                  ↘ {{ stats.total - lastStats.total }}
                </span>
              </div>
            </div>

            <!-- 今日新增 -->
            <div *ngIf="config.showTodayNew"
                 class="stat-item group cursor-pointer"
                 [class.animate-in]="config.enableAnimation && stats?.todayNew">
              <div class="stat-icon" *ngIf="config.showIcons">
                <span class="text-2xl">🆕</span>
              </div>
              <div class="stat-value" [ngClass]="getValueClass('todayNew')">
                {{ stats?.todayNew || 0 }}
              </div>
              <div class="stat-label">今日新增</div>
              <div class="stat-trend text-xs mt-1" *ngIf="config.showTrends">
                <span class="text-green-500">📈 实时更新</span>
              </div>
            </div>

            <!-- 在线用户 -->
            <div *ngIf="config.showOnline"
                 class="stat-item group cursor-pointer"
                 [class.animate-in]="config.enableAnimation && stats?.online">
              <div class="stat-icon" *ngIf="config.showIcons">
                <span class="text-2xl">🟢</span>
              </div>
              <div class="stat-value" [ngClass]="getValueClass('online')">
                {{ stats?.online || 0 }}
              </div>
              <div class="stat-label">在线用户</div>
              <div class="stat-status text-xs mt-1" *ngIf="config.showTrends">
                <span class="text-green-500 animate-pulse">● 实时在线</span>
              </div>
            </div>
          </div>

          <!-- 更新时间 -->
          <div *ngIf="config.showUpdateTime" class="update-time text-xs opacity-60 text-center mt-4">
            最后更新: {{ lastUpdateTime | date:'HH:mm:ss' }}
          </div>
        </div>
      </ng-container>

      <!-- 展示模式 - 简洁设计 -->
      <ng-container *ngIf="!isEditMode">
        <div class="p-6 h-full">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">{{ config.title }}</h3>
          <div class="stats grid grid-cols-3 gap-4 h-full items-center">
            <div class="stat-item text-center">
              <div class="text-3xl font-bold text-blue-600">{{ stats?.total || 0 }}</div>
              <div class="text-sm text-gray-500 mt-1">总用户数</div>
            </div>
            <div class="stat-item text-center">
              <div class="text-3xl font-bold text-green-600">{{ stats?.todayNew || 0 }}</div>
              <div class="text-sm text-gray-500 mt-1">今日新增</div>
            </div>
            <div class="stat-item text-center">
              <div class="text-3xl font-bold text-purple-600">{{ stats?.online || 0 }}</div>
              <div class="text-sm text-gray-500 mt-1">在线用户</div>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .weibo-stats-card {
      position: relative;
      overflow: hidden;
    }

    .hover-scale:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }

    .stats-grid {
      display: grid;
      gap: 1.5rem;
    }

    .stats-grid.cols-1 { grid-template-columns: 1fr; }
    .stats-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
    .stats-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }

    .stat-item {
      text-align: center;
      padding: 1rem;
      border-radius: 0.75rem;
      background: rgba(255,255,255,0.5);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
      transition: all 0.3s ease;
    }

    .stat-item:hover {
      background: rgba(255,255,255,0.7);
      transform: scale(1.02);
    }

    .stat-icon {
      margin-bottom: 0.5rem;
      opacity: 0.8;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 0.5rem;
      transition: all 0.3s ease;
    }

    .stat-label {
      font-size: 0.875rem;
      opacity: 0.7;
      font-weight: 500;
    }

    .animate-in {
      animation: slideInUp 0.5s ease forwards;
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .loading-indicator {
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .error-state {
      min-height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .connection-status .status-dot {
      transition: all 0.3s ease;
    }

    .connection-status.connected .status-dot {
      background-color: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    }

    .connection-status.connecting .status-dot {
      background-color: #f59e0b;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .connection-status.disconnected .status-dot {
      background-color: #ef4444;
    }

    .connection-status.failed .status-dot {
      background-color: #dc2626;
      animation: pulse 1s ease-in-out infinite;
    }

    /* 响应式设计 */
    @media (max-width: 768px) {
      .stats-grid.cols-3 {
        grid-template-columns: 1fr;
      }
      .stats-grid.cols-2 {
        grid-template-columns: 1fr;
      }
      .stat-value {
        font-size: 1.5rem;
      }
    }
  `]
})
export class WeiboLoggedInUsersCardComponent implements OnInit, OnDestroy, IScreenComponent {
  @Input() config: WeiboUsersCardConfig = DEFAULT_CONFIG;

  stats: LoggedInUsersStats | null = null;
  lastStats: LoggedInUsersStats | null = null;
  lastUpdateTime: Date = new Date();
  isLoading = false;
  errorMessage = '';
  connectionState: ConnectionState = ConnectionState.Disconnected;

  private readonly destroy$ = new Subject<void>();
  private readonly refreshTimer$ = new Subject<void>();
  private wsService!: WebSocketService;

  constructor(
    @Optional() private wsManager: WebSocketManager | null,
    @Optional() private sdk: SkerSDK | null,
    @Optional() @Inject('ITokenStorage') private tokenStorage: ITokenStorage | null
  ) {
    console.log('[WeiboLoggedInUsersCardComponent] 构造函数调用 - 可选依赖模式', {
      componentName: 'weibo-logged-in-users-card',
      wsManager: !!this.wsManager,
      sdk: !!this.sdk,
      tokenStorage: !!this.tokenStorage,
      wsManagerType: this.wsManager?.constructor?.name,
      sdkType: this.sdk?.constructor?.name,
      tokenStorageType: this.tokenStorage?.constructor?.name
    });
  }

  ngOnInit(): void {
    console.log('[WeiboLoggedInUsersCardComponent] ngOnInit 开始 - 可选依赖模式', {
      componentId: 'weibo-logged-in-users-card',
      config: this.config,
      hasWsManager: !!this.wsManager,
      hasSdk: !!this.sdk,
      hasTokenStorage: !!this.tokenStorage
    });

    try {
      this.initConfig();
      console.log('[WeiboLoggedInUsersCardComponent] 配置初始化完成', {
        mergedConfig: this.config
      });

      this.validateServicesAndInitialize();
      console.log('[WeiboLoggedInUsersCardComponent] ngOnInit 完成');
    } catch (error) {
      console.error('[WeiboLoggedInUsersCardComponent] ngOnInit 失败', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      this.handleInitializationError(error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.refreshTimer$.next();
    this.refreshTimer$.complete();
  }

  onConfigChange(config: any): void {
    this.config = this.mergeConfig(config);
    this.setupRefreshTimer();
  }

  get isEditMode(): boolean {
    return this.config.mode === 'edit';
  }

  private initConfig(): void {
    this.config = this.mergeConfig(this.config);
  }

  private validateServicesAndInitialize(): void {
    const hasRequiredServices = this.sdk !== null;

    if (!hasRequiredServices) {
      console.warn('[WeiboLoggedInUsersCardComponent] 关键服务不可用，进入降级模式', {
        hasSDK: !!this.sdk,
        hasWSManager: !!this.wsManager,
        hasTokenStorage: !!this.tokenStorage
      });
      this.enterDegradedMode();
      return;
    }

    console.log('[WeiboLoggedInUsersCardComponent] 服务验证通过，启动完整功能', {
      hasSDK: !!this.sdk,
      hasWSManager: !!this.wsManager,
      hasTokenStorage: !!this.tokenStorage
    });

    this.initializeFullFeatures();
  }

  private initializeFullFeatures(): void {
    try {
      this.loadData();
      console.log('[WeiboLoggedInUsersCardComponent] 数据加载启动');

      if (this.wsManager && this.tokenStorage) {
        this.initializeWebSocketConnection();
        console.log('[WeiboLoggedInUsersCardComponent] WebSocket连接初始化');
      } else {
        console.warn('[WeiboLoggedInUsersCardComponent] WebSocket服务不可用，跳过实时连接');
      }

      this.setupRefreshTimer();
      console.log('[WeiboLoggedInUsersCardComponent] 刷新定时器设置完成');
    } catch (error) {
      console.error('[WeiboLoggedInUsersCardComponent] 完整功能初始化失败，降级到基础模式', error);
      this.enterDegradedMode();
    }
  }

  private enterDegradedMode(): void {
    console.log('[WeiboLoggedInUsersCardComponent] 进入降级模式');

    this.setDataError('服务暂时不可用，显示模拟数据');

    this.stats = {
      total: 0,
      todayNew: 0,
      online: 0
    };

    this.lastUpdateTime = new Date();

    if (this.config.refreshInterval && this.config.refreshInterval > 0) {
      this.setupDegradedRefreshTimer();
    }
  }

  private setupDegradedRefreshTimer(): void {
    if (!this.config.refreshInterval || this.config.refreshInterval <= 0) {
      return;
    }

    interval(this.config.refreshInterval).pipe(
      takeUntil(this.destroy$),
      takeUntil(this.refreshTimer$)
    ).subscribe(() => {
      if (this.sdk) {
        console.log('[WeiboLoggedInUsersCardComponent] SDK服务恢复，尝试重新加载数据');
        this.clearErrorState();
        this.loadData();
      } else {
        console.log('[WeiboLoggedInUsersCardComponent] 降级模式定时器触发，SDK仍不可用');
      }
    });
  }

  private handleInitializationError(error: any): void {
    console.error('[WeiboLoggedInUsersCardComponent] 初始化失败，进入错误状态', error);
    this.setDataError('组件初始化失败');
    this.enterDegradedMode();
  }

  private mergeConfig(newConfig?: Partial<WeiboUsersCardConfig>): WeiboUsersCardConfig {
    const baseConfig = this.isEditMode ? DEFAULT_CONFIG : SIMPLE_CONFIG;
    return { ...baseConfig, ...newConfig };
  }

  private loadData(): void {
    console.log('[WeiboLoggedInUsersCardComponent] loadData 开始', {
      isLoading: this.isLoading,
      hasSdk: !!this.sdk,
      sdkWeiboMethod: this.sdk ? typeof this.sdk.weibo?.getLoggedInUsersStats : 'N/A'
    });

    if (this.isLoading) {
      console.warn('[WeiboLoggedInUsersCardComponent] 数据正在加载中，跳过重复请求');
      return;
    }

    if (!this.sdk) {
      console.error('[WeiboLoggedInUsersCardComponent] SDK服务不可用，无法加载数据');
      this.setDataError('数据服务不可用');
      return;
    }

    this.isLoading = true;
    this.clearErrorState();

    console.log('[WeiboLoggedInUsersCardComponent] 调用 SDK API');

    try {
      this.sdk.weibo.getLoggedInUsersStats().pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (stats: LoggedInUsersStats) => {
          console.log('[WeiboLoggedInUsersCardComponent] 数据加载成功', {
            stats,
            statsType: typeof stats
          });
          this.updateStats(stats);
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('[WeiboLoggedInUsersCardComponent] 获取微博用户统计数据失败', {
            error: error instanceof Error ? error.message : error,
            errorType: typeof error,
            stack: error instanceof Error ? error.stack : undefined
          });
          this.setDataError('数据加载失败');
          this.isLoading = false;
        }
      });
    } catch (syncError) {
      console.error('[WeiboLoggedInUsersCardComponent] SDK调用同步错误', {
        error: syncError instanceof Error ? syncError.message : syncError,
        stack: syncError instanceof Error ? syncError.stack : undefined
      });
      this.setDataError('SDK调用失败');
      this.isLoading = false;
    }
  }

  private initializeWebSocketConnection(): void {
    console.log('[WeiboLoggedInUsersCardComponent] WebSocket连接初始化开始');

    if (!this.wsManager || !this.tokenStorage || !this.sdk) {
      console.warn('[WeiboLoggedInUsersCardComponent] WebSocket依赖服务不完整，跳过初始化', {
        hasWsManager: !!this.wsManager,
        hasTokenStorage: !!this.tokenStorage,
        hasSDK: !!this.sdk
      });
      return;
    }

    try {
      const token = this.getToken();
      console.log('[WeiboLoggedInUsersCardComponent] 获取令牌', {
        hasToken: !!token,
        tokenLength: token?.length
      });

      const wsConfig = createScreensWebSocketConfig(this.sdk.baseUrl, token);
      console.log('[WeiboLoggedInUsersCardComponent] WebSocket配置创建', {
        baseUrl: this.sdk.baseUrl,
        hasConfig: !!wsConfig
      });

      this.wsService = this.wsManager.connectToNamespace(wsConfig) as WebSocketService;
      console.log('[WeiboLoggedInUsersCardComponent] WebSocket服务创建', {
        hasWsService: !!this.wsService,
        wsServiceType: this.wsService?.constructor?.name
      });

      this.observeConnectionState();
      console.log('[WeiboLoggedInUsersCardComponent] 连接状态监听设置');

      this.subscribeToDataUpdates();
      console.log('[WeiboLoggedInUsersCardComponent] 数据更新订阅设置');

    } catch (error) {
      console.error('[WeiboLoggedInUsersCardComponent] WebSocket初始化失败', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  private getToken(): string | undefined {
    return this.tokenStorage?.getToken() || undefined;
  }

  private observeConnectionState(): void {
    this.wsService.state$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(state => {
      this.connectionState = state;
      this.handleConnectionStateChange(state);
    });
  }

  private handleConnectionStateChange(state: ConnectionState): void {
    switch (state) {
      case ConnectionState.Connecting:
      case ConnectionState.Reconnecting:
        this.clearErrorState();
        break;
      case ConnectionState.Failed:
        this.setNetworkError('WebSocket连接失败');
        break;
      case ConnectionState.Disconnected:
        if (this.connectionState !== ConnectionState.Disconnected) {
          this.setNetworkError('WebSocket连接已断开');
        }
        break;
    }
  }

  private subscribeToDataUpdates(): void {
    this.wsService.isConnected$.pipe(
      filter(connected => connected),
      switchMap(() => this.wsService.on('weibo:logged-in-users:update')),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (stats) => this.updateStatsFromWebSocket(stats),
      error: (error) => this.handleWebSocketError(error)
    });
  }

  private updateStatsFromWebSocket(newStats: LoggedInUsersStats): void {
    this.clearErrorState();
    this.updateStats(newStats);
  }

  private handleWebSocketError(error: any): void {
    console.error('WebSocket数据更新失败:', error);
    this.setDataError('实时数据更新失败');
  }

  private clearErrorState(): void {
    if (this.errorMessage) {
      this.errorMessage = '';
    }
  }

  private setNetworkError(message: string): void {
    if (this.config.showErrorHandling) {
      this.errorMessage = message;
    }
  }

  private setDataError(message: string): void {
    if (this.config.showErrorHandling) {
      this.errorMessage = message;
    }
  }

  private setupRefreshTimer(): void {
    this.refreshTimer$.next();

    if (!this.config.refreshInterval || this.config.refreshInterval <= 0) {
      return;
    }

    interval(this.config.refreshInterval).pipe(
      takeUntil(this.destroy$),
      takeUntil(this.refreshTimer$)
    ).subscribe(() => {
      this.loadData();
    });
  }

  private updateStats(newStats: LoggedInUsersStats): void {
    if (newStats) {
      this.lastStats = this.stats;
      this.stats = newStats;
      this.lastUpdateTime = new Date();
    }
  }

  retryLoad(): void {
    this.loadData();
  }

  getContainerClasses(): string {
    if (this.isEditMode) {
      return this.getThemeClasses();
    }
    return 'bg-white';
  }

  getThemeClasses(): string {
    const theme = this.config.theme || 'default';
    const baseClasses = 'relative p-6';

    const themeClasses = {
      default: 'bg-gradient-to-br from-white to-gray-50 text-gray-800',
      blue: 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-900',
      green: 'bg-gradient-to-br from-green-50 to-emerald-100 text-green-900',
      purple: 'bg-gradient-to-br from-purple-50 to-pink-100 text-purple-900',
      orange: 'bg-gradient-to-br from-orange-50 to-amber-100 text-orange-900'
    };

    return `${baseClasses} ${themeClasses[theme] || themeClasses.default}`;
  }

  getTitleClasses(): string {
    const theme = this.config.theme || 'default';
    const themeClasses = {
      default: 'text-gray-800',
      blue: 'text-blue-900',
      green: 'text-green-900',
      purple: 'text-purple-900',
      orange: 'text-orange-900'
    };

    return themeClasses[theme] || themeClasses.default;
  }

  getStatsGridClass(): string {
    const visibleFields = [
      this.config.showTotal,
      this.config.showTodayNew,
      this.config.showOnline
    ].filter(Boolean).length;

    return `cols-${visibleFields}`;
  }

  getValueClass(field: keyof LoggedInUsersStats): string {
    const theme = this.config.theme || 'default';
    const baseClass = 'transition-all duration-300';

    const colorClasses = {
      default: {
        total: 'text-blue-600',
        todayNew: 'text-green-600',
        online: 'text-purple-600'
      },
      blue: {
        total: 'text-blue-700',
        todayNew: 'text-cyan-600',
        online: 'text-indigo-600'
      },
      green: {
        total: 'text-green-700',
        todayNew: 'text-emerald-600',
        online: 'text-teal-600'
      },
      purple: {
        total: 'text-purple-700',
        todayNew: 'text-pink-600',
        online: 'text-fuchsia-600'
      },
      orange: {
        total: 'text-orange-700',
        todayNew: 'text-amber-600',
        online: 'text-red-600'
      }
    };

    return `${baseClass} ${colorClasses[theme]?.[field] || colorClasses.default[field]}`;
  }

  getConnectionStatusClass(): string {
    switch (this.connectionState) {
      case ConnectionState.Connected:
        return 'connected';
      case ConnectionState.Connecting:
      case ConnectionState.Reconnecting:
        return 'connecting';
      case ConnectionState.Failed:
        return 'failed';
      case ConnectionState.Disconnected:
      default:
        return 'disconnected';
    }
  }
}