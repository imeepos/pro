import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EventsService } from '../../state/events.service';
import { EventsQuery } from '../../state/events.query';
import { TagsService } from '../../state/tags.service';
import { TagsQuery } from '../../state/tags.query';
import { Event, EventQueryParams, EventStatus, Tag, IndustryType, EventType } from '@pro/sdk';
import { ToastService } from '../../shared/services/toast.service';
import {
  EventFilterPanelComponent,
  TagCloudComponent,
  DeleteEventDialogComponent
} from './components';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EventFilterPanelComponent,
    TagCloudComponent,
    DeleteEventDialogComponent
  ],
  templateUrl: './events-list.component.html',
  styleUrls: ['./events-list.component.scss']
})
export class EventsListComponent implements OnInit, OnDestroy {
  events: Event[] = [];
  tags: Tag[] = [];
  industryTypes: IndustryType[] = [];
  eventTypes: EventType[] = [];
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
  isFilterPanelCollapsed = true;

  private destroy$ = new Subject<void>();

  constructor(
    private eventsService: EventsService,
    private eventsQuery: EventsQuery,
    private tagsService: TagsService,
    private tagsQuery: TagsQuery,
    private router: Router,
    private toastService: ToastService
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

    this.tagsQuery.tags$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(tags => {
      this.tags = tags;
    });

    this.loadEvents();
    this.loadPopularTags();
    this.loadFilterData();
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

  loadPopularTags(): void {
    this.tagsService.loadPopularTags(20).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      error: (error) => {
        console.error('加载热门标签失败:', error);
      }
    });
  }

  loadFilterData(): void {
    // 这里应该调用服务获取行业类型和事件类型数据
    // 暂时使用模拟数据
    this.industryTypes = [
      { id: '1', industryName: '制造业', industryCode: 'MFG' },
      { id: '2', industryName: '金融业', industryCode: 'FIN' },
      { id: '3', industryName: '科技业', industryCode: 'TECH' }
    ] as IndustryType[];

    this.eventTypes = [
      { id: '1', eventName: '产品发布', industryId: '1' },
      { id: '2', eventName: '市场活动', industryId: '2' },
      { id: '3', eventName: '技术更新', industryId: '3' }
    ] as EventType[];
  }

  toggleFilterPanel(): void {
    this.isFilterPanelCollapsed = !this.isFilterPanelCollapsed;
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filterParams.keyword ||
      this.filterParams.industryTypeId ||
      this.filterParams.eventTypeId ||
      (this.filterParams.tagIds && this.filterParams.tagIds.length > 0) ||
      this.filterParams.status !== undefined ||
      this.filterParams.startTime ||
      this.filterParams.endTime
    );
  }

  onFilterChange(params: Partial<EventQueryParams>): void {
    this.filterParams = { ...this.filterParams, ...params, page: 1 };
    this.loadEvents();

    // 在筛选应用后，可选择性地折叠面板（移动端自动折叠）
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        this.isFilterPanelCollapsed = true;
      }, 500);
    }
  }

  onTagClick(tagId: string): void {
    const tagIds = this.filterParams.tagIds || [];
    const index = tagIds.indexOf(tagId);

    if (index > -1) {
      tagIds.splice(index, 1);
    } else {
      tagIds.push(tagId);
      // 如果面板是折叠状态，点击标签时自动展开
      if (this.isFilterPanelCollapsed) {
        this.isFilterPanelCollapsed = false;
      }
    }

    this.filterParams = { ...this.filterParams, tagIds, page: 1 };
    this.loadEvents();
  }

  // 添加点击遮罩层关闭面板的功能（移动端）
  onBackdropClick(): void {
    if (window.innerWidth <= 768 && !this.isFilterPanelCollapsed) {
      this.isFilterPanelCollapsed = true;
    }
  }

  onFilterReset(): void {
    this.filterParams = { page: 1, pageSize: 20 };
    this.loadEvents();
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
