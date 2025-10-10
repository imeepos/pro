import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { FormElement, Color, Size } from '../interfaces/component-base.interface';

@Component({
  selector: 'pro-search-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="search-input-container">
      <!-- Search Icon -->
      <div class="search-input-icon">
        <svg [attr.viewBox]="iconViewBox" fill="none" stroke="currentColor" [class]="iconClasses">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Input Field -->
      <input
        #searchInput
        [type]="type"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [readonly]="readonly"
        [required]="required"
        [attr.aria-label]="ariaLabel"
        [attr.aria-expanded]="showSuggestions"
        [attr.aria-activedescendant]="highlightedSuggestion ? 'suggestion-' + highlightedIndex : null"
        [attr.aria-autocomplete]="suggestions.length > 0 ? 'list' : null"
        [attr.aria-owns]="suggestions.length > 0 ? 'suggestions-list' : null"
        [class]="inputClasses"
        [value]="value"
        (input)="handleInput($event)"
        (keydown)="handleKeydown($event)"
        (focus)="handleFocus()"
        (blur)="handleBlur()"
        (search)="handleClear($event)"
      />

      <!-- Clear Button -->
      <button
        *ngIf="clearable && value && !disabled && !readonly"
        type="button"
        [class]="clearButtonClasses"
        (click)="clearValue()"
        [attr.aria-label]="clearButtonAriaLabel">
        <svg [attr.viewBox]="iconViewBox" fill="none" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Loading Indicator -->
      <div *ngIf="loading" class="search-input-loading">
        <pro-spinner type="circular" [size]="size === 'xs' || size === 'sm' ? 'xs' : 'sm'" [color]="color"></pro-spinner>
      </div>

      <!-- Suggestions Dropdown -->
      <div *ngIf="showSuggestions && suggestions.length > 0"
           class="suggestions-dropdown"
           role="listbox"
           id="suggestions-list">
        <div
          *ngFor="let suggestion of suggestions; let i = index"
          role="option"
          [id]="'suggestion-' + i"
          [class]="getSuggestionClasses(i)"
          (click)="selectSuggestion(suggestion)"
          (mouseenter)="highlightedIndex = i">
          <div class="suggestion-content">
            <!-- Suggestion Icon -->
            <div *ngIf="suggestion.icon" class="suggestion-icon">
              <svg [attr.viewBox]="iconViewBox" fill="none" stroke="currentColor" class="w-4 h-4">
                <path [attr.d]="suggestion.icon" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
              </svg>
            </div>

            <!-- Suggestion Text -->
            <div class="suggestion-text">
              <div class="suggestion-label">{{ suggestion.label }}</div>
              <div *ngIf="suggestion.description" class="suggestion-description">
                {{ suggestion.description }}
              </div>
            </div>

            <!-- Suggestion Type Badge -->
            <div *ngIf="suggestion.type" class="suggestion-type">
              <pro-badge [color]="getTypeColor(suggestion.type)" [size]="'xs'" [variant]="'soft'">
                {{ suggestion.type }}
              </pro-badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-input-container {
      @apply relative;
    }

    .search-input-icon {
      @apply absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none;
    }

    .search-input-loading {
      @apply absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none;
    }

    .search-input-field {
      @apply block w-full border rounded-lg shadow-sm transition-colors duration-200;
      @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
      @apply bg-white dark:bg-gray-800 text-gray-900 dark:text-white;
      @apply placeholder-gray-500 dark:placeholder-gray-400;
    }

    .search-input-field:focus {
      @apply ring-blue-500 border-blue-500;
    }

    .search-input-field:disabled {
      @apply bg-gray-50 dark:bg-gray-700 cursor-not-allowed;
    }

    .search-input-field::-webkit-search-cancel-button {
      @apply hidden;
    }

    .clear-button {
      @apply absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200;
    }

    .suggestions-dropdown {
      @apply absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto;
    }

    .suggestion-item {
      @apply px-3 py-2 cursor-pointer transition-colors duration-150;
      @apply hover:bg-gray-50 dark:hover:bg-gray-700;
    }

    .suggestion-item-highlighted {
      @apply bg-gray-50 dark:bg-gray-700;
    }

    .suggestion-content {
      @apply flex items-center space-x-3;
    }

    .suggestion-icon {
      @apply flex-shrink-0 text-gray-400 dark:text-gray-500;
    }

    .suggestion-text {
      @apply flex-1 min-w-0;
    }

    .suggestion-label {
      @apply text-sm font-medium text-gray-900 dark:text-white truncate;
    }

    .suggestion-description {
      @apply text-xs text-gray-500 dark:text-gray-400 truncate;
    }

    .suggestion-type {
      @apply flex-shrink-0;
    }
  `]
})
export class SearchInputComponent implements FormElement {
  @Input() value = '';
  @Input() placeholder = '搜索...';
  @Input() type: 'text' | 'search' = 'search';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  @Input() clearable = true;
  @Input() loading = false;
  @Input() size: Size = 'md';
  @Input() color: Color = 'primary';
  @Input() ariaLabel = '搜索';
  @Input() clearButtonAriaLabel = '清除搜索';
  @Input() debounceTime = 300;

  @Output() valueChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();
  @Output() clear = new EventEmitter<void>();
  @Output() focus = new EventEmitter<FocusEvent>();
  @Output() blur = new EventEmitter<FocusEvent>();
  @Output() suggestionSelect = new EventEmitter<any>();

  @Input() suggestions: Array<{
    label: string;
    value: any;
    description?: string;
    icon?: string;
    type?: string;
  }> = [];

  showSuggestions = false;
  highlightedIndex = -1;
  private debounceTimer: any = null;

  iconViewBox = '0 0 24 24';

  get inputClasses(): string {
    const baseClasses = 'search-input-field';

    // Size classes with icon padding
    const sizeClasses = {
      xs: 'pl-8 pr-8 py-1 text-xs',
      sm: 'pl-9 pr-9 py-1.5 text-sm',
      md: 'pl-10 pr-10 py-2 text-sm',
      lg: 'pl-11 pr-11 py-2.5 text-base',
      xl: 'pl-12 pr-12 py-3 text-lg'
    };

    return `${baseClasses} ${sizeClasses[this.size]}`;
  }

  get iconClasses(): string {
    const sizeClasses = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-5 h-5',
      xl: 'w-6 h-6'
    };

    const colorClasses = {
      primary: 'text-blue-500 dark:text-blue-400',
      secondary: 'text-gray-500 dark:text-gray-400',
      success: 'text-green-500 dark:text-green-400',
      warning: 'text-yellow-500 dark:text-yellow-400',
      error: 'text-red-500 dark:text-red-400',
      info: 'text-cyan-500 dark:text-cyan-400'
    };

    return `${sizeClasses[this.size]} ${colorClasses[this.color]}`;
  }

  get clearButtonClasses(): string {
    return 'clear-button';
  }

  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newValue = target.value;

    // Clear previous debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new debounce timer
    this.debounceTimer = setTimeout(() => {
      this.value = newValue;
      this.valueChange.emit(newValue);
      this.search.emit(newValue);
      this.showSuggestions = newValue.length > 0 && this.suggestions.length > 0;
    }, this.debounceTime);

    // Update suggestions visibility immediately for better UX
    this.showSuggestions = newValue.length > 0 && this.suggestions.length > 0;
    this.highlightedIndex = -1;
  }

  handleKeydown(event: KeyboardEvent): void {
    if (!this.showSuggestions || this.suggestions.length === 0) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.search.emit(this.value);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.suggestions.length - 1);
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
        break;

      case 'Enter':
        event.preventDefault();
        if (this.highlightedIndex >= 0) {
          this.selectSuggestion(this.suggestions[this.highlightedIndex]);
        } else {
          this.search.emit(this.value);
          this.showSuggestions = false;
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.showSuggestions = false;
        this.highlightedIndex = -1;
        break;

      case 'Tab':
        this.showSuggestions = false;
        this.highlightedIndex = -1;
        break;
    }
  }

  handleFocus(): void {
    this.focus.emit();
    if (this.value && this.suggestions.length > 0) {
      this.showSuggestions = true;
    }
  }

  handleBlur(): void {
    // Delay hiding suggestions to allow click events on suggestions
    setTimeout(() => {
      this.showSuggestions = false;
      this.highlightedIndex = -1;
      this.blur.emit();
    }, 200);
  }

  handleClear(event: Event): void {
    event.preventDefault();
    this.clearValue();
  }

  clearValue(): void {
    this.value = '';
    this.valueChange.emit('');
    this.search.emit('');
    this.clear.emit();
    this.showSuggestions = false;
    this.highlightedIndex = -1;
  }

  selectSuggestion(suggestion: any): void {
    this.value = suggestion.label;
    this.valueChange.emit(suggestion.label);
    this.search.emit(suggestion.label);
    this.suggestionSelect.emit(suggestion);
    this.showSuggestions = false;
    this.highlightedIndex = -1;
  }

  getSuggestionClasses(index: number): string {
    const baseClasses = 'suggestion-item';
    const highlightedClass = index === this.highlightedIndex ? 'suggestion-item-highlighted' : '';
    return `${baseClasses} ${highlightedClass}`;
  }

  getTypeColor(type: string): Color {
    const typeColorMap: { [key: string]: Color } = {
      'category': 'secondary',
      'user': 'primary',
      'product': 'success',
      'order': 'warning',
      'error': 'error',
      'info': 'info'
    };

    return typeColorMap[type.toLowerCase()] || 'secondary';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-input-container')) {
      this.showSuggestions = false;
      this.highlightedIndex = -1;
    }
  }
}