import { Component, forwardRef, input, model, output, ViewChild, ElementRef, AfterViewInit, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

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
  styleUrl: './select.component.scss'
})
export class SelectComponent implements ControlValueAccessor, AfterViewInit {
  @ViewChild('trigger') triggerElement!: ElementRef;
  @ViewChild('dropdown') dropdownElement!: ElementRef;

  // Inputs
  options = input<SelectOption[]>([]);
  placeholder = input<string>('请选择');
  disabled = input<boolean>(false);
  clearable = input<boolean>(false);
  searchable = input<boolean>(false);
  loading = input<boolean>(false);

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
  }

  ngAfterViewInit() {
    // Add click outside listener
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.handleClickOutside.bind(this));
  }

  private handleClickOutside(event: MouseEvent) {
    const target = event.target as Node;
    if (!this.triggerElement?.nativeElement.contains(target) &&
        !this.dropdownElement?.nativeElement.contains(target)) {
      this.isOpen.set(false);
    }
  }

  get selectedOption(): SelectOption | null {
    if (this.value() === null || this.value() === undefined) {
      return null;
    }
    return this.options().find(option => option.value === this.value()) || null;
  }

  get filteredOptions(): SelectOption[] {
    if (!this.searchable()) {
      return this.options();
    }

    const term = this.searchTerm().toLowerCase();
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
        const searchInput = document.querySelector('.select-search-input') as HTMLInputElement;
        searchInput?.focus();
      });
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
    }
  }
}