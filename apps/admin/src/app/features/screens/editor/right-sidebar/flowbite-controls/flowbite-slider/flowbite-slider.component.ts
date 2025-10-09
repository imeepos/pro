import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-flowbite-slider',
  templateUrl: './flowbite-slider.component.html',
  styleUrls: ['./flowbite-slider.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FlowbiteSliderComponent),
      multi: true
    }
  ]
})
export class FlowbiteSliderComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() min: number = 0;
  @Input() max: number = 100;
  @Input() step: number = 1;
  @Input() disabled: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() required: boolean = false;
  @Input() helperText: string = '';
  @Input() errorText: string = '';
  @Input() customClasses: string = '';
  @Input() showValue: boolean = true;
  @Input() showMinMax: boolean = false;
  @Input() showTooltip: boolean = false;
  @Input() color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' = 'blue';
  @Input() vertical: boolean = false;
  @Input() unit: string = '';
  @Input() precision: number = 0;
  @Input() marks?: { value: number; label?: string }[];

  value: number = 0;

  @Output() valueChange = new EventEmitter<number>();
  @Output() change = new EventEmitter<number>();
  @Output() input = new EventEmitter<number>();
  @Output() blur = new EventEmitter<void>();
  @Output() focus = new EventEmitter<void>();

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};
  private isDragging: boolean = false;

  get sliderId(): string {
    return this.label ? `slider-${this.label.replace(/\s+/g, '-').toLowerCase()}` : `slider-${Math.random().toString(36).substr(2, 9)}`;
  }

  get containerClasses(): string {
    const baseClasses = 'flowbite-slider-wrapper';
    const directionClasses = this.vertical ? 'flex-col space-y-4' : 'flex-col space-y-2';
    return `${baseClasses} ${directionClasses} ${this.customClasses}`;
  }

  get sliderClasses(): string {
    const baseClasses = 'w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed';

    const colorClasses = {
      blue: 'accent-blue-600 focus:ring-blue-500',
      green: 'accent-green-600 focus:ring-green-500',
      red: 'accent-red-600 focus:ring-red-500',
      yellow: 'accent-yellow-500 focus:ring-yellow-500',
      purple: 'accent-purple-600 focus:ring-purple-500',
      gray: 'accent-gray-600 focus:ring-gray-500'
    };

    const sizeClasses = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3'
    };

    return `${baseClasses} ${colorClasses[this.color]} ${sizeClasses[this.size]}`;
  }

  get valueDisplayClasses(): string {
    const baseClasses = 'font-mono text-sm';
    const colorClasses = this.errorText ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300';
    return `${baseClasses} ${colorClasses}`;
  }

  get minMaxClasses(): string {
    return 'text-xs text-gray-500 dark:text-gray-400 select-none';
  }

  get formattedValue(): string {
    if (this.precision > 0) {
      return this.value.toFixed(this.precision);
    }
    return this.value.toString();
  }

  get formattedMin(): string {
    return this.min.toString();
  }

  get formattedMax(): string {
    return this.max.toString();
  }

  get percentage(): number {
    const range = this.max - this.min;
    if (range === 0) return 0;
    return ((this.value - this.min) / range) * 100;
  }

  get sliderStyles(): { [key: string]: string } {
    if (this.vertical) {
      return {
        height: '200px',
        writingMode: 'bt-lr' // For WebKit
      };
    }
    return {};
  }

  get thumbPosition(): { [key: string]: string } {
    if (this.showTooltip) {
      const thumbSize = this.size === 'sm' ? 16 : this.size === 'lg' ? 24 : 20;
      const offset = thumbSize / 2;
      const position = this.percentage;

      if (this.vertical) {
        return {
          bottom: `calc(${position}% - ${offset}px)`
        };
      }
      return {
        left: `calc(${position}% - ${offset}px)`
      };
    }
    return {};
  }

  onSliderInput(event: Event): void {
    const newValue = parseFloat((event.target as HTMLInputElement).value);
    this.value = newValue;
    this.onChange(newValue);
    this.input.emit(newValue);
    this.valueChange.emit(newValue);
  }

  onSliderChange(event: Event): void {
    const newValue = parseFloat((event.target as HTMLInputElement).value);
    this.value = newValue;
    this.change.emit(newValue);
  }

  onFocus(): void {
    this.focus.emit();
  }

  onBlur(): void {
    this.onTouched();
    this.blur.emit();
  }

  onValueInputChange(event: Event): void {
    const inputValue = parseFloat((event.target as HTMLInputElement).value);

    if (!isNaN(inputValue) && inputValue >= this.min && inputValue <= this.max) {
      this.value = inputValue;
      this.onChange(inputValue);
      this.valueChange.emit(inputValue);
      this.change.emit(inputValue);
    }
  }

  onMouseDown(): void {
    this.isDragging = true;
  }

  onMouseUp(): void {
    this.isDragging = false;
    this.onTouched();
  }

  getMarkPosition(markValue: number): number {
    const range = this.max - this.min;
    if (range === 0) return 0;
    return ((markValue - this.min) / range) * 100;
  }

  isMarkActive(markValue: number): boolean {
    return this.value >= markValue;
  }

  // ControlValueAccessor implementation
  writeValue(value: number): void {
    if (value !== undefined && value !== null) {
      this.value = Math.max(this.min, Math.min(this.max, value));
    }
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}