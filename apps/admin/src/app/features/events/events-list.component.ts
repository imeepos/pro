import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EventsService } from '../../state/events.service';
import { EventsQuery } from '../../state/events.query';
import { Event, EventQueryParams, EventStatus } from '@pro/sdk';
import { ToastService } from '../../shared/services/toast.service';
import { DeleteEventDialogComponent } from './components';
import { DISPLAY_NZ_MODULES, COMMON_NZ_MODULES, NzMessageService } from '../../shared/ng-zorro-components';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DeleteEventDialogComponent,
    ...DISPLAY_NZ_MODULES,
    ...COMMON_NZ_MODULES
  ],
  templateUrl: './events-list.component.html',
  styleUrls: ['./events-list.component.scss']
})
export class EventsListComponent implements OnInit, OnDestroy {
  events: Event[] = [];
  loading = false;
  error: string | null = null;
  total = 0;

  filterParams: EventQueryParams = {
    page: 1,
    pageSize: 20
  };

  viewMode: 'list' | 'map' = 'list';
  selectedEvents: Event[] = [];
  showDeleteDialog = false;
  eventToDelete: Event | null = null;
  searchHistory: string[] = [];

  @ViewChild('headerActions', { static: true }) headerActions!: TemplateRef<void>;
  @ViewChild('suffixIcons', { static: true }) suffixIcons!: TemplateRef<void>;

  private destroy$ = new Subject<void>();

  constructor(
    private eventsService: EventsService,
    private eventsQuery: EventsQuery,
    private router: Router,
    private toastService: ToastService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.eventsQuery.events$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(events => {
      this.events = events;
    });

    this.eventsQuery.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      this.loading = loading;
    });

    this.eventsQuery.error$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      this.error = error;
    });

    this.eventsQuery.total$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(total => {
      this.total = total;
    });

    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEvents(): void {
    this.eventsService.loadEvents(this.filterParams).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      error: (error) => {
        console.error('加载事件列表失败:', error);
      }
    });
  }


  onSearch(keyword: string): void {
    this.filterParams = { ...this.filterParams, keyword, page: 1 };

    if (keyword && !this.searchHistory.includes(keyword)) {
      this.searchHistory = [keyword, ...this.searchHistory.slice(0, 4)];
    }

    this.loadEvents();
  }

  clearSearch(): void {
    this.filterParams = { ...this.filterParams, keyword: '', page: 1 };
    this.loadEvents();
  }

  switchView(mode: 'list' | 'map'): void {
    this.viewMode = mode;
  }

  createEvent(): void {
    this.router.navigate(['/events/create']);
  }

  editEvent(event: Event): void {
    this.router.navigate(['/events/edit', event.id]);
  }

  viewDetail(event: Event): void {
    this.router.navigate(['/events/detail', event.id]);
  }

  openDeleteDialog(event: Event): void {
    this.eventToDelete = event;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.eventToDelete = null;
  }

  onConfirmDelete(): void {
    if (!this.eventToDelete?.id) {
      this.toastService.error('删除失败：无效的事件信息');
      this.closeDeleteDialog();
      return;
    }

    this.eventsService.deleteEvent(this.eventToDelete.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.toastService.success('事件删除成功');
        this.closeDeleteDialog();
      },
      error: (error) => {
        this.toastService.error(`删除失败: ${error.message}`);
        this.closeDeleteDialog();
      }
    });
  }

  publishEvent(event: Event): void {
    this.eventsService.publishEvent(event.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.toastService.success('事件发布成功');
      },
      error: (error) => {
        this.toastService.error(`发布失败: ${error.message}`);
      }
    });
  }

  archiveEvent(event: Event): void {
    this.eventsService.archiveEvent(event.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.toastService.success('事件归档成功');
      },
      error: (error) => {
        this.toastService.error(`归档失败: ${error.message}`);
      }
    });
  }

  onPageChange(page: number): void {
    this.filterParams = { ...this.filterParams, page };
    this.loadEvents();
  }

  onPageSizeChange(pageSize: number): void {
    this.filterParams = { ...this.filterParams, pageSize, page: 1 };
    this.loadEvents();
  }

  getStatusText(status: EventStatus): string {
    switch (status) {
      case EventStatus.DRAFT:
        return '草稿';
      case EventStatus.PUBLISHED:
        return '已发布';
      case EventStatus.ARCHIVED:
        return '已归档';
      default:
        return '未知';
    }
  }

  getStatusColor(status: EventStatus): string {
    switch (status) {
      case EventStatus.DRAFT:
        return 'default';
      case EventStatus.PUBLISHED:
        return 'success';
      case EventStatus.ARCHIVED:
        return 'warning';
      default:
        return 'default';
    }
  }

  getStatusClass(status: EventStatus): string {
    switch (status) {
      case EventStatus.DRAFT:
        return 'draft';
      case EventStatus.PUBLISHED:
        return 'published';
      case EventStatus.ARCHIVED:
        return 'archived';
      default:
        return 'draft';
    }
  }

  getFlowbiteStatusClass(status: EventStatus): string {
    switch (status) {
      case EventStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case EventStatus.PUBLISHED:
        return 'bg-green-100 text-green-800';
      case EventStatus.ARCHIVED:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
