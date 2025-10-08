import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { createWeiboAuthSDK, WeiboAccount, WeiboAuthSDK } from '@pro/sdk';
import { getApiUrl } from '@pro/config';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { WeiboLoginComponent } from './weibo-login.component';

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
  templateUrl: './weibo-accounts.component.html',
  styleUrls: ['./weibo-accounts.component.scss']
})
export class WeiboAccountsComponent implements OnInit {
  accounts: WeiboAccount[] = [];
  isLoading = false;
  showLoginDialog = false;
  error: string | null = null;

  private weiboSDK: WeiboAuthSDK;

  constructor(
    private tokenStorage: TokenStorageService,
    private router: Router
  ) {
    this.weiboSDK = createWeiboAuthSDK(this.getBaseUrl());
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

      const result = await this.weiboSDK.getAccounts(token);
      this.accounts = result.accounts;
    } catch (error: any) {
      this.error = error.message || '加载账号列表失败';
      console.error('加载微博账号列表失败:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 删除账号
   */
  async deleteAccount(account: WeiboAccount): Promise<void> {
    if (!confirm(`确定要删除微博账号 "${account.weiboNickname}" 吗?`)) {
      return;
    }

    try {
      const token = this.tokenStorage.getToken();
      if (!token) {
        this.router.navigate(['/login']);
        return;
      }

      await this.weiboSDK.deleteAccount(token, account.id);
      await this.loadAccounts();
    } catch (error: any) {
      alert(`删除失败: ${error.message}`);
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

  /**
   * 获取状态显示文本
   */
  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'active': '正常',
      'expired': '已过期',
      'banned': '已封禁'
    };
    return statusMap[status] || status;
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
