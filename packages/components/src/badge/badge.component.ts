import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ComponentBase, Color, Size } from '../interfaces/component-base.interface';

@Component({
  selector: 'pro-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="badgeClasses" [attr.aria-label]="ariaLabel">
      <!-- Icon -->
      <span *ngIf="icon" class="flex-shrink-0 mr-1">
        <svg [attr.viewBox]="iconViewBox" fill="none" stroke="currentColor" [class]="iconClasses">
          <path [attr.d]="icon" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
        </svg>
      </span>

      <!-- Badge Content -->
      <ng-container *ngIf="!dot">
        <span *ngIf="count !== undefined && count > 0" class="font-medium">{{ formattedCount }}</span>
        <span *ngIf="!count">{{ label }}</span>
        <ng-content *ngIf="!label && !count"></ng-content>
      </ng-container>

      <!-- Dot Indicator -->
      <span *ngIf="dot" [class]="dotClasses"></span>
    </span>
  `,
  styles: [`
    span {
      transition: all 0.2s ease-in-out;
    }
  `]
})
export class BadgeComponent implements ComponentBase {
  @Input() label = '';
  @Input() count: number | undefined;
  @Input() color: Color = 'primary';
  @Input() size: Size = 'md';
  @Input() variant: 'solid' | 'outline' | 'soft' = 'solid';
  @Input() shape: 'rounded' | 'pill' = 'rounded';
  @Input() dot = false;
  @Input() showZero = false;
  @Input() maxCount = 99;
  @Input() icon = '';
  @Input() ariaLabel = '';

  iconViewBox = '0 0 24 24';

  get badgeClasses(): string {
    const baseClasses = [
      'inline-flex items-center justify-center font-medium',
      'transition-all duration-200'
    ];

    // Size classes
    const sizeClasses = this.dot ? {
      xs: 'w-2 h-2',
      sm: 'w-2.5 h-2.5',
      md: 'w-3 h-3',
      lg: 'w-3.5 h-3.5',
      xl: 'w-4 h-4'
    } : {
      xs: 'px-1.5 py-0.5 text-xs',
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-sm',
      lg: 'px-3 py-1 text-sm',
      xl: 'px-3.5 py-1.5 text-base'
    };

    // Shape classes
    const shapeClasses = {
      rounded: 'rounded-md',
      pill: 'rounded-full'
    };

    // Color classes based on variant
    const colorClasses = {
      primary: {
        solid: this.dot ? 'bg-blue-500' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        outline: 'border border-blue-500 text-blue-600 dark:text-blue-400 bg-transparent',
        soft: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
      },
      secondary: {
        solid: this.dot ? 'bg-gray-500' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        outline: 'border border-gray-500 text-gray-600 dark:text-gray-400 bg-transparent',
        soft: 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300'
      },
      success: {
        solid: this.dot ? 'bg-green-500' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        outline: 'border border-green-500 text-green-600 dark:text-green-400 bg-transparent',
        soft: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
      },
      warning: {
        solid: this.dot ? 'bg-yellow-500' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        outline: 'border border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-transparent',
        soft: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
      },
      error: {
        solid: this.dot ? 'bg-red-500' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        outline: 'border border-red-500 text-red-600 dark:text-red-400 bg-transparent',
        soft: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
      },
      info: {
        solid: this.dot ? 'bg-cyan-500' : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
        outline: 'border border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-transparent',
        soft: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300'
      }
    };

    // Hidden state
    if (this.count !== undefined && this.count === 0 && !this.showZero && !this.dot) {
      return 'hidden';
    }

    return [
      ...baseClasses,
      sizeClasses[this.size],
      shapeClasses[this.shape],
      colorClasses[this.color][this.variant]
    ].join(' ');
  }

  get iconClasses(): string {
    const sizeClasses = {
      xs: 'w-3 h-3',
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-4 h-4',
      xl: 'w-5 h-5'
    };

    return sizeClasses[this.size];
  }

  get dotClasses(): string {
    return 'block rounded-full currentColor';
  }

  get formattedCount(): string {
    if (this.count === undefined) return '';

    if (this.count > this.maxCount) {
      return `${this.maxCount}+`;
    }

    return this.count.toString();
  }
}