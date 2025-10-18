import { Routes } from '@angular/router';

export const DATA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./data-list/data-list.component').then(m => m.DataListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./data-form/data-form.component').then(m => m.DataFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./data-form/data-form.component').then(m => m.DataFormComponent)
  }
];