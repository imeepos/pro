import { Injectable } from '@angular/core';
import { Query } from '@datorama/akita';
import { map } from 'rxjs';
import { WorkflowEditorState } from '../models/workflow-blueprint.model';
import { WorkflowStore } from './workflow.store';

@Injectable({ providedIn: 'root' })
export class WorkflowQuery extends Query<WorkflowEditorState> {
  readonly nodes$ = this.select('nodes');
  readonly edges$ = this.select('edges');
  readonly isDirty$ = this.select('dirty');
  readonly isSaving$ = this.select('saving');
  readonly validationIssues$ = this.select('validationIssues');
  readonly loading$ = this.select('loading');
  readonly error$ = this.select('error');

  readonly selectedNode$ = this.select().pipe(
    map(state => state.nodes.find(node => node.id === state.selectedNodeId) ?? null),
  );

  readonly definition$ = this.select(state => ({
    nodes: state.nodes,
    edges: state.edges,
  }));

  constructor(store: WorkflowStore) {
    super(store);
  }
}
