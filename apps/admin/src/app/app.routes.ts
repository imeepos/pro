import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './core/layout/layout.component';

export const routes: Routes = [
  // 登录/注册页面 - 不使用布局
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },

  // 主应用 - 使用布局
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'screens', pathMatch: 'full' },
      {
        path: 'screens',
        loadComponent: () => import('./features/screens/screens-list.component').then(m => m.ScreensListComponent)
      },
      {
        path: 'screens/editor/:id',
        loadComponent: () => import('./features/screens/editor/screen-editor.component').then(m => m.ScreenEditorComponent)
      },
      {
        path: 'weibo/accounts',
        loadComponent: () => import('./features/weibo/weibo-accounts.component').then(m => m.WeiboAccountsComponent)
      }
    ]
  },

  // 404 重定向
  {
    path: '**',
    redirectTo: 'login'
  }
];
