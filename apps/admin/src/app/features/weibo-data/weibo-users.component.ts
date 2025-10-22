import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeiboUser } from '../../core/services/weibo-data.types';

interface WeiboUserProfile extends WeiboUser {
  location?: string;
  biography?: string;
  lastActiveAt: string;
  tags: string[];
}

type VerificationFilter = 'all' | 'verified' | 'unverified';
type FollowerBracket = 'all' | '0-1k' | '1k-10k' | '10k-100k' | '100k+';

@Component({
  selector: 'app-weibo-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './weibo-users.component.html'
})
export class WeiboUsersComponent implements OnInit {
  users = signal<WeiboUserProfile[]>([]);
  loading = signal(false);
  selectedUser = signal<WeiboUserProfile | null>(null);

  keyword = signal('');
  weiboId = signal('');
  verification = signal<VerificationFilter>('all');
  followerBracket = signal<FollowerBracket>('all');
  tagKeyword = signal('');

  filteredUsers = computed(() => {
    const keyword = this.keyword().trim().toLowerCase();
    const idKeyword = this.weiboId().trim();
    const tagKeyword = this.tagKeyword().trim().toLowerCase();
    const verification = this.verification();
    const bracket = this.followerBracket();

    return this.users().filter(user => {
      if (keyword && !user.screenName.toLowerCase().includes(keyword) && !user.biography?.toLowerCase().includes(keyword)) {
        return false;
      }

      if (idKeyword && !user.weiboId.includes(idKeyword)) {
        return false;
      }

      if (verification === 'verified' && !user.verified) {
        return false;
      }

      if (verification === 'unverified' && user.verified) {
        return false;
      }

      if (tagKeyword && !user.tags.some(tag => tag.toLowerCase().includes(tagKeyword))) {
        return false;
      }

      if (bracket !== 'all' && !this.isInBracket(user.followersCount, bracket)) {
        return false;
      }

      return true;
    });
  });

  totalFollowers = computed(() =>
    this.filteredUsers().reduce((sum, user) => sum + user.followersCount, 0)
  );

  averageStatuses = computed(() => {
    const users = this.filteredUsers();
    if (users.length === 0) {
      return 0;
    }
    const total = users.reduce((sum, user) => sum + user.statusesCount, 0);
    return Math.round(total / users.length);
  });

  ngOnInit(): void {
    this.loadMockUsers();
  }

  refresh(): void {
    this.loadMockUsers();
  }

  applyFilters(): void {
    this.keyword.set(this.keyword().trim());
    this.weiboId.set(this.weiboId().trim());
    this.tagKeyword.set(this.tagKeyword().trim());
  }

  resetFilters(): void {
    this.keyword.set('');
    this.weiboId.set('');
    this.verification.set('all');
    this.followerBracket.set('all');
    this.tagKeyword.set('');
  }

  openDetail(user: WeiboUserProfile): void {
    this.selectedUser.set(user);
  }

  closeDetail(): void {
    this.selectedUser.set(null);
  }

  private loadMockUsers(): void {
    this.loading.set(true);

    setTimeout(() => {
      const mockUsers: WeiboUserProfile[] = Array.from({ length: 48 }, (_, index) => {
        const followerBase = Math.floor(Math.random() * 500_000);
        const verified = index % 3 === 0;
        const statuses = Math.floor(Math.random() * 20_000);
        const lastActive = new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000);

        return {
          id: `user-${index + 1}`,
          weiboId: `${100_000_000 + index}`,
          screenName: `微博用户 ${index + 1}`,
          profileImageUrl: `https://i.pravatar.cc/150?img=${(index % 70) + 1}`,
          verified,
          followersCount: followerBase,
          friendsCount: Math.floor(Math.random() * 5000),
          statusesCount: statuses,
          location: ['北京', '上海', '广州', '深圳', '杭州', '成都'][index % 6],
          biography: this.mockBiography(index),
          tags: this.mockTags(index),
          lastActiveAt: lastActive.toISOString()
        };
      });

      this.users.set(mockUsers);
      this.loading.set(false);
    }, 300);
  }

  private mockBiography(index: number): string {
    const bios = [
      '热爱技术与创作的数字游民。',
      '关注社会话题，记录生活点滴。',
      '数据分析师，探索社交网络趋势。',
      '旅行摄影爱好者，分享世界美景。',
      '品牌营销顾问，研究内容策略。',
      '新闻观察员，聚焦财经资讯。'
    ];
    return bios[index % bios.length];
  }

  private mockTags(index: number): string[] {
    const tagSets = [
      ['科技', '编程', 'AI'],
      ['生活', '美食', '旅行'],
      ['财经', '投资', '热点'],
      ['摄影', '艺术', '设计'],
      ['教育', '学习', '成长'],
      ['健康', '运动', '跑步']
    ];
    return tagSets[index % tagSets.length];
  }

  private isInBracket(count: number, bracket: FollowerBracket): boolean {
    switch (bracket) {
      case '0-1k':
        return count < 1_000;
      case '1k-10k':
        return count >= 1_000 && count < 10_000;
      case '10k-100k':
        return count >= 10_000 && count < 100_000;
      case '100k+':
        return count >= 100_000;
      default:
        return true;
    }
  }

  formatNumber(value: number): string {
    if (value >= 100_000_000) {
      return `${(value / 100_000_000).toFixed(1)}亿`;
    }
    if (value >= 10_000) {
      return `${(value / 10_000).toFixed(1)}万`;
    }
    return value.toString();
  }

  formatDate(value: string): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
