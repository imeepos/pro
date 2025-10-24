import { Routes } from '@angular/router';

export const WORKFLOW_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./list/workflows-list.component').then(
        m => m.WorkflowsListComponent,
      ),
  },
  {
    path: 'editor/:id',
    loadComponent: () =>
      import('./editor/workflow-editor.component').then(
        m => m.WorkflowEditorComponent,
      ),
  },
  {
    path: 'monitor/:id',
    loadComponent: () =>
      import('./monitor/workflow-monitor.component').then(
        m => m.WorkflowMonitorComponent,
      ),
  },
  {
    path: 'debug/:executionId',
    loadComponent: () =>
      import('./debug/workflow-debug.component').then(
        m => m.WorkflowDebugComponent,
      ),
  },
];
