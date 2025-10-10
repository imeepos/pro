import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'pro-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="containerClasses">
      <!-- Page Size Selector -->
      <div *ngIf="showSizeChanger" class="pagination-size-selector">
        <span class="pagination-text">显示</span>
        <select
          [value]="pageSize"
          (change)="handlePageSizeChange($event)"
          class="pagination-select">
          <option *ngFor="let size of pageSizeOptions" [value]="size">
            {{ size }}
          </option>
        </select>
        <span class="pagination-text">条</span>
      </div>

      <!-- Pagination Info -->
      <div class="pagination-info">
        <span class="pagination-text">
          第 {{ startItem }}-{{ endItem }} 条，共 {{ total }} 条
        </span>
      </div>

      <!-- Pagination Controls -->
      <div class="pagination-controls">
        <!-- First Page -->
        <button
          [disabled]="currentPage <= 1"
          [class]="getButtonClasses()"
          (click)="goToFirstPage()"
          title="首页">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        <!-- Previous Page -->
        <button
          [disabled]="currentPage <= 1"
          [class]="getButtonClasses()"
          (click)="goToPreviousPage()"
          title="上一页">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <!-- Page Numbers -->
        <div class="pagination-pages">
          <button
            *ngFor="let page of visiblePages; trackBy: trackByPage"
            [class]="getPageButtonClasses(page)"
            (click)="goToPage(page)">
            {{ page }}
          </button>
        </div>

        <!-- Next Page -->
        <button
          [disabled]="currentPage >= totalPages"
          [class]="getButtonClasses()"
          (click)="goToNextPage()"
          title="下一页">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Last Page -->
        <button
          [disabled]="currentPage >= totalPages"
          [class]="getButtonClasses()"
          (click)="goToLastPage()"
          title="末页">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Quick Jumper -->
      <div *ngIf="showQuickJumper" class="pagination-jumper">
        <span class="pagination-text">跳至</span>
        <input
          type="number"
          [min]="1"
          [max]="totalPages"
          [value]="jumpPage"
          (input)="jumpPage = $any($event.target).value"
          (keyup.enter)="handleJump()"
          class="pagination-input"
          placeholder="页码" />
        <span class="pagination-text">页</span>
        <button
          [disabled]="!isValidJumpPage"
          [class]="getButtonClasses()"
          (click)="handleJump()"
          class="pagination-jump-button">
          确定
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pagination-container {
      @apply flex items-center justify-between;
    }

    .pagination-size-selector,
    .pagination-jumper,
    .pagination-info {
      @apply flex items-center space-x-2;
    }

    .pagination-controls {
      @apply flex items-center space-x-1;
    }

    .pagination-pages {
      @apply flex items-center space-x-1;
    }

    .pagination-text {
      @apply text-sm text-gray-700 dark:text-gray-300;
    }

    .pagination-select {
      @apply inline-flex items-center px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
    }

    .pagination-input {
      @apply w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
    }

    .pagination-button {
      @apply inline-flex items-center justify-center w-8 h-8 text-sm font-medium border rounded-md transition-colors duration-200;
    }

    .pagination-button-default {
      @apply border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700;
    }

    .pagination-button-active {
      @apply border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20;
    }

    .pagination-button:disabled {
      @apply opacity-50 cursor-not-allowed hover:bg-white dark:hover:bg-gray-800;
    }

    .pagination-jump-button {
      @apply ml-2 px-3 py-1 text-sm;
    }
  `]
})
export class PaginationComponent implements OnChanges {
  @Input() currentPage = 1;
  @Input() pageSize = 10;
  @Input() total = 0;
  @Input() showSizeChanger = false;
  @Input() showQuickJumper = false;
  @Input() pageSizeOptions: number[] = [10, 20, 50, 100];
  @Input() maxVisiblePages = 7;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  jumpPage: number | null = null;
  totalPages = 0;
  startItem = 0;
  endItem = 0;

  get containerClasses(): string {
    return 'pagination-container';
  }

  get visiblePages(): number[] {
    if (this.totalPages === 0) return [];

    const pages: number[] = [];
    const halfVisible = Math.floor(this.maxVisiblePages / 2);

    let start = Math.max(1, this.currentPage - halfVisible);
    let end = Math.min(this.totalPages, start + this.maxVisiblePages - 1);

    // Adjust start if we're near the end
    if (end - start + 1 < this.maxVisiblePages) {
      start = Math.max(1, end - this.maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  get isValidJumpPage(): boolean {
    return this.jumpPage !== null &&
           this.jumpPage >= 1 &&
           this.jumpPage <= this.totalPages;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentPage'] || changes['pageSize'] || changes['total']) {
      this.calculateDerivedValues();
    }
  }

  private calculateDerivedValues(): void {
    this.totalPages = Math.ceil(this.total / this.pageSize) || 1;
    this.startItem = this.total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    this.endItem = Math.min(this.currentPage * this.pageSize, this.total);
  }

  getButtonClasses(): string {
    return 'pagination-button pagination-button-default';
  }

  getPageButtonClasses(page: number): string {
    if (page === this.currentPage) {
      return 'pagination-button pagination-button-active';
    }
    return 'pagination-button pagination-button-default';
  }

  goToFirstPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(1);
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  goToLastPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.totalPages);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.pageChange.emit(page);
    }
  }

  handlePageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newPageSize = parseInt(target.value, 10);

    if (newPageSize !== this.pageSize) {
      this.pageSize = newPageSize;
      this.calculateDerivedValues();

      // Reset to first page if current page would be out of bounds
      if (this.currentPage > this.totalPages) {
        this.goToPage(1);
      } else {
        this.pageSizeChange.emit(newPageSize);
      }
    }
  }

  handleJump(): void {
    if (this.isValidJumpPage && this.jumpPage !== this.currentPage) {
      this.goToPage(this.jumpPage!);
    }
    this.jumpPage = null;
  }

  trackByPage(_index: number, page: number): number {
    return page;
  }
}