import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import {
  WeiboInteraction,
  WeiboInteractionType,
  WeiboTargetType,
  InteractionFilter
} from '../../core/services/weibo-data.types';

interface UserSnapshot {
  screenName?: string;
  profileImageUrl?: string;
  weiboId?: string;
}

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
    NzAvatarModule,
    NzIconModule,
    NzSpinModule,
    NzEmptyModule
  ],
  templateUrl: './weibo-interactions.component.html'
})
export class WeiboInteractionsComponent {
  interactions = signal<WeiboInteraction[]>(this.mockInteractions());
  loading = signal<boolean>(false);
  activeTab = signal<WeiboInteractionType | 'all'>('all');

  searchUserWeiboId = signal<string>('');
  searchTargetWeiboId = signal<string>('');
  dateRange = signal<Date[] | null>(null);
  selectedTargetType = signal<WeiboTargetType | null>(null);

  filteredInteractions = computed(() => {
    let data = this.interactions();
    const tab = this.activeTab();

    if (tab !== 'all') {
      data = data.filter(item => item.interactionType === tab);
    }

    const userWeiboId = this.searchUserWeiboId();
    if (userWeiboId) {
      data = data.filter(item => {
        const snapshot = item.userInfoSnapshot as UserSnapshot;
        return snapshot.weiboId?.includes(userWeiboId);
      });
    }

    const targetWeiboId = this.searchTargetWeiboId();
    if (targetWeiboId) {
      data = data.filter(item => item.targetWeiboId.includes(targetWeiboId));
    }

    const targetType = this.selectedTargetType();
    if (targetType) {
      data = data.filter(item => item.targetType === targetType);
    }

    const range = this.dateRange();
    if (range && range.length === 2) {
      const [start, end] = range;
      data = data.filter(item => {
        const date = new Date(item.createdAt);
        return date >= start && date <= end;
      });
    }

    return data;
  });

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

  onTabChange(index: number): void {
    this.activeTab.set(this.tabIndexMap[index]);
  }

  refresh(): void {
    this.loading.set(true);
    setTimeout(() => {
      this.interactions.set(this.mockInteractions());
      this.loading.set(false);
    }, 500);
  }

  resetFilters(): void {
    this.searchUserWeiboId.set('');
    this.searchTargetWeiboId.set('');
    this.dateRange.set(null);
    this.selectedTargetType.set(null);
  }

  getInteractionIcon(type: WeiboInteractionType): string {
    const icons = {
      [WeiboInteractionType.Like]: '❤️',
      [WeiboInteractionType.Repost]: '🔄',
      [WeiboInteractionType.Comment]: '💬',
      [WeiboInteractionType.Favorite]: '⭐'
    };
    return icons[type];
  }

  getInteractionLabel(type: WeiboInteractionType): string {
    const labels = {
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

  getUserSnapshot(snapshot: Record<string, unknown>): UserSnapshot {
    return snapshot as UserSnapshot;
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

  private mockInteractions(): WeiboInteraction[] {
    const types = Object.values(WeiboInteractionType);
    const targetTypes = Object.values(WeiboTargetType);
    const now = Date.now();

    return Array.from({ length: 50 }, (_, i) => ({
      id: `interaction-${i + 1}`,
      interactionType: types[i % types.length],
      targetType: targetTypes[i % targetTypes.length],
      userInfoSnapshot: {
        screenName: `用户${i + 1}`,
        profileImageUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        weiboId: `${1000000000 + i}`
      },
      targetWeiboId: `${5000000000 + i}`,
      createdAt: new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    }));
  }
}
