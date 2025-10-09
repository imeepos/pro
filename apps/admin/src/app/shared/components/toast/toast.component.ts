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
    const classes: Record<ToastType, string> = {
      success: 'text-green-900 border-green-400 bg-green-100 dark:bg-gray-800 dark:text-green-400 dark:border-green-800',
      error: 'text-red-900 border-red-400 bg-red-100 dark:bg-gray-800 dark:text-red-400 dark:border-red-800',
      warning: 'text-yellow-900 border-yellow-400 bg-yellow-100 dark:bg-gray-800 dark:text-yellow-300 dark:border-yellow-800',
      info: 'text-blue-900 border-blue-400 bg-blue-100 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-800'
    };
    return classes[this.type];
  }

  get iconClasses(): string {
    const classes: Record<ToastType, string> = {
      success: 'text-green-600 dark:text-green-400',
      error: 'text-red-600 dark:text-red-400',
      warning: 'text-yellow-600 dark:text-yellow-300',
      info: 'text-blue-600 dark:text-blue-400'
    };
    return classes[this.type];
  }

  get closeButtonClasses(): string {
    const classes: Record<ToastType, string> = {
      success: 'bg-green-100 text-green-600 hover:bg-green-200 focus:ring-green-400 dark:bg-gray-800 dark:text-green-400 dark:hover:bg-gray-700',
      error: 'bg-red-100 text-red-600 hover:bg-red-200 focus:ring-red-400 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700',
      warning: 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200 focus:ring-yellow-400 dark:bg-gray-800 dark:text-yellow-300 dark:hover:bg-gray-700',
      info: 'bg-blue-100 text-blue-600 hover:bg-blue-200 focus:ring-blue-400 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700'
    };
    return classes[this.type];
  }
}
