import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { IndustryTypesService } from '../../state/industry-types.service';
import { IndustryTypesQuery } from '../../state/industry-types.query';
import { IndustryType } from '@pro/sdk';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-industry-types-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './industry-types-list.component.html',
  styleUrls: ['./industry-types-list.component.scss']
})
export class IndustryTypesListComponent implements OnInit, OnDestroy {
  industryTypes: IndustryType[] = [];
  filteredIndustryTypes: IndustryType[] = [];
  loading = false;
  error: string | null = null;
  searchKeyword = '';
  showDeleteDialog = false;
  industryTypeToDelete: IndustryType | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private industryTypesService: IndustryTypesService,
    private industryTypesQuery: IndustryTypesQuery,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.industryTypesQuery.industryTypes$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(industryTypes => {
      this.industryTypes = industryTypes;
      this.applyFilter();
    });

    this.industryTypesQuery.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      this.loading = loading;
    });

    this.industryTypesQuery.error$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      this.error = error;
    });

    this.loadIndustryTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadIndustryTypes(): void {
    this.industryTypesService.loadIndustryTypes().subscribe({
      error: (error) => {
        console.error('加载行业类型列表失败:', error);
      }
    });
  }

  applyFilter(): void {
    const keyword = this.searchKeyword.toLowerCase().trim();
    if (!keyword) {
      this.filteredIndustryTypes = [...this.industryTypes];
    } else {
      this.filteredIndustryTypes = this.industryTypes.filter(item =>
        item.industryName.toLowerCase().includes(keyword) ||
        item.industryCode.toLowerCase().includes(keyword) ||
        (item.description && item.description.toLowerCase().includes(keyword))
      );
    }
  }

  onSearch(): void {
    this.applyFilter();
  }

  createIndustryType(): void {
    this.router.navigate(['/events/industry-types/create']);
  }

  editIndustryType(industryType: IndustryType): void {
    this.router.navigate(['/events/industry-types/edit', industryType.id]);
  }

  openDeleteDialog(industryType: IndustryType): void {
    this.industryTypeToDelete = industryType;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.industryTypeToDelete = null;
  }

  confirmDelete(): void {
    if (!this.industryTypeToDelete?.id) {
      this.toastService.error('删除失败：无效的行业类型信息');
      this.closeDeleteDialog();
      return;
    }

    this.industryTypesService.deleteIndustryType(this.industryTypeToDelete.id).subscribe({
      next: () => {
        this.toastService.success('行业类型删除成功');
        this.closeDeleteDialog();
      },
      error: (error) => {
        this.toastService.error(`删除失败: ${error.message}`);
        this.closeDeleteDialog();
      }
    });
  }

  getStatusText(status: number): string {
    return status === 1 ? '启用' : '禁用';
  }

  getStatusClass(status: number): string {
    return status === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  }

  formatDate(dateStr: string): string {
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
