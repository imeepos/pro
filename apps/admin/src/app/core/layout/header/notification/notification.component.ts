import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { print } from 'graphql';
import { SubscriptionClient } from '../../../graphql/subscription-client.service';
import { NotificationReceivedSubscription } from '../../../graphql/notifications.documents';
import { TokenStorageService } from '../../../services/token-storage.service';

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
  private unsubscribe?: () => void;

  constructor(
    private readonly subscriptionClient: SubscriptionClient,
    private readonly tokenStorage: TokenStorageService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.subscribeToNotifications();
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
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
    notification.read = true;
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
  }

  trackById(_index: number, notification: Notification): string {
    return notification.id;
  }

  getTimeAgo(timestamp: Date): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  }

  private subscribeToNotifications(): void {
    const client = this.subscriptionClient.getClient();

    this.unsubscribe = client.subscribe(
      { query: print(NotificationReceivedSubscription) },
      {
        next: ({ data }: any) => {
          if (data?.notificationReceived) {
            this.receiveNotification(data.notificationReceived);
          }
        },
        error: (error: any) => {
          if (this.isAuthenticationError(error)) {
            this.handleAuthenticationFailure();
          }
        },
        complete: () => {}
      }
    );
  }

  private receiveNotification(data: any): void {
    this.notifications.unshift({
      id: data.id,
      title: data.title,
      message: data.message,
      timestamp: new Date(data.timestamp),
      read: false
    });

    if (this.notifications.length > 50) {
      this.notifications.length = 50;
    }
  }

  private isAuthenticationError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('unauthorized') ||
           message.includes('unauthenticated') ||
           message.includes('token');
  }

  private handleAuthenticationFailure(): void {
    this.tokenStorage.clearTokens();
    this.router.navigate(['/auth/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-container') && this.isDropdownOpen) {
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
