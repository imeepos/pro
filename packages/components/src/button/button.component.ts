import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ComponentBase, Color, Size } from '../interfaces/component-base.interface';

@Component({
  selector: 'pro-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [attr.aria-label]="ariaLabel"
      [attr.aria-disabled]="disabled || loading"
      [class]="buttonClasses"
      (click)="handleClick($event)"
    >
      <span *ngIf="loading" class="animate-spin mr-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </span>

      <span *ngIf="icon && !loading" [class]="iconClasses">
        <svg [attr.viewBox]="iconViewBox" fill="none" stroke="currentColor" stroke-width="2">
          <path [attr.d]="icon" />
        </svg>
      </span>

      <span *ngIf="label" [class]="labelClasses">{{ label }}</span>

      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    button {
      transition: all 0.2s ease-in-out;
      position: relative;
      overflow: hidden;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    button:not(:disabled):hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    button:not(:disabled):active {
      transform: translateY(0);
    }
  `]
})
export class ButtonComponent implements ComponentBase {
  @Input() label = '';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() color: Color = 'primary';
  @Input() size: Size = 'md';
  @Input() variant: 'solid' | 'outline' | 'ghost' = 'solid';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() block = false;
  @Input() rounded = false;
  @Input() icon = '';
  @Input() iconPosition: 'left' | 'right' = 'left';
  @Input() ariaLabel = '';

  @Output() clicked = new EventEmitter<Event>();

  get buttonClasses(): string {
    const baseClasses = [
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
    ];

    // Size classes
    const sizeClasses = {
      xs: 'px-2.5 py-1.5 text-xs rounded',
      sm: 'px-3 py-2 text-sm rounded-md',
      md: 'px-4 py-2 text-sm rounded-md',
      lg: 'px-4 py-2 text-base rounded-md',
      xl: 'px-6 py-3 text-base rounded-lg'
    };

    // Color classes based on variant
    const colorClasses = {
      primary: {
        solid: 'bg-blue-600 border border-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        outline: 'border border-blue-600 text-blue-600 bg-transparent hover:bg-blue-50 focus:ring-blue-500',
        ghost: 'text-blue-600 bg-transparent hover:bg-blue-50 focus:ring-blue-500'
      },
      secondary: {
        solid: 'bg-gray-600 border border-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
        outline: 'border border-gray-600 text-gray-600 bg-transparent hover:bg-gray-50 focus:ring-gray-500',
        ghost: 'text-gray-600 bg-transparent hover:bg-gray-50 focus:ring-gray-500'
      },
      success: {
        solid: 'bg-green-600 border border-green-600 text-white hover:bg-green-700 focus:ring-green-500',
        outline: 'border border-green-600 text-green-600 bg-transparent hover:bg-green-50 focus:ring-green-500',
        ghost: 'text-green-600 bg-transparent hover:bg-green-50 focus:ring-green-500'
      },
      warning: {
        solid: 'bg-yellow-600 border border-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
        outline: 'border border-yellow-600 text-yellow-600 bg-transparent hover:bg-yellow-50 focus:ring-yellow-500',
        ghost: 'text-yellow-600 bg-transparent hover:bg-yellow-50 focus:ring-yellow-500'
      },
      error: {
        solid: 'bg-red-600 border border-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        outline: 'border border-red-600 text-red-600 bg-transparent hover:bg-red-50 focus:ring-red-500',
        ghost: 'text-red-600 bg-transparent hover:bg-red-50 focus:ring-red-500'
      },
      info: {
        solid: 'bg-cyan-600 border border-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500',
        outline: 'border border-cyan-600 text-cyan-600 bg-transparent hover:bg-cyan-50 focus:ring-cyan-500',
        ghost: 'text-cyan-600 bg-transparent hover:bg-cyan-50 focus:ring-cyan-500'
      }
    };

    // Additional classes
    const additionalClasses = [];
    if (this.block) additionalClasses.push('w-full');
    if (this.rounded) additionalClasses.push('rounded-full');
    if (this.disabled || this.loading) additionalClasses.push('opacity-60 cursor-not-allowed');

    // Dark mode classes
    const darkModeClasses = 'dark:focus:ring-offset-gray-800';

    return [
      ...baseClasses,
      sizeClasses[this.size],
      colorClasses[this.color][this.variant],
      ...additionalClasses,
      darkModeClasses
    ].join(' ');
  }

  get iconClasses(): string {
    const baseClasses = 'flex-shrink-0';
    const sizeClasses = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
      xl: 'w-6 h-6'
    };
    const marginClasses = this.iconPosition === 'left' && this.label ? 'mr-2' :
                         this.iconPosition === 'right' && this.label ? 'ml-2' : '';

    return `${baseClasses} ${sizeClasses[this.size]} ${marginClasses}`;
  }

  get labelClasses(): string {
    return '';
  }

  get iconViewBox(): string {
    return '0 0 24 24';
  }

  handleClick(event: Event): void {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
    }
  }
}
