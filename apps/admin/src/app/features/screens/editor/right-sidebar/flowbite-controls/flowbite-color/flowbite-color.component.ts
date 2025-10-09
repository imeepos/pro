import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-flowbite-color',
  templateUrl: './flowbite-color.component.html',
  styleUrls: ['./flowbite-color.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FlowbiteColorComponent),
      multi: true
    }
  ]
})
export class FlowbiteColorComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = '#000000';
  @Input() disabled: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() required: boolean = false;
  @Input() readonly: boolean = false;
  @Input() helperText: string = '';
  @Input() errorText: string = '';
  @Input() customClasses: string = '';
  @Input() showHexInput: boolean = true;
  @Input() showSwatches: boolean = false;
  @Input() swatches: string[] = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#C0C0C0', '#FFD700'
  ];
  @Input() allowTransparency: boolean = false;

  value: string = '';

  @Output() valueChange = new EventEmitter<string>();
  @Output() blur = new EventEmitter<void>();
  @Output() focus = new EventEmitter<void>();
  @Output() colorPreview = new EventEmitter<string>();

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private isColorPickerOpen: boolean = false;

  get colorInputId(): string {
    return this.label ? `color-${this.label.replace(/\s+/g, '-').toLowerCase()}` : `color-${Math.random().toString(36).substr(2, 9)}`;
  }

  get containerClasses(): string {
    const baseClasses = 'flowbite-color-wrapper';
    return `${baseClasses} ${this.customClasses}`;
  }

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

    return `${baseClasses} ${sizeClasses[this.size]} ${stateClasses}`;
  }

  get colorPickerClasses(): string {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12'
    };

    const baseClasses = `relative rounded-lg border-2 border-gray-300 cursor-pointer transition-all duration-200 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`;

    return `${baseClasses} ${sizeClasses[this.size]} ${this.disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
  }

  get isValidColor(): boolean {
    if (!this.value) return true;
    return this.isValidHexColor(this.value);
  }

  get swatchesContainerClasses(): string {
    return `grid grid-cols-5 gap-2 mt-3`;
  }

  get swatchClasses(): string {
    const sizeClasses = {
      sm: 'w-6 h-6',
      md: 'w-8 h-8',
      lg: 'w-10 h-10'
    };

    const baseClasses = 'rounded-lg border-2 border-gray-200 cursor-pointer transition-all duration-200 hover:border-blue-400 hover:scale-110 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1';

    return `${baseClasses} ${sizeClasses[this.size]}`;
  }

  isValidHexColor(color: string): boolean {
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const hexWithAlphaPattern = /^#([A-Fa-f0-9]{8})$/;

    return hexPattern.test(color) || (this.allowTransparency && hexWithAlphaPattern.test(color));
  }

  normalizeColorValue(color: string): string {
    if (!color) return '';

    // Remove # if present
    let normalizedColor = color.replace('#', '');

    // Convert 3-digit hex to 6-digit
    if (normalizedColor.length === 3) {
      normalizedColor = normalizedColor.split('').map(char => char + char).join('');
    }

    // Add # back
    return `#${normalizedColor}`;
  }

  onColorInputChange(event: Event): void {
    const inputValue = ($event.target as HTMLInputElement).value;
    const normalizedValue = this.normalizeColorValue(inputValue);

    this.value = normalizedValue;
    this.onChange(normalizedValue);
    this.valueChange.emit(normalizedValue);
    this.colorPreview.emit(normalizedValue);
  }

  onColorPickerChange(event: Event): void {
    const selectedColor = ($event.target as HTMLInputElement).value;

    this.value = selectedColor;
    this.onChange(selectedColor);
    this.valueChange.emit(selectedColor);
    this.colorPreview.emit(selectedColor);
  }

  onSwatchClick(color: string): void {
    if (this.disabled) return;

    this.value = color;
    this.onChange(color);
    this.valueChange.emit(color);
    this.colorPreview.emit(color);
  }

  onBlur(): void {
    this.onTouched();
    this.blur.emit();
  }

  onFocus(): void {
    this.focus.emit();
    this.colorPreview.emit(this.value);
  }

  openColorPicker(): void {
    if (this.disabled || this.readonly) return;
    const colorInput = document.getElementById(this.colorInputId) as HTMLInputElement;
    if (colorInput) {
      colorInput.click();
    }
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