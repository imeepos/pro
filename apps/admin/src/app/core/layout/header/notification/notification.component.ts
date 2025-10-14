import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WebSocketManager, createNotificationWebSocketConfig } from '@pro/components';
import { Subscription } from 'rxjs';
import { environment } from '../../../../../environments/environment';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html'
})
export class NotificationComponent implements OnInit, OnDestroy {
  isDropdownOpen = false;
  notifications: Notification[] = [];
  private subscription?: Subscription;

  constructor(
    private wsManager: WebSocketManager,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscribeToNotifications();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  get hasUnread(): boolean {
    return this.unreadCount > 0;
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    console.log('Notification dropdown toggled. New state:', this.isDropdownOpen);
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  markAsRead(notification: Notification): void {
    if (!notification.read) {
      notification.read = true;
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
  }

  trackById(_index: number, notification: Notification): string {
    return notification.id;
  }

  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  }

  private subscribeToNotifications(): void {
    const notificationWs = this.wsManager.getConnection('notifications');

    if (!notificationWs) {
      console.warn('通知WebSocket连接未找到，将创建新连接');
      const token = localStorage.getItem(environment.tokenKey);
      const config = createNotificationWebSocketConfig(environment.wsUrl, token || undefined);
      const ws = this.wsManager.connectToNamespace(config);

      this.subscription = ws.on('notification')
        .subscribe((data: any) => {
          this.handleNotification(data);
        });

      // 监听认证失败事件
      ws.on('auth:token-expired')
        .subscribe(() => {
          console.log('[NotificationComponent] Token 过期，跳转登录页');
          this.handleTokenExpired();
        });

      ws.on('auth:authentication-failed')
        .subscribe((error: any) => {
          console.log('[NotificationComponent] 认证失败，跳转登录页', error);
          this.handleTokenExpired();
        });
    } else {
      this.subscription = notificationWs.on('notification')
        .subscribe((data: any) => {
          this.handleNotification(data);
        });

      // 监听认证失败事件
      notificationWs.on('auth:token-expired')
        .subscribe(() => {
          console.log('[NotificationComponent] Token 过期，跳转登录页');
          this.handleTokenExpired();
        });

      notificationWs.on('auth:authentication-failed')
        .subscribe((error: any) => {
          console.log('[NotificationComponent] 认证失败，跳转登录页', error);
          this.handleTokenExpired();
        });
    }
  }

  private handleNotification(data: any): void {
    const notification: Notification = {
      id: data.id || Date.now().toString(),
      title: data.title || '新通知',
      message: data.message,
      timestamp: new Date(data.timestamp || Date.now()),
      read: false
    };

    this.notifications.unshift(notification);

    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }
  }

  private handleTokenExpired(): void {
    // 清除本地存储的认证信息
    localStorage.removeItem(environment.tokenKey);
    localStorage.removeItem(environment.refreshTokenKey);

    // 跳转到登录页
    this.router.navigate(['/auth/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.notification-container');

    if (!clickedInside && this.isDropdownOpen) {
      this.closeDropdown();
    }
  }

  @HostListener('keydown.escape')
  onEscapePress(): void {
    if (this.isDropdownOpen) {
      this.closeDropdown();
    }
  }
}
