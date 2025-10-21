import { Component, OnDestroy, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { WeiboLoginService, WeiboLoginEvent, SubscriptionConnectionState } from '../../core/services/weibo-login.service';

@Component({
  selector: 'app-weibo-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weibo-login.component.html'
})
export class WeiboLoginComponent implements OnInit, OnDestroy {
  qrcodeUrl = '';
  status = '';
  isLoading = false;
  showSuccess = false;
  accountInfo: any = null;
  connectionState: SubscriptionConnectionState = 'disconnected';
  connectionMessage = '';

  private subscription?: Subscription;
  private connectionSubscription?: Subscription;

  constructor(
    private readonly weiboLogin: WeiboLoginService,
    private readonly ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.connectionSubscription = this.weiboLogin.observeConnectionState().subscribe(state => {
      this.ngZone.run(() => this.handleConnectionState(state));
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe();
    this.connectionSubscription?.unsubscribe();
    this.connectionSubscription = undefined;
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
      const type = (event.type ?? '').toLowerCase();

      switch (type) {
        case 'qrcode':
          this.qrcodeUrl = event.data?.image ?? '';
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
          this.status = `错误: ${event.data?.message ?? '发生未知错误'}`;
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

  retryConnection(): void {
    this.weiboLogin.reconnect();
    this.status = '正在重新建立连接...';
  }

  private handleConnectionState(state: SubscriptionConnectionState): void {
    this.connectionState = state;

    switch (state) {
      case 'connecting':
        this.connectionMessage = '正在建立实时连接...';
        break;
      case 'reconnecting':
        this.connectionMessage = '连接中断，正在尝试重连...';
        break;
      case 'error':
        this.connectionMessage = '连接异常，请点击重试';
        break;
      default:
        this.connectionMessage = '';
    }
  }

  resetAndStartNew(): void {
    this.unsubscribe();
    this.startWeiboLogin();
  }
}
