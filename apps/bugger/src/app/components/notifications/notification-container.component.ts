import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import {
  NotificationService,
  Notification,
  NotificationType,
  NotificationAction,
} from '../../services/notification.service';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      <div
        *ngFor="let notification of notifications"
        [ngClass]="getNotificationClasses(notification.type)"
        class="p-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out animate-slide-in"
        role="alert">

        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg [ngClass]="getIconClasses(notification.type)" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path *ngIf="notification.type === NotificationType.SUCCESS" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
              <path *ngIf="notification.type === NotificationType.ERROR" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
              <path *ngIf="notification.type === NotificationType.WARNING" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
              <path *ngIf="notification.type === NotificationType.INFO" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
            </svg>
          </div>

          <div class="ml-3 flex-1">
            <h3 class="text-sm font-medium" [ngClass]="getTitleClasses(notification.type)">
              {{ notification.title }}
            </h3>
            <p class="mt-1 text-sm" [ngClass]="getMessageClasses(notification.type)">
              {{ notification.message }}
            </p>

            <div *ngIf="notification.actions && notification.actions.length > 0" class="mt-3 flex space-x-2">
              <button
                *ngFor="let action of notification.actions"
                (click)="executeAction(action, notification)"
                [ngClass]="action.primary ? 'btn-primary' : 'btn-secondary'"
                class="text-xs px-3 py-1 rounded">
                {{ action.label }}
              </button>
            </div>
          </div>

          <div class="ml-4 flex-shrink-0">
            <button
              (click)="dismiss(notification.id)"
              class="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition ease-in-out duration-150">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .animate-slide-in {
      animation: slide-in 0.3s ease-out;
    }

    .notification-success {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }

    .notification-error {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .notification-warning {
      background-color: #fffbeb;
      border: 1px solid #fed7aa;
      color: #92400e;
    }

    .notification-info {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    }

    .icon-success {
      color: #16a34a;
    }

    .icon-error {
      color: #dc2626;
    }

    .icon-warning {
      color: #ea580c;
    }

    .icon-info {
      color: #2563eb;
    }

    .title-success {
      color: #166534;
    }

    .title-error {
      color: #991b1b;
    }

    .title-warning {
      color: #92400e;
    }

    .title-info {
      color: #1e40af;
    }

    .message-success {
      color: #15803d;
    }

    .message-error {
      color: #b91c1c;
    }

    .message-warning {
      color: #a16207;
    }

    .message-info {
      color: #1d4ed8;
    }

    .btn-primary {
      background-color: #3b82f6;
      color: white;
      border: 1px solid #2563eb;
    }

    .btn-primary:hover {
      background-color: #2563eb;
    }

    .btn-secondary {
      background-color: transparent;
      color: #6b7280;
      border: 1px solid #d1d5db;
    }

    .btn-secondary:hover {
      background-color: #f9fafb;
      color: #374151;
    }
  `]
})
export class NotificationContainerComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription: Subscription = new Subscription();
  NotificationType = NotificationType;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscription = this.notificationService.notifications$.subscribe(notification => {
      if (notification.id === 'dismiss-all') {
        this.notifications = [];
      } else if (notification.id.startsWith('dismiss-')) {
        const actualId = notification.id.replace('dismiss-', '');
        if (actualId) {
          this.dismiss(actualId);
        }
      } else if (notification.title === '' && notification.message === '') {
        if (notification.id) {
          this.dismiss(notification.id);
        }
      } else {
        const existingIndex = this.notifications.findIndex(n => n.id === notification.id);
        if (existingIndex >= 0) {
          this.notifications[existingIndex] = notification;
        } else {
          this.notifications.unshift(notification);
          if (this.notifications.length > 5) {
            this.notifications = this.notifications.slice(0, 5);
          }
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  dismiss(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    if (notificationId) {
      this.notificationService.dismiss(notificationId);
    }
  }

  executeAction(action: NotificationAction, notification: Notification): void {
    action.action();
    if (!notification.persistent) {
      this.dismiss(notification.id);
    }
  }

  getNotificationClasses(type: NotificationType): string {
    const baseClasses = 'border-l-4 p-4';
    const typeClasses = {
      [NotificationType.SUCCESS]: 'notification-success border-green-400',
      [NotificationType.ERROR]: 'notification-error border-red-400',
      [NotificationType.WARNING]: 'notification-warning border-yellow-400',
      [NotificationType.INFO]: 'notification-info border-blue-400'
    };
    return `${baseClasses} ${typeClasses[type]}`;
  }

  getIconClasses(type: NotificationType): string {
    const iconClasses = {
      [NotificationType.SUCCESS]: 'icon-success',
      [NotificationType.ERROR]: 'icon-error',
      [NotificationType.WARNING]: 'icon-warning',
      [NotificationType.INFO]: 'icon-info'
    };
    return iconClasses[type];
  }

  getTitleClasses(type: NotificationType): string {
    const titleClasses = {
      [NotificationType.SUCCESS]: 'title-success',
      [NotificationType.ERROR]: 'title-error',
      [NotificationType.WARNING]: 'title-warning',
      [NotificationType.INFO]: 'title-info'
    };
    return titleClasses[type];
  }

  getMessageClasses(type: NotificationType): string {
    const messageClasses = {
      [NotificationType.SUCCESS]: 'message-success',
      [NotificationType.ERROR]: 'message-error',
      [NotificationType.WARNING]: 'message-warning',
      [NotificationType.INFO]: 'message-info'
    };
    return messageClasses[type];
  }
}
