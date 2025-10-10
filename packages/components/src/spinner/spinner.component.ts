import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ComponentBase, Color, Size } from '../interfaces/component-base.interface';

@Component({
  selector: 'pro-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="containerClasses" [attr.aria-label]="ariaLabel || 'Loading...'">
      <!-- Circular Spinner -->
      <div *ngIf="type === 'circular'" [class]="spinnerClasses">
        <svg [class]="svgClasses" fill="none" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>

      <!-- Dots Spinner -->
      <div *ngIf="type === 'dots'" [class]="dotsContainerClasses">
        <div
          *ngFor="let dot of [].constructor(dotCount)"
          [class]="dotClasses"
          [style.animation-delay]="'.' + $index + 's'"
        ></div>
      </div>

      <!-- Pulse Spinner -->
      <div *ngIf="type === 'pulse'" [class]="pulseClasses">
        <div class="w-full h-full bg-current rounded-full opacity-75"></div>
      </div>

      <!-- Bars Spinner -->
      <div *ngIf="type === 'bars'" [class]="barsContainerClasses">
        <div
          *ngFor="let bar of [].constructor(barCount)"
          [class]="barClasses"
          [style.animation-delay]="'.' + $index + 's'"
        ></div>
      </div>

      <!-- Overlay Text -->
      <div *ngIf="text" class="mt-2">
        <span [class]="textClasses">{{ text }}</span>
      </div>
    </div>
  `,
  styles: [`
    /* Circular Spinner Animation */
    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    /* Dots Animation */
    @keyframes bounce {
      0%, 80%, 100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1);
      }
    }

    /* Pulse Animation */
    @keyframes pulse {
      0% {
        transform: scale(0);
        opacity: 1;
      }
      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }

    /* Bars Animation */
    @keyframes scale {
      0%, 100% {
        transform: scaleY(0.4);
      }
      20% {
        transform: scaleY(1);
      }
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }

    .animate-bounce {
      animation: bounce 1.4s ease-in-out infinite both;
    }

    .animate-pulse {
      animation: pulse 1.5s ease-in-out infinite;
    }

    .animate-scale {
      animation: scale 1s ease-in-out infinite;
    }
  `]
})
export class SpinnerComponent implements ComponentBase {
  @Input() type: 'circular' | 'dots' | 'pulse' | 'bars' = 'circular';
  @Input() color: Color = 'primary';
  @Input() size: Size = 'md';
  @Input() text = '';
  @Input() centered = false;
  @Input() overlay = false;
  @Input() dotCount = 3;
  @Input() barCount = 4;
  @Input() ariaLabel = '';

  get containerClasses(): string {
    const baseClasses = ['flex flex-col items-center justify-center'];

    if (this.overlay) {
      baseClasses.push('fixed inset-0 bg-black bg-opacity-50 z-50');
    } else if (this.centered) {
      baseClasses.push('w-full h-full');
    }

    return baseClasses.join(' ');
  }

  get spinnerClasses(): string {
    return 'animate-spin';
  }

  get svgClasses(): string {
    const sizeClasses = {
      xs: 'w-4 h-4',
      sm: 'w-5 h-5',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-12 h-12'
    };

    const colorClasses = {
      primary: 'text-blue-600 dark:text-blue-400',
      secondary: 'text-gray-600 dark:text-gray-400',
      success: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      error: 'text-red-600 dark:text-red-400',
      info: 'text-cyan-600 dark:text-cyan-400'
    };

    return `${sizeClasses[this.size]} ${colorClasses[this.color]}`;
  }

  get dotsContainerClasses(): string {
    const gapClasses = {
      xs: 'space-x-1',
      sm: 'space-x-1.5',
      md: 'space-x-2',
      lg: 'space-x-2.5',
      xl: 'space-x-3'
    };

    return `flex items-center ${gapClasses[this.size]}`;
  }

  get dotClasses(): string {
    const sizeClasses = {
      xs: 'w-1 h-1',
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5',
      xl: 'w-3 h-3'
    };

    const colorClasses = {
      primary: 'bg-blue-600 dark:bg-blue-400',
      secondary: 'bg-gray-600 dark:bg-gray-400',
      success: 'bg-green-600 dark:bg-green-400',
      warning: 'bg-yellow-600 dark:bg-yellow-400',
      error: 'bg-red-600 dark:bg-red-400',
      info: 'bg-cyan-600 dark:bg-cyan-400'
    };

    return `${sizeClasses[this.size]} ${colorClasses[this.color]} rounded-full animate-bounce`;
  }

  get pulseClasses(): string {
    const sizeClasses = {
      xs: 'w-4 h-4',
      sm: 'w-6 h-6',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16'
    };

    const colorClasses = {
      primary: 'text-blue-600 dark:text-blue-400',
      secondary: 'text-gray-600 dark:text-gray-400',
      success: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      error: 'text-red-600 dark:text-red-400',
      info: 'text-cyan-600 dark:text-cyan-400'
    };

    return `${sizeClasses[this.size]} ${colorClasses[this.color]} animate-pulse`;
  }

  get barsContainerClasses(): string {
    const gapClasses = {
      xs: 'space-x-0.5',
      sm: 'space-x-1',
      md: 'space-x-1.5',
      lg: 'space-x-2',
      xl: 'space-x-2.5'
    };

    return `flex items-center ${gapClasses[this.size]}`;
  }

  get barClasses(): string {
    const sizeClasses = {
      xs: 'w-1 h-4',
      sm: 'w-1.5 h-6',
      md: 'w-2 h-8',
      lg: 'w-2.5 h-10',
      xl: 'w-3 h-12'
    };

    const colorClasses = {
      primary: 'bg-blue-600 dark:bg-blue-400',
      secondary: 'bg-gray-600 dark:bg-gray-400',
      success: 'bg-green-600 dark:bg-green-400',
      warning: 'bg-yellow-600 dark:bg-yellow-400',
      error: 'bg-red-600 dark:bg-red-400',
      info: 'bg-cyan-600 dark:bg-cyan-400'
    };

    return `${sizeClasses[this.size]} ${colorClasses[this.color]} rounded animate-scale`;
  }

  get textClasses(): string {
    const sizeClasses = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg'
    };

    const colorClasses = {
      primary: 'text-blue-600 dark:text-blue-400',
      secondary: 'text-gray-600 dark:text-gray-400',
      success: 'text-green-600 dark:text-green-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      error: 'text-red-600 dark:text-red-400',
      info: 'text-cyan-600 dark:text-cyan-400'
    };

    return `${sizeClasses[this.size]} ${colorClasses[this.color]} font-medium`;
  }
}