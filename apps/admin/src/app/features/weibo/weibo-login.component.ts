import { Component, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { WeiboLoginService, WeiboLoginEvent } from '../../core/services/weibo-login.service';

@Component({
  selector: 'app-weibo-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weibo-login.component.html'
})
export class WeiboLoginComponent implements OnDestroy {
  qrcodeUrl = '';
  status = '';
  isLoading = false;
  showSuccess = false;
  accountInfo: any = null;

  private subscription?: Subscription;

  constructor(
    private readonly weiboLogin: WeiboLoginService,
    private readonly ngZone: NgZone
  ) {}

  ngOnDestroy(): void {
    this.unsubscribe();
  }

  async startWeiboLogin(): Promise<void> {
    this.isLoading = true;
    this.showSuccess = false;
    this.qrcodeUrl = '';
    this.status = '正在初始化...';
    this.accountInfo = null;

    try {
      const session = await this.weiboLogin.startLogin();
      this.observeLoginEvents(session.sessionId);
    } catch (error) {
      this.status = `初始化失败: ${error}`;
      this.isLoading = false;
    }
  }

  private observeLoginEvents(sessionId: string): void {
    this.subscription = this.weiboLogin.observeLoginEvents(sessionId).subscribe({
      next: (event: WeiboLoginEvent) => this.handleLoginEvent(event),
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

  private handleLoginEvent(event: WeiboLoginEvent): void {
    this.ngZone.run(() => {
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

  private unsubscribe(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  resetAndStartNew(): void {
    this.unsubscribe();
    this.startWeiboLogin();
  }
}
