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
    path: 'screen/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/screen/screen-display.component').then(m => m.ScreenDisplayComponent)
  },
  {
    path: 'api-keys',
    canActivate: [authGuard],
    loadComponent: () => import('./features/api-key-management/api-key-management.component').then(m => m.ApiKeyManagementComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
