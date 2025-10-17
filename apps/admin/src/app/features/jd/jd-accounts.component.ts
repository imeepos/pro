import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { JdAccountService, JdAccount } from '../../core/services/jd-account.service';
import { ToastService } from '../../shared/services/toast.service';
import { JdLoginComponent } from './jd-login.component';

/**
 * 京东账号管理组件
 *
 * 核心职责:
 * 1. 展示用户绑定的所有京东账号
 * 2. 支持添加新的京东账号
 * 3. 支持删除已绑定的京东账号
 * 4. 显示账号状态(正常/过期/封禁)
 */
@Component({
  selector: 'app-jd-accounts',
  standalone: true,
  imports: [CommonModule, JdLoginComponent],
  templateUrl: './jd-accounts.component.html'
})
export class JdAccountsComponent implements OnInit {
  accounts: JdAccount[] = [];
  isLoading = false;
  showLoginDialog = false;
  error: string | null = null;
  checkingAccounts = new Set<number>();

  constructor(
    private jdAccountService: JdAccountService,
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
      const result = await this.jdAccountService.getAccounts().toPromise();
      this.accounts = result?.accounts || [];
    } catch (error: any) {
      this.error = error.message || '加载账号列表失败';
      console.error('加载京东账号列表失败:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async deleteAccount(account: JdAccount): Promise<void> {
    const nickname = account.jdNickname || account.jdUid;
    if (!confirm(`确定要删除京东账号 "${nickname}" 吗?`)) {
      return;
    }

    try {
      await this.jdAccountService.deleteAccount(account.id);
      await this.loadAccounts();
      this.toastService.success(`京东账号 "${nickname}" 已删除`);
    } catch (error: any) {
      this.toastService.error(`删除失败: ${error.message}`);
      console.error('删除京东账号失败:', error);
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

  async checkAccount(account: JdAccount): Promise<void> {
    if (this.checkingAccounts.has(account.id)) {
      return;
    }

    this.checkingAccounts.add(account.id);

    try {
      const result = await this.jdAccountService.checkAccount(account.id);

      const index = this.accounts.findIndex(a => a.id === account.id);
      if (index !== -1) {
        this.accounts[index].status = result.newStatus;
        this.accounts[index].lastCheckAt = result.checkedAt;
      }

      if (result.statusChanged) {
        const message = `账号状态已更新: ${this.getStatusText(result.oldStatus)} → ${this.getStatusText(result.newStatus)}`;
        if (result.newStatus === 'ACTIVE') {
          this.toastService.success(message);
        } else {
          this.toastService.warning(message);
        }
      } else {
        this.toastService.success(`账号状态正常: ${result.message}`);
      }
    } catch (error: any) {
      this.toastService.error(`检查失败: ${error.message}`);
      console.error('检查账号失败:', error);
    } finally {
      this.checkingAccounts.delete(account.id);
    }
  }

  isChecking(accountId: number): boolean {
    return this.checkingAccounts.has(accountId);
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'ACTIVE': '正常',
      'EXPIRED': '已过期',
      'RESTRICTED': '风控受限',
      'BANNED': '已封禁'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): { [key: string]: boolean } {
    const classMap: Record<string, { [key: string]: boolean }> = {
      'ACTIVE': { 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300': true },
      'EXPIRED': { 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300': true },
      'RESTRICTED': { 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300': true },
      'BANNED': { 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300': true }
    };
    return classMap[status] || { 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300': true };
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
}