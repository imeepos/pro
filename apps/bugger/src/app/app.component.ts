import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { NotificationContainerComponent } from './components/notifications/notification-container.component';
import { AuthSignalStore } from './state/auth.signal-store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidebarComponent, NotificationContainerComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      @if (showLayout()) {
        <!-- 顶部导航 -->
        <app-header></app-header>

        <div class="flex">
          <!-- 侧边栏 -->
          <app-sidebar></app-sidebar>

          <!-- 主内容区 -->
          <main class="flex-1 p-6">
            <router-outlet></router-outlet>
          </main>
        </div>
      } @else {
        <!-- 仅显示路由内容，不显示菜单栏 -->
        <router-outlet></router-outlet>
      }

      <!-- 通知容器 -->
      <app-notification-container></app-notification-container>
    </div>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'Bug守护者';

  private router = inject(Router);
  private authStore = inject(AuthSignalStore);

  showLayout(): boolean {
    // 未登录时只显示登录页面，不显示菜单栏
    if (!this.authStore.isAuthenticated()) {
      return false;
    }

    // 已登录时，在登录页面也不显示菜单栏
    const currentUrl = this.router.url;
    return !currentUrl.includes('/login');
  }

  ngOnInit(): void {
    // 监听路由变化，触发变更检测
    this.router.events.subscribe(() => {
      // Angular 的变更检测会自动处理 DOM 更新
    });
  }
}