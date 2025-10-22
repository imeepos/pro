import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { firstValueFrom } from 'rxjs';
import {
  WeiboInteraction,
  WeiboInteractionType,
  WeiboTargetType,
  InteractionFilter,
  Pagination,
  Sort,
  SortOrder
} from '../../core/services/weibo-data.types';
import { WeiboDataService } from '../../core/services/weibo-data.service';

@Component({
  selector: 'app-weibo-interactions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTabsModule,
    NzTableModule,
    NzInputModule,
    NzButtonModule,
    NzDatePickerModule,
    NzSelectModule,
    NzTagModule,
    NzSpinModule,
    NzEmptyModule
  ],
  templateUrl: './weibo-interactions.component.html'
})
export class WeiboInteractionsComponent implements OnInit {
  interactions = signal<WeiboInteraction[]>([]);
  totalCount = signal(0);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  activeTab = signal<WeiboInteractionType | 'all'>('all');

  searchUserWeiboId = signal<string>('');
  searchTargetWeiboId = signal<string>('');
  dateRange = signal<Date[] | null>(null);
  selectedTargetType = signal<WeiboTargetType | null>(null);
  page = signal<number>(1);
  pageSize = signal<number>(20);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / this.pageSize()))
  );

  readonly WeiboInteractionType = WeiboInteractionType;
  readonly WeiboTargetType = WeiboTargetType;

  readonly targetTypeOptions = [
    { label: '帖子', value: WeiboTargetType.Post },
    { label: '评论', value: WeiboTargetType.Comment }
  ];

  readonly tabIndexMap: (WeiboInteractionType | 'all')[] = [
    'all',
    WeiboInteractionType.Like,
    WeiboInteractionType.Favorite,
    WeiboInteractionType.Repost,
    WeiboInteractionType.Comment
  ];

  constructor(private readonly weiboData: WeiboDataService) {}

  ngOnInit(): void {
    void this.loadInteractions();
  }

  onTabChange(index: number): void {
    this.activeTab.set(this.tabIndexMap[index]);
    this.page.set(1);
    void this.loadInteractions();
  }

  async refresh(): Promise<void> {
    await this.loadInteractions();
  }

  resetFilters(): void {
    this.searchUserWeiboId.set('');
    this.searchTargetWeiboId.set('');
    this.dateRange.set(null);
    this.selectedTargetType.set(null);
    this.page.set(1);
    void this.loadInteractions();
  }

  async onPageChange(index: number): Promise<void> {
    this.page.set(index);
    await this.loadInteractions();
  }

  async onPageSizeChange(size: number): Promise<void> {
    this.pageSize.set(size);
    this.page.set(1);
    await this.loadInteractions();
  }

  getInteractionIcon(type: WeiboInteractionType): string {
    const icons: Record<WeiboInteractionType, string> = {
      [WeiboInteractionType.Like]: '❤️',
      [WeiboInteractionType.Repost]: '🔄',
      [WeiboInteractionType.Comment]: '💬',
      [WeiboInteractionType.Favorite]: '⭐'
    };
    return icons[type];
  }

  getInteractionLabel(type: WeiboInteractionType): string {
    const labels: Record<WeiboInteractionType, string> = {
      [WeiboInteractionType.Like]: '点赞',
      [WeiboInteractionType.Repost]: '转发',
      [WeiboInteractionType.Comment]: '评论',
      [WeiboInteractionType.Favorite]: '收藏'
    };
    return labels[type];
  }

  getTargetTypeLabel(type: WeiboTargetType): string {
    return type === WeiboTargetType.Post ? '帖子' : '评论';
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

  private async loadInteractions(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const connection = await firstValueFrom(
        this.weiboData.getInteractions(
          this.buildFilter(),
          this.buildPagination(),
          this.buildSort()
        )
      );

      this.totalCount.set(connection.totalCount);

      const desiredPage = this.resolvePageWithinBounds();
      if (desiredPage !== this.page()) {
        this.page.set(desiredPage);
        this.loading.set(false);
        await this.loadInteractions();
        return;
      }

      this.interactions.set(connection.edges.map(edge => edge.node));
    } catch (error) {
      console.error('加载互动数据失败:', error);
      this.error.set('加载互动数据失败，请稍后再试。');
    } finally {
      this.loading.set(false);
    }
  }

  private buildFilter(): InteractionFilter | undefined {
    const filter: InteractionFilter = {};

    const tab = this.activeTab();
    if (tab !== 'all') {
      filter.interactionType = tab;
    }

    const userId = this.searchUserWeiboId().trim();
    if (userId) {
      filter.userWeiboId = userId;
    }

    const targetId = this.searchTargetWeiboId().trim();
    if (targetId) {
      filter.targetWeiboId = targetId;
    }

    const targetType = this.selectedTargetType();
    if (targetType) {
      filter.targetType = targetType;
    }

    const range = this.dateRange();
    if (range && range.length === 2) {
      const [start, end] = range;
      if (start) {
        filter.dateFrom = start.toISOString();
      }
      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        filter.dateTo = endOfDay.toISOString();
      }
    }

    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  private buildPagination(): Pagination {
    return {
      page: this.page(),
      limit: this.pageSize()
    };
  }

  private buildSort(): Sort {
    return {
      field: 'createdAt',
      order: SortOrder.DESC
    };
  }

  private resolvePageWithinBounds(): number {
    const maxPage = this.totalPages();

    if (this.page() > maxPage) {
      return maxPage;
    }

    if (this.page() < 1) {
      return 1;
    }

    return this.page();
  }
}
