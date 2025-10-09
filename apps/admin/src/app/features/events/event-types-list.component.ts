import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EventTypesService } from '../../state/event-types.service';
import { EventTypesQuery } from '../../state/event-types.query';
import { EventType } from '@pro/sdk';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-event-types-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-types-list.component.html',
  host: { class: 'block h-full' }
})
export class EventTypesListComponent implements OnInit, OnDestroy {
  eventTypes: EventType[] = [];
  filteredEventTypes: EventType[] = [];
  loading = false;
  error: string | null = null;
  searchKeyword = '';
  showDeleteDialog = false;
  eventTypeToDelete: EventType | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private eventTypesService: EventTypesService,
    private eventTypesQuery: EventTypesQuery,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.eventTypesQuery.eventTypes$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(eventTypes => {
      this.eventTypes = eventTypes;
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

  
  applyFilter(): void {
    let filtered = [...this.eventTypes];

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

  
  getStatusText(status: number): string {
    return status === 1 ? '启用' : '禁用';
  }

  getStatusClass(status: number): string {
    return status === 1
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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
