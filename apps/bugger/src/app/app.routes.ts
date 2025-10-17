import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'bugs',
    loadComponent: () =>
      import('./components/bug-list/bug-list.component').then(
        (m) => m.BugListComponent
      ),
  },
  {
    path: 'bugs/new',
    loadComponent: () =>
      import('./components/create-bug/create-bug.component').then(
        (m) => m.CreateBugComponent
      ),
  },
  {
    path: 'bugs/:id/edit',
    loadComponent: () =>
      import('./components/bug-edit/bug-edit.component').then(
        (m) => m.BugEditComponent
      ),
  },
  {
    path: 'bugs/:id',
    loadComponent: () =>
      import('./components/bug-detail/bug-detail.component').then(
        (m) => m.BugDetailComponent
      ),
  },
];
