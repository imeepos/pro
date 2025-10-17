import { Component, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { JdLoginService, JdLoginEvent } from '../../core/services/jd-login.service';

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

  private subscription?: Subscription;

  constructor(
    private readonly jdLogin: JdLoginService,
    private readonly ngZone: NgZone
  ) {}

  ngOnDestroy(): void {
    this.unsubscribe();
  }

  async startJdLogin(): Promise<void> {
    this.isLoading = true;
    this.showSuccess = false;
    this.qrcodeUrl = '';
    this.status = '正在初始化...';
    this.accountInfo = null;
    this.canRetry = false;
    this.currentAttempt = 0;

    try {
      const session = await this.jdLogin.startLogin();
      this.observeLoginEvents(session.sessionId);
    } catch (error) {
      this.status = `初始化失败: ${error}`;
      this.isLoading = false;
    }
  }

  private observeLoginEvents(sessionId: string): void {
    this.subscription = this.jdLogin.observeLoginEvents(sessionId).subscribe({
      next: (event: JdLoginEvent) => this.handleLoginEvent(event),
      error: (error: Error) => {
        this.ngZone.run(() => {
          this.status = `连接错误: ${error.message}`;
          this.isLoading = false;
        });
      },
      complete: () => {
        this.ngZone.run(() => {
          if (!this.showSuccess) {
            this.status = '连接已关闭';
            this.isLoading = false;
          }
        });
      }
    });
  }

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
          break;

        case 'expired':
          this.status = '二维码已过期,请重新获取';
          this.isLoading = false;
          break;

        case 'error':
          this.handleErrorEvent(event.data);
          break;
      }
    });
  }

  private handleErrorEvent(errorData: any): void {
    this.currentAttempt = errorData.attempt || 0;
    this.canRetry = errorData.canRetry || false;
    this.isLoading = false;

    if (this.canRetry && this.currentAttempt < this.maxRetries) {
      this.status = `${errorData.message} (尝试 ${this.currentAttempt}/${this.maxRetries})`;
    } else if (this.canRetry && this.currentAttempt >= this.maxRetries) {
      this.status = `${errorData.message} (已达到最大重试次数)`;
    } else {
      this.status = `${errorData.message} (无法重试)`;
    }
  }

  private unsubscribe(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  manualRetry(): void {
    if (!this.canRetry) {
      return;
    }

    this.unsubscribe();
    this.canRetry = false;
    this.startJdLogin();
  }

  getRetryButtonText(): string {
    if (!this.canRetry) {
      return '无法重试';
    }

    if (this.currentAttempt >= this.maxRetries) {
      return '已达到最大重试次数';
    }

    return `重试 (${this.currentAttempt + 1}/${this.maxRetries})`;
  }

  getErrorStatusDescription(): string {
    if (!this.isLoading && this.canRetry) {
      if (this.currentAttempt >= this.maxRetries) {
        return '操作失败，已达到最大重试次数。请稍后再试或联系技术支持。';
      }
      return '操作失败，您可以点击重试按钮再次尝试。';
    }

    return this.status;
  }

  resetAndStartNew(): void {
    this.unsubscribe();
    this.canRetry = false;
    this.currentAttempt = 0;
    this.startJdLogin();
  }
}