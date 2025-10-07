import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthQuery } from '../../state/auth.query';
import { AuthService } from '../../state/auth.service';
import { User } from '@pro/types';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="home-container">
      <div class="home-header">
        <h1>后台管理系统</h1>
        <button (click)="logout()" class="btn-logout">退出登录</button>
      </div>
      <div class="home-content">
        <div class="user-info" *ngIf="currentUser$ | async as user">
          <h2>欢迎, {{ user.username }}!</h2>
          <p>邮箱: {{ user.email }}</p>
          <p>状态: {{ user.status }}</p>
          <p>注册时间: {{ user.createdAt | date:'yyyy-MM-dd HH:mm' }}</p>
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

    .home-content {
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      .user-info {
        h2 {
          margin: 0 0 16px 0;
          color: #333;
          font-size: 20px;
        }

        p {
          margin: 8px 0;
          color: #666;
          font-size: 14px;
        }
      }
    }
  `]
})
export class HomeComponent {
  currentUser$: Observable<User | null>;

  constructor(
    private authQuery: AuthQuery,
    private authService: AuthService
  ) {
    this.currentUser$ = this.authQuery.currentUser$;
  }

  logout(): void {
    this.authService.logout();
  }
}
