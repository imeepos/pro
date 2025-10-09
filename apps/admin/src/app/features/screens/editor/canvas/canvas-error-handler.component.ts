import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CanvasService } from './services/canvas.service';
import { CanvasQuery } from './services/canvas.query';
import { SaveError } from './services/canvas.store';

@Component({
  selector: 'app-canvas-error-handler',
  template: `
    <div class="canvas-error-handler" *ngIf="showErrorPanel$ | async">
      <!-- 网络状态提示 -->
      <div class="network-status"
           [class.online]="(networkStatus$ | async) === 'online'"
           [class.offline]="(networkStatus$ | async) === 'offline'">
        <mat-icon>{{ (networkStatus$ | async) === 'online' ? 'wifi' : 'wifi_off' }}</mat-icon>
        <span>{{ getNetworkStatusMessage() }}</span>
      </div>

      <!-- 错误提示面板 -->
      <div class="error-panel" *ngIf="(saveError$ | async)">
        <mat-card class="error-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon color="warn">error</mat-icon>
              保存失败
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>{{ getErrorMessage() }}</p>
            <div class="error-details" *ngIf="showDetails">
              <small>
                错误类型: {{ (saveError$ | async)?.type }}<br>
                重试次数: {{ (retryCount$ | async) }}<br>
                时间: {{ formatErrorTime((saveError$ | async)?.timestamp) }}
              </small>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button
                    (click)="toggleDetails()">
              {{ showDetails ? '隐藏详情' : '显示详情' }}
            </button>
            <button mat-raised-button
                    color="primary"
                    (click)="retrySave()"
                    [disabled]="!(canRetry$ | async)">
              <mat-icon>refresh</mat-icon>
              重试
            </button>
            <button mat-button
                    (click)="forceSave()"
                    [disabled]="!(canRetry$ | async)">
              强制保存
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- 重试进度提示 -->
      <div class="retry-progress" *ngIf="isRetrying$ | async">
        <mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner>
        <span>正在重试保存...</span>
      </div>

      <!-- 保存状态指示器 -->
      <div class="save-status" [ngClass]="(saveStatus$ | async)">
        <mat-icon [color]="getStatusIconColor()">
          {{ getStatusIcon() }}
        </mat-icon>
        <span>{{ getStatusMessage() }}</span>
      </div>
    </div>
  `,
  styles: [`
    .canvas-error-handler {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      max-width: 400px;
    }

    .network-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 4px;
      margin-bottom: 8px;
      background: #f5f5f5;
      transition: all 0.3s ease;
    }

    .network-status.online {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .network-status.offline {
      background: #ffebee;
      color: #c62828;
    }

    .error-panel {
      margin-bottom: 8px;
    }

    .error-card {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .error-details {
      margin-top: 12px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      font-family: monospace;
    }

    .retry-progress {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #e3f2fd;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .save-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
    }

    .save-status.saved {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .save-status.saving {
      background: #e3f2fd;
      color: #1565c0;
    }

    .save-status.unsaved {
      background: #fff3e0;
      color: #ef6c00;
    }

    .save-status.error {
      background: #ffebee;
      color: #c62828;
    }

    .save-status.retrying {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    mat-card-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
  `]
})
export class CanvasErrorHandlerComponent implements OnInit, OnDestroy {
  // Observable 状态
  saveStatus$: Observable<string>;
  saveError$: Observable<SaveError | null>;
  retryCount$: Observable<number>;
  networkStatus$: Observable<string>;
  isRetrying$: Observable<boolean>;
  canRetry$: Observable<boolean>;
  showErrorPanel$: Observable<boolean>;

  // 本地状态
  showDetails = false;

  constructor(
    private canvasService: CanvasService,
    private canvasQuery: CanvasQuery
  ) {
    this.saveStatus$ = this.canvasQuery.saveStatus$;
    this.saveError$ = this.canvasQuery.lastSaveError$;
    this.retryCount$ = this.canvasQuery.retryCount$;
    this.networkStatus$ = this.canvasQuery.networkStatus$;
    this.isRetrying$ = this.canvasQuery.isRetrying$;
    this.canRetry$ = this.canvasQuery.canRetry$;
    this.showErrorPanel$ = this.canvasQuery.showSaveError$;
  }

  ngOnInit(): void {
    // 组件初始化逻辑
  }

  ngOnDestroy(): void {
    // 清理逻辑
  }

  // 获取错误消息
  getErrorMessage(): string {
    return this.canvasService.getUserFriendlyErrorMessage();
  }

  // 获取网络状态消息
  getNetworkStatusMessage(): string {
    const status = this.canvasService.getNetworkStatus();
    if (status.isOnline) {
      return '网络连接正常';
    } else {
      return '网络连接已断开';
    }
  }

  // 格式化错误时间
  formatErrorTime(timestamp?: number): string {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString();
  }

  // 切换详情显示
  toggleDetails(): void {
    this.showDetails = !this.showDetails;
  }

  // 重试保存
  retrySave(): void {
    this.canvasService.manualRetrySave();
  }

  // 强制保存
  forceSave(): void {
    if (confirm('强制保存可能会忽略某些错误，确定要继续吗？')) {
      this.canvasService.forceSave();
    }
  }

  // 获取状态图标
  getStatusIcon(): string {
    const status = this.canvasService.getSaveStatus();
    switch (status) {
      case 'saved': return 'check_circle';
      case 'saving': return 'cloud_upload';
      case 'unsaved': return 'edit';
      case 'error': return 'error';
      case 'retrying': return 'refresh';
      default: return 'help';
    }
  }

  // 获取状态图标颜色
  getStatusIconColor(): string {
    const status = this.canvasService.getSaveStatus();
    switch (status) {
      case 'saved': return 'primary';
      case 'saving': return 'accent';
      case 'unsaved': return 'warn';
      case 'error': return 'warn';
      case 'retrying': return 'accent';
      default: return '';
    }
  }

  // 获取状态消息
  getStatusMessage(): string {
    const status = this.canvasService.getSaveStatus();
    switch (status) {
      case 'saved': return '已保存';
      case 'saving': return '保存中...';
      case 'unsaved': return '未保存';
      case 'error': return '保存失败';
      case 'retrying': return '重试中...';
      default: return '未知状态';
    }
  }
}