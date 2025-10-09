import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-flowbite-input',
  templateUrl: './flowbite-input.component.html',
  styleUrls: ['./flowbite-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FlowbiteInputComponent),
      multi: true
    }
  ]
})
export class FlowbiteInputComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() type: 'text' | 'number' | 'email' | 'password' | 'url' | 'tel' = 'text';
  @Input() placeholder: string = '';
  @Input() disabled: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() required: boolean = false;
  @Input() readonly: boolean = false;
  @Input() helperText: string = '';
  @Input() errorText: string = '';
  @Input() customClasses: string = '';

  value: any = '';

  @Output() valueChange = new EventEmitter<any>();
  @Output() blur = new EventEmitter<void>();
  @Output() focus = new EventEmitter<void>();
  @Output() keydown = new EventEmitter<KeyboardEvent>();
  @Output() keyup = new EventEmitter<KeyboardEvent>();

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  get inputClasses(): string {
    const baseClasses = 'block w-full border rounded-lg bg-white text-gray-900 focus:ring-2 focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeClasses = {
      sm: 'text-sm px-3 py-1.5',
      md: 'text-sm px-4 py-2',
      lg: 'text-base px-4 py-3'
    };

    const stateClasses = this.errorText
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';

    const customClasses = this.customClasses ? ` ${this.customClasses}` : '';

    return `${baseClasses} ${sizeClasses[this.size]} ${stateClasses}${customClasses}`;
  }

  onValueChange(newValue: any): void {
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
  writeValue(value: any): void {
    this.value = value;
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
}