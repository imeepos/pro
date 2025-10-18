import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  RawData,
  RawDataFilters,
  RawDataStats,
  ProcessingStatus,
  SourceType,
  SourcePlatform
} from '@pro/types';
import { DataService } from '../services';

@Component({
  selector: 'app-data-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './data-list.component.html',
  styleUrls: ['./data-list.component.scss']
})
export class DataListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ProcessingStatus = ProcessingStatus;
  SourceType = SourceType;
  SourcePlatform = SourcePlatform;

  dataList: RawData[] = [];
  selectedData: RawData | null = null;
  stats: RawDataStats | null = null;
  loading: boolean = false;
  error: string | null = null;

  showDeleteModal = false;
  showProcessModal = false;
  showBulkActionModal = false;

  searchForm: FormGroup;
  selectedItems: Set<number> = new Set();

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  constructor(
    private fb: FormBuilder,
    public dataService: DataService
  ) {
    this.searchForm = this.fb.group({
      search: [''],
      processingStatus: [''],
      sourceType: [''],
      sourcePlatform: [''],
      sortBy: ['createdAt'],
      sortOrder: ['desc']
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupSearchFormListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.dataService.loadDataList();
    this.dataService.loadStats();

    this.dataService.dataList$
      .pipe(takeUntil(this.destroy$))
      .subscribe(dataList => {
        this.dataList = dataList || [];
      });

    this.dataService.selectedData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.selectedData = data;
      });

    this.dataService.stats$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        this.stats = stats;
      });

    this.dataService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading = loading || false;
      });

    this.dataService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.error = error;
      });

    this.dataService.pagination$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pagination => {
        this.currentPage = pagination.page;
        this.pageSize = pagination.limit;
        this.totalItems = pagination.total;
      });
  }

  private setupSearchFormListener(): void {
    this.searchForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyFilters();
      });
  }

  applyFilters(): void {
    const formValue = this.searchForm.value;
    const filters: RawDataFilters = {
      ...formValue,
      page: this.currentPage,
      limit: this.pageSize
    };

    this.dataService.loadDataList(filters);
  }

  onDataSelected(data: RawData): void {
    this.dataService.selectData(data);
  }

  onCreateData(): void {
    // 路由导航将由路由配置处理
  }

  onEditData(data: RawData): void {
    this.dataService.selectData(data);
  }

  onDeleteData(data: RawData): void {
    this.dataService.selectData(data);
    this.showDeleteModal = true;
  }

  onProcessData(data: RawData): void {
    this.dataService.selectData(data);
    this.showProcessModal = true;
  }

  onViewData(data: RawData): void {
    this.dataService.selectData(data);
  }

  onRefresh(): void {
    this.loadInitialData();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFilters();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.applyFilters();
  }

  onModalClose(): void {
    this.showDeleteModal = false;
    this.showProcessModal = false;
    this.showBulkActionModal = false;
    this.dataService.clearSelectedData();
  }

  onDataDeleted(): void {
    this.onModalClose();
    this.loadInitialData();
  }

  onDataProcessed(): void {
    this.onModalClose();
    this.loadInitialData();
  }

  onToggleSelection(data: RawData): void {
    if (this.selectedItems.has(data.id)) {
      this.selectedItems.delete(data.id);
    } else {
      this.selectedItems.add(data.id);
    }
  }

  onToggleAllSelection(): void {
    if (this.isAllSelected()) {
      this.selectedItems.clear();
    } else {
      this.dataList.forEach(data => this.selectedItems.add(data.id));
    }
  }

  onBulkAction(action: string): void {
    if (this.selectedItems.size === 0) return;

    const ids = Array.from(this.selectedItems);

    switch (action) {
      case 'delete':
        this.dataService.bulkDeleteData(ids).subscribe(() => {
          this.selectedItems.clear();
          this.loadInitialData();
        });
        break;
      case 'process':
        this.dataService.bulkProcessData(ids).subscribe(() => {
          this.selectedItems.clear();
          this.loadInitialData();
        });
        break;
    }
  }

  isSelected(data: RawData): boolean {
    return this.selectedItems.has(data.id);
  }

  isAllSelected(): boolean {
    return this.dataList.length > 0 && this.dataList.every(data => this.selectedItems.has(data.id));
  }

  getStatusBadgeClass(status: ProcessingStatus): string {
    switch (status) {
      case ProcessingStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ProcessingStatus.PROCESSING:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case ProcessingStatus.COMPLETED:
        return 'bg-green-100 text-green-800 border-green-200';
      case ProcessingStatus.FAILED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getTypeBadgeClass(type: SourceType): string {
    switch (type) {
      case SourceType.WEIBO_HTML:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case SourceType.WEIBO_API_JSON:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case SourceType.WEIBO_COMMENT:
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case SourceType.JD:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case SourceType.CUSTOM:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getPlatformBadgeClass(platform: SourcePlatform): string {
    switch (platform) {
      case SourcePlatform.WEIBO:
        return 'bg-red-100 text-red-800 border-red-200';
      case SourcePlatform.JD:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case SourcePlatform.CUSTOM:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, this.currentPage - 2);
      const end = Math.min(this.totalPages, this.currentPage + 2);

      if (start > 1) pages.push(1);
      if (start > 2) pages.push(-1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < this.totalPages - 1) pages.push(-1);
      if (end < this.totalPages) pages.push(this.totalPages);
    }

    return pages;
  }

  getDisplayRange(): string {
    if (this.totalItems === 0) return '0 条记录';

    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalItems);

    return `显示 ${start}-${end} 条，共 ${this.totalItems} 条`;
  }

  trackByDataId(index: number, data: RawData): number {
    return data.id;
  }

  trackByPage(index: number, page: number): number {
    return page;
  }
}