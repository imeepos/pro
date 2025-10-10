import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-flowbite-textarea',
  templateUrl: './flowbite-textarea.component.html',
  styleUrls: ['./flowbite-textarea.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FlowbiteTextareaComponent),
      multi: true
    }
  ]
})
export class FlowbiteTextareaComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() disabled: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() required: boolean = false;
  @Input() readonly: boolean = false;
  @Input() helperText: string = '';
  @Input() errorText: string = '';
  @Input() customClasses: string = '';
  @Input() rows: number = 4;
  @Input() maxLength?: number;
  @Input() resize: 'none' | 'vertical' | 'horizontal' | 'both' = 'vertical';
  @Input() showCharCount: boolean = false;

  value: string = '';

  @Output() valueChange = new EventEmitter<string>();
  @Output() blur = new EventEmitter<void>();
  @Output() focus = new EventEmitter<void>();
  @Output() keydown = new EventEmitter<KeyboardEvent>();
  @Output() keyup = new EventEmitter<KeyboardEvent>();

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  get textareaClasses(): string {
    const baseClasses = 'block w-full border rounded-lg bg-white text-gray-900 focus:ring-2 focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeClasses = {
      sm: 'text-sm px-3 py-1.5',
      md: 'text-sm px-4 py-2',
      lg: 'text-base px-4 py-3'
    };

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize'
    };

    const stateClasses = this.errorText
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';

    const customClasses = this.customClasses ? ` ${this.customClasses}` : '';

    return `${baseClasses} ${sizeClasses[this.size]} ${resizeClasses[this.resize]} ${stateClasses}${customClasses}`;
  }

  get remainingChars(): number {
    if (!this.maxLength) return 0;
    return this.maxLength - (this.value?.length || 0);
  }

  get isOverLimit(): boolean {
    if (!this.maxLength) return false;
    return (this.value?.length || 0) > this.maxLength;
  }

  get charCountClasses(): string {
    const baseClasses = 'text-xs mt-1 text-right';
    if (this.isOverLimit) {
      return `${baseClasses} text-red-600 dark:text-red-400`;
    }
    if (this.maxLength && this.remainingChars <= 20) {
      return `${baseClasses} text-yellow-600 dark:text-yellow-400`;
    }
    return `${baseClasses} text-gray-500 dark:text-gray-400`;
  }

  getTextareaId(): string {
    if (!this.label) return '';
    return 'textarea-' + this.label.replace(/\s+/g, '-').toLowerCase();
  }

  onValueChange(newValue: string): void {
    this.value = newValue;
    this.onChange(newValue);
    this.valueChange.emit(newValue);
  }

  onBlur(): void {
    this.onTouched();
    this.blur.emit();
  }

  onFocus(): void {
    this.focus.emit();
  }

  onKeyDown(event: KeyboardEvent): void {
    this.keydown.emit(event);
  }

  onKeyUp(event: KeyboardEvent): void {
    this.keyup.emit(event);
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}