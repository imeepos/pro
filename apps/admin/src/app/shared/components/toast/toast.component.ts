import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

type ToastType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html'
})
export class ToastComponent implements OnInit, OnDestroy {
  @Input() type: ToastType = 'info';
  @Input() message: string = '';
  @Input() duration: number = 3000;
  @Output() closed = new EventEmitter<void>();

  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  close(): void {
    this.clearTimer();
    this.closed.emit();
  }

  private startTimer(): void {
    this.timer = setTimeout(() => this.close(), this.duration);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  get alertClasses(): string {
    // 使用标准 Flowbite Alert 类
    const baseClasses = 'transition-all duration-300 ease-in-out transform';
    const classes: Record<ToastType, string> = {
      success: 'text-green-800 bg-green-50 border-green-200 dark:bg-gray-800 dark:text-green-400 dark:border-green-600',
      error: 'text-red-800 bg-red-50 border-red-200 dark:bg-gray-800 dark:text-red-400 dark:border-red-600',
      warning: 'text-yellow-800 bg-yellow-50 border-yellow-200 dark:bg-gray-800 dark:text-yellow-300 dark:border-yellow-600',
      info: 'text-blue-800 bg-blue-50 border-blue-200 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-600'
    };
    return `${baseClasses} ${classes[this.type]}`;
  }

  get iconClasses(): string {
    // 标准化图标颜色，增强对比度
    const classes: Record<ToastType, string> = {
      success: 'text-green-500 dark:text-green-400',
      error: 'text-red-500 dark:text-red-400',
      warning: 'text-yellow-500 dark:text-yellow-400',
      info: 'text-blue-500 dark:text-blue-400'
    };
    return classes[this.type];
  }

  get closeButtonClasses(): string {
    // 简化关闭按钮样式
    const baseClasses = 'inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-offset-2';
    const classes: Record<ToastType, string> = {
      success: 'text-green-500 hover:bg-green-200 focus:ring-green-400 dark:text-green-400 dark:hover:bg-gray-700',
      error: 'text-red-500 hover:bg-red-200 focus:ring-red-400 dark:text-red-400 dark:hover:bg-gray-700',
      warning: 'text-yellow-500 hover:bg-yellow-200 focus:ring-yellow-400 dark:text-yellow-400 dark:hover:bg-gray-700',
      info: 'text-blue-500 hover:bg-blue-200 focus:ring-blue-400 dark:text-blue-400 dark:hover:bg-gray-700'
    };
    return `${baseClasses} ${classes[this.type]}`;
  }

  get iconPath(): string {
    // 为不同类型使用合适的图标路径
    const paths: Record<ToastType, string> = {
      success: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
      error: 'M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm0 16a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm1-5a1 1 0 1 1-2 0V6a1 1 0 1 1 2 0v5.5Z',
      warning: 'M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM10 16a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm1-5a1 1 0 1 1-2 0V6a1 1 0 1 1 2 0v5Z',
      info: 'M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z'
    };
    return paths[this.type];
  }
}
