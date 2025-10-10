import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthQuery } from '../../state/auth.query';
import { User } from '@pro/types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser$: Observable<User | null>;
  stats = {
    totalScreens: 0,
    totalEvents: 0,
    totalWeiboAccounts: 0,
    totalSearchTasks: 0
  };
  recentActivities = [
    { type: 'screen', message: '创建了新的大屏', time: '2小时前' },
    { type: 'event', message: '添加了新事件', time: '4小时前' },
    { type: 'weibo', message: '更新了微博账号', time: '1天前' }
  ];

  constructor(
    private router: Router,
    private authQuery: AuthQuery
  ) {
    this.currentUser$ = this.authQuery.currentUser$;
  }

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  private loadDashboardStats(): void {
    // TODO: 调用API获取统计数据
    this.stats = {
      totalScreens: 12,
      totalEvents: 45,
      totalWeiboAccounts: 8,
      totalSearchTasks: 3
    };
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
      default: return 'text-gray-600 bg-gray-100';
    }
  }
}