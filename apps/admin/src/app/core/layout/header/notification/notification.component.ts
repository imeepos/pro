import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../../services/websocket.service';
import { Subscription } from 'rxjs';

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

  constructor(private websocketService: WebSocketService) {}

  ngOnInit(): void {
    this.websocketService.connect();
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
    this.subscription = this.websocketService.on('notification')
      .subscribe((data: any) => {
        const notification: Notification = {
          id: data.id || Date.now().toString(),
          title: data.title || '新通知',
          message: data.message,
          timestamp: new Date(data.timestamp || Date.now()),
          read: false
        };

        // Add new notification to the beginning
        this.notifications.unshift(notification);

        // Keep only the latest 50 notifications
        if (this.notifications.length > 50) {
          this.notifications = this.notifications.slice(0, 50);
        }
      });
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
