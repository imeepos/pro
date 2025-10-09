import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MediaTypesService } from '../../../state/media-types.service';
import { MediaTypesQuery } from '../../../state/media-types.query';
import { MediaType } from '@pro/sdk';
import { ToastService } from '../../../shared/services/toast.service';
import { SelectComponent } from '../../../shared/components/select';
import type { SelectOption } from '../../../shared/components/select';

@Component({
  selector: 'app-media-type-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent],
  templateUrl: './media-type-list.component.html'
})
export class MediaTypeListComponent implements OnInit, OnDestroy {
  mediaTypes: MediaType[] = [];
  filteredMediaTypes: MediaType[] = [];
  loading = false;
  error: string | null = null;
  searchKeyword = '';
  selectedStatus: string = '';
  showDeleteDialog = false;
  mediaTypeToDelete: MediaType | null = null;

  statusOptions: SelectOption[] = [
    { value: '', label: '全部状态' },
    { value: 'ACTIVE', label: '启用' },
    { value: 'INACTIVE', label: '禁用' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private mediaTypesService: MediaTypesService,
    private mediaTypesQuery: MediaTypesQuery,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.mediaTypesQuery.mediaTypes$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(mediaTypes => {
      this.mediaTypes = mediaTypes;
      this.applyFilter();
    });

    this.mediaTypesQuery.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      this.loading = loading;
    });

    this.mediaTypesQuery.error$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      this.error = error;
    });

    this.loadMediaTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMediaTypes(): void {
    this.mediaTypesService.loadMediaTypes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      error: (error) => {
        console.error('加载媒体类型列表失败:', error);
      }
    });
  }

  applyFilter(): void {
    const keyword = this.searchKeyword.toLowerCase().trim();

    let filtered = [...this.mediaTypes];

    if (keyword) {
      filtered = filtered.filter(item =>
        item.typeName.toLowerCase().includes(keyword) ||
        item.typeCode.toLowerCase().includes(keyword) ||
        (item.description && item.description.toLowerCase().includes(keyword))
      );
    }

    if (this.selectedStatus) {
      filtered = filtered.filter(item => item.status === this.selectedStatus);
    }

    this.filteredMediaTypes = filtered.sort((a, b) => a.sort - b.sort);
  }

  onSearch(): void {
    console.log('搜索按钮被点击，关键词:', this.searchKeyword);
    this.applyFilter();
    console.log('过滤后的结果数量:', this.filteredMediaTypes.length);
  }

  onStatusChange(): void {
    this.applyFilter();
  }

  createMediaType(): void {
    this.router.navigate(['/media-type/new']);
  }

  editMediaType(mediaType: MediaType): void {
    this.router.navigate(['/media-type', mediaType.id, 'edit']);
  }

  toggleStatus(mediaType: MediaType): void {
    const newStatus = mediaType.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.mediaTypesService.updateMediaType(mediaType.id, { status: newStatus }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.toastService.success(`媒体类型已${newStatus === 'ACTIVE' ? '启用' : '禁用'}`);
      },
      error: (error) => {
        this.toastService.error(`操作失败: ${error.message}`);
      }
    });
  }

  openDeleteDialog(mediaType: MediaType): void {
    this.mediaTypeToDelete = mediaType;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.mediaTypeToDelete = null;
  }

  confirmDelete(): void {
    if (!this.mediaTypeToDelete?.id) {
      this.toastService.error('删除失败：无效的媒体类型信息');
      this.closeDeleteDialog();
      return;
    }

    this.mediaTypesService.deleteMediaType(this.mediaTypeToDelete.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.toastService.success('媒体类型删除成功');
        this.closeDeleteDialog();
      },
      error: (error) => {
        this.toastService.error(`删除失败: ${error.message}`);
        this.closeDeleteDialog();
      }
    });
  }

  getStatusText(status: string): string {
    return status === 'ACTIVE' ? '启用' : '禁用';
  }

  getStatusClass(status: string): string {
    return status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  }

  formatDate(dateStr: Date | string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
