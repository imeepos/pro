import { Component, Input, Output, EventEmitter, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: any;
  label: string;
  disabled?: boolean;
  group?: string;
  icon?: string;
  description?: string;
}

export interface SelectGroup {
  label: string;
  disabled?: boolean;
  options: SelectOption[];
}

@Component({
  selector: 'app-flowbite-select',
  templateUrl: './flowbite-select.component.html',
  styleUrls: ['./flowbite-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FlowbiteSelectComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlowbiteSelectComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = '请选择...';
  @Input() disabled: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() required: boolean = false;
  @Input() readonly: boolean = false;
  @Input() helperText: string = '';
  @Input() errorText: string = '';
  @Input() customClasses: string = '';
  @Input() searchable: boolean = false;
  @Input() clearable: boolean = false;
  @Input() multiple: boolean = false;
  @Input() maxDisplayValues: number = 3;

  private _options: (SelectOption | SelectGroup)[] = [];
  @Input()
  get options(): (SelectOption | SelectGroup)[] {
    return this._options;
  }
  set options(value: (SelectOption | SelectGroup)[]) {
    this._options = value || [];
    this.processOptions();
  }

  value: any = null;
  searchQuery: string = '';
  isDropdownOpen: boolean = false;
  highlightedIndex: number = -1;

  @Output() valueChange = new EventEmitter<any>();
  @Output() blur = new EventEmitter<void>();
  @Output() focus = new EventEmitter<void>();
  @Output() open = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @Output() search = new EventEmitter<string>();

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  private processedOptions: SelectOption[] = [];
  private groups: SelectGroup[] = [];

  get selectId(): string {
    return this.label ? `select-${this.label.replace(/\s+/g, '-').toLowerCase()}` : `select-${Math.random().toString(36).substr(2, 9)}`;
  }

  get containerClasses(): string {
    const baseClasses = 'flowbite-select-wrapper relative';
    return `${baseClasses} ${this.customClasses}`;
  }

  get triggerClasses(): string {
    const baseClasses = 'flex items-center justify-between w-full border rounded-lg bg-white text-gray-900 focus:ring-2 focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

    const sizeClasses = {
      sm: 'text-sm px-3 py-1.5 min-h-[2.5rem]',
      md: 'text-sm px-4 py-2 min-h-[2.75rem]',
      lg: 'text-base px-4 py-3 min-h-[3rem]'
    };

    const stateClasses = this.errorText
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';

    return `${baseClasses} ${sizeClasses[this.size]} ${stateClasses}`;
  }

  get dropdownClasses(): string {
    const baseClasses = 'absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden focus:outline-none';
    return `${baseClasses} ${this.size === 'sm' ? 'text-sm' : this.size === 'lg' ? 'text-base' : 'text-sm'}`;
  }

  get searchInputClasses(): string {
    const baseClasses = 'w-full px-4 py-2 border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500';
    return `${baseClasses} ${this.size === 'sm' ? 'text-sm' : this.size === 'lg' ? 'text-base' : 'text-sm'}`;
  }

  get optionClasses(): string {
    return 'relative flex items-center px-4 py-2 cursor-pointer transition-colors duration-150 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none';
  }

  get selectedOptionClasses(): string {
    return 'bg-blue-50 text-blue-700 hover:bg-blue-100';
  }

  get disabledOptionClasses(): string {
    return 'opacity-50 cursor-not-allowed hover:bg-transparent';
  }

  get groupLabelClasses(): string {
    return 'px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wider';
  }

  get selectedLabel(): string {
    if (this.multiple && Array.isArray(this.value)) {
      if (this.value.length === 0) {
        return this.placeholder;
      }
      if (this.value.length <= this.maxDisplayValues) {
        return this.value.map(val => this.getOptionLabel(val)).join(', ');
      }
      return `${this.value.length} 项已选择`;
    }

    const option = this.findOptionByValue(this.value);
    return option ? option.label : this.placeholder;
  }

  get filteredOptions(): (SelectOption | SelectGroup)[] {
    if (!this.searchQuery) {
      return this.options;
    }

    return this.options.filter(item => {
      if ('options' in item) {
        return item.options.some(option =>
          option.label.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          (option.description && option.description.toLowerCase().includes(this.searchQuery.toLowerCase()))
        );
      } else {
        return item.label.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
               (item.description && item.description.toLowerCase().includes(this.searchQuery.toLowerCase()));
      }
    });
  }

  processOptions(): void {
    this.processedOptions = [];
    this.groups = [];

    this.options.forEach(item => {
      if ('options' in item) {
        this.groups.push(item);
        this.processedOptions.push(...item.options);
      } else {
        this.processedOptions.push(item);
      }
    });
  }

  findOptionByValue(value: any): SelectOption | undefined {
    return this.processedOptions.find(option => option.value === value);
  }

  getOptionLabel(value: any): string {
    const option = this.findOptionByValue(value);
    return option ? option.label : String(value);
  }

  onToggleDropdown(): void {
    if (this.disabled || this.readonly) return;

    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.open.emit();
      this.highlightedIndex = -1;
      if (this.searchable) {
        setTimeout(() => {
          const searchInput = document.getElementById(`${this.selectId}-search`) as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        });
      }
    } else {
      this.close.emit();
    }
  }

  onOptionSelect(option: SelectOption): void {
    if (option.disabled || this.disabled || this.readonly) return;

    if (this.multiple) {
      const currentValues = Array.isArray(this.value) ? this.value : [];
      const newValue = currentValues.includes(option.value)
        ? currentValues.filter(v => v !== option.value)
        : [...currentValues, option.value];

      this.value = newValue;
      this.onChange(newValue);
      this.valueChange.emit(newValue);
    } else {
      this.value = option.value;
      this.onChange(option.value);
      this.valueChange.emit(option.value);
      this.isDropdownOpen = false;
      this.close.emit();
    }

    this.onTouched();
  }

  onSearchChange(event: Event): void {
    const query = ($event.target as HTMLInputElement).value;
    this.searchQuery = query;
    this.search.emit(query);
    this.highlightedIndex = -1;
  }

  onClearValue(event: Event): void {
    event.stopPropagation();

    if (this.multiple) {
      this.value = [];
    } else {
      this.value = null;
    }

    this.onChange(this.value);
    this.valueChange.emit(this.value);
    this.onTouched();
  }

  onFocus(): void {
    this.focus.emit();
  }

  onBlur(): void {
    this.onTouched();
    this.blur.emit();
    this.isDropdownOpen = false;
    this.close.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled || this.readonly) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        if (!this.isDropdownOpen) {
          event.preventDefault();
          this.onToggleDropdown();
        } else if (this.highlightedIndex >= 0) {
          event.preventDefault();
          const flatOptions = this.getFlatOptions();
          const option = flatOptions[this.highlightedIndex];
          if (option && !option.disabled) {
            this.onOptionSelect(option);
          }
        }
        break;

      case 'Escape':
        if (this.isDropdownOpen) {
          event.preventDefault();
          this.isDropdownOpen = false;
          this.close.emit();
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (!this.isDropdownOpen) {
          this.onToggleDropdown();
        } else {
          this.highlightNextOption();
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (this.isDropdownOpen) {
          this.highlightPreviousOption();
        }
        break;

      case 'Tab':
        this.isDropdownOpen = false;
        this.close.emit();
        break;
    }
  }

  private getFlatOptions(): SelectOption[] {
    const flatOptions: SelectOption[] = [];
    this.filteredOptions.forEach(item => {
      if ('options' in item) {
        flatOptions.push(...item.options);
      } else {
        flatOptions.push(item);
      }
    });
    return flatOptions;
  }

  private highlightNextOption(): void {
    const flatOptions = this.getFlatOptions();
    let nextIndex = this.highlightedIndex + 1;

    while (nextIndex < flatOptions.length) {
      if (!flatOptions[nextIndex].disabled) {
        this.highlightedIndex = nextIndex;
        return;
      }
      nextIndex++;
    }
  }

  private highlightPreviousOption(): void {
    const flatOptions = this.getFlatOptions();
    let prevIndex = this.highlightedIndex - 1;

    while (prevIndex >= 0) {
      if (!flatOptions[prevIndex].disabled) {
        this.highlightedIndex = prevIndex;
        return;
      }
      prevIndex--;
    }
  }

  isOptionSelected(option: SelectOption): boolean {
    if (this.multiple && Array.isArray(this.value)) {
      return this.value.includes(option.value);
    }
    return this.value === option.value;
  }

  isOptionHighlighted(index: number): boolean {
    return this.highlightedIndex === index;
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