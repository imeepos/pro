import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  WeiboPost,
  PostFilter,
  SortOrder,
  Pagination,
  Sort
} from '../../core/services/weibo-data.types';
import { WeiboDataService } from '../../core/services/weibo-data.service';

interface SortConfig {
  field: 'createdAt' | 'attitudesCount' | 'commentsCount';
  order: SortOrder;
}

@Component({
  selector: 'app-weibo-posts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './weibo-posts.component.html'
})
export class WeiboPostsComponent implements OnInit {
  readonly Math = Math;

  posts = signal<WeiboPost[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  selectedPost = signal<WeiboPost | null>(null);

  keyword = signal('');
  authorNickname = signal('');
  dateFrom = signal<string>('');
  dateTo = signal<string>('');
  isLongText = signal<boolean | undefined>(undefined);
  isRepost = signal<boolean | undefined>(undefined);
  favorited = signal<boolean | undefined>(undefined);

  sort = signal<SortConfig>({ field: 'createdAt', order: SortOrder.DESC });
  page = signal(1);
  pageSize = signal(20);

  totalCount = signal(0);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  pagedPosts = computed(() => this.posts());

  constructor(
    private readonly router: Router,
    private readonly weiboData: WeiboDataService
  ) {}

  ngOnInit(): void {
    void this.loadPosts();
  }

  private async loadPosts(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const filter = this.buildFilter();
    const pagination = this.buildPagination();
    const sort = this.buildSort();

    try {
      const connection = await firstValueFrom(
        this.weiboData.getPosts(filter, pagination, sort)
      );

      this.totalCount.set(connection.totalCount);
      const targetPage = this.resolvePageWithinBounds();

      if (targetPage !== this.page()) {
        this.page.set(targetPage);
        this.loading.set(false);
        await this.loadPosts();
        return;
      }

      this.posts.set(connection.edges.map(edge => edge.node));
    } catch (error) {
      console.error('加载微博帖子失败:', error);
      this.error.set('加载微博帖子失败，请稍后重试。');
    } finally {
      this.loading.set(false);
    }
  }

  private buildFilter(): PostFilter | undefined {
    const filter: PostFilter = {};
    const keyword = this.keyword().trim();
    const author = this.authorNickname().trim();

    if (keyword) {
      filter.keyword = keyword;
    }

    if (author) {
      filter.authorNickname = author;
    }

    if (this.dateFrom()) {
      filter.dateFrom = this.dateFrom();
    }

    if (this.dateTo()) {
      filter.dateTo = this.dateTo();
    }

    if (this.isLongText() !== undefined) {
      filter.isLongText = this.isLongText() ?? undefined;
    }

    if (this.isRepost() !== undefined) {
      filter.isRepost = this.isRepost() ?? undefined;
    }

    if (this.favorited() !== undefined) {
      filter.favorited = this.favorited() ?? undefined;
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
    const { field, order } = this.sort();
    return {
      field,
      order
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

  applyFilters(): void {
    this.page.set(1);
    void this.loadPosts();
  }

  resetFilters(): void {
    this.keyword.set('');
    this.authorNickname.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.isLongText.set(undefined);
    this.isRepost.set(undefined);
    this.favorited.set(undefined);
    this.page.set(1);
    void this.loadPosts();
  }

  toggleSort(field: 'createdAt' | 'attitudesCount' | 'commentsCount'): void {
    const current = this.sort();
    if (current.field === field) {
      this.sort.set({
        field,
        order: current.order === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC
      });
    } else {
      this.sort.set({ field, order: SortOrder.DESC });
    }
    void this.loadPosts();
  }

  toggleFilter(type: 'isLongText' | 'isRepost' | 'favorited'): void {
    const current = this[type]();
    if (current === undefined) {
      this[type].set(true);
    } else if (current === true) {
      this[type].set(false);
    } else {
      this[type].set(undefined);
    }
    void this.loadPosts();
  }

  viewDetail(post: WeiboPost): void {
    this.selectedPost.set(post);
  }

  closeDetail(): void {
    this.selectedPost.set(null);
  }

  viewComments(post: WeiboPost): void {
    this.router.navigate(['/weibo-data/comments'], {
      queryParams: { postId: post.id }
    });
  }

  deletePost(post: WeiboPost): void {
    if (!confirm(`确定要删除这条帖子吗？\n\n${this.truncateText(post.text, 50)}`)) {
      return;
    }

    console.warn('删除帖子功能尚未实现', post.id);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.page.set(page);
      void this.loadPosts();
    }
  }

  truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  formatNumber(num: number): string {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toString();
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFilterClass(value: boolean | undefined): string {
    if (value === undefined) {
      return 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    }
    if (value === true) {
      return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700';
    }
    return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600';
  }

  getSortIcon(field: 'createdAt' | 'attitudesCount' | 'commentsCount'): string {
    const current = this.sort();
    if (current.field !== field) return '↕';
    return current.order === SortOrder.ASC ? '↑' : '↓';
  }
}
