import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { EventTypesService } from '../../state/event-types.service';
import { EventTypesQuery } from '../../state/event-types.query';
import { IndustryTypesService } from '../../state/industry-types.service';
import { IndustryTypesQuery } from '../../state/industry-types.query';
import { EventType, IndustryType } from '@pro/sdk';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-event-types-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-types-list.component.html',
  styleUrls: ['./event-types-list.component.scss']
})
export class EventTypesListComponent implements OnInit, OnDestroy {
  eventTypes: EventType[] = [];
  industryTypes: IndustryType[] = [];
  filteredEventTypes: EventType[] = [];
  loading = false;
  error: string | null = null;
  searchKeyword = '';
  selectedIndustryId = '';
  showDeleteDialog = false;
  eventTypeToDelete: EventType | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private eventTypesService: EventTypesService,
    private eventTypesQuery: EventTypesQuery,
    private industryTypesService: IndustryTypesService,
    private industryTypesQuery: IndustryTypesQuery,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.eventTypesQuery.eventTypes$,
      this.industryTypesQuery.industryTypes$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([eventTypes, industryTypes]) => {
      this.eventTypes = eventTypes;
      this.industryTypes = industryTypes;
      this.applyFilter();
    });

    this.eventTypesQuery.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      this.loading = loading;
    });

    this.eventTypesQuery.error$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      this.error = error;
    });

    this.loadEventTypes();
    this.loadIndustryTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEventTypes(): void {
    this.eventTypesService.loadEventTypes().subscribe({
      error: (error) => {
        console.error('加载事件类型列表失败:', error);
      }
    });
  }

  loadIndustryTypes(): void {
    this.industryTypesService.loadIndustryTypes().subscribe({
      error: (error) => {
        console.error('加载行业类型列表失败:', error);
      }
    });
  }

  applyFilter(): void {
    let filtered = [...this.eventTypes];

    if (this.selectedIndustryId) {
      filtered = filtered.filter(item => item.industryId === this.selectedIndustryId);
    }

    const keyword = this.searchKeyword.toLowerCase().trim();
    if (keyword) {
      filtered = filtered.filter(item =>
        item.eventName.toLowerCase().includes(keyword) ||
        item.eventCode.toLowerCase().includes(keyword) ||
        (item.description && item.description.toLowerCase().includes(keyword))
      );
    }

    this.filteredEventTypes = filtered;
  }

  onSearch(): void {
    this.applyFilter();
  }

  onIndustryChange(): void {
    this.applyFilter();
  }

  createEventType(): void {
    this.router.navigate(['/events/event-types/create']);
  }

  editEventType(eventType: EventType): void {
    this.router.navigate(['/events/event-types/edit', eventType.id]);
  }

  openDeleteDialog(eventType: EventType): void {
    this.eventTypeToDelete = eventType;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.eventTypeToDelete = null;
  }

  confirmDelete(): void {
    if (!this.eventTypeToDelete?.id) {
      this.toastService.error('删除失败：无效的事件类型信息');
      this.closeDeleteDialog();
      return;
    }

    this.eventTypesService.deleteEventType(this.eventTypeToDelete.id).subscribe({
      next: () => {
        this.toastService.success('事件类型删除成功');
        this.closeDeleteDialog();
      },
      error: (error) => {
        this.toastService.error(`删除失败: ${error.message}`);
        this.closeDeleteDialog();
      }
    });
  }

  getIndustryName(industryId: string): string {
    const industry = this.industryTypes.find(i => i.id === industryId);
    return industry ? industry.industryName : '-';
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
