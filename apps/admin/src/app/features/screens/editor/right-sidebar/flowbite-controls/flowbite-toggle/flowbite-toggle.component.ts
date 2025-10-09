import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-flowbite-toggle',
  templateUrl: './flowbite-toggle.component.html',
  styleUrls: ['./flowbite-toggle.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FlowbiteToggleComponent),
      multi: true
    }
  ]
})
export class FlowbiteToggleComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() description: string = '';
  @Input() disabled: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() required: boolean = false;
  @Input() helperText: string = '';
  @Input() errorText: string = '';
  @Input() color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' = 'blue';
  @Input() showLabel: boolean = true;
  @Input() labelPosition: 'left' | 'right' | 'top' | 'bottom' = 'right';
  @Input() customClasses: string = '';

  checked: boolean = false;

  @Output() valueChange = new EventEmitter<boolean>();
  @Output() change = new EventEmitter<boolean>();
  @Output() focus = new EventEmitter<void>();
  @Output() blur = new EventEmitter<void>();

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  get toggleId(): string {
    return this.label ? `toggle-${this.label.replace(/\s+/g, '-').toLowerCase()}` : `toggle-${Math.random().toString(36).substr(2, 9)}`;
  }

  get containerClasses(): string {
    const baseClasses = 'relative inline-flex items-center';

    const labelPositionClasses = {
      left: 'flex-row-reverse space-x-reverse',
      right: 'flex-row',
      top: 'flex-col items-start space-y-2',
      bottom: 'flex-col items-start space-y-2 space-y-reverse'
    };

    const spacingClasses = this.label ? 'space-x-3' : '';
    const positionClasses = this.labelPosition !== 'right' ? labelPositionClasses[this.labelPosition] : spacingClasses;

    return `${baseClasses} ${positionClasses}`;
  }

  get toggleClasses(): string {
    const baseClasses = 'relative inline-flex items-center h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2';

    const sizeClasses = {
      sm: 'w-9 h-5',
      md: 'w-11 h-6',
      lg: 'w-14 h-7'
    };

    const colorClasses = {
      blue: this.checked ? 'bg-blue-600 focus:ring-blue-500' : 'bg-gray-200',
      green: this.checked ? 'bg-green-600 focus:ring-green-500' : 'bg-gray-200',
      red: this.checked ? 'bg-red-600 focus:ring-red-500' : 'bg-gray-200',
      yellow: this.checked ? 'bg-yellow-500 focus:ring-yellow-500' : 'bg-gray-200',
      purple: this.checked ? 'bg-purple-600 focus:ring-purple-500' : 'bg-gray-200',
      gray: this.checked ? 'bg-gray-600 focus:ring-gray-500' : 'bg-gray-200'
    };

    const disabledClasses = this.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

    return `${baseClasses} ${sizeClasses[this.size]} ${colorClasses[this.color]} ${disabledClasses}`;
  }

  get thumbClasses(): string {
    const baseClasses = 'inline-block bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out pointer-events-none';

    const sizeClasses = {
      sm: 'w-4 h-4 translate-x-0.5',
      md: 'w-5 h-5 translate-x-0.5',
      lg: 'w-6 h-6 translate-x-0.5'
    };

    const checkedClasses = {
      sm: this.checked ? 'translate-x-4' : 'translate-x-0.5',
      md: this.checked ? 'translate-x-5' : 'translate-x-0.5',
      lg: this.checked ? 'translate-x-7' : 'translate-x-0.5'
    };

    return `${baseClasses} ${sizeClasses[this.size]} ${this.checked ? checkedClasses[this.size].split(' ')[1] : checkedClasses[this.size].split(' ')[0]}`;
  }

  get labelClasses(): string {
    const baseClasses = 'text-sm font-medium select-none';
    const colorClasses = this.errorText ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300';
    const disabledClasses = this.disabled ? 'opacity-50 cursor-not-allowed' : '';

    return `${baseClasses} ${colorClasses} ${disabledClasses}`;
  }

  get descriptionClasses(): string {
    const baseClasses = 'text-xs select-none';
    const colorClasses = this.errorText ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400';

    return `${baseClasses} ${colorClasses}`;
  }

  onToggleChange(event: Event): void {
    if (this.disabled) return;

    const newValue = (event.target as HTMLInputElement).checked;
    this.checked = newValue;
    this.onChange(newValue);
    this.valueChange.emit(newValue);
    this.change.emit(newValue);
  }

  onFocus(): void {
    this.focus.emit();
  }

  onBlur(): void {
    this.onTouched();
    this.blur.emit();
  }

  // ControlValueAccessor implementation
  writeValue(value: boolean): void {
    this.checked = !!value;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}