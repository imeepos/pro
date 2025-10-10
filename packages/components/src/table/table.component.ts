import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableColumn, TableAction } from '../interfaces/component-base.interface';

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'pro-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="table-container">
      <!-- Loading Overlay -->
      <div *ngIf="loading" class="table-loading-overlay">
        <pro-spinner type="circular" size="lg" [color]="'primary'"></pro-spinner>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <!-- Table Header -->
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <!-- Checkbox Column -->
              <th *ngIf="selectable" class="table-checkbox-header">
                <input
                  type="checkbox"
                  [checked]="isAllSelected"
                  [indeterminate]="isIndeterminate"
                  (change)="toggleAllSelection($event)"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>

              <!-- Data Columns -->
              <th
                *ngFor="let column of columns"
                [class]="getHeaderClasses(column)"
                [style.width]="column.width"
                (click)="handleSort(column)">
                <div class="flex items-center justify-between">
                  <span>{{ column.label }}</span>
                  <div *ngIf="column.sortable" class="ml-2 flex flex-col">
                    <svg
                      class="w-3 h-3 text-gray-400"
                      [class]="getSortIconClass(column.key, 'asc')"
                      fill="currentColor"
                      viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                    </svg>
                    <svg
                      class="w-3 h-3 text-gray-400 -mt-1"
                      [class]="getSortIconClass(column.key, 'desc')"
                      fill="currentColor"
                      viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </div>
              </th>

              <!-- Actions Column -->
              <th *ngIf="actions && actions.length > 0" class="table-actions-header">
                操作
              </th>
            </tr>
          </thead>

          <!-- Table Body -->
          <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            <!-- Empty State -->
            <tr *ngIf="!loading && data.length === 0">
              <td [attr.colspan]="totalColumns" class="table-empty-cell">
                <div class="table-empty-state">
                  <svg class="table-empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 class="table-empty-title">暂无数据</h3>
                  <p class="table-empty-text">{{ emptyText }}</p>
                </div>
              </td>
            </tr>

            <!-- Data Rows -->
            <tr
              *ngFor="let row of data; trackBy: trackByFn"
              [class]="getRowClasses(row)"
              (click)="handleRowClick(row)">
              <!-- Checkbox Cell -->
              <td *ngIf="selectable" class="table-checkbox-cell">
                <input
                  type="checkbox"
                  [checked]="isRowSelected(row)"
                  (change)="toggleRowSelection(row, $event)"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </td>

              <!-- Data Cells -->
              <td
                *ngFor="let column of columns"
                [class]="getCellClasses(column)">
                <span *ngIf="column.render" [innerHTML]="column.render(getCellValue(row, column.key), row)"></span>
                <span *ngIf="!column.render">{{ getCellValue(row, column.key) }}</span>
              </td>

              <!-- Actions Cell -->
              <td *ngIf="actions && actions.length > 0" class="table-actions-cell">
                <div class="flex items-center space-x-2">
                  <button
                    *ngFor="let action of actions"
                    [disabled]="action.disabled ? action.disabled(row) : false"
                    [class]="getActionButtonClasses(action, row)"
                    (click)="action.action(row); $event.stopPropagation()"
                    [title]="action.label">
                    <svg *ngIf="action.icon" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path [attr.d]="action.icon" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                    </svg>
                    <span *ngIf="!action.icon">{{ action.label }}</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .table-container {
      position: relative;
    }

    .table-loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }

    .table-checkbox-header,
    .table-checkbox-cell {
      @apply w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider;
    }

    .table-checkbox-cell {
      @apply whitespace-nowrap;
    }

    .table-actions-header,
    .table-actions-cell {
      @apply px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider;
    }

    .table-actions-cell {
      @apply whitespace-nowrap;
    }

    .table-empty-cell {
      @apply px-6 py-12 text-center;
    }

    .table-empty-state {
      @apply flex flex-col items-center justify-center;
    }

    .table-empty-icon {
      @apply mx-auto h-12 w-12 text-gray-400;
    }

    .table-empty-title {
      @apply mt-2 text-sm font-medium text-gray-900 dark:text-white;
    }

    .table-empty-text {
      @apply mt-1 text-sm text-gray-500 dark:text-gray-400;
    }

    .table-row-hover:hover {
      @apply bg-gray-50 dark:bg-gray-800;
    }

    .table-row-selected {
      @apply bg-blue-50 dark:bg-blue-900/20;
    }

    .table-row-striped:nth-child(even) {
      @apply bg-gray-50 dark:bg-gray-800;
    }

    .table-cell-padding {
      @apply px-6 py-4;
    }

    .table-cell-text-left {
      @apply text-left;
    }

    .table-cell-text-center {
      @apply text-center;
    }

    .table-cell-text-right {
      @apply text-right;
    }

    .table-cell-text-sm {
      @apply text-sm text-gray-900 dark:text-white;
    }

    .table-header-cursor {
      @apply cursor-pointer;
    }

    .table-sort-active {
      @apply text-blue-600 dark:text-blue-400;
    }

    .table-action-button {
      @apply inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors duration-200;
    }

    .table-action-button-primary {
      @apply text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20;
    }

    .table-action-button-success {
      @apply text-green-600 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20;
    }

    .table-action-button-warning {
      @apply text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:text-yellow-300 dark:hover:bg-yellow-900/20;
    }

    .table-action-button-error {
      @apply text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20;
    }

    .table-action-button:disabled {
      @apply opacity-50 cursor-not-allowed hover:bg-transparent hover:text-current;
    }
  `]
})
export class TableComponent implements OnChanges {
  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() actions: TableAction[] = [];
  @Input() loading = false;
  @Input() selectable = false;
  @Input() striped = false;
  @Input() hover = true;
  @Input() emptyText = '暂无数据显示';
  @Input() trackBy: string = 'id';
  @Input() sortConfig: SortConfig | null = null;
  @Input() selectedRows: any[] = [];

  @Output() sort = new EventEmitter<SortConfig>();
  @Output() rowClick = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any[]>();

  private internalSelectedRows: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedRows']) {
      this.internalSelectedRows = [...this.selectedRows];
    }
  }

  get totalColumns(): number {
    let count = this.columns.length;
    if (this.selectable) count++;
    if (this.actions && this.actions.length > 0) count++;
    return count;
  }

  getHeaderClasses(column: TableColumn): string {
    const baseClasses = [
      'px-6 py-3',
      'text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
    ];

    if (column.align === 'center') {
      baseClasses.push('text-center');
    } else if (column.align === 'right') {
      baseClasses.push('text-right');
    }

    if (column.sortable) {
      baseClasses.push('table-header-cursor');
    }

    return baseClasses.join(' ');
  }

  getCellClasses(column: TableColumn): string {
    const baseClasses = ['table-cell-padding', 'table-cell-text-sm'];

    if (column.align === 'center') {
      baseClasses.push('table-cell-text-center');
    } else if (column.align === 'right') {
      baseClasses.push('table-cell-text-right');
    } else {
      baseClasses.push('table-cell-text-left');
    }

    return baseClasses.join(' ');
  }

  getRowClasses(row: any): string {
    const classes = [];

    if (this.striped) {
      classes.push('table-row-striped');
    }

    if (this.hover) {
      classes.push('table-row-hover');
    }

    if (this.isRowSelected(row)) {
      classes.push('table-row-selected');
    }

    return classes.join(' ');
  }

  getSortIconClass(columnKey: string, direction: 'asc' | 'desc'): string {
    if (!this.sortConfig || this.sortConfig.key !== columnKey) {
      return '';
    }

    if (this.sortConfig.direction === direction) {
      return 'table-sort-active';
    }

    return '';
  }

  getActionButtonClasses(action: TableAction, row: any): string {
    const baseClasses = ['table-action-button'];

    if (action.disabled && action.disabled(row)) {
      return baseClasses.join(' ');
    }

    if (action.danger) {
      baseClasses.push('table-action-button-error');
    } else if (action.color) {
      baseClasses.push(`table-action-button-${action.color}`);
    } else {
      baseClasses.push('table-action-button-primary');
    }

    return baseClasses.join(' ');
  }

  getCellValue(row: any, key: string): any {
    return key.split('.').reduce((obj, k) => obj?.[k], row);
  }

  trackByFn(index: number, item: any): any {
    return item[this.trackBy] || index;
  }

  handleSort(column: TableColumn): void {
    if (!column.sortable) return;

    let direction: 'asc' | 'desc' = 'asc';

    if (this.sortConfig && this.sortConfig.key === column.key) {
      direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }

    this.sortConfig = { key: column.key, direction };
    this.sort.emit(this.sortConfig);
  }

  handleRowClick(row: any): void {
    this.rowClick.emit(row);
  }

  // Selection methods
  get isAllSelected(): boolean {
    return this.data.length > 0 && this.internalSelectedRows.length === this.data.length;
  }

  get isIndeterminate(): boolean {
    return this.internalSelectedRows.length > 0 && this.internalSelectedRows.length < this.data.length;
  }

  isRowSelected(row: any): boolean {
    return this.internalSelectedRows.some(selected => selected[this.trackBy] === row[this.trackBy]);
  }

  toggleAllSelection(event: Event): void {
    const target = event.target as HTMLInputElement;

    if (target.checked) {
      this.internalSelectedRows = [...this.data];
    } else {
      this.internalSelectedRows = [];
    }

    this.selectionChange.emit(this.internalSelectedRows);
  }

  toggleRowSelection(row: any, event: Event): void {
    const target = event.target as HTMLInputElement;

    if (target.checked) {
      if (!this.isRowSelected(row)) {
        this.internalSelectedRows.push(row);
      }
    } else {
      this.internalSelectedRows = this.internalSelectedRows.filter(
        selected => selected[this.trackBy] !== row[this.trackBy]
      );
    }

    this.selectionChange.emit(this.internalSelectedRows);
  }
}