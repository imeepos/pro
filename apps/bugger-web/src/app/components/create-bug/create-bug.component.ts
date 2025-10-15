import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BugService } from '../../services/bug.service';
import { CreateBugDto, BugEnvironment } from '@pro/types';

// 定义枚举
enum BugPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

enum BugCategory {
  FUNCTIONAL = 'functional',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  UI_UX = 'ui_ux',
  INTEGRATION = 'integration',
  DATA = 'data',
  CONFIGURATION = 'configuration',
  DOCUMENTATION = 'documentation'
}

@Component({
  selector: 'app-create-bug',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in max-w-4xl mx-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">提交Bug</h1>
        <p class="text-gray-600 mt-1">报告发现的问题，帮助改进产品质量</p>
      </div>

      <div class="bg-white shadow-sm border border-gray-200 rounded-lg">
        <form (ngSubmit)="onSubmit()" class="p-6 space-y-6">
          <!-- 基本信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Bug标题 <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                [(ngModel)]="bug.title"
                name="title"
                required
                placeholder="简要描述问题"
                class="form-input">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                优先级 <span class="text-red-500">*</span>
              </label>
              <select [(ngModel)]="bug.priority" name="priority" required class="form-input">
                <option value="">请选择优先级</option>
                <option [value]="BugPriority.LOW">低 - 轻微问题，不影响主要功能</option>
                <option [value]="BugPriority.MEDIUM">中 - 影响用户体验，但可正常使用</option>
                <option [value]="BugPriority.HIGH">高 - 严重影响，功能受限</option>
                <option [value]="BugPriority.CRITICAL">紧急 - 系统崩溃或核心功能失效</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                分类 <span class="text-red-500">*</span>
              </label>
              <select [(ngModel)]="bug.category" name="category" required class="form-input">
                <option value="">请选择分类</option>
                <option [value]="BugCategory.FUNCTIONAL">功能问题</option>
                <option [value]="BugCategory.PERFORMANCE">性能问题</option>
                <option [value]="BugCategory.SECURITY">安全问题</option>
                <option [value]="BugCategory.UI_UX">界面/用户体验</option>
                <option [value]="BugCategory.INTEGRATION">集成问题</option>
                <option [value]="BugCategory.DATA">数据问题</option>
                <option [value]="BugCategory.CONFIGURATION">配置问题</option>
                <option [value]="BugCategory.DOCUMENTATION">文档问题</option>
              </select>
            </div>
          </div>

          <!-- 详细描述 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              详细描述 <span class="text-red-500">*</span>
            </label>
            <textarea
              [(ngModel)]="bug.description"
              name="description"
              required
              rows="4"
              placeholder="详细描述发现的问题，包括具体的错误信息和影响范围"
              class="form-textarea"></textarea>
          </div>

          <!-- 环境信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">操作系统</label>
              <input
                type="text"
                [(ngModel)]="bug.environment!.os"
                name="os"
                placeholder="Windows 11 / macOS 13.0 / Ubuntu 22.04"
                class="form-input">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">浏览器</label>
              <input
                type="text"
                [(ngModel)]="bug.environment!.browser"
                name="browser"
                placeholder="Chrome 119 / Firefox 120 / Safari 17"
                class="form-input">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">应用版本</label>
              <input
                type="text"
                [(ngModel)]="bug.environment!.appVersion"
                name="appVersion"
                placeholder="v1.2.3"
                class="form-input">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">设备类型</label>
              <input
                type="text"
                [(ngModel)]="bug.environment!.device"
                name="device"
                placeholder="桌面 / 移动 / 平板"
                class="form-input">
            </div>
          </div>

          <!-- 复现步骤 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              复现步骤
            </label>
            <textarea
              [(ngModel)]="bug.stepsToReproduce"
              name="stepsToReproduce"
              rows="3"
              placeholder="1. 点击登录按钮&#10;2. 输入用户名和密码&#10;3. 点击提交&#10;4. 观察到错误信息"
              class="form-textarea"></textarea>
          </div>

          <!-- 期望行为 vs 实际行为 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                期望行为
              </label>
              <textarea
                [(ngModel)]="bug.expectedBehavior"
                name="expectedBehavior"
                rows="3"
                placeholder="描述期望的正确行为"
                class="form-textarea"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                实际行为
              </label>
              <textarea
                [(ngModel)]="bug.actualBehavior"
                name="actualBehavior"
                rows="3"
                placeholder="描述实际观察到的行为"
                class="form-textarea"></textarea>
            </div>
          </div>

          <!-- 复现频率 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">复现频率</label>
            <select [(ngModel)]="bug.reproductionRate" name="reproductionRate" class="form-input">
              <option value="">请选择复现频率</option>
              <option value="always">总是 - 每次操作都会出现</option>
              <option value="sometimes">有时 - 部分时间会出现</option>
              <option value="rarely">很少 - 偶尔会出现</option>
            </select>
          </div>

          <!-- 分配给 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">分配给 (可选)</label>
            <input
              type="text"
              [(ngModel)]="bug.assigneeId"
              name="assigneeId"
              placeholder="开发者ID或用户名"
              class="form-input">
          </div>

          <!-- 按钮组 -->
          <div class="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              (click)="onCancel()"
              class="btn-secondary">
              取消
            </button>
            <button
              type="submit"
              [disabled]="isSubmitting"
              class="btn-primary">
              <svg *ngIf="isSubmitting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isSubmitting ? '提交中...' : '提交Bug' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: []
})
export class CreateBugComponent {
  bug: CreateBugDto = {
    title: '',
    description: '',
    priority: BugPriority.MEDIUM,
    category: BugCategory.FUNCTIONAL,
    environment: {},
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    reproductionRate: 'sometimes'
  };

  isSubmitting = false;
  BugPriority = BugPriority;
  BugCategory = BugCategory;

  constructor(
    private bugService: BugService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;

    // 清理空的环境信息
    const cleanedBug: CreateBugDto = {
      ...this.bug,
      environment: this.cleanEnvironment(this.bug.environment || {})
    };

    this.bugService.createBug(cleanedBug).subscribe({
      next: (createdBug) => {
        if (createdBug) {
          alert('Bug提交成功！');
          this.router.navigate(['/bugs', createdBug.id]);
        } else {
          alert('Bug提交失败，请重试');
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('创建Bug失败:', error);
        alert('Bug提交失败：' + (error.message || '未知错误'));
        this.isSubmitting = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/bugs']);
  }

  private validateForm(): boolean {
    if (!this.bug.title.trim()) {
      alert('请输入Bug标题');
      return false;
    }

    if (!this.bug.description.trim()) {
      alert('请输入详细描述');
      return false;
    }

    if (!this.bug.priority) {
      alert('请选择优先级');
      return false;
    }

    if (!this.bug.category) {
      alert('请选择分类');
      return false;
    }

    return true;
  }

  private cleanEnvironment(env: BugEnvironment): BugEnvironment | undefined {
    const cleaned: any = {};
    Object.keys(env).forEach(key => {
      const value = env[key as keyof BugEnvironment];
      if (value && typeof value === 'string' && value.trim()) {
        cleaned[key] = value.trim();
      }
    });
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
}