import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface EmptyStateConfig {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHandler?: () => void;
}

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        class="w-20 h-20 mb-6 rounded-full bg-slate-100 flex items-center justify-center"
        [attr.aria-hidden]="true">
        <span class="text-4xl">{{ config.icon || '📭' }}</span>
      </div>

      <h3 class="text-xl font-semibold text-slate-800 mb-2">
        {{ config.title }}
      </h3>

      <p
        *ngIf="config.description"
        class="text-sm text-slate-500 mb-6 max-w-md">
        {{ config.description }}
      </p>

      <button
        *ngIf="config.actionLabel && config.actionHandler"
        (click)="config.actionHandler()"
        class="px-6 py-3 bg-primary text-white rounded-lg font-medium
               transition-colors hover:bg-primary-600 focus:outline-none
               focus:ring-2 focus:ring-primary focus:ring-offset-2"
        type="button">
        {{ config.actionLabel }}
      </button>
    </div>
  `,
  styles: []
})
export class EmptyStateComponent {
  @Input({ required: true }) config!: EmptyStateConfig;
}
