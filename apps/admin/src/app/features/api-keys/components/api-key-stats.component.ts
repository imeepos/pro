import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, catchError, map } from 'rxjs/operators';

import { ApiKeyStats, ApiKeyUsageStats, ApiKey } from '@pro/types';
import { ApiKeyService } from '../services/api-key.service';

@Component({
  selector: 'app-api-key-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-key-stats.component.html',
  styleUrls: ['./api-key-stats.component.scss']
})
export class ApiKeyStatsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  stats$ = this.apiKeyService.stats$;
  usageStats$ = this.apiKeyService.usageStats$;
  loading$ = this.apiKeyService.loading$;

  // 选中的统计卡片
  selectedStat: string | null = null;

  constructor(private apiKeyService: ApiKeyService) {}

  ngOnInit(): void {
    // 组件初始化时可以添加额外的逻辑
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 选择统计卡片
  selectStat(statType: string | null): void {
    this.selectedStat = this.selectedStat === statType ? null : statType;
  }

  // 获取统计数据
  getStatsData(): Observable<StatsData> {
    return this.stats$.pipe(
      map((stats: ApiKeyStats | null) => {
        if (!stats) {
          return this.getDefaultStatsData();
        }

        return {
          total: stats.total,
          active: stats.active,
          inactive: stats.inactive,
          expired: stats.expired,
          revoked: stats.revoked,
          readOnly: stats.readOnly,
          readWrite: stats.readWrite,
          admin: stats.admin,
          expiringSoon: stats.expiringSoon,
          neverUsed: stats.neverUsed,
          mostUsed: stats.mostUsed,
          recentlyUsed: stats.recentlyUsed
        };
      }),
      catchError(() => of(this.getDefaultStatsData()))
    );
  }

  // 获取默认统计数据
  private getDefaultStatsData(): StatsData {
    return {
      total: 0,
      active: 0,
      inactive: 0,
      expired: 0,
      revoked: 0,
      readOnly: 0,
      readWrite: 0,
      admin: 0,
      expiringSoon: 0,
      neverUsed: 0,
      mostUsed: null,
      recentlyUsed: null
    };
  }

  // 获取使用率
  getUsageRate(statsData: StatsData): number {
    if (statsData.total === 0) return 0;
    return Math.round((statsData.active / statsData.total) * 100);
  }

  // 获取健康度评分
  getHealthScore(statsData: StatsData): number {
    if (statsData.total === 0) return 100;

    let score = 100;

    // 扣分因素
    if (statsData.expired > 0) score -= (statsData.expired / statsData.total) * 30;
    if (statsData.expiringSoon > 0) score -= (statsData.expiringSoon / statsData.total) * 15;
    if (statsData.revoked > 0) score -= (statsData.revoked / statsData.total) * 20;
    if (statsData.neverUsed > 0) score -= (statsData.neverUsed / statsData.total) * 10;

    return Math.max(0, Math.round(score));
  }

  // 获取健康度等级
  getHealthGrade(score: number): { grade: string; color: string; icon: string } {
    if (score >= 90) return { grade: '优秀', color: 'text-green-600', icon: '🟢' };
    if (score >= 75) return { grade: '良好', color: 'text-blue-600', icon: '🔵' };
    if (score >= 60) return { grade: '一般', color: 'text-yellow-600', icon: '🟡' };
    if (score >= 40) return { grade: '较差', color: 'text-orange-600', icon: '🟠' };
    return { grade: '危险', color: 'text-red-600', icon: '🔴' };
  }

  // 获取类型分布数据
  getTypeDistribution(statsData: StatsData): TypeDistribution[] {
    const total = statsData.total;
    if (total === 0) return [];

    return [
      {
        type: '只读',
        count: statsData.readOnly,
        percentage: Math.round((statsData.readOnly / total) * 100),
        color: 'bg-blue-500'
      },
      {
        type: '读写',
        count: statsData.readWrite,
        percentage: Math.round((statsData.readWrite / total) * 100),
        color: 'bg-purple-500'
      },
      {
        type: '管理员',
        count: statsData.admin,
        percentage: Math.round((statsData.admin / total) * 100),
        color: 'bg-red-500'
      }
    ].filter(item => item.count > 0);
  }

  // 获取状态分布数据
  getStatusDistribution(statsData: StatsData): StatusDistribution[] {
    const total = statsData.total;
    if (total === 0) return [];

    return [
      {
        status: '活跃',
        count: statsData.active,
        percentage: Math.round((statsData.active / total) * 100),
        color: 'bg-green-500'
      },
      {
        status: '未激活',
        count: statsData.inactive,
        percentage: Math.round((statsData.inactive / total) * 100),
        color: 'bg-yellow-500'
      },
      {
        status: '已过期',
        count: statsData.expired,
        percentage: Math.round((statsData.expired / total) * 100),
        color: 'bg-red-500'
      },
      {
        status: '已撤销',
        count: statsData.revoked,
        percentage: Math.round((statsData.revoked / total) * 100),
        color: 'bg-gray-500'
      }
    ].filter(item => item.count > 0);
  }

  // 获取趋势数据
  getTrendData(): TrendData[] {
    // 这里可以根据实际需求生成趋势数据
    // 目前返回模拟数据
    return [
      { period: '本周', requests: 1250, change: 15 },
      { period: '上周', requests: 1086, change: -5 },
      { period: '本月', requests: 5200, change: 23 },
      { period: '上月', requests: 4230, change: 8 }
    ];
  }

  // 格式化数字
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  // 格式化百分比
  formatPercentage(value: number): string {
    return value + '%';
  }

  // 刷新统计数据
  refreshStats(): void {
    this.apiKeyService.loadStats();
  }
}

// 接口定义
interface StatsData {
  total: number;
  active: number;
  inactive: number;
  expired: number;
  revoked: number;
  readOnly: number;
  readWrite: number;
  admin: number;
  expiringSoon: number;
  neverUsed: number;
  mostUsed: ApiKey | null;
  recentlyUsed: ApiKey | null;
}

interface TypeDistribution {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

interface TrendData {
  period: string;
  requests: number;
  change: number;
}
