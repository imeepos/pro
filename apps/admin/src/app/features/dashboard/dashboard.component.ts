import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthQuery } from '../../state/auth.query';
import { User } from '@pro/types';
import { SkerSDK, DashboardStats, RecentActivity } from '@pro/sdk';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser$: Observable<User | null>;
  stats: DashboardStats = {
    totalScreens: 0,
    totalEvents: 0,
    totalWeiboAccounts: 0,
    totalSearchTasks: 0
  };
  recentActivities: RecentActivity[] = [];
  loading = true;

  private sdk = inject(SkerSDK);

  constructor(
    private router: Router,
    private authQuery: AuthQuery
  ) {
    this.currentUser$ = this.authQuery.currentUser$;
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private async loadDashboardData(): Promise<void> {
    try {
      this.loading = true;

      const [stats, activities] = await Promise.all([
        this.sdk.dashboard.getStats(),
        this.sdk.dashboard.getRecentActivities()
      ]);

      this.stats = stats;
      this.recentActivities = activities;
    } catch (error) {
      console.error('加载 Dashboard 数据失败:', error);
    } finally {
      this.loading = false;
    }
  }

  navigateToSection(section: string): void {
    this.router.navigate([`/${section}`]);
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'screen': return 'monitor';
      case 'event': return 'calendar';
      case 'weibo': return 'user-circle';
      default: return 'document';
    }
  }

  getActivityColor(type: string): string {
    switch (type) {
      case 'screen': return 'text-blue-600 bg-blue-100';
      case 'event': return 'text-green-600 bg-green-100';
      case 'weibo': return 'text-purple-600 bg-purple-100';
      case 'task': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }
}