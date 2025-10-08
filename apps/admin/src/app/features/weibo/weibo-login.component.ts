import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { createWeiboAuthSDK, WeiboLoginEvent, WeiboAuthSDK } from '@pro/sdk';
import { getApiUrl } from '@pro/config';
import { TokenStorageService } from '../../core/services/token-storage.service';

/**
 * 微博登录组件
 *
 * 核心职责:
 * 1. 启动微博扫码登录流程
 * 2. 展示二维码供用户扫描
 * 3. 处理 SSE 推送的登录状态变化
 * 4. 处理登录成功/失败/过期等各种状态
 */
@Component({
  selector: 'app-weibo-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weibo-login.component.html',
  styleUrls: ['./weibo-login.component.scss']
})
export class WeiboLoginComponent implements OnDestroy {
  qrcodeUrl = '';
  status = '';
  isLoading = false;
  showSuccess = false;
  accountInfo: any = null;

  private weiboSDK: WeiboAuthSDK;
  private eventSource?: EventSource;

  constructor(private tokenStorage: TokenStorageService) {
    this.weiboSDK = createWeiboAuthSDK(this.getBaseUrl());
  }

  ngOnDestroy(): void {
    this.closeConnection();
  }

  /**
   * 获取 API 基础地址
   */
  private getBaseUrl(): string {
    return getApiUrl().replace('/api', '');
  }

  /**
   * 启动微博登录流程
   */
  startWeiboLogin(): void {
    this.isLoading = true;
    this.showSuccess = false;
    this.qrcodeUrl = '';
    this.status = '正在初始化...';
    this.accountInfo = null;

    const token = this.tokenStorage.getToken();
    if (!token) {
      this.status = '未登录,请先登录系统';
      this.isLoading = false;
      return;
    }

    this.eventSource = this.weiboSDK.startLogin(token, (event: WeiboLoginEvent) => {
      this.handleLoginEvent(event);
    });
  }

  /**
   * 处理登录事件
   */
  private handleLoginEvent(event: WeiboLoginEvent): void {
    switch (event.type) {
      case 'qrcode':
        this.qrcodeUrl = event.data.image;
        this.status = '请使用微博扫描二维码';
        break;

      case 'scanned':
        this.status = '已扫码,请在手机上确认登录';
        break;

      case 'success':
        this.status = '登录成功!';
        this.showSuccess = true;
        this.accountInfo = event.data;
        this.isLoading = false;
        this.onLoginSuccess(event.data);
        break;

      case 'expired':
        this.status = '二维码已过期,请重新获取';
        this.isLoading = false;
        break;

      case 'error':
        this.status = `错误: ${event.data.message}`;
        this.isLoading = false;
        break;
    }
  }

  /**
   * 登录成功回调
   */
  private onLoginSuccess(data: any): void {
    console.log('微博账号绑定成功:', data);
  }

  /**
   * 关闭 SSE 连接
   */
  private closeConnection(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }

  /**
   * 重置状态,开始新的登录
   */
  resetAndStartNew(): void {
    this.closeConnection();
    this.startWeiboLogin();
  }
}
