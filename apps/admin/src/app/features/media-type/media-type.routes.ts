import { Routes } from '@angular/router';

export const mediaTypeRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./media-type-list/media-type-list.component').then(m => m.MediaTypeListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./media-type-form/media-type-form.component').then(m => m.MediaTypeFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./media-type-form/media-type-form.component').then(m => m.MediaTypeFormComponent)
  }
];
