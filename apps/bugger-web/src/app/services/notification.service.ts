import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { BugError } from '@pro/types';

export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = new Subject<Notification>();
  private notificationQueue = new Map<string, Notification>();

  readonly notifications$: Observable<Notification> = this.notifications.asObservable();

  showSuccess(title: string, message: string, duration = 4000): string {
    return this.createNotification({
      type: NotificationType.SUCCESS,
      title,
      message,
      duration
    });
  }

  showError(title: string, message: string, persistent = false): string {
    return this.createNotification({
      type: NotificationType.ERROR,
      title,
      message,
      persistent,
      duration: persistent ? undefined : 6000
    });
  }

  showBugError(bugError: BugError, persistent = false): string {
    const title = this.getBugErrorTitle(bugError);
    const message = bugError.getUserFriendlyMessage();

    return this.createNotification({
      type: NotificationType.ERROR,
      title,
      message,
      persistent: persistent || bugError.type === 'NETWORK_ERROR',
      duration: persistent ? undefined : 6000,
      actions: this.createBugErrorActions(bugError)
    });
  }

  showWarning(title: string, message: string, duration = 5000): string {
    return this.createNotification({
      type: NotificationType.WARNING,
      title,
      message,
      duration
    });
  }

  showInfo(title: string, message: string, duration = 4000): string {
    return this.createNotification({
      type: NotificationType.INFO,
      title,
      message,
      duration
    });
  }

  dismiss(notificationId: string): void {
    const notification = this.notificationQueue.get(notificationId);
    if (notification) {
      this.notificationQueue.delete(notificationId);
      this.notifyDismissed(notificationId);
    }
  }

  dismissAll(): void {
    this.notificationQueue.clear();
    this.notifyDismissAll();
  }

  private createNotification(notification: Omit<Notification, 'id'>): string {
    const id = this.generateId();
    const notificationWithId = { ...notification, id };

    this.notificationQueue.set(id, notificationWithId);
    this.notifications.next(notificationWithId);

    if (notification.duration && !notification.persistent) {
      setTimeout(() => this.dismiss(id), notification.duration);
    }

    return id;
  }

  private getBugErrorTitle(bugError: BugError): string {
    switch (bugError.type) {
      case 'NETWORK_ERROR':
        return '网络连接失败';
      case 'VALIDATION_ERROR':
        return '输入验证失败';
      case 'AUTHENTICATION_ERROR':
        return '身份验证失败';
      case 'AUTHORIZATION_ERROR':
        return '权限不足';
      case 'NOT_FOUND':
        return '资源未找到';
      case 'CONFLICT':
        return '数据冲突';
      case 'SERVER_ERROR':
        return '服务器错误';
      case 'TIMEOUT_ERROR':
        return '请求超时';
      default:
        return '操作失败';
    }
  }

  private createBugErrorActions(bugError: BugError): NotificationAction[] {
    const actions: NotificationAction[] = [];

    if (bugError.type === 'AUTHENTICATION_ERROR') {
      actions.push({
        label: '重新登录',
        action: () => this.handleReauth(),
        primary: true
      });
    }

    if (bugError.type === 'NETWORK_ERROR' || bugError.type === 'TIMEOUT_ERROR') {
      actions.push({
        label: '重试',
        action: () => this.handleRetry(),
        primary: true
      });
    }

    if (bugError.type === 'VALIDATION_ERROR') {
      actions.push({
        label: '查看详情',
        action: () => this.handleValidationError(bugError)
      });
    }

    return actions;
  }

  private handleReauth(): void {
    window.location.href = '/auth/login';
  }

  private handleRetry(): void {
    window.location.reload();
  }

  private handleValidationError(bugError: BugError): void {
    console.warn('Validation error details:', bugError.details);
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifyDismissed(notificationId: string): void {
    // Create a special dismiss signal
    this.notifications.next({
      id: `dismiss-${notificationId}`,
      type: NotificationType.INFO,
      title: '',
      message: '',
      persistent: false
    });
  }

  private notifyDismissAll(): void {
    this.notifications.next({
      id: 'dismiss-all',
      type: NotificationType.INFO,
      title: '',
      message: '',
      persistent: false
    });
  }
}
