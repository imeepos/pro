import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthSignalStore } from '../../state/auth.signal-store';
import { AuthStateService } from '../../state/auth-state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo和标题 -->
          <div class="flex items-center">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 7a2 2 0 11-4 0 2 2 0 014 0zm8 8a6 6 0 01-12 0h12z"/>
                </svg>
              </div>
              <h1 class="text-xl font-bold text-gray-900 cursor-pointer" (click)="navigateTo('/')">Bug守护者</h1>
            </div>
          </div>

          <!-- 用户信息 -->
          <div class="flex items-center space-x-4">
            @if (isAuthenticated()) {
              <!-- 信息中心 -->
              <div class="relative">
                <button
                  (click)="toggleNotifications()"
                  class="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                  <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                @if (showNotifications()) {
                  <div class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div class="p-4 border-b border-gray-200">
                      <h3 class="text-sm font-semibold text-gray-900">通知中心</h3>
                    </div>
                    <div class="p-4 text-sm text-gray-600 text-center">
                      暂无新通知
                    </div>
                  </div>
                }
              </div>

              <!-- 用户下拉菜单 -->
              <div class="relative">
                <button
                  (click)="toggleUserMenu()"
                  class="flex items-center space-x-3 focus:outline-none"
                >
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                  <span class="text-sm font-medium text-gray-700">{{ user()?.username || '用户' }}</span>
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>

                @if (showUserMenu()) {
                  <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div class="py-1">
                      <button
                        (click)="navigateTo('/profile')"
                        class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        个人资料
                      </button>
                      <button
                        (click)="navigateTo('/settings')"
                        class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        设置
                      </button>
                      <div class="border-t border-gray-200"></div>
                      <button
                        (click)="onLogout()"
                        class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        退出登录
                      </button>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <button
                (click)="navigateTo('/login')"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                登录
              </button>
            }
          </div>
        </div>
      </div>
    </header>
  `,
  styles: []
})
export class HeaderComponent {
  private router = inject(Router);
  private authStore = inject(AuthSignalStore);
  private authStateService = inject(AuthStateService);

  isAuthenticated = this.authStore.isAuthenticated;
  user = this.authStore.user;

  showNotifications = signal(false);
  showUserMenu = signal(false);

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
    this.showUserMenu.set(false);
  }

  toggleUserMenu(): void {
    this.showUserMenu.update(v => !v);
    this.showNotifications.set(false);
  }

  navigateTo(path: string): void {
    this.showNotifications.set(false);
    this.showUserMenu.set(false);
    this.router.navigate([path]);
  }

  onLogout(): void {
    this.showUserMenu.set(false);
    this.authStateService.logout().subscribe();
  }
}