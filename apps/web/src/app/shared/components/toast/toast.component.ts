import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed top-4 right-4 z-[9999] flex flex-col gap-3"
      role="region"
      aria-label="通知消息"
      aria-live="polite">
      <div
        *ngFor="let toast of toasts$ | async"
        @slideIn
        [attr.role]="toast.type === 'error' ? 'alert' : 'status'"
        [attr.aria-live]="toast.type === 'error' ? 'assertive' : 'polite'"
        class="relative flex items-center gap-3 px-5 py-4 rounded-lg shadow-lg
               backdrop-blur-sm min-w-[320px] max-w-md border"
        [ngClass]="getToastClasses(toast.type)">
        <span class="text-2xl flex-shrink-0" [attr.aria-hidden]="true">
          {{ getIcon(toast.type) }}
        </span>
        <p class="flex-1 text-sm font-medium">{{ toast.message }}</p>
        <button
          (click)="close(toast.id)"
          class="flex-shrink-0 w-6 h-6 rounded-full transition-colors
                 hover:bg-black/10 focus:outline-none focus:ring-2
                 focus:ring-offset-2 focus:ring-current"
          [attr.aria-label]="'关闭' + toast.message"
          type="button">
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  `,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ],
  styles: []
})
export class ToastContainerComponent {
  toasts$ = this.toastService.toasts$;

  constructor(private toastService: ToastService) {}

  getToastClasses(type: string): string {
    const baseClasses = 'text-white';
    const typeClasses: Record<string, string> = {
      success: 'bg-green-500 border-green-600',
      error: 'bg-red-500 border-red-600',
      warning: 'bg-yellow-500 border-yellow-600',
      info: 'bg-blue-500 border-blue-600'
    };
    return `${baseClasses} ${typeClasses[type] || typeClasses['info']}`;
  }

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons['info'];
  }

  close(id: string): void {
    this.toastService.remove(id);
  }
}
