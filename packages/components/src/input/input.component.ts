import { Component, Input, Output, EventEmitter, forwardRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import type { FormElement, Color, Size } from '../interfaces/component-base.interface';

@Component({
  selector: 'pro-input',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  template: `
    <div class="relative">
      <!-- Label -->
      <label *ngIf="label"
             [for]="inputId"
             [class]="labelClasses">
        {{ label }}
        <span *ngIf="required" class="text-red-500 ml-1">*</span>
      </label>

      <!-- Input Container -->
      <div class="relative">
        <!-- Prefix Icon -->
        <div *ngIf="prefixIcon" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg [attr.viewBox]="iconViewBox" fill="none" stroke="currentColor" class="w-5 h-5 text-gray-400">
            <path [attr.d]="prefixIcon" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
          </svg>
        </div>

        <!-- Input Element -->
        <input
          [id]="inputId"
          [type]="type"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [readonly]="readonly"
          [required]="required"
          [attr.aria-label]="ariaLabel"
          [attr.aria-invalid]="hasError"
          [attr.aria-describedby]="errorId"
          [class]="inputClasses"
          [style.padding-left]="prefixIcon ? '2.5rem' : null"
          [style.padding-right]="suffixIcon || clearable ? '2.5rem' : null"
          [value]="_value"
          (input)="handleInput($event)"
          (blur)="handleBlur()"
          (focus)="handleFocus()"
        />

        <!-- Suffix Icon -->
        <div *ngIf="suffixIcon && !clearable" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg [attr.viewBox]="iconViewBox" fill="none" stroke="currentColor" class="w-5 h-5 text-gray-400">
            <path [attr.d]="suffixIcon" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
          </svg>
        </div>

        <!-- Clear Button -->
        <button *ngIf="clearable && _value && !disabled && !readonly"
                type="button"
                (click)="clearValue()"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
          <svg [attr.viewBox]="iconViewBox" fill="none" stroke="currentColor" class="w-4 h-4">
            <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
          </svg>
        </button>
      </div>

      <!-- Help Text -->
      <div *ngIf="helpText && !hasError" [class]="helpTextClasses" [id]="helpTextId">
        {{ helpText }}
      </div>

      <!-- Error Message -->
      <div *ngIf="hasError && errorMessage" [class]="errorClasses" [id]="errorId" role="alert">
        {{ errorMessage }}
      </div>

      <!-- Character Count -->
      <div *ngIf="showCharCount && maxLength" class="flex justify-between mt-1">
        <div></div>
        <span [class]="charCountClasses">
          {{ _value?.length || 0 }} / {{ maxLength }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    input {
      transition: all 0.2s ease-in-out;
    }

    input:focus {
      outline: none;
    }

    input:disabled {
      background-color: #f3f4f6;
      cursor: not-allowed;
    }

    input:disabled + .absolute svg {
      color: #9ca3af;
    }

    input::placeholder {
      color: #9ca3af;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      input:disabled {
        background-color: #374151;
      }

      input::placeholder {
        color: #6b7280;
      }
    }
  `]
})
export class InputComponent implements ControlValueAccessor, FormElement {
  @Input() label = '';
  @Input() type: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search' = 'text';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  @Input() clearable = false;
  @Input() showCharCount = false;
  @Input() maxLength: number | null = null;
  @Input() size: Size = 'md';
  @Input() color: Color = 'primary';
  @Input() helpText = '';
  @Input() errorMessage = '';
  @Input() hasError = false;
  @Input() prefixIcon = '';
  @Input() suffixIcon = '';
  @Input() ariaLabel = '';
  @Input() name = '';

  @Output() valueChange = new EventEmitter<string>();
  @Output() focus = new EventEmitter<FocusEvent>();
  @Output() blur = new EventEmitter<FocusEvent>();

  protected _value = '';
  private onChange = (_value: any) => {};
  private onTouched = () => {};

  // Generate unique IDs for accessibility
  inputId = `pro-input-${Math.random().toString(36).substr(2, 9)}`;
  errorId = `${this.inputId}-error`;
  helpTextId = `${this.inputId}-help`;
  iconViewBox = '0 0 24 24';

  get inputClasses(): string {
    const baseClasses = [
      'block w-full border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2',
      'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
    ];

    // Size classes
    const sizeClasses = {
      xs: 'px-2.5 py-1.5 text-xs',
      sm: 'px-3 py-2 text-sm',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-2 text-base',
      xl: 'px-4 py-3 text-lg'
    };

    // State classes
    const stateClasses = this.hasError ?
      'border-red-300 focus:ring-red-500 focus:border-red-500 dark:border-red-600 dark:focus:border-red-500' :
      'border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-500';

    // Disabled classes
    const disabledClasses = this.disabled ? 'bg-gray-50 dark:bg-gray-700 cursor-not-allowed' : '';

    return [
      ...baseClasses,
      sizeClasses[this.size],
      stateClasses,
      disabledClasses
    ].join(' ');
  }

  get labelClasses(): string {
    const baseClasses = 'block text-sm font-medium mb-1';
    const colorClasses = this.hasError ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300';

    return `${baseClasses} ${colorClasses}`;
  }

  get helpTextClasses(): string {
    return 'mt-1 text-sm text-gray-500 dark:text-gray-400';
  }

  get errorClasses(): string {
    return 'mt-1 text-sm text-red-600 dark:text-red-400';
  }

  get charCountClasses(): string {
    const baseClasses = 'text-xs';
    const isNearLimit = this.maxLength && (this._value?.length || 0) > this.maxLength * 0.9;
    const isOverLimit = this.maxLength && (this._value?.length || 0) > this.maxLength;

    const colorClasses = isOverLimit ? 'text-red-600 dark:text-red-400' :
                         isNearLimit ? 'text-yellow-600 dark:text-yellow-400' :
                         'text-gray-500 dark:text-gray-400';

    return `${baseClasses} ${colorClasses}`;
  }

  get value(): string {
    return this._value;
  }

  set value(newValue: string) {
    if (this._value !== newValue) {
      this._value = newValue;
      this.onChange(newValue);
      this.valueChange.emit(newValue);
    }
  }

  writeValue(value: any): void {
    this._value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    let newValue: string = target.value;

    // Enforce maxLength if set
    if (this.maxLength && newValue.length > this.maxLength) {
      newValue = newValue.substring(0, this.maxLength);
      target.value = newValue;
    }

    this.value = newValue;
  }

  handleFocus(): void {
    this.focus.emit();
  }

  handleBlur(): void {
    this.onTouched();
    this.blur.emit();
  }

  clearValue(): void {
    this.value = '';
  }

  @HostListener('keydown.enter', ['$event'])
  onEnter(event: KeyboardEvent): void {
    // Prevent form submission if this is a search input
    if (this.type === 'search') {
      event.preventDefault();
    }
  }
}