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
    // 使用标准 Flowbite Alert 样式，添加进入和退出动画
    const baseClasses = 'transition-all duration-300 ease-in-out transform animate-fade-in-up hover:shadow-xl border-l-4';
    const classes: Record<ToastType, string> = {
      success: 'text-green-800 bg-green-50 border-green-500 dark:bg-gray-800 dark:text-green-400 dark:border-green-600',
      error: 'text-red-800 bg-red-50 border-red-500 dark:bg-gray-800 dark:text-red-400 dark:border-red-600',
      warning: 'text-yellow-800 bg-yellow-50 border-yellow-500 dark:bg-gray-800 dark:text-yellow-300 dark:border-yellow-600',
      info: 'text-blue-800 bg-blue-50 border-blue-500 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-600'
    };
    return `${baseClasses} ${classes[this.type]}`;
  }

  get iconContainerClasses(): string {
    // 图标容器样式，增强视觉效果
    const classes: Record<ToastType, string> = {
      success: 'bg-green-100 text-green-500 dark:bg-green-800 dark:text-green-200',
      error: 'bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200',
      warning: 'bg-yellow-100 text-yellow-500 dark:bg-yellow-800 dark:text-yellow-200',
      info: 'bg-blue-100 text-blue-500 dark:bg-blue-800 dark:text-blue-200'
    };
    return classes[this.type];
  }

  get closeButtonClasses(): string {
    // 优化关闭按钮样式，添加悬停效果
    const baseClasses = 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:ring-2 focus:ring-gray-300 rounded-lg dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-gray-600';
    return baseClasses;
  }
}
