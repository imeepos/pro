import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  WeiboComment,
  CommentFilter,
  SortOrder,
  Pagination,
  Sort
} from '../../core/services/weibo-data.types';
import { WeiboDataService } from '../../core/services/weibo-data.service';

interface CommentListItem extends WeiboComment {
  depth: number;
}

@Component({
  selector: 'app-weibo-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './weibo-comments.component.html'
})
export class WeiboCommentsComponent implements OnInit {
  comments = signal<CommentListItem[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  total = signal<number>(0);

  searchKeyword = signal<string>('');
  searchPostId = signal<string>('');
  searchAuthor = signal<string>('');
  hasLikesFilter = signal<boolean>(false);
  dateFrom = signal<string>('');
  dateTo = signal<string>('');
  sortOrder = signal<SortOrder>(SortOrder.DESC);

  currentPage = signal<number>(1);
  readonly pageSize = 20;

  expandedCommentId = signal<string | null>(null);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  constructor(private readonly weiboData: WeiboDataService) {}

  ngOnInit(): void {
    void this.loadComments();
  }

  async loadComments(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const connection = await firstValueFrom(
        this.weiboData.getComments(this.buildFilter(), this.buildPagination(), this.buildSort())
      );

      this.total.set(connection.totalCount);
      const desiredPage = this.resolvePageWithinBounds();

      if (desiredPage !== this.currentPage()) {
        this.currentPage.set(desiredPage);
        this.loading.set(false);
        await this.loadComments();
        return;
      }

      const flat = connection.edges.map(edge => edge.node);
      const depthMap = this.computeDepths(flat);
      this.comments.set(
        flat.map(comment => ({
          ...comment,
          depth: depthMap.get(comment.id) ?? 0
        }))
      );
    } catch (error) {
      console.error('加载评论失败:', error);
      this.error.set('加载评论失败，请稍后再试。');
    } finally {
      this.loading.set(false);
    }
  }

  getIndentPixels(depth: number): number {
    return Math.min(depth * 24, 120);
  }

  toggleExpandComment(commentId: string): void {
    this.expandedCommentId.set(
      this.expandedCommentId() === commentId ? null : commentId
    );
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

  handleSearch(): void {
    this.currentPage.set(1);
    void this.loadComments();
  }

  resetFilters(): void {
    this.searchKeyword.set('');
    this.searchPostId.set('');
    this.searchAuthor.set('');
    this.hasLikesFilter.set(false);
    this.dateFrom.set('');
    this.dateTo.set('');
    this.sortOrder.set(SortOrder.DESC);
    this.currentPage.set(1);
    void this.loadComments();
  }

  toggleSortOrder(): void {
    this.sortOrder.set(
      this.sortOrder() === SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC
    );
    void this.loadComments();
  }

  toggleLikesFilter(): void {
    this.hasLikesFilter.set(!this.hasLikesFilter());
    this.currentPage.set(1);
    void this.loadComments();
  }

  viewPost(postId: string): void {
    console.log('查看帖子:', postId);
  }

  viewCommentThread(commentId: string): void {
    this.toggleExpandComment(commentId);
  }

  deleteComment(comment: WeiboComment): void {
    if (!confirm(`确定要删除这条评论吗?\n\n${comment.text}`)) {
      return;
    }
    console.log('删除评论:', comment.id);
  }

  changePage(delta: number): void {
    const newPage = this.currentPage() + delta;
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.currentPage.set(newPage);
      void this.loadComments();
    }
  }

  private buildFilter(): CommentFilter | undefined {
    const filter: CommentFilter = {};

    const keyword = this.searchKeyword().trim();
    if (keyword) {
      filter.keyword = keyword;
    }

    const postId = this.searchPostId().trim();
    if (postId) {
      filter.postId = postId;
    }

    const author = this.searchAuthor().trim();
    if (author) {
      filter.authorNickname = author;
    }

    if (this.dateFrom()) {
      filter.dateFrom = this.dateFrom();
    }

    if (this.dateTo()) {
      filter.dateTo = this.dateTo();
    }

    if (this.hasLikesFilter()) {
      filter.hasLikes = true;
    }

    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  private buildPagination(): Pagination {
    return {
      page: this.currentPage(),
      limit: this.pageSize
    };
  }

  private buildSort(): Sort {
    return {
      field: 'createdAt',
      order: this.sortOrder()
    };
  }

  private resolvePageWithinBounds(): number {
    const maxPage = Math.max(1, Math.ceil(this.total() / this.pageSize));

    if (this.currentPage() > maxPage) {
      return maxPage;
    }

    if (this.currentPage() < 1) {
      return 1;
    }

    return this.currentPage();
  }

  private computeDepths(comments: WeiboComment[]): Map<string, number> {
    const byId = new Map(comments.map(comment => [comment.id, comment]));
    const depths = new Map<string, number>();

    const resolveDepth = (comment: WeiboComment, trail: Set<string>): number => {
      if (depths.has(comment.id)) {
        return depths.get(comment.id)!;
      }

      const parentId = comment.replyCommentId ?? undefined;
      if (!parentId) {
        depths.set(comment.id, 0);
        return 0;
      }

      if (trail.has(parentId)) {
        depths.set(comment.id, 0);
        return 0;
      }

      const parent = byId.get(parentId);
      if (!parent) {
        depths.set(comment.id, 1);
        return 1;
      }

      const depth = resolveDepth(parent, new Set([...trail, comment.id])) + 1;
      depths.set(comment.id, depth);
      return depth;
    };

    for (const comment of comments) {
      resolveDepth(comment, new Set());
    }

    return depths;
  }
}
