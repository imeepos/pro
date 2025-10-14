import { Component, forwardRef, input, model, output, effect, signal, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

type SelectSize = 'sm' | 'md' | 'lg';
type SelectColor = 'default' | 'primary' | 'success' | 'warning' | 'error';

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px)' }),
        animate('150ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        style({ opacity: 1, transform: 'translateY(0)' }),
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-8px)' }))
      ])
    ])
  ]
})
export class SelectComponent implements ControlValueAccessor {
  @ViewChild('searchInput', { static: false }) searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('selectContainer', { static: true }) selectContainerRef!: ElementRef;

  // Inputs
  options = input<SelectOption[]>([]);
  placeholder = input<string>('请选择');
  disabled = input<boolean>(false);
  clearable = input<boolean>(false);
  searchable = input<boolean>(false);
  loading = input<boolean>(false);
  size = input<SelectSize>('md');
  color = input<SelectColor>('default');

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
      this.highlightedIndex.set(-1);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.selectContainerRef.nativeElement.contains(event.target)) {
      if (this.isOpen()) {
        this.closeDropdown();
      }
    }
  }

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

  handleSearchKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightNext();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightPrevious();
        break;
      case 'Enter':
        event.preventDefault();
        this.selectHighlighted();
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
    }
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
    if (this.searchable() && this.searchInputRef) {
      setTimeout(() => {
        this.searchInputRef?.nativeElement?.focus();
      });
    }
  }

  // Size classes utility
  getSizeClasses(): string {
    const sizeMap = {
      sm: 'text-xs px-2 py-1.5 min-h-[32px]',
      md: 'text-sm px-3 py-2 min-h-[40px]',
      lg: 'text-base px-4 py-3 min-h-[48px]'
    };
    return sizeMap[this.size()];
  }

  // Color classes utility
  getColorClasses(): string {
    const colorMap = {
      default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-200',
      primary: 'border-blue-300 focus:border-blue-600 focus:ring-blue-300',
      success: 'border-green-300 focus:border-green-600 focus:ring-green-300',
      warning: 'border-yellow-300 focus:border-yellow-600 focus:ring-yellow-300',
      error: 'border-red-300 focus:border-red-600 focus:ring-red-300'
    };
    return colorMap[this.color()];
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