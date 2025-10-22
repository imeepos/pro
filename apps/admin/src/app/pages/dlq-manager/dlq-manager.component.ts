import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { DlqManagerService, DlqMessageView, DlqQueueView } from './dlq-manager.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-dlq-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzCheckboxModule,
    NzButtonModule,
    NzSelectModule,
    NzPaginationModule,
    NzSpinModule,
    NzEmptyModule,
    NzIconModule,
    NzToolTipModule,
    DatePipe,
  ],
  templateUrl: './dlq-manager.component.html',
  styleUrls: ['./dlq-manager.component.scss'],
})
export class DlqManagerComponent implements OnInit {
  private readonly service = inject(DlqManagerService);
  private readonly toast = inject(ToastService);

  readonly queues = signal<DlqQueueView[]>([]);
  readonly messages = signal<DlqMessageView[]>([]);
  readonly totalMessages = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly loadingQueues = signal(false);
  readonly loadingMessages = signal(false);
  readonly operating = signal(false);
  readonly selectedQueue = signal<string | null>(null);
  readonly selectedIds = signal<Set<string>>(new Set());

  readonly allChecked = signal(false);
  readonly indeterminate = signal(false);

  readonly pageCount = computed(() => {
    const size = this.pageSize();
    if (size <= 0) {
      return 0;
    }
    return Math.ceil(this.totalMessages() / size);
  });

  constructor() {
    effect(() => {
      const items = this.messages();
      const selected = this.selectedIds();
      if (items.length === 0) {
        this.allChecked.set(false);
        this.indeterminate.set(false);
        return;
      }

      const checkedCount = items.filter((item) => selected.has(item.id)).length;
      this.allChecked.set(checkedCount === items.length);
      this.indeterminate.set(checkedCount > 0 && checkedCount < items.length);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadQueues();
  }

  async loadQueues(): Promise<void> {
    this.loadingQueues.set(true);
    try {
      const queues = await this.service.fetchQueues();
      this.queues.set(queues);

      if (!this.selectedQueue() && queues.length > 0) {
        this.selectedQueue.set(queues[0].name);
      }

      if (this.selectedQueue()) {
        await this.loadMessages({ resetPage: true });
      }
    } catch (error) {
      console.error('加载死信队列失败:', error);
      this.toast.error('加载死信队列失败，请稍后再试');
    } finally {
      this.loadingQueues.set(false);
    }
  }

  async loadMessages(options?: { resetPage?: boolean }): Promise<void> {
    const queueName = this.selectedQueue();
    if (!queueName) {
      return;
    }

    if (options?.resetPage) {
      this.page.set(1);
    }

    this.loadingMessages.set(true);
    this.selectedIds.set(new Set());
    try {
      const result = await this.service.fetchMessages(
        queueName,
        this.page(),
        this.pageSize(),
      );

      this.messages.set(result.items);
      this.totalMessages.set(result.total);
    } catch (error) {
      console.error('加载死信消息失败:', error);
      this.toast.error('加载死信消息失败，请稍后再试');
      this.messages.set([]);
      this.totalMessages.set(0);
    } finally {
      this.loadingMessages.set(false);
    }
  }

  async refresh(): Promise<void> {
    await this.loadQueues();
  }

  async onQueueChange(queueName: string): Promise<void> {
    this.selectedQueue.set(queueName);
    await this.loadMessages({ resetPage: true });
  }

  async onPageIndexChange(page: number): Promise<void> {
    this.page.set(page);
    await this.loadMessages();
  }

  async onPageSizeChange(size: number): Promise<void> {
    this.pageSize.set(size);
    await this.loadMessages({ resetPage: true });
  }

  toggleAll(checked: boolean): void {
    if (!checked) {
      this.selectedIds.set(new Set());
      return;
    }

    this.selectedIds.set(new Set(this.messages().map((item) => item.id)));
  }

  toggleSelection(messageId: string, checked: boolean): void {
    const next = new Set(this.selectedIds());
    if (checked) {
      next.add(messageId);
    } else {
      next.delete(messageId);
    }
    this.selectedIds.set(next);
  }

  selectionSize(): number {
    return this.selectedIds().size;
  }

  trackByMessageId(_: number, message: DlqMessageView): string {
    return message.id;
  }

  displayContent(content: unknown): string {
    if (content === null || content === undefined) {
      return '';
    }

    if (typeof content === 'string') {
      return content;
    }

    return JSON.stringify(content, null, 2);
  }

  async retrySelected(): Promise<void> {
    const queueName = this.selectedQueue();
    const messageIds = Array.from(this.selectedIds());
    if (!queueName || messageIds.length === 0) {
      return;
    }

    this.operating.set(true);
    try {
      const success = await this.service.retryMessages(queueName, messageIds);
      if (success) {
        this.toast.success(`已重新投递 ${messageIds.length} 条消息`);
      } else {
        this.toast.warning('部分消息未能重新投递，请稍后再试');
      }
      await this.loadMessages();
    } catch (error) {
      console.error('重试死信消息失败:', error);
      this.toast.error('重试失败，请稍后再试');
    } finally {
      this.operating.set(false);
    }
  }

  async deleteSelected(): Promise<void> {
    const queueName = this.selectedQueue();
    const messageIds = Array.from(this.selectedIds());
    if (!queueName || messageIds.length === 0) {
      return;
    }

    this.operating.set(true);
    try {
      const success = await this.service.deleteMessages(queueName, messageIds);
      if (success) {
        this.toast.success(`已删除 ${messageIds.length} 条消息`);
      } else {
        this.toast.warning('部分消息未删除，请稍后再试');
      }
      await this.loadMessages();
    } catch (error) {
      console.error('删除死信消息失败:', error);
      this.toast.error('删除失败，请稍后再试');
    } finally {
      this.operating.set(false);
    }
  }
}
