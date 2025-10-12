import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SkerSDK, ScreenPage } from '@pro/sdk';

@Component({
  selector: 'app-screen-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
      <!-- 导航栏 -->
      <nav class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center">
              <h1 class="text-xl font-semibold text-gray-900 dark:text-white">大屏展示管理</h1>
            </div>
            <div class="flex items-center space-x-4">
              <button
                (click)="refreshList()"
                class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600">
                <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                刷新
              </button>
              <a
                [routerLink]="['/api-keys']"
                class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600">
                API管理
              </a>
            </div>
          </div>
        </div>
      </nav>

      <!-- 主要内容 -->
      <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <!-- 统计卡片 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">总页面数</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ publishedScreens.length }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">可展示页面</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{{ publishedScreens.length }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">当前展示</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">
                      {{ currentScreen ? currentScreen.name : '未选择' }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 错误提示 -->
        <div *ngIf="error" class="mb-6 p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
          {{ error }}
        </div>

        <!-- 加载状态 -->
        <div *ngIf="loading" class="flex justify-center items-center py-12">
          <div class="flex space-x-2">
            <div class="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
            <div class="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
        </div>

        <!-- 页面列表 -->
        <div *ngIf="!loading && publishedScreens.length > 0" class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
          <ul class="divide-y divide-gray-200 dark:divide-gray-700">
            <li *ngFor="let screen of publishedScreens" class="hover:bg-gray-50 dark:hover:bg-gray-700">
              <div class="px-4 py-4 flex items-center justify-between">
                <div class="flex items-center min-w-0 flex-1">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ screen.name }}
                      </p>
                      <span *ngIf="screen.isDefault"
                            class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        默认
                      </span>
                      <span *ngIf="currentScreen?.id === screen.id"
                            class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        当前展示
                      </span>
                    </div>
                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {{ screen.description || '暂无描述' }}
                    </p>
                    <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      尺寸: {{ screen.layout.width }}x{{ screen.layout.height }} |
                      组件数: {{ screen.components.length }} |
                      更新时间: {{ formatDate(screen.updatedAt) }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    (click)="displayScreen(screen)"
                    class="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    展示
                  </button>
                  <button
                    (click)="previewScreen(screen)"
                    class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600">
                    <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    新窗口预览
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- 空状态 -->
        <div *ngIf="!loading && publishedScreens.length === 0" class="text-center py-12">
          <svg class="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">暂无已发布的大屏页面</h3>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">请在管理端发布页面后，再来查看和展示</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ScreenListComponent implements OnInit, OnDestroy {
  publishedScreens: ScreenPage[] = [];
  currentScreen: ScreenPage | null = null;
  loading = true;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private sdk: SkerSDK,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPublishedScreens();
    this.loadCurrentScreen();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPublishedScreens(): void {
    this.loading = true;
    this.error = null;

    this.sdk.screen.getPublishedScreens$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.publishedScreens = response.items;
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || '加载已发布页面失败';
          this.loading = false;
          console.error('Failed to load published screens:', err);
        }
      });
  }

  private loadCurrentScreen(): void {
    // 从 localStorage 获取当前展示的屏幕
    const currentScreenId = localStorage.getItem('currentScreenId');
    if (currentScreenId) {
      this.sdk.screen.getScreen$(currentScreenId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (screen) => {
            this.currentScreen = screen;
          },
          error: (err) => {
            console.error('Failed to load current screen:', err);
            // 清除无效的 ID
            localStorage.removeItem('currentScreenId');
          }
        });
    }
  }

  refreshList(): void {
    this.loadPublishedScreens();
  }

  displayScreen(screen: ScreenPage): void {
    // 保存当前选择的屏幕 ID
    localStorage.setItem('currentScreenId', screen.id);
    this.currentScreen = screen;

    // 导航到屏幕展示页面
    this.router.navigate(['/screen', screen.id]);
  }

  previewScreen(screen: ScreenPage): void {
    // 在新窗口打开预览
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/screen', screen.id])
    );
    window.open(url, '_blank');
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}