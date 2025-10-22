import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WeiboAccountService, WeiboAccount } from '../../core/services/weibo-account.service';
import { ToastService } from '../../shared/services/toast.service';
import { WeiboLoginComponent } from './weibo-login.component';

interface StatusPresentation {
  label: string;
  classes: string;
}

type WeiboStatusToken = 'ACTIVE' | 'EXPIRED' | 'RESTRICTED' | 'BANNED' | 'INACTIVE' | 'SUSPENDED';

const STATUS_PRESENTATION: Record<WeiboStatusToken, StatusPresentation> = {
  ACTIVE: {
    label: '正常',
    classes: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  },
  EXPIRED: {
    label: '已过期',
    classes: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  },
  RESTRICTED: {
    label: '风控受限',
    classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  },
  BANNED: {
    label: '已封禁',
    classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  },
  INACTIVE: {
    label: '已停用',
    classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  },
  SUSPENDED: {
    label: '暂时冻结',
    classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
  }
};

const FALLBACK_STATUS_PRESENTATION: StatusPresentation = {
  label: '未知状态',
  classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
};

/**
 * 微博账号管理组件
 *
 * 核心职责:
 * 1. 展示用户绑定的所有微博账号
 * 2. 支持添加新的微博账号
 * 3. 支持删除已绑定的微博账号
 * 4. 显示账号状态(正常/过期/封禁)
 */
@Component({
  selector: 'app-weibo-accounts',
  standalone: true,
  imports: [CommonModule, WeiboLoginComponent],
  templateUrl: './weibo-accounts.component.html'
})
export class WeiboAccountsComponent implements OnInit {
  accounts: WeiboAccount[] = [];
  isLoading = false;
  showLoginDialog = false;
  error: string | null = null;
  checkingAccounts = new Set<string>();

  constructor(
    private weiboAccountService: WeiboAccountService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  async loadAccounts(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const result = await this.weiboAccountService.getAccounts().toPromise();
      this.accounts = result?.accounts || [];
    } catch (error: any) {
      this.error = error.message || '加载账号列表失败';
      console.error('加载微博账号列表失败:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async deleteAccount(account: WeiboAccount): Promise<void> {
    if (!confirm(`确定要删除微博账号 "${account.nickname}" 吗?`)) {
      return;
    }

    try {
      await this.weiboAccountService.deleteAccount(Number(account.id));
      await this.loadAccounts();
      this.toastService.success(`微博账号 "${account.nickname}" 已删除`);
    } catch (error: any) {
      this.toastService.error(`删除失败: ${error.message}`);
      console.error('删除微博账号失败:', error);
    }
  }

  /**
   * 显示添加账号对话框
   */
  showAddAccountDialog(): void {
    this.showLoginDialog = true;
  }

  /**
   * 关闭添加账号对话框
   */
  closeAddAccountDialog(): void {
    this.showLoginDialog = false;
    this.loadAccounts();
  }

  async checkAccount(account: WeiboAccount): Promise<void> {
    if (this.checkingAccounts.has(account.id)) {
      return;
    }

    this.checkingAccounts.add(account.id);

    try {
      await this.weiboAccountService.checkAccount(Number(account.id));
      await this.loadAccounts();
      this.toastService.success(`账号 "${account.nickname}" 检查完成`);
    } catch (error: any) {
      this.toastService.error(`检查失败: ${error.message}`);
      console.error('检查账号失败:', error);
    } finally {
      this.checkingAccounts.delete(account.id);
    }
  }

  isChecking(accountId: string): boolean {
    return this.checkingAccounts.has(accountId);
  }

  /**
   * 获取状态显示文本
   */
  getStatusText(status: string): string {
    return this.describeStatus(status).label;
  }

  getStatusClasses(status: string): string {
    return this.describeStatus(status).classes;
  }

  private describeStatus(status: string | null | undefined): StatusPresentation {
    if (!status) {
      return FALLBACK_STATUS_PRESENTATION;
    }

    const normalized = status.toUpperCase() as WeiboStatusToken;
    return STATUS_PRESENTATION[normalized] ?? FALLBACK_STATUS_PRESENTATION;
  }

  /**
   * 格式化日期
   */
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
}
