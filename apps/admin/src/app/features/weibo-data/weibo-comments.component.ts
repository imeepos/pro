import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeiboComment, CommentFilter, SortOrder } from '../../core/services/weibo-data.types';

@Component({
  selector: 'app-weibo-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './weibo-comments.component.html'
})
export class WeiboCommentsComponent implements OnInit {
  comments = signal<WeiboComment[]>([]);
  loading = signal<boolean>(false);
  total = signal<number>(0);

  searchKeyword = signal<string>('');
  searchPostId = signal<string>('');
  searchAuthor = signal<string>('');
  hasLikesFilter = signal<boolean | null>(null);
  dateFrom = signal<string>('');
  dateTo = signal<string>('');
  sortOrder = signal<SortOrder>(SortOrder.DESC);

  currentPage = signal<number>(1);
  pageSize = 20;

  expandedCommentId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadComments();
  }

  async loadComments(): Promise<void> {
    this.loading.set(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockComments: WeiboComment[] = [
        {
          id: '1',
          commentId: 'c001',
          text: '这个产品真的很棒，强烈推荐！用了一个月感觉非常好',
          author: {
            id: 'u1',
            weiboId: '1234567890',
            screenName: '科技爱好者',
            profileImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
            verified: true,
            followersCount: 15000,
            friendsCount: 500,
            statusesCount: 3200
          },
          post: {
            id: 'p001',
            weiboId: 'w001',
            text: '今天发布了新产品...'
          },
          createdAt: '2025-10-20T10:30:00Z',
          likeCounts: 156,
          path: '1'
        },
        {
          id: '2',
          commentId: 'c002',
          text: '同意楼上，确实不错',
          author: {
            id: 'u2',
            weiboId: '9876543210',
            screenName: '数码达人',
            profileImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
            verified: false,
            followersCount: 3200,
            friendsCount: 800,
            statusesCount: 1500
          },
          post: {
            id: 'p001',
            weiboId: 'w001',
            text: '今天发布了新产品...'
          },
          createdAt: '2025-10-20T11:15:00Z',
          likeCounts: 23,
          path: '1.2'
        },
        {
          id: '3',
          commentId: 'c003',
          text: '价格有点贵，但是质量确实好',
          author: {
            id: 'u3',
            weiboId: '5555555555',
            screenName: '理性消费者',
            profileImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3',
            verified: false,
            followersCount: 890,
            friendsCount: 200,
            statusesCount: 450
          },
          post: {
            id: 'p001',
            weiboId: 'w001',
            text: '今天发布了新产品...'
          },
          createdAt: '2025-10-20T14:22:00Z',
          likeCounts: 67,
          path: '3'
        },
        {
          id: '4',
          commentId: 'c004',
          text: '等双十一活动再买',
          author: {
            id: 'u4',
            weiboId: '6666666666',
            screenName: '薅羊毛小能手',
            profileImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user4',
            verified: false,
            followersCount: 5600,
            friendsCount: 1200,
            statusesCount: 8900
          },
          post: {
            id: 'p001',
            weiboId: 'w001',
            text: '今天发布了新产品...'
          },
          createdAt: '2025-10-20T15:45:00Z',
          likeCounts: 0,
          path: '3.4'
        },
        {
          id: '5',
          commentId: 'c005',
          text: '已经下单了，期待收货',
          author: {
            id: 'u5',
            weiboId: '7777777777',
            screenName: '剁手党',
            profileImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user5',
            verified: true,
            followersCount: 12000,
            friendsCount: 3000,
            statusesCount: 15000
          },
          post: {
            id: 'p002',
            weiboId: 'w002',
            text: '双十一预售开始啦...'
          },
          createdAt: '2025-10-21T09:10:00Z',
          likeCounts: 234,
          path: '5'
        }
      ];

      this.comments.set(mockComments);
      this.total.set(mockComments.length);
    } catch (error) {
      console.error('加载评论失败:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getIndentLevel(path: string): number {
    return path.split('.').length - 1;
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
    this.loadComments();
  }

  resetFilters(): void {
    this.searchKeyword.set('');
    this.searchPostId.set('');
    this.searchAuthor.set('');
    this.hasLikesFilter.set(null);
    this.dateFrom.set('');
    this.dateTo.set('');
    this.sortOrder.set(SortOrder.DESC);
    this.loadComments();
  }

  toggleSortOrder(): void {
    this.sortOrder.set(
      this.sortOrder() === SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC
    );
    this.loadComments();
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
    const totalPages = Math.ceil(this.total() / this.pageSize);

    if (newPage >= 1 && newPage <= totalPages) {
      this.currentPage.set(newPage);
      this.loadComments();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.total() / this.pageSize);
  }
}
