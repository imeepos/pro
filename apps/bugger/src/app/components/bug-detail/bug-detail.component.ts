import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BugService } from '../../services/bug.service';
import { Bug, CreateBugCommentDto, BugStatus, BugPriority } from '@pro/types';

@Component({
  selector: 'app-bug-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in max-w-6xl mx-auto">
      <!-- 操作按钮 -->
      <div class="mb-6 flex justify-between items-center">
        <button (click)="goBack()" class="btn-secondary">
          <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          返回列表
        </button>
        <div class="space-x-3">
          <button (click)="editBug()" class="btn-secondary">编辑</button>
          <button (click)="deleteBug()" class="btn-danger">删除</button>
        </div>
      </div>

      <div *ngIf="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-gray-500">加载中...</p>
      </div>

      <div *ngIf="!loading && !bug" class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Bug不存在</h3>
        <p class="mt-1 text-sm text-gray-500">该Bug可能已被删除或不存在</p>
      </div>

      <div *ngIf="!loading && bug" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 主要内容 -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Bug信息卡片 -->
          <div class="bug-card">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <div class="flex items-center space-x-3 mb-2">
                  <h1 class="text-2xl font-bold text-gray-900">{{ bug.title }}</h1>
                  <span [class]="'px-3 py-1 text-sm font-medium rounded-full ' + getPriorityClass(bug.priority)">
                    {{ getPriorityText(bug.priority) }}
                  </span>
                  <span [class]="'px-3 py-1 text-sm font-medium rounded-full ' + getStatusClass(bug.status)">
                    {{ getStatusText(bug.status) }}
                  </span>
                </div>
                <div class="text-sm text-gray-500 space-x-4">
                  <span>ID: {{ bug.id }}</span>
                  <span>创建于 {{ bug.createdAt | date:'medium' }}</span>
                  <span *ngIf="bug.updatedAt !== bug.createdAt">更新于 {{ bug.updatedAt | date:'medium' }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <h3 class="text-sm font-medium text-gray-900 mb-2">详细描述</h3>
                <p class="text-gray-700 whitespace-pre-wrap">{{ bug.description }}</p>
              </div>

              <div *ngIf="bug.stepsToReproduce">
                <h3 class="text-sm font-medium text-gray-900 mb-2">复现步骤</h3>
                <p class="text-gray-700 whitespace-pre-wrap">{{ bug.stepsToReproduce }}</p>
              </div>

              <div *ngIf="bug.expectedBehavior || bug.actualBehavior" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div *ngIf="bug.expectedBehavior">
                  <h3 class="text-sm font-medium text-gray-900 mb-2">期望行为</h3>
                  <p class="text-gray-700 whitespace-pre-wrap">{{ bug.expectedBehavior }}</p>
                </div>
                <div *ngIf="bug.actualBehavior">
                  <h3 class="text-sm font-medium text-gray-900 mb-2">实际行为</h3>
                  <p class="text-gray-700 whitespace-pre-wrap">{{ bug.actualBehavior }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 评论区域 -->
          <div class="bug-card">
            <h3 class="text-lg font-medium text-gray-900 mb-4">评论 ({{ (bug.comments && bug.comments.length) || 0 }})</h3>

            <!-- 添加评论表单 -->
            <div class="mb-6 p-4 bg-gray-50 rounded-lg">
              <form (ngSubmit)="addComment()" class="space-y-3">
                <textarea
                  [(ngModel)]="newComment"
                  name="newComment"
                  rows="3"
                  placeholder="添加评论..."
                  class="form-textarea"
                  required></textarea>
                <div class="flex justify-end">
                  <button
                    type="submit"
                    [disabled]="isAddingComment"
                    class="btn-primary">
                    {{ isAddingComment ? '添加中...' : '添加评论' }}
                  </button>
                </div>
              </form>
            </div>

            <!-- 评论列表 -->
            <div class="space-y-4">
              <div *ngIf="!bug.comments || bug.comments.length === 0" class="text-center py-8 text-gray-500">
                暂无评论
              </div>
              <div *ngFor="let comment of bug.comments" class="flex space-x-3 p-4 bg-gray-50 rounded-lg">
                <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-gray-900">{{ comment.authorName }}</span>
                    <span class="text-xs text-gray-500">{{ comment.createdAt | date:'short' }}</span>
                  </div>
                  <p class="text-gray-700 whitespace-pre-wrap">{{ comment.content }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 侧边栏 -->
        <div class="space-y-6">
          <!-- 状态操作 -->
          <div class="bug-card">
            <h3 class="text-lg font-medium text-gray-900 mb-4">状态管理</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">更改状态</label>
                <select [(ngModel)]="selectedStatus" (change)="changeStatus()" class="form-input">
                  <option value="">选择新状态</option>
                  <option [value]="BugStatus.OPEN">待处理</option>
                  <option [value]="BugStatus.IN_PROGRESS">进行中</option>
                  <option [value]="BugStatus.RESOLVED">已解决</option>
                  <option [value]="BugStatus.CLOSED">已关闭</option>
                  <option [value]="BugStatus.REJECTED">已拒绝</option>
                  <option [value]="BugStatus.REOPENED">已重新打开</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">分配给</label>
                <input
                  type="text"
                  [(ngModel)]="assigneeId"
                  placeholder="用户ID"
                  class="form-input">
                <button (click)="assignBug()" class="mt-2 w-full btn-secondary">分配</button>
              </div>
            </div>
          </div>

          <!-- 环境信息 -->
          <div *ngIf="bug.environment" class="bug-card">
            <h3 class="text-lg font-medium text-gray-900 mb-4">环境信息</h3>
            <div class="space-y-2 text-sm">
              <div *ngIf="bug.environment.os" class="flex justify-between">
                <span class="text-gray-600">操作系统:</span>
                <span class="text-gray-900">{{ bug.environment.os }}</span>
              </div>
              <div *ngIf="bug.environment.browser" class="flex justify-between">
                <span class="text-gray-600">浏览器:</span>
                <span class="text-gray-900">{{ bug.environment.browser }}</span>
              </div>
              <div *ngIf="bug.environment.appVersion" class="flex justify-between">
                <span class="text-gray-600">应用版本:</span>
                <span class="text-gray-900">{{ bug.environment.appVersion }}</span>
              </div>
              <div *ngIf="bug.environment.device" class="flex justify-between">
                <span class="text-gray-600">设备:</span>
                <span class="text-gray-900">{{ bug.environment.device }}</span>
              </div>
            </div>
          </div>

          <!-- 其他信息 -->
          <div class="bug-card">
            <h3 class="text-lg font-medium text-gray-900 mb-4">其他信息</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">复现频率:</span>
                <span class="text-gray-900">{{ getReproductionRateText(bug.reproductionRate) }}</span>
              </div>
              <div *ngIf="bug.dueDate" class="flex justify-between">
                <span class="text-gray-600">截止日期:</span>
                <span class="text-gray-900">{{ bug.dueDate | date:'medium' }}</span>
              </div>
              <div *ngIf="bug.estimatedHours" class="flex justify-between">
                <span class="text-gray-600">预估工时:</span>
                <span class="text-gray-900">{{ bug.estimatedHours }} 小时</span>
              </div>
              <div *ngIf="bug.actualHours" class="flex justify-between">
                <span class="text-gray-600">实际工时:</span>
                <span class="text-gray-900">{{ bug.actualHours }} 小时</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class BugDetailComponent implements OnInit {
  bug: Bug | null = null;
  loading = true;
  selectedStatus = '';
  assigneeId = '';
  newComment = '';
  isAddingComment = false;

  BugStatus = BugStatus;
  BugPriority = BugPriority;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bugService: BugService
  ) {}

  ngOnInit(): void {
    this.loadBug();
  }

  loadBug(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/bugs']);
      return;
    }

    this.bugService.getBug(id).subscribe(result => {
      this.loading = false;
      if (result.success && result.data) {
        this.bug = result.data;
        if (this.bug.assigneeId) {
          this.assigneeId = this.bug.assigneeId;
        }
      } else {
        this.bug = null;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/bugs']);
  }

  editBug(): void {
    if (this.bug) {
      this.router.navigate(['/bugs', this.bug.id, 'edit']);
    }
  }

  deleteBug(): void {
    if (this.bug && confirm('确定要删除这个Bug吗？此操作不可恢复。')) {
      this.bugService.deleteBug(this.bug.id).subscribe(result => {
        if (result.success) {
          alert('Bug删除成功');
          this.router.navigate(['/bugs']);
        } else {
          alert('Bug删除失败');
        }
      });
    }
  }

  changeStatus(): void {
    if (!this.selectedStatus || !this.bug) return;

    const comment = prompt('请输入状态变更说明（可选）:');
    this.bugService.updateBugStatus(this.bug.id, this.selectedStatus, comment || undefined).subscribe(result => {
      if (result.success && result.data) {
        this.bug = result.data;
        this.selectedStatus = '';
        alert('状态更新成功');
      } else {
        alert('状态更新失败');
      }
    });
  }

  assignBug(): void {
    if (!this.assigneeId.trim() || !this.bug) return;

    this.bugService.assignBug(this.bug.id, this.assigneeId.trim()).subscribe(result => {
      if (result.success && result.data) {
        this.bug = result.data;
        alert('Bug分配成功');
      } else {
        alert('Bug分配失败');
      }
    });
  }

  addComment(): void {
    if (!this.newComment.trim() || !this.bug) return;

    this.isAddingComment = true;
    const commentData: CreateBugCommentDto = {
      content: this.newComment.trim()
    };

    this.bugService.addComment(this.bug.id, commentData).subscribe(result => {
      if (result.success && result.data) {
        this.bug!.comments = [...(this.bug!.comments || []), result.data];
        this.newComment = '';
      } else {
        alert('评论添加失败');
      }
      this.isAddingComment = false;
    });
  }

  getPriorityClass(priority: BugPriority): string {
    const classes = {
      [BugPriority.LOW]: 'bg-green-100 text-green-800',
      [BugPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800',
      [BugPriority.HIGH]: 'bg-red-100 text-red-800',
      [BugPriority.CRITICAL]: 'bg-red-200 text-red-900 font-bold',
    };
    return classes[priority] || 'bg-gray-100 text-gray-800';
  }

  getPriorityText(priority: BugPriority): string {
    const texts = {
      [BugPriority.LOW]: '低',
      [BugPriority.MEDIUM]: '中',
      [BugPriority.HIGH]: '高',
      [BugPriority.CRITICAL]: '紧急',
    };
    return texts[priority] || priority;
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

  getReproductionRateText(rate?: string): string {
    const texts = {
      'always': '总是',
      'sometimes': '有时',
      'rarely': '很少',
    };
    return texts[rate as keyof typeof texts] || '未知';
  }
}