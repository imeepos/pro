import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { DropdownItem, Color, Size } from '../interfaces/component-base.interface';
import { BadgeComponent } from '../badge/badge.component';

@Component({
  selector: 'pro-dropdown',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  template: `
    <div class="dropdown-container">
      <!-- Trigger -->
      <div class="dropdown-trigger">
        <button
          [id]="buttonId"
          [class]="triggerButtonClasses"
          [attr.aria-expanded]="isOpen"
          [attr.aria-haspopup]="true"
          [disabled]="disabled"
          (click)="toggleDropdown()"
          (keydown)="handleTriggerKeydown($event)">

          <!-- Trigger Content -->
          <ng-container *ngIf="!customTrigger">
            <!-- Button Icon -->
            <span *ngIf="icon" class="trigger-icon">
              <svg [attr.viewBox]="iconViewBox" fill="none" stroke="currentColor" class="w-4 h-4">
                <path [attr.d]="icon" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
              </svg>
            </span>

            <!-- Button Label -->
            <span *ngIf="label" class="trigger-label">{{ label }}</span>

            <!-- Dropdown Arrow -->
            <span class="trigger-arrow" [class]="arrowClasses">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </ng-container>

          <!-- Custom Trigger Content -->
          <ng-content select="[trigger]"></ng-content>
        </button>
      </div>

      <!-- Dropdown Menu -->
      <div
        *ngIf="isOpen"
        [class]="menuClasses"
        [attr.aria-labelledby]="buttonId"
        role="menu">

        <div
          *ngFor="let item of visibleItems; let i = index"
          [class]="getItemClasses(item)"
          role="menuitem"
          (click)="selectItem(item, $event)">

          <!-- Divider -->
          <div *ngIf="item.divider" class="dropdown-divider"></div>

          <!-- Regular Item -->
          <ng-container *ngIf="!item.divider">
            <div class="dropdown-item-content">
              <!-- Item Icon -->
              <span *ngIf="item.icon" class="item-icon">
                <svg [attr.viewBox]="iconViewBox" fill="none" stroke="currentColor" class="w-4 h-4">
                  <path [attr.d]="item.icon" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                </svg>
              </span>

              <!-- Item Label -->
              <span class="item-label">{{ item.label }}</span>

              <!-- Item Badge -->
              <span *ngIf="item.badge" class="item-badge">
                <pro-badge [color]="item.badge.color || 'secondary'" [size]="'xs'" [variant]="'soft'">
                  {{ item.badge.text }}
                </pro-badge>
              </span>

              <!-- Checkmark for Selected Item -->
              <span *ngIf="isItemSelected(item)" class="item-checkmark">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </div>
          </ng-container>
        </div>

        <!-- Empty State -->
        <div *ngIf="visibleItems.length === 0" class="dropdown-empty">
          <div class="empty-icon">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p class="empty-text">{{ emptyText }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dropdown-container {
      @apply relative inline-block;
    }

    .dropdown-trigger {
      @apply relative;
    }

    .trigger-button {
      @apply inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2;
      @apply border rounded-md shadow-sm;
      @apply bg-white dark:bg-gray-800 text-gray-900 dark:text-white;
      @apply border-gray-300 dark:border-gray-600;
      @apply hover:bg-gray-50 dark:hover:bg-gray-700;
      @apply focus:ring-blue-500 focus:border-blue-500;
      @apply dark:focus:ring-offset-gray-800;
    }

    .trigger-button:disabled {
      @apply opacity-50 cursor-not-allowed hover:bg-white dark:hover:bg-gray-800;
    }

    .trigger-icon {
      @apply flex-shrink-0 mr-2;
    }

    .trigger-label {
      @apply flex-1;
    }

    .trigger-arrow {
      @apply ml-2 transition-transform duration-200;
    }

    .trigger-arrow-open {
      @apply transform rotate-180;
    }

    .dropdown-menu {
      @apply absolute z-20 min-w-max bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg;
      @apply py-1;
    }

    .dropdown-item {
      @apply px-3 py-2 cursor-pointer transition-colors duration-150;
      @apply hover:bg-gray-50 dark:hover:bg-gray-700;
      @apply focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none;
    }

    .dropdown-item-disabled {
      @apply opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent;
    }

    .dropdown-item-danger {
      @apply text-red-600 dark:text-red-400;
    }

    .dropdown-item-content {
      @apply flex items-center space-x-3;
    }

    .item-icon {
      @apply flex-shrink-0 text-gray-400 dark:text-gray-500;
    }

    .item-label {
      @apply flex-1 text-sm font-medium text-gray-900 dark:text-white;
    }

    .item-badge {
      @apply flex-shrink-0;
    }

    .item-checkmark {
      @apply flex-shrink-0 text-green-600 dark:text-green-400;
    }

    .dropdown-divider {
      @apply my-1 border-t border-gray-200 dark:border-gray-700;
    }

    .dropdown-empty {
      @apply px-4 py-6 text-center;
    }

    .empty-icon {
      @apply mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-2;
    }

    .empty-text {
      @apply text-sm text-gray-500 dark:text-gray-400;
    }

    /* Positioning */
    .dropdown-menu-bottom-left {
      @apply top-full left-0 mt-1;
    }

    .dropdown-menu-bottom-right {
      @apply top-full right-0 mt-1;
    }

    .dropdown-menu-top-left {
      @apply bottom-full left-0 mb-1;
    }

    .dropdown-menu-top-right {
      @apply bottom-full right-0 mb-1;
    }
  `]
})
export class DropdownComponent {
  @Input() label = '';
  @Input() items: DropdownItem[] = [];
  @Input() icon = '';
  @Input() disabled = false;
  @Input() size: Size = 'md';
  @Input() color: Color = 'primary';
  @Input() placement: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' = 'bottom-left';
  @Input() trigger: 'click' | 'hover' = 'click';
  @Input() closeOnSelect = true;
  @Input() searchable = false;
  @Input() multiple = false;
  @Input() selectedValue: any = null;
  @Input() selectedValues: any[] = [];
  @Input() emptyText = '暂无选项';
  @Input() customTrigger = false;

  @Output() select = new EventEmitter<DropdownItem | DropdownItem[]>();
  @Output() open = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  isOpen = false;
  searchTerm = '';
  private internalSelectedValues: any[] = [];

  buttonId = `dropdown-button-${Math.random().toString(36).substr(2, 9)}`;
  iconViewBox = '0 0 24 24';

  get triggerButtonClasses(): string {
    const baseClasses = 'trigger-button';

    // Size classes
    const sizeClasses = {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-4 py-2 text-base',
      xl: 'px-6 py-3 text-base'
    };

    // Color classes
    const colorClasses = {
      primary: 'focus:ring-blue-500 focus:border-blue-500',
      secondary: 'focus:ring-gray-500 focus:border-gray-500',
      success: 'focus:ring-green-500 focus:border-green-500',
      warning: 'focus:ring-yellow-500 focus:border-yellow-500',
      error: 'focus:ring-red-500 focus:border-red-500',
      info: 'focus:ring-cyan-500 focus:border-cyan-500'
    };

    return `${baseClasses} ${sizeClasses[this.size]} ${colorClasses[this.color]}`;
  }

  get arrowClasses(): string {
    const baseClasses = 'trigger-arrow';
    const openClass = this.isOpen ? 'trigger-arrow-open' : '';
    return `${baseClasses} ${openClass}`;
  }

  get menuClasses(): string {
    const baseClasses = 'dropdown-menu';
    const positionClass = `dropdown-menu-${this.placement}`;
    return `${baseClasses} ${positionClass}`;
  }

  get visibleItems(): DropdownItem[] {
    if (!this.searchable || !this.searchTerm) {
      return this.items;
    }

    return this.items.filter(item =>
      item.label.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  getItemClasses(item: DropdownItem): string {
    const baseClasses = 'dropdown-item';

    if (item.disabled) {
      return `${baseClasses} dropdown-item-disabled`;
    }

    if (item.danger) {
      return `${baseClasses} dropdown-item-danger`;
    }

    return baseClasses;
  }

  toggleDropdown(): void {
    if (this.disabled) return;

    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown(): void {
    this.isOpen = true;
    this.open.emit();
  }

  closeDropdown(): void {
    this.isOpen = false;
    this.searchTerm = '';
    this.close.emit();
  }

  selectItem(item: DropdownItem, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (item.disabled || item.divider) return;

    if (this.multiple) {
      if (!this.internalSelectedValues.includes(item.value)) {
        this.internalSelectedValues.push(item.value);
      } else {
        this.internalSelectedValues = this.internalSelectedValues.filter(v => v !== item.value);
      }
      this.select.emit(this.getSelectedItems());
    } else {
      this.selectedValue = item.value;
      this.select.emit(item);

      if (this.closeOnSelect) {
        this.closeDropdown();
      }
    }
  }

  handleTriggerKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.toggleDropdown();
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen) {
          this.openDropdown();
        }
        break;

      case 'Escape':
        if (this.isOpen) {
          event.preventDefault();
          this.closeDropdown();
        }
        break;
    }
  }

  isItemSelected(item: DropdownItem): boolean {
    if (this.multiple) {
      return this.internalSelectedValues.includes(item.value);
    }
    return this.selectedValue === item.value;
  }

  private getSelectedItems(): DropdownItem[] {
    return this.items.filter(item => this.internalSelectedValues.includes(item.value));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (this.isOpen && event.key === 'Escape') {
      this.closeDropdown();
    }
  }
}