import { Routes } from '@angular/router';
import { BugListComponent } from './components/bug-list/bug-list.component';
import { BugDetailComponent } from './components/bug-detail/bug-detail.component';
import { CreateBugComponent } from './components/create-bug/create-bug.component';
import { BugEditComponent } from './components/bug-edit/bug-edit.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'bugs', component: BugListComponent },
  { path: 'bugs/new', component: CreateBugComponent },
  { path: 'bugs/:id/edit', component: BugEditComponent },
  { path: 'bugs/:id', component: BugDetailComponent },
];