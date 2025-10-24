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

  // Screen Editor - 全屏页面，不使用布局
  {
    path: 'screens/editor/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/screens/editor/screen-editor.component').then(m => m.ScreenEditorComponent)
  },

  // 主应用 - 使用布局
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'api-keys',
        loadComponent: () => import('./features/api-keys/api-keys.component').then(m => m.ApiKeysComponent)
      },
      {
        path: 'screens',
        loadComponent: () => import('./features/screens/screens-list.component').then(m => m.ScreensListComponent)
      },
      {
        path: 'weibo/accounts',
        loadComponent: () => import('./features/weibo/weibo-accounts.component').then(m => m.WeiboAccountsComponent)
      },
      {
        path: 'weibo-data/posts',
        loadComponent: () => import('./features/weibo-data/weibo-posts.component').then(m => m.WeiboPostsComponent)
      },
      {
        path: 'weibo-data/users',
        loadComponent: () => import('./features/weibo-data/weibo-users.component').then(m => m.WeiboUsersComponent)
      },
      {
        path: 'weibo-data/comments',
        loadComponent: () => import('./features/weibo-data/weibo-comments.component').then(m => m.WeiboCommentsComponent)
      },
      {
        path: 'weibo-data/interactions',
        loadComponent: () => import('./features/weibo-data/weibo-interactions.component').then(m => m.WeiboInteractionsComponent)
      },
      {
        path: 'weibo-search-tasks',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/weibo-search-tasks/weibo-search-tasks-list.component').then(m => m.WeiboSearchTasksListComponent)
          },
          {
            path: 'create',
            loadComponent: () => import('./features/weibo-search-tasks/weibo-search-task-form.component').then(m => m.WeiboSearchTaskFormComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./features/weibo-search-tasks/weibo-search-task-detail.component').then(m => m.WeiboSearchTaskDetailComponent)
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./features/weibo-search-tasks/weibo-search-task-form.component').then(m => m.WeiboSearchTaskFormComponent)
          }
        ]
      },
      {
        path: 'jd/accounts',
        loadComponent: () => import('./features/jd/jd-accounts.component').then(m => m.JdAccountsComponent)
      },
      {
        path: 'events',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/events/events-list.component').then(m => m.EventsListComponent)
          },
          {
            path: 'create',
            loadComponent: () => import('./features/events/event-editor.component').then(m => m.EventEditorComponent)
          },
          {
            path: 'edit/:id',
            loadComponent: () => import('./features/events/event-editor.component').then(m => m.EventEditorComponent)
          },
          {
            path: 'detail/:id',
            loadComponent: () => import('./features/events/event-detail.component').then(m => m.EventDetailComponent)
          },
          {
            path: 'industry-types',
            loadComponent: () => import('./features/events/industry-types-list.component').then(m => m.IndustryTypesListComponent)
          },
          {
            path: 'industry-types/create',
            loadComponent: () => import('./features/events/industry-type-editor.component').then(m => m.IndustryTypeEditorComponent)
          },
          {
            path: 'industry-types/edit/:id',
            loadComponent: () => import('./features/events/industry-type-editor.component').then(m => m.IndustryTypeEditorComponent)
          },
          {
            path: 'event-types',
            loadComponent: () => import('./features/events/event-types-list.component').then(m => m.EventTypesListComponent)
          },
          {
            path: 'event-types/create',
            loadComponent: () => import('./features/events/event-type-editor.component').then(m => m.EventTypeEditorComponent)
          },
          {
            path: 'event-types/edit/:id',
            loadComponent: () => import('./features/events/event-type-editor.component').then(m => m.EventTypeEditorComponent)
          }
        ]
      },
      {
        path: 'workflows',
        loadChildren: () => import('./features/workflows/workflows.routes').then(m => m.WORKFLOW_ROUTES)
      },
      {
        path: 'media-type',
        loadChildren: () => import('./features/media-type/media-type.routes').then(m => m.mediaTypeRoutes)
      },
      {
        path: 'flowbite-demo',
        loadComponent: () => import('./features/flowbite-demo/flowbite-demo.component').then(m => m.FlowbiteDemoComponent)
      },
      {
        path: 'dlq-manager',
        loadComponent: () => import('./pages/dlq-manager/dlq-manager.component').then(m => m.DlqManagerComponent)
      },
      {
        path: 'data',
        loadChildren: () => import('./features/data/data.routes').then(m => m.DATA_ROUTES)
      }
    ]
  },

  // 404 重定向
  {
    path: '**',
    redirectTo: 'login'
  }
];
