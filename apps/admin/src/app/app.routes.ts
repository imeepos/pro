import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'weibo/login',
    canActivate: [authGuard],
    loadComponent: () => import('./features/weibo/weibo-login.component').then(m => m.WeiboLoginComponent)
  },
  {
    path: 'weibo/accounts',
    canActivate: [authGuard],
    loadComponent: () => import('./features/weibo/weibo-accounts.component').then(m => m.WeiboAccountsComponent)
  },
  {
    path: 'screens',
    canActivate: [authGuard],
    loadComponent: () => import('./features/screens/screens-list.component').then(m => m.ScreensListComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
