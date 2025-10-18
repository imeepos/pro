import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BugStatus } from '@pro/types';

export interface StatusChangeData {
  newStatus: BugStatus;
  comment?: string;
}

@Component({
  selector: 'app-status-change-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 overflow-y-auto" *ngIf="isVisible">
      <!-- 背景遮罩 -->
      <div
        class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        (click)="cancelStatusChange()"></div>

      <!-- 弹框容器 -->
      <div class="flex min-h-full items-center justify-center p-4">
        <div
          class="relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all"
          [ngClass]="{'scale-95 opacity-0': !isAnimated, 'scale-100 opacity-100': isAnimated}">

          <!-- 弹框头部 -->
          <div class="border-b border-gray-200 px-6 py-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900">更改 Bug 状态</h3>
              <button
                (click)="cancelStatusChange()"
                [disabled]="isLoading"
                class="text-gray-400 hover:text-gray-500 transition-colors disabled:opacity-50">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- 弹框内容 -->
          <div class="px-6 py-4">
            <!-- 状态变更信息 -->
            <div class="mb-4">
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="text-sm">
                  <span class="text-gray-600">当前状态：</span>
                  <span
                    [class]="'ml-2 px-2 py-1 text-xs font-medium rounded-full ' + getCurrentStatusClass()"
                    class="inline-block">
                    {{ getCurrentStatusText() }}
                  </span>
                </div>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
                <div class="text-sm">
                  <span class="text-gray-600">目标状态：</span>
                  <span
                    [class]="'ml-2 px-2 py-1 text-xs font-medium rounded-full ' + getNewStatusClass()"
                    class="inline-block">
                    {{ getNewStatusText() }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 变更说明输入框 -->
            <div class="mb-4">
              <label for="status-comment" class="block text-sm font-medium text-gray-700 mb-2">
                变更说明 <span class="text-gray-400">(可选)</span>
              </label>
              <textarea
                id="status-comment"
                [(ngModel)]="comment"
                rows="3"
                placeholder="请说明状态变更的原因..."
                [disabled]="isLoading"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-vertical"></textarea>
              <p class="mt-1 text-xs text-gray-500">
                {{ comment.length || 0 }}/500 字符
              </p>
            </div>

            <!-- 错误提示 -->
            <div *ngIf="errorMessage" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div class="flex">
                <svg class="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <p class="text-sm text-red-800">{{ errorMessage }}</p>
              </div>
            </div>
          </div>

          <!-- 弹框底部按钮 -->
          <div class="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                (click)="cancelStatusChange()"
                [disabled]="isLoading"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                取消
              </button>
              <button
                type="button"
                (click)="confirmStatusChange()"
                [disabled]="isLoading || isCommentTooLong()"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                <span *ngIf="!isLoading">确认更改</span>
                <span *ngIf="isLoading" class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  更改中...
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .resize-vertical {
      resize: vertical;
      min-height: 80px;
      max-height: 200px;
    }

    @keyframes modal-appear {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .transform.transition-all {
      animation: modal-appear 0.2s ease-out;
    }
  `]
})
export class StatusChangeDialogComponent implements OnInit, OnDestroy {
  @Input() currentStatus: BugStatus | null = null;
  @Input() newStatus: BugStatus | null = null;
  @Input() isVisible = false;
  @Input() isLoading = false;
  @Input() errorMessage = '';

  @Output() statusConfirm = new EventEmitter<StatusChangeData>();
  @Output() statusCancel = new EventEmitter<void>();

  comment = '';
  private maxCommentLength = 500;
  private escapeKeyListener: any;

  BugStatus = BugStatus;

  ngOnInit(): void {
    this.escapeKeyListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.isVisible && !this.isLoading) {
        this.statusCancel.emit();
      }
    };
    document.addEventListener('keydown', this.escapeKeyListener);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.escapeKeyListener);
  }

  onVisibilityChange(): void {
    if (this.isVisible) {
      this.isAnimated = true;
      this.comment = '';
      this.errorMessage = '';
    } else {
      this.isAnimated = false;
    }
  }

  confirmStatusChange(): void {
    if (this.isCommentTooLong()) {
      return;
    }

    const data: StatusChangeData = {
      newStatus: this.newStatus!,
      comment: this.comment.trim() || undefined
    };
    this.statusConfirm.emit(data);
  }

  cancelStatusChange(): void {
    if (!this.isLoading) {
      this.statusCancel.emit();
    }
  }

  isCommentTooLong(): boolean {
    return (this.comment?.length || 0) > this.maxCommentLength;
  }

  getCurrentStatusClass(): string {
    return this.getStatusClass(this.currentStatus);
  }

  getNewStatusClass(): string {
    return this.getStatusClass(this.newStatus);
  }

  getCurrentStatusText(): string {
    return this.getStatusText(this.currentStatus);
  }

  getNewStatusText(): string {
    return this.getStatusText(this.newStatus);
  }

  private getStatusClass(status: BugStatus | null): string {
    const classes = {
      [BugStatus.OPEN]: 'bg-blue-100 text-blue-800',
      [BugStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
      [BugStatus.RESOLVED]: 'bg-green-100 text-green-800',
      [BugStatus.CLOSED]: 'bg-gray-100 text-gray-800',
      [BugStatus.REJECTED]: 'bg-red-100 text-red-800',
      [BugStatus.REOPENED]: 'bg-purple-100 text-purple-800',
    };
    return classes[status!] || 'bg-gray-100 text-gray-800';
  }

  private getStatusText(status: BugStatus | null): string {
    const texts = {
      [BugStatus.OPEN]: '待处理',
      [BugStatus.IN_PROGRESS]: '进行中',
      [BugStatus.RESOLVED]: '已解决',
      [BugStatus.CLOSED]: '已关闭',
      [BugStatus.REJECTED]: '已拒绝',
      [BugStatus.REOPENED]: '已重新打开',
    };
    return texts[status!] || status || '';
  }

  isAnimated = false;
}