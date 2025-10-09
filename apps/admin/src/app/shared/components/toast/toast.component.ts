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
      success: 'text-green-800 border-green-300 bg-green-50 dark:bg-gray-800 dark:text-green-400 dark:border-green-800',
      error: 'text-red-800 border-red-300 bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-800',
      warning: 'text-yellow-800 border-yellow-300 bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300 dark:border-yellow-800',
      info: 'text-blue-800 border-blue-300 bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-800'
    };
    return classes[this.type];
  }

  get iconClasses(): string {
    const classes: Record<ToastType, string> = {
      success: 'text-green-500 dark:text-green-400',
      error: 'text-red-500 dark:text-red-400',
      warning: 'text-yellow-500 dark:text-yellow-300',
      info: 'text-blue-500 dark:text-blue-400'
    };
    return classes[this.type];
  }

  get closeButtonClasses(): string {
    const classes: Record<ToastType, string> = {
      success: 'bg-green-50 text-green-500 hover:bg-green-200 focus:ring-green-400 dark:bg-gray-800 dark:text-green-400 dark:hover:bg-gray-700',
      error: 'bg-red-50 text-red-500 hover:bg-red-200 focus:ring-red-400 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700',
      warning: 'bg-yellow-50 text-yellow-500 hover:bg-yellow-200 focus:ring-yellow-400 dark:bg-gray-800 dark:text-yellow-300 dark:hover:bg-gray-700',
      info: 'bg-blue-50 text-blue-500 hover:bg-blue-200 focus:ring-blue-400 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700'
    };
    return classes[this.type];
  }
}
