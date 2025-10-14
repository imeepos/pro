import { Component, forwardRef, input, model, output, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  FormField,
  FormControl,
  provideFlowbiteFormFieldConfig,
  provideFlowbiteFormControlConfig,
  FlowbiteFormFieldSizes,
  FlowbiteFormFieldColors
} from 'flowbite-angular/form';
import {
  DropdownContent,
  DropdownItem,
  provideFlowbiteDropdownConfig,
  provideFlowbiteDropdownContentConfig,
  provideFlowbiteDropdownItemConfig,
  FlowbiteDropdownStateToken
} from 'flowbite-angular/dropdown';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [
    CommonModule,
    FormField,
    FormControl,
    DropdownContent,
    DropdownItem
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    },
    provideFlowbiteFormFieldConfig({
      size: 'md',
      color: 'default',
      mode: 'normal'
    }),
    provideFlowbiteFormControlConfig({}),
    provideFlowbiteDropdownConfig({
      color: 'default'
    }),
    provideFlowbiteDropdownContentConfig({}),
    provideFlowbiteDropdownItemConfig({}),
    {
      provide: FlowbiteDropdownStateToken,
      useValue: {}
    }
  ],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss'
})
export class SelectComponent implements ControlValueAccessor {

  // Inputs
  options = input<SelectOption[]>([]);
  placeholder = input<string>('请选择');
  disabled = input<boolean>(false);
  clearable = input<boolean>(false);
  searchable = input<boolean>(false);
  loading = input<boolean>(false);

  // Flowbite theme inputs
  size = input<keyof FlowbiteFormFieldSizes>('md');
  color = input<keyof FlowbiteFormFieldColors>('default');
  customTheme = input<any>({});

  // Model for two-way binding
  value = model<string | number | null>(null);

  // Outputs
  selectionChange = output<SelectOption | null>();
  clear = output<void>();

  // Internal state
  isOpen = signal(false);
  searchTerm = signal('');
  highlightedIndex = signal(-1);

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      // Update highlighted index when search term changes
      this.highlightedIndex.set(-1);
    });

    // Add click outside listener using document click handling
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.handleClickOutside.bind(this));
  }

  private handleClickOutside = (event: MouseEvent): void => {
    const target = event.target as Element;
    const dropdownContainer = target.closest('[flowbiteDropdown]');

    // Close dropdown if clicking outside
    if (!dropdownContainer && this.isOpen()) {
      this.closeDropdown();
    }
  };

  // Enhanced value getter with better null handling
  get selectedOption(): SelectOption | null {
    const currentValue = this.value();
    if (currentValue === null || currentValue === undefined) {
      return null;
    }
    return this.options().find(option => option.value === currentValue) || null;
  }

  // Optimized filtered options with memoization potential
  get filteredOptions(): SelectOption[] {
    if (!this.searchable()) {
      return this.options();
    }

    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return this.options();
    }

    return this.options().filter(option =>
      option.label.toLowerCase().includes(term) &&
      !option.disabled
    );
  }

  
  get displayValue(): string {
    const selected = this.selectedOption;
    return selected ? selected.label : this.placeholder();
  }

  toggleDropdown(): void {
    if (this.disabled()) return;

    this.isOpen.set(!this.isOpen());
    if (this.isOpen()) {
      this.searchTerm.set('');
      this.focusSearch();
    }
  }

  openDropdown(): void {
    if (this.disabled()) return;
    this.isOpen.set(true);
    this.focusSearch();
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.searchTerm.set('');
    this.highlightedIndex.set(-1);
  }

  selectOption(option: SelectOption): void {
    if (option.disabled) return;

    this.value.set(option.value);
    this.selectionChange.emit(option);
    this.onChange(option.value);
    this.closeDropdown();
  }

  clearSelection(): void {
    if (this.disabled()) return;

    this.value.set(null);
    this.selectionChange.emit(null);
    this.onChange(null);
    this.clear.emit();
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  highlightNext(): void {
    const filtered = this.filteredOptions;
    const current = this.highlightedIndex();
    const next = current < filtered.length - 1 ? current + 1 : 0;
    this.highlightedIndex.set(next);
  }

  highlightPrevious(): void {
    const filtered = this.filteredOptions;
    const current = this.highlightedIndex();
    const prev = current > 0 ? current - 1 : filtered.length - 1;
    this.highlightedIndex.set(prev);
  }

  selectHighlighted(): void {
    const filtered = this.filteredOptions;
    const highlighted = this.highlightedIndex();

    if (highlighted >= 0 && highlighted < filtered.length) {
      this.selectOption(filtered[highlighted]);
    }
  }

  private focusSearch(): void {
    if (this.searchable()) {
      setTimeout(() => {
        const searchInput = document.querySelector('.search-input') as HTMLInputElement;
        searchInput?.focus();
      });
    }
  }

  // Enhanced keyboard navigation with better accessibility
  onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.isOpen()) {
          this.selectHighlighted();
        } else {
          this.openDropdown();
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (this.isOpen()) {
          this.highlightNext();
        } else {
          this.openDropdown();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (this.isOpen()) {
          this.highlightPrevious();
        } else {
          this.openDropdown();
        }
        break;
      case 'Tab':
        this.closeDropdown();
        break;
      case 'Home':
        event.preventDefault();
        if (this.isOpen()) {
          this.highlightedIndex.set(0);
        }
        break;
      case 'End':
        event.preventDefault();
        if (this.isOpen()) {
          this.highlightedIndex.set(this.filteredOptions.length - 1);
        }
        break;
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.value.set(value);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // This will be handled by the disabled input signal
  }
}