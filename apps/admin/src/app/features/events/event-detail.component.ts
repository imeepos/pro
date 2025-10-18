import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { EventsService } from '../../state/events.service';
import { EventDetail } from '@pro/sdk';
import { EventStatus } from '@pro/types';
import { ToastService } from '../../shared/services/toast.service';
import { AmapViewerComponent, DeleteEventDialogComponent } from './components';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, AmapViewerComponent, DeleteEventDialogComponent],
  templateUrl: './event-detail.component.html',
  host: { class: 'block h-full' }
})
export class EventDetailComponent implements OnInit, OnDestroy {
  event: EventDetail | null = null;
  loading = false;
  showDeleteDialog = false;
  EventStatus = EventStatus

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventsService: EventsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadEvent(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEvent(id: string): void {
    this.loading = true;
    this.eventsService.loadEventDetail(id).subscribe({
      next: (event) => {
        this.event = event;
        this.loading = false;
      },
      error: (error) => {
        this.toastService.error(`加载事件详情失败: ${error.message}`);
        this.loading = false;
        this.router.navigate(['/events']);
      }
    });
  }

  edit(): void {
    if (this.event) {
      this.router.navigate(['/events/edit', this.event.id]);
    }
  }

  openDeleteDialog(): void {
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
  }

  onConfirmDelete(): void {
    if (!this.event) return;

    this.eventsService.deleteEvent(this.event.id).subscribe({
      next: () => {
        this.toastService.success('事件删除成功');
        this.router.navigate(['/events']);
      },
      error: (error) => {
        this.toastService.error(`删除失败: ${error.message}`);
        this.closeDeleteDialog();
      }
    });
  }

  publish(): void {
    if (!this.event) return;

    this.eventsService.publishEvent(this.event.id).subscribe({
      next: () => {
        this.toastService.success('事件发布成功');
        this.loadEvent(this.event!.id);
      },
      error: (error) => {
        this.toastService.error(`发布失败: ${error.message}`);
      }
    });
  }

  archive(): void {
    if (!this.event) return;

    this.eventsService.archiveEvent(this.event.id).subscribe({
      next: () => {
        this.toastService.success('事件归档成功');
        this.loadEvent(this.event!.id);
      },
      error: (error) => {
        this.toastService.error(`归档失败: ${error.message}`);
      }
    });
  }

  back(): void {
    this.router.navigate(['/events']);
  }

  get fullAddress(): string {
    if (!this.event) return '';
    const parts = [
      this.event.province,
      this.event.city,
      this.event.district,
      this.event.street
    ].filter(Boolean);
    return parts.join(' ');
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
        return 'bg-gray-100 text-gray-800';
      case EventStatus.PUBLISHED:
        return 'bg-green-100 text-green-800';
      case EventStatus.ARCHIVED:
        return 'bg-blue-100 text-blue-800';
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

  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  downloadAttachment(url: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  }
}
