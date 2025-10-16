import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BugService } from '../../services/bug.service';
import { Bug } from '@pro/types';

// 定义枚举
enum BugStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REJECTED = 'rejected',
  REOPENED = 'reopened'
}

enum BugPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fade-in">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">仪表板</h1>
        <p class="text-gray-600 mt-1">Bug追踪系统概览</p>
      </div>

      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="flex items-center">
            <div class="p-3 bg-blue-100 rounded-lg">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">总Bug数</p>
              <p class="text-2xl font-bold text-gray-900">{{ statistics.total || 0 }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="flex items-center">
            <div class="p-3 bg-yellow-100 rounded-lg">
              <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">待处理</p>
              <p class="text-2xl font-bold text-yellow-600">{{ statistics.byStatus?.open || 0 }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="flex items-center">
            <div class="p-3 bg-blue-100 rounded-lg">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">进行中</p>
              <p class="text-2xl font-bold text-blue-600">{{ statistics.byStatus?.in_progress || 0 }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="flex items-center">
            <div class="p-3 bg-green-100 rounded-lg">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">已解决</p>
              <p class="text-2xl font-bold text-green-600">{{ statistics.byStatus?.resolved || 0 }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 优先级分布 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">优先级分布</h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span class="text-sm text-gray-600">低优先级</span>
              </div>
              <span class="text-sm font-medium text-gray-900">{{ statistics.byPriority?.low || 0 }}</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span class="text-sm text-gray-600">中优先级</span>
              </div>
              <span class="text-sm font-medium text-gray-900">{{ statistics.byPriority?.medium || 0 }}</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span class="text-sm text-gray-600">高优先级</span>
              </div>
              <span class="text-sm font-medium text-gray-900">{{ statistics.byPriority?.high || 0 }}</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-3 h-3 bg-red-700 rounded-full mr-2"></div>
                <span class="text-sm text-gray-600">紧急</span>
              </div>
              <span class="text-sm font-medium text-gray-900">{{ statistics.byPriority?.critical || 0 }}</span>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">最近Bug</h2>
          <div class="space-y-3">
            <div *ngFor="let bug of recentBugs.slice(0, 5)" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div class="flex-1">
                <h4 class="text-sm font-medium text-gray-900 truncate">{{ bug.title }}</h4>
                <p class="text-xs text-gray-500">{{ bug.createdAt | date:'short' }}</p>
              </div>
              <span [class]="'px-2 py-1 text-xs font-medium rounded-full ' + getStatusClass(bug.status)">
                {{ getStatusText(bug.status) }}
              </span>
            </div>
            <div *ngIf="recentBugs.length === 0" class="text-center py-8 text-gray-500">
              暂无Bug记录
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit {
  statistics: any = {};
  recentBugs: Bug[] = [];

  constructor(private bugService: BugService) {}

  ngOnInit(): void {
    this.loadStatistics();
    this.loadRecentBugs();
  }

  loadStatistics(): void {
    this.bugService.getStatistics().subscribe(result => {
      if (result.success && result.data) {
        this.statistics = result.data;
      } else {
        this.statistics = {};
      }
    });
  }

  loadRecentBugs(): void {
    this.bugService.getBugs({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }).subscribe(result => {
      if (result.success && result.data) {
        this.recentBugs = result.data.bugs;
      } else {
        this.recentBugs = [];
      }
    });
  }

  getStatusClass(status: BugStatus): string {
    const classes = {
      [BugStatus.OPEN]: 'bg-blue-100 text-blue-800',
      [BugStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
      [BugStatus.RESOLVED]: 'bg-green-100 text-green-800',
      [BugStatus.CLOSED]: 'bg-gray-100 text-gray-800',
      [BugStatus.REJECTED]: 'bg-red-100 text-red-800',
      [BugStatus.REOPENED]: 'bg-purple-100 text-purple-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: BugStatus): string {
    const texts = {
      [BugStatus.OPEN]: '待处理',
      [BugStatus.IN_PROGRESS]: '进行中',
      [BugStatus.RESOLVED]: '已解决',
      [BugStatus.CLOSED]: '已关闭',
      [BugStatus.REJECTED]: '已拒绝',
      [BugStatus.REOPENED]: '已重新打开',
    };
    return texts[status] || status;
  }
}