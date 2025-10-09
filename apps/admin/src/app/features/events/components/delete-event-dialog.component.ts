import { Component, Input, Output, EventEmitter, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { Event, EventStatus } from '@pro/sdk';

@Component({
  selector: 'app-delete-event-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'translateY(20px) scale(0.95)'
        }),
        animate('300ms ease-out', style({
          opacity: 1,
          transform: 'translateY(0) scale(1)'
        }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({
          opacity: 0,
          transform: 'translateY(-10px) scale(0.95)'
        }))
      ])
    ])
  ],
  template: `
    <div
      *ngIf="isVisible"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      (click)="onBackdropClick($event)"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-md w-full"
        @slideUp
        (click)="$event.stopPropagation()"
      >
        <!-- 头部 -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900">删除事件</h3>
              <p class="mt-1 text-sm text-gray-500">此操作不可恢复，请谨慎操作</p>
            </div>
          </div>
        </div>

        <!-- 内容 -->
        <div class="p-6 space-y-4">
          <!-- 警告信息 -->
          <div
            [class]="getWarningClass()"
            class="p-4 rounded-lg"
          >
            <div class="flex gap-3">
              <svg class="w-5 h-5 flex-shrink-0" [class]="getWarningIconClass()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <p class="text-sm font-medium" [class]="getWarningTextClass()">
                  {{ warningMessage }}
                </p>
              </div>
            </div>
          </div>

          <!-- 事件信息 -->
          <div *ngIf="event" class="bg-gray-50 rounded-lg p-4 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">事件名称</span>
              <span class="text-sm font-medium text-gray-900">{{ event.eventName }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">状态</span>
              <span
                class="px-2 py-0.5 text-xs font-medium rounded-full"
                [class]="getStatusClass(event.status)"
              >
                {{ getStatusText(event.status) }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">创建时间</span>
              <span class="text-sm text-gray-900">{{ formatDate(event.createdAt) }}</span>
            </div>
          </div>

          <!-- 确认输入 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              请输入事件名称 <span class="text-red-500">{{ event?.eventName }}</span> 以确认删除
            </label>
            <input
              type="text"
              [(ngModel)]="confirmName"
              [placeholder]="'请输入: ' + event?.eventName"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              (keyup.enter)="onConfirm()"
            />
            <p
              *ngIf="confirmName && !isValidName"
              class="mt-1 text-sm text-red-600"
            >
              输入的名称不匹配
            </p>
          </div>

          <!-- 额外提示 -->
          <div class="text-xs text-gray-500 space-y-1">
            <p>删除事件后:</p>
            <ul class="list-disc list-inside pl-2">
              <li>事件的所有附件将被永久删除</li>
              <li>事件的标签关联将被移除</li>
              <li>此操作无法撤销</li>
            </ul>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="p-6 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            (click)="onCancel()"
            [disabled]="isSubmitting"
            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            type="button"
            (click)="onConfirm()"
            [disabled]="!canDelete || isSubmitting"
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {{ isSubmitting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class DeleteEventDialogComponent implements OnInit {
  @Input() event: Event | null = null;
  @Input() isVisible = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  confirmName = '';
  isSubmitting = false;

  ngOnInit(): void {
    this.reset();
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isVisible && !this.isSubmitting) {
      this.cancel.emit();
    }
  }

  get isValidName(): boolean {
    return this.confirmName.trim() === (this.event?.eventName || '');
  }

  get canDelete(): boolean {
    return this.isValidName && !this.isSubmitting;
  }

  get warningMessage(): string {
    if (!this.event) return '此操作不可恢复，请谨慎操作';

    if (this.event.status === EventStatus.PUBLISHED) {
      return '此事件已发布，删除后将无法访问，相关数据也将被清理';
    }

    return '此操作不可恢复，请谨慎操作';
  }

  getWarningClass(): string {
    if (!this.event) return 'bg-yellow-50 border border-yellow-200';

    if (this.event.status === EventStatus.PUBLISHED) {
      return 'bg-red-50 border border-red-200';
    }

    return 'bg-yellow-50 border border-yellow-200';
  }

  getWarningIconClass(): string {
    if (this.event?.status === EventStatus.PUBLISHED) {
      return 'text-red-600';
    }
    return 'text-yellow-600';
  }

  getWarningTextClass(): string {
    if (this.event?.status === EventStatus.PUBLISHED) {
      return 'text-red-800';
    }
    return 'text-yellow-800';
  }

  getStatusClass(status: EventStatus): string {
    switch (status) {
      case EventStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case EventStatus.PUBLISHED:
        return 'bg-green-100 text-green-800';
      case EventStatus.ARCHIVED:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: EventStatus): string {
    switch (status) {
      case EventStatus.DRAFT:
        return '草稿';
      case EventStatus.PUBLISHED:
        return '已发布';
      case EventStatus.ARCHIVED:
        return '已归档';
      default:
        return '未知';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onConfirm(): void {
    if (!this.canDelete || !this.event) return;

    if (this.confirmName.trim() !== this.event.eventName) {
      return;
    }

    this.isSubmitting = true;
    this.confirm.emit();
  }

  onCancel(): void {
    if (this.isSubmitting) return;
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.isSubmitting) {
      this.onCancel();
    }
  }

  reset(): void {
    this.confirmName = '';
    this.isSubmitting = false;
  }
}
