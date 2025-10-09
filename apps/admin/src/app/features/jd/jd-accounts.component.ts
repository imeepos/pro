import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { createJdAuthSDK, JdAccount, JdAuthSDK } from '@pro/sdk';
import { getApiUrl } from '@pro/config';
import { TokenStorageService } from '../../core/services/token-storage.service';
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
  checkingAccounts = new Set<number>(); // 正在检查的账号 ID

  private jdSDK: JdAuthSDK;

  constructor(
    private tokenStorage: TokenStorageService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.jdSDK = createJdAuthSDK(this.getBaseUrl());
  }

  ngOnInit(): void {
    this.loadAccounts();
  }

  /**
   * 获取 API 基础地址
   */
  private getBaseUrl(): string {
    return getApiUrl().replace('/api', '');
  }

  /**
   * 加载账号列表
   */
  async loadAccounts(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const token = this.tokenStorage.getToken();
      if (!token) {
        this.router.navigate(['/login']);
        return;
      }

      const result = await this.jdSDK.getAccounts(token);
      this.accounts = result.accounts;
    } catch (error: any) {
      this.error = error.message || '加载账号列表失败';
      console.error('加载京东账号列表失败:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 删除账号
   */
  async deleteAccount(account: JdAccount): Promise<void> {
    if (!confirm(`确定要删除京东账号 "${account.jdNickname}" 吗?`)) {
      return;
    }

    try {
      const token = this.tokenStorage.getToken();
      if (!token) {
        this.router.navigate(['/login']);
        return;
      }

      await this.jdSDK.deleteAccount(token, account.id);
      await this.loadAccounts();
      this.toastService.success(`京东账号 "${account.jdNickname}" 已删除`);
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

  /**
   * 检查账号健康状态
   */
  async checkAccount(account: JdAccount): Promise<void> {
    if (this.checkingAccounts.has(account.id)) {
      return; // 防止重复检查
    }

    this.checkingAccounts.add(account.id);

    try {
      const token = this.tokenStorage.getToken();
      if (!token) {
        this.router.navigate(['/login']);
        return;
      }

      const result = await this.jdSDK.checkAccount(token, account.id);

      // 更新账号状态
      const index = this.accounts.findIndex(a => a.id === account.id);
      if (index !== -1) {
        this.accounts[index].status = result.newStatus as any;
        this.accounts[index].lastCheckAt = result.checkedAt;
      }

      // 显示结果消息
      if (result.statusChanged) {
        const message = `账号状态已更新: ${this.getStatusText(result.oldStatus)} → ${this.getStatusText(result.newStatus)}`;
        if (result.newStatus === 'active') {
          this.toastService.success(message);
        } else if (result.newStatus === 'expired' || result.newStatus === 'banned') {
          this.toastService.error(message);
        } else {
          this.toastService.warning(message);
        }
      } else {
        if (result.newStatus === 'active') {
          this.toastService.success(`账号状态正常: ${result.message}`);
        } else {
          this.toastService.info(`账号状态: ${result.message}`);
        }
      }
    } catch (error: any) {
      this.toastService.error(`检查失败: ${error.message}`);
      console.error('检查账号失败:', error);
    } finally {
      this.checkingAccounts.delete(account.id);
    }
  }

  /**
   * 判断账号是否正在检查中
   */
  isChecking(accountId: number): boolean {
    return this.checkingAccounts.has(accountId);
  }

  /**
   * 获取状态显示文本
   */
  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'active': '正常',
      'expired': '已过期',
      'restricted': '风控受限',
      'banned': '已封禁'
    };
    return statusMap[status] || status;
  }

  /**
   * 获取状态对应的CSS类
   */
  getStatusClass(status: string): { [key: string]: boolean } {
    const classMap: Record<string, { [key: string]: boolean }> = {
      'active': { 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300': true },
      'expired': { 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300': true },
      'restricted': { 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300': true },
      'banned': { 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300': true }
    };
    return classMap[status] || { 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300': true };
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