import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { Observable } from 'rxjs';
import { WorkflowDirectoryState, WorkflowSummary, WorkflowDirectoryStore } from './workflow-directory.store';

@Injectable({ providedIn: 'root' })
export class WorkflowDirectoryQuery extends QueryEntity<WorkflowDirectoryState, WorkflowSummary> {
  readonly workflows$: Observable<WorkflowSummary[]> = this.selectAll();
  readonly loading$: Observable<boolean> = this.selectLoading();
  readonly error$: Observable<string | null> = this.select((state) => state.error);

  constructor(store: WorkflowDirectoryStore) {
    super(store);
  }
}
