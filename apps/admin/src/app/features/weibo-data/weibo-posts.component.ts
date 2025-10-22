import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WeiboPost, PostFilter, SortOrder } from '../../core/services/weibo-data.types';

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

  totalCount = computed(() => this.filteredPosts().length);
  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()));

  filteredPosts = computed(() => {
    let filtered = this.posts();
    const kw = this.keyword().trim().toLowerCase();
    const author = this.authorNickname().trim().toLowerCase();

    if (kw) {
      filtered = filtered.filter(p => p.text.toLowerCase().includes(kw));
    }

    if (author) {
      filtered = filtered.filter(p => p.author.screenName.toLowerCase().includes(author));
    }

    if (this.dateFrom()) {
      const from = new Date(this.dateFrom());
      filtered = filtered.filter(p => new Date(p.createdAt) >= from);
    }

    if (this.dateTo()) {
      const to = new Date(this.dateTo());
      filtered = filtered.filter(p => new Date(p.createdAt) <= to);
    }

    if (this.isLongText() !== undefined) {
      filtered = filtered.filter(p => p.isLongText === this.isLongText());
    }

    if (this.isRepost() !== undefined) {
      filtered = filtered.filter(p => p.isRepost === this.isRepost());
    }

    if (this.favorited() !== undefined) {
      filtered = filtered.filter(p => p.favorited === this.favorited());
    }

    return this.sortPosts(filtered);
  });

  pagedPosts = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredPosts().slice(start, end);
  });

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadMockData();
  }

  private loadMockData(): void {
    this.loading.set(true);

    setTimeout(() => {
      const mockPosts: WeiboPost[] = Array.from({ length: 50 }, (_, i) => ({
        id: `post-${i + 1}`,
        weiboId: `${4900000000000000 + i}`,
        mid: `mid-${i + 1}`,
        text: this.generateMockText(i),
        author: {
          id: `user-${i % 10}`,
          weiboId: `${1000000000 + i % 10}`,
          screenName: `用户${i % 10}`,
          profileImageUrl: `https://i.pravatar.cc/150?u=${i % 10}`,
          verified: i % 3 === 0,
          followersCount: Math.floor(Math.random() * 100000),
          friendsCount: Math.floor(Math.random() * 1000),
          statusesCount: Math.floor(Math.random() * 10000)
        },
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        repostsCount: Math.floor(Math.random() * 1000),
        commentsCount: Math.floor(Math.random() * 500),
        attitudesCount: Math.floor(Math.random() * 5000),
        picNum: i % 4 === 0 ? Math.floor(Math.random() * 9) + 1 : 0,
        regionName: ['北京', '上海', '广州', '深圳', '杭州'][i % 5],
        source: ['微博 weibo.com', 'iPhone客户端', 'Android客户端', '微博网页版'][i % 4],
        isLongText: i % 5 === 0,
        isRepost: i % 3 === 0,
        favorited: i % 7 === 0
      }));

      this.posts.set(mockPosts);
      this.loading.set(false);
    }, 500);
  }

  private generateMockText(index: number): string {
    const texts = [
      '今天天气真不错，适合出门散步。',
      '分享一些工作心得，希望对大家有帮助。最近在研究新技术，感觉收获很大。',
      '刚刚看到一个很有趣的新闻，分享给大家。',
      '周末计划去爬山，有没有一起的？',
      '最近在学习新的编程语言，感觉很有挑战性。分享一些学习笔记和心得体会，希望能够帮助到同样在学习的朋友们。',
      '美食分享：今天尝试了一家新餐厅，味道超赞！',
      '读书笔记：最近在读一本好书，很有启发。',
      '旅行记录：上周去了一个美丽的地方，风景如画。',
      '健身打卡第30天，坚持就是胜利！',
      '分享一个实用的生活小技巧，亲测有效。'
    ];

    return texts[index % texts.length];
  }

  private sortPosts(posts: WeiboPost[]): WeiboPost[] {
    const sorted = [...posts];
    const { field, order } = this.sort();

    sorted.sort((a, b) => {
      let comparison = 0;

      if (field === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        comparison = a[field] - b[field];
      }

      return order === SortOrder.ASC ? comparison : -comparison;
    });

    return sorted;
  }

  applyFilters(): void {
    this.page.set(1);
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
    if (confirm(`确定要删除这条帖子吗？\n\n${this.truncateText(post.text, 50)}`)) {
      const updated = this.posts().filter(p => p.id !== post.id);
      this.posts.set(updated);
    }
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.page.set(page);
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
    if (value === undefined) return 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    if (value === true) return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700';
    return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400';
  }

  getSortIcon(field: 'createdAt' | 'attitudesCount' | 'commentsCount'): string {
    const current = this.sort();
    if (current.field !== field) return '↕';
    return current.order === SortOrder.ASC ? '↑' : '↓';
  }
}
