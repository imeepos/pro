import { Component, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { createJdAuthSDK, JdLoginEvent, JdAuthSDK } from '@pro/sdk';
import { getApiUrl } from '@pro/config';
import { TokenStorageService } from '../../core/services/token-storage.service';

/**
 * 京东登录组件
 *
 * 核心职责:
 * 1. 启动京东扫码登录流程
 * 2. 展示二维码供用户扫描
 * 3. 处理 SSE 推送的登录状态变化
 * 4. 处理登录成功/失败/过期等各种状态
 */
@Component({
  selector: 'app-jd-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './jd-login.component.html',
  styleUrls: ['./jd-login.component.scss']
})
export class JdLoginComponent implements OnDestroy {
  qrcodeUrl = '';
  status = '';
  isLoading = false;
  showSuccess = false;
  accountInfo: any = null;

  private jdSDK: JdAuthSDK;
  private eventSource?: EventSource;

  constructor(
    private tokenStorage: TokenStorageService,
    private ngZone: NgZone
  ) {
    this.jdSDK = createJdAuthSDK(this.getBaseUrl());
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
   * 启动京东登录流程
   */
  startJdLogin(): void {
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

    this.eventSource = this.jdSDK.startLogin(token, (event: JdLoginEvent) => {
      this.handleLoginEvent(event);
    });
  }

  /**
   * 处理登录事件
   */
  private handleLoginEvent(event: JdLoginEvent): void {
    this.ngZone.run(() => {
      switch (event.type) {
        case 'qrcode':
          this.qrcodeUrl = event.data.image;
          this.status = '请使用京东扫描二维码';
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
    });
  }

  private onLoginSuccess(data: any): void {
    // 登录成功处理
    console.log('京东登录成功:', data);
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
    this.startJdLogin();
  }
}