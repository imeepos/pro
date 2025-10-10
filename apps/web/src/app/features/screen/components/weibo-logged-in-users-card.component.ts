import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { IScreenComponent } from '../../../shared/interfaces/screen-component.interface';
import { SkerSDK, LoggedInUsersStats } from '@pro/sdk';
import { WebSocketService } from '../../../core/services/websocket.service';

@Component({
  selector: 'app-weibo-logged-in-users-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-card bg-white rounded-lg shadow-lg p-6 h-full">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">微博已登录用户统计</h3>
      <div class="stats grid grid-cols-3 gap-4">
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
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class WeiboLoggedInUsersCardComponent implements OnInit, OnDestroy, IScreenComponent {
  stats: LoggedInUsersStats | null = null;
  config?: any;
  private destroy$ = new Subject<void>();

  private sdk: SkerSDK;

  constructor(
    private wsService: WebSocketService
  ) {
    this.sdk = new SkerSDK('');
  }

  ngOnInit(): void {
    this.sdk.weibo.getLoggedInUsersStats().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('获取微博用户统计数据失败:', error);
      }
    });

    this.wsService.on('weibo:logged-in-users:update').pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('WebSocket 更新失败:', error);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onConfigChange?(config: any): void {
    this.config = config;
  }
}
