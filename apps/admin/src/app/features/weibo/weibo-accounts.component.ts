import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { createWeiboAuthSDK, WeiboAccount } from '@pro/sdk';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { getApiUrl } from '@pro/config';

/**
 * 微博账号管理组件
 *
 * 功能:
 * - 展示已绑定的微博账号列表
 * - 支持删除账号
 * - 支持跳转到添加账号页面
 */
@Component({
  selector: 'app-weibo-accounts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weibo-accounts.component.html',
  styleUrls: ['./weibo-accounts.component.scss']
})
export class WeiboAccountsComponent implements OnInit {
  accounts: WeiboAccount[] = [];
  loading = false;
  error: string | null = null;

  private weiboSDK = createWeiboAuthSDK(getApiUrl());

  constructor(
    private tokenStorage: TokenStorageService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadAccounts();
  }

  /**
   * 加载微博账号列表
   */
  async loadAccounts() {
    this.loading = true;
    this.error = null;

    try {
      const token = this.tokenStorage.getToken();
      if (!token) {
        this.error = '未登录,请先登录';
        return;
      }

      const result = await this.weiboSDK.getAccounts(token);
      this.accounts = result.accounts;
    } catch (error: any) {
      this.error = error.message || '加载账号列表失败';
      console.error('加载账号列表失败:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * 删除微博账号
   */
  async deleteAccount(accountId: number) {
    if (!confirm('确定要删除此微博账号吗?')) {
      return;
    }

    try {
      const token = this.tokenStorage.getToken();
      if (!token) {
        this.error = '未登录,请先登录';
        return;
      }

      await this.weiboSDK.deleteAccount(token, accountId);
      await this.loadAccounts();
    } catch (error: any) {
      this.error = error.message || '删除账号失败';
      console.error('删除账号失败:', error);
    }
  }

  /**
   * 跳转到添加账号页面
   */
  goToAddAccount() {
    this.router.navigate(['/weibo/login']);
  }

  /**
   * 获取账号状态的显示文本
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
   * 获取账号状态的 CSS 类
   */
  getStatusClass(status: string): string {
    const classMap: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'expired': 'bg-red-100 text-red-800',
      'banned': 'bg-gray-100 text-gray-800'
    };
    return classMap[status] || 'bg-gray-100 text-gray-800';
  }
}
