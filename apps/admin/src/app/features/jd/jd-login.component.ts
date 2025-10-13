import { Component, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { createJdAuthSDK, JdLoginEvent, JdAuthSDK, JdErrorEventData } from '@pro/sdk';
import { environment } from '../../../environments/environment';
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
  canRetry = false;
  currentAttempt = 0;
  maxRetries = 3;

  private jdSDK: JdAuthSDK;
  private eventSource?: EventSource;

  constructor(
    private tokenStorage: TokenStorageService,
    private ngZone: NgZone
  ) {
    this.jdSDK = createJdAuthSDK(this.getBaseUrl(), environment.tokenKey);
  }

  ngOnDestroy(): void {
    this.closeConnection();
  }

  /**
   * 获取 API 基础地址
   */
  private getBaseUrl(): string {
    return environment.apiUrl.replace('/api', '');
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
    this.canRetry = false;
    this.currentAttempt = 0;

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
          this.handleErrorEvent(event.data as JdErrorEventData);
          break;
      }
    });
  }

  /**
   * 处理错误事件
   */
  private handleErrorEvent(errorData: JdErrorEventData): void {
    this.currentAttempt = errorData.attempt;
    this.canRetry = errorData.canRetry;
    this.isLoading = false;

    // 根据重试状态和次数显示不同的错误信息
    if (errorData.canRetry && errorData.attempt < this.maxRetries) {
      this.status = `${errorData.message} (尝试 ${errorData.attempt}/${this.maxRetries})`;
    } else if (errorData.canRetry && errorData.attempt >= this.maxRetries) {
      this.status = `${errorData.message} (已达到最大重试次数)`;
    } else {
      this.status = `${errorData.message} (无法重试)`;
    }
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
   * 手动重试登录
   */
  manualRetry(): void {
    if (!this.canRetry) {
      return;
    }

    this.closeConnection();
    this.canRetry = false;
    this.startJdLogin();
  }

  /**
   * 获取重试按钮的提示文本
   */
  getRetryButtonText(): string {
    if (!this.canRetry) {
      return '无法重试';
    }

    if (this.currentAttempt >= this.maxRetries) {
      return '已达到最大重试次数';
    }

    return `重试 (${this.currentAttempt + 1}/${this.maxRetries})`;
  }

  /**
   * 获取错误状态的详细描述
   */
  getErrorStatusDescription(): string {
    if (!this.isLoading && this.canRetry) {
      if (this.currentAttempt >= this.maxRetries) {
        return '操作失败，已达到最大重试次数。请稍后再试或联系技术支持。';
      }
      return '操作失败，您可以点击重试按钮再次尝试。';
    }

    return this.status;
  }

  /**
   * 重置状态,开始新的登录
   */
  resetAndStartNew(): void {
    this.closeConnection();
    this.canRetry = false;
    this.currentAttempt = 0;
    this.startJdLogin();
  }
}