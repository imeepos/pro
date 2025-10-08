import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../state/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="home-container">
      <div class="home-header">
        <h1>欢迎</h1>
        <div class="header-actions">
          <button (click)="goToWeiboAccounts()" class="btn-weibo">微博账号管理</button>
          <button (click)="logout()" class="btn-logout">退出登录</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      padding: 20px;
    }

    .home-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;

      h1 {
        margin: 0;
        font-size: 24px;
        color: #333;
      }

      .header-actions {
        display: flex;
        gap: 12px;
      }

      .btn-weibo {
        padding: 10px 20px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s;

        &:hover {
          background: #2563eb;
        }
      }

      .btn-logout {
        padding: 10px 20px;
        background: #f56565;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s;

        &:hover {
          background: #e53e3e;
        }
      }
    }

  `]
})
export class HomeComponent {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  logout(): void {
    this.authService.logout();
  }

  goToWeiboAccounts(): void {
    this.router.navigate(['/weibo/accounts']);
  }
}
