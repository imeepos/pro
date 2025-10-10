import { Component, OnInit, OnDestroy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval, Observable } from 'rxjs';
import { IScreenComponent } from '../base/screen-component.interface';
import { WebSocketService } from '../services/websocket.service';

// 临时类型定义，避免直接依赖@pro/sdk
export interface LoggedInUsersStats {
  total: number;
  todayNew: number;
  online: number;
}

export interface SkerSDK {
  weibo: {
    getLoggedInUsersStats: () => any;
  };
}

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
          <div *ngIf="isLoading" class="loading-indicator">
            <span class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
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
  private destroy$ = new Subject<void>();
  private refreshTimer$ = new Subject<void>();

  private sdk: any;

  constructor(
    private wsService: WebSocketService
  ) {
    // 创建一个模拟实例，实际使用时应该由应用通过配置提供真实的SDK
    this.sdk = {
      weibo: {
        getLoggedInUsersStats: () => {
          // 模拟数据，实际使用时应该由应用提供真实的SDK
          return new Observable(observer => {
            observer.next({
              total: 0,
              todayNew: 0,
              online: 0
            });
            observer.complete();
          });
        }
      }
    };
  }

  // 提供一个方法让应用可以设置真实的SDK
  setSDK(sdk: any): void {
    this.sdk = sdk;
  }

  ngOnInit(): void {
    this.initConfig();
    this.loadData();
    this.setupWebSocket();
    this.setupRefreshTimer();
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

  private mergeConfig(newConfig?: Partial<WeiboUsersCardConfig>): WeiboUsersCardConfig {
    const baseConfig = this.isEditMode ? DEFAULT_CONFIG : SIMPLE_CONFIG;
    return { ...baseConfig, ...newConfig };
  }

  private loadData(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.sdk.weibo.getLoggedInUsersStats().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (stats) => {
        this.updateStats(stats);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('获取微博用户统计数据失败:', error);
        if (this.config.showErrorHandling) {
          this.errorMessage = '数据加载失败';
        }
        this.isLoading = false;
      }
    });
  }

  private setupWebSocket(): void {
    this.wsService.on('weibo:logged-in-users:update').pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (stats) => {
        this.updateStats(stats);
      },
      error: (error) => {
        console.error('WebSocket 更新失败:', error);
      }
    });
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
}