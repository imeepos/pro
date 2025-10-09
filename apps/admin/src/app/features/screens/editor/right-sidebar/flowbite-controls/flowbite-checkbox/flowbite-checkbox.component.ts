import { Component, Input, Output, EventEmitter, forwardRef, ChangeDetectionStrategy, HostListener, ElementRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-flowbite-checkbox',
  templateUrl: './flowbite-checkbox.component.html',
  styleUrls: ['./flowbite-checkbox.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FlowbiteCheckboxComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowbiteCheckboxComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() disabled: boolean = false;
  @Input() required: boolean = false;
  @Input() readonly: boolean = false;
  @Input() helperText: string = '';
  @Input() errorText: string = '';
  @Input() customClasses: string = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' = 'blue';
  @Input() indeterminate: boolean = false;
  @Input() value: any = true;

  checked: boolean = false;

  @Output() change = new EventEmitter<boolean>();
  @Output() blur = new EventEmitter<void>();
  @Output() focus = new EventEmitter<void>();

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef) {}

  get checkboxId(): string {
    return this.label ? `checkbox-${this.label.replace(/\s+/g, '-').toLowerCase()}` : `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  }

  get containerClasses(): string {
    const baseClasses = 'flex items-start';
    return `${baseClasses} ${this.customClasses}`;
  }

  get checkboxClasses(): string {
    const baseClasses = 'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-2 cursor-pointer transition-all duration-200';

    const colorClasses = {
      blue: 'text-blue-600 focus:ring-blue-500',
      green: 'text-green-600 focus:ring-green-500',
      red: 'text-red-600 focus:ring-red-500',
      yellow: 'text-yellow-600 focus:ring-yellow-500',
      purple: 'text-purple-600 focus:ring-purple-500',
      gray: 'text-gray-600 focus:ring-gray-500'
    };

    const stateClasses = this.disabled
      ? 'opacity-50 cursor-not-allowed bg-gray-100'
      : 'bg-white hover:border-gray-400';

    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };

    return `${baseClasses} ${colorClasses[this.color]} ${stateClasses} ${sizeClasses[this.size]}`;
  }

  get labelClasses(): string {
    const baseClasses = 'ml-2 text-sm font-medium text-gray-900';
    const stateClasses = this.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    };

    return `${baseClasses} ${stateClasses} ${sizeClasses[this.size]}`;
  }

  get helperClasses(): string {
    const baseClasses = 'mt-1 text-xs';
    return this.errorText
      ? `${baseClasses} text-red-600`
      : `${baseClasses} text-gray-500`;
  }

  onCheckboxChange(event: Event): void {
    if (this.disabled || this.readonly) return;

    const target = event.target as HTMLInputElement;
    this.checked = target.checked;
    this.indeterminate = false;

    this.onChange(this.checked ? this.value : false);
    this.change.emit(this.checked);
    this.onTouched();
  }

  onFocus(): void {
    this.focus.emit();
  }

  onBlur(): void {
    this.onTouched();
    this.blur.emit();
  }

  onToggle(): void {
    if (this.disabled || this.readonly) return;

    if (this.indeterminate) {
      this.checked = true;
      this.indeterminate = false;
    } else {
      this.checked = !this.checked;
    }

    this.onChange(this.checked ? this.value : false);
    this.change.emit(this.checked);
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.checked = value === this.value;
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Handle any document-level click events if needed
  }
}